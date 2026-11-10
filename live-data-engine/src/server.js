import express from 'express';
import http from 'node:http';
import { PubSub } from '@google-cloud/pubsub';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
app.use(express.json({ limit: '64kb' }));
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const port = Number(process.env.PORT || 8788);
const projectId = process.env.GOOGLE_CLOUD_PROJECT || '';
const subscriptionName = process.env.CME_PUBSUB_SUBSCRIPTION || '';
const feedFormat = String(process.env.CME_FEED_FORMAT || 'JSON').toUpperCase();
const distributionApproved = process.env.PUBLIC_LIVE_DISTRIBUTION_APPROVED === 'true';
const providerLabel = 'CME Group Data Services · Google Cloud Pub/Sub';

let subscriber;
let lastMessageAt = 0;
let received = 0;
let published = 0;
let rejected = 0;
let lastError = null;
const tradingViewEvents = [];
const MAX_REPLAY_EVENTS = 5000;
const tradingViewWebhookToken = process.env.TRADINGVIEW_WEBHOOK_TOKEN || '';

function status() {
  return {
    service: 'Northstar Live Data Engine',
    provider: providerLabel,
    transport: 'Google Cloud Pub/Sub',
    feedFormat,
    decoder: feedFormat === 'JSON' ? 'JSON envelope inspection only; CME field mapping still required' : 'SBE decoder not installed',
    state: lastMessageAt && Date.now() - lastMessageAt < 30000 ? 'receiving' : 'waiting',
    distributionApproved,
    publicStreaming: distributionApproved,
    lastMessageAt: lastMessageAt || null,
    received,
    published,
    rejected,
    error: lastError
  };
}

function symbolFrom(payload) {
  const candidates = [
    payload?.symbol,
    payload?.ticker,
    payload?.instrumentSymbol,
    payload?.productSymbol,
    payload?.security?.symbol,
    payload?.instrument?.symbol
  ].filter(value => typeof value === 'string');
  for (const candidate of candidates) {
    const value = candidate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.startsWith('MNQ')) return 'MNQ';
    if (value.startsWith('NQ')) return 'NQ';
  }
  return null;
}

function publishToClients(envelope) {
  const message = JSON.stringify(envelope);
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    if (client.symbol && client.symbol !== envelope.symbol) continue;
    client.send(message);
  }
  published += 1;
}

function handlePubSubMessage(message) {
  received += 1;
  lastMessageAt = Date.now();
  try {
    const raw = message.data.toString('utf8');
    const payload = JSON.parse(raw);
    const symbol = symbolFrom(payload);
    if (!symbol) {
      rejected += 1;
      message.ack();
      return;
    }

    // Keep the provider's original payload intact. Do not invent trade-side,
    // depth, order identity, or timestamps when CME has not supplied them.
    if (distributionApproved) {
      publishToClients({
        type: 'cme-market-data',
        provider: providerLabel,
        symbol,
        receivedAt: lastMessageAt,
        payload
      });
    }
    message.ack();
  } catch (error) {
    rejected += 1;
    lastError = error.message;
    // Invalid/unrecognized payloads are acknowledged to avoid poison-message loops.
    message.ack();
  }
}

app.disable('x-powered-by');
app.get('/health', (_req, res) => res.json({ ok: true, service: 'Northstar Live Data Engine' }));

app.get('/api/status', (_req, res) => res.json({
  ...status(),
  tradingViewBridge: {
    enabled: Boolean(tradingViewWebhookToken),
    received: tradingViewEvents.length,
    mode: 'alert-events only; not a raw exchange tick or order-book feed'
  }
}));

// TradingView alert outputs are events, not a copy of its underlying exchange feed.
app.post('/api/ingest/tradingview/:token', (req, res) => {
  if (!tradingViewWebhookToken || req.params.token !== tradingViewWebhookToken) {
    return res.status(401).json({ ok: false, error: 'Webhook not configured or token invalid' });
  }
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ ok: false, error: 'Expected a JSON alert object' });
  }
  const rawSymbol = String(body.symbol || body.ticker || '').toUpperCase();
  const symbol = rawSymbol.includes('MNQ') ? 'MNQ' : rawSymbol.includes('NQ') ? 'NQ' : null;
  if (!symbol) return res.status(422).json({ ok: false, error: 'Only NQ/MNQ symbols are accepted' });

  const numeric = value => value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
  const event = {
    id: 'tv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9),
    type: 'tradingview-alert',
    source: 'TradingView alert webhook',
    symbol,
    receivedAt: Date.now(),
    eventTime: body.time || body.timestamp || null,
    timeframe: body.timeframe || body.interval || null,
    event: String(body.event || body.signal || body.message || 'alert').slice(0, 500),
    price: numeric(body.price),
    open: numeric(body.open),
    high: numeric(body.high),
    low: numeric(body.low),
    close: numeric(body.close),
    volume: numeric(body.volume),
    raw: body
  };
  tradingViewEvents.push(event);
  if (tradingViewEvents.length > MAX_REPLAY_EVENTS) tradingViewEvents.shift();
  publishToClients(event);
  return res.status(202).json({ ok: true, accepted: true, id: event.id, source: event.source, symbol, note: 'Alert event stored; this is not a full tick/order-book feed.' });
});

app.get('/api/replay', (req, res) => {
  const symbol = String(req.query.symbol || '').toUpperCase();
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '500', 10) || 500, 1), MAX_REPLAY_EVENTS);
  const events = tradingViewEvents.filter(item => !['NQ', 'MNQ'].includes(symbol) || item.symbol === symbol).slice(-limit);
  res.json({ source: 'TradingView alert webhook', count: events.length, retained: tradingViewEvents.length, events });
});


wss.on('connection', (socket, request) => {
  const url = new URL(request.url, 'http://localhost');
  const symbol = String(url.searchParams.get('symbol') || '').toUpperCase();
  socket.symbol = ['NQ', 'MNQ'].includes(symbol) ? symbol : null;
  socket.send(JSON.stringify({ type: 'status', ...status() }));
  if (!distributionApproved) {
    socket.send(JSON.stringify({
      type: 'notice',
      code: 'DISTRIBUTION_NOT_APPROVED',
      message: 'CME production data is not broadcast until CME public-distribution authorization is confirmed.'
    }));
  }
});

async function start() {
  if (projectId && subscriptionName && feedFormat !== 'JSON') {
    lastError = 'This build only accepts CME JSON Pub/Sub messages. SBE full-depth/MBO requires the CME SBE schema decoder before subscribing.';
    console.error(lastError);
  } else if (projectId && subscriptionName) {
    const pubsub = new PubSub({ projectId });
    subscriber = pubsub.subscription(subscriptionName, {
      flowControl: { maxMessages: 100, allowExcessMessages: false }
    });
    subscriber.on('message', handlePubSubMessage);
    subscriber.on('error', error => {
      lastError = error.message;
      console.error('CME Pub/Sub subscriber error:', error.message);
    });
    console.log(`Subscribed to configured Pub/Sub subscription: ${subscriptionName}`);
  } else {
    console.warn('CME Pub/Sub is not configured. Set GOOGLE_CLOUD_PROJECT and CME_PUBSUB_SUBSCRIPTION.');
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Northstar Live Data Engine listening on ${port}`);
  });
}

async function shutdown() {
  if (subscriber) await subscriber.close().catch(() => {});
  for (const client of wss.clients) client.close(1001, 'Service shutting down');
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
start().catch(error => {
  console.error(error);
  process.exit(1);
});
