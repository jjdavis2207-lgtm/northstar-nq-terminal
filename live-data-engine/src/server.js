import express from 'express';
import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { ingestMarketEvent, getCandles, getEngineMetrics, getMarketSnapshot, getTrades } from './market-engine.js';
import { createRithmicBridgeAdapter } from './adapters/rithmic-bridge.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb', strict: true }));
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });
const port = Number(process.env.PORT || 8788);
const ingestToken = process.env.NORTHSTAR_INGEST_TOKEN || '';
const distributionApproved = process.env.PUBLIC_LIVE_DISTRIBUTION_APPROVED === 'true';
const startedAt = Date.now();
let rithmicStatus = { configured: false, connected: false, received: 0, accepted: 0, lastError: null };

function safeEqual(a, b) {
  if (!a || !b) return false;
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

function isIngestAuthorized(req) {
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\\s+/i, '');
  return Boolean(ingestToken) && (safeEqual(bearer, ingestToken) || safeEqual(req.headers['x-api-key'], ingestToken));
}

function status() {
  const metrics = getEngineMetrics();
  return {
    service: 'Northstar Live Data Engine',
    version: '2.1.0',
    state: metrics.lastEventAt && Date.now() - metrics.lastEventAt < 30000 ? 'receiving' : 'waiting',
    dataSource: rithmicStatus.connected ? 'Rithmic R|Protocol bridge' : 'none connected until an authorized provider is configured',
    ingestConfigured: Boolean(ingestToken),
    publicDistributionApproved: distributionApproved,
    publicStreaming: distributionApproved,
    websocketClients: wss.clients.size,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    metrics,
    adapters: {
      normalizedHttp: 'ready',
      rithmicBridge: rithmicStatus,
      cmePubSub: 'not connected; CME schema/entitlement required',
      tradingViewExtraction: 'not supported'
    }
  };
}

function publish(event) {
  if (!distributionApproved) return false;
  const message = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    if (client.symbol && client.symbol !== event.symbol) continue;
    client.send(message);
  }
  return true;
}

function acceptProviderEvent(event) {
  const result = ingestMarketEvent(event, { source: 'rithmic-rprotocol', mode: 'provider' });
  if (!result.ok || result.duplicate) return result;
  publish(result.event);
  return result;
}

function requirePublicDistribution(res) {
  if (distributionApproved) return true;
  res.status(403).json({
    ok: false,
    error: 'Public market-data distribution is disabled',
    reason: 'Set PUBLIC_LIVE_DISTRIBUTION_APPROVED=true only after the upstream provider authorizes this audience and use.'
  });
  return false;
}

app.get('/health', (_req, res) => res.json({ ok: true, service: 'Northstar Live Data Engine', version: '2.1.0' }));
app.get('/api/status', (_req, res) => res.json(status()));

app.post('/api/ingest/event', (req, res) => {
  if (!isIngestAuthorized(req)) {
    return res.status(401).json({ ok: false, error: 'Missing or invalid ingest credential' });
  }
  const result = acceptProviderEvent(req.body);
  if (!result.ok) return res.status(422).json(result);
  if (result.duplicate) return res.status(200).json({ ok: true, duplicate: true });
  return res.status(202).json({
    ok: true, accepted: true, eventId: result.event.id,
    symbol: result.event.symbol, eventType: result.event.type,
    publicBroadcast: distributionApproved
  });
});

app.get('/api/market/:symbol', (req, res) => {
  if (!requirePublicDistribution(res)) return;
  const snapshot = getMarketSnapshot(req.params.symbol);
  if (!snapshot) return res.status(404).json({ ok: false, error: 'Symbol must be NQ or MNQ' });
  res.json(snapshot);
});

app.get('/api/candles/:symbol', (req, res) => {
  if (!requirePublicDistribution(res)) return;
  const interval = String(req.query.interval || '1m');
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '500', 10) || 500, 1), 2000);
  const result = getCandles(req.params.symbol, interval, limit);
  if (result === null) return res.status(400).json({ ok: false, error: 'Use symbol NQ/MNQ and interval 1m, 5m, or 15m' });
  res.json({ symbol: req.params.symbol.toUpperCase(), interval, count: result.length, candles: result });
});

app.get('/api/replay/:symbol', (req, res) => {
  if (!requirePublicDistribution(res)) return;
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '500', 10) || 500, 1), 5000);
  const result = getTrades(req.params.symbol, limit);
  if (!['NQ', 'MNQ'].includes(req.params.symbol.toUpperCase())) return res.status(404).json({ ok: false, error: 'Symbol must be NQ or MNQ' });
  res.json({ symbol: req.params.symbol.toUpperCase(), count: result.length, trades: result });
});

wss.on('connection', (socket, request) => {
  const url = new URL(request.url, 'http://localhost');
  const symbol = String(url.searchParams.get('symbol') || '').toUpperCase();
  socket.symbol = ['NQ', 'MNQ'].includes(symbol) ? symbol : null;
  socket.send(JSON.stringify({ type: 'status', ...status() }));
  if (!distributionApproved) {
    socket.send(JSON.stringify({
      type: 'notice', code: 'DISTRIBUTION_NOT_APPROVED',
      message: 'Market events are not broadcast to public WebSocket clients until the upstream provider authorizes this audience.'
    }));
  }
});

const rithmicBridgeAdapter = createRithmicBridgeAdapter({
  httpUrl: process.env.NORTHSTAR_RITHMIC_BRIDGE_HTTP || '',
  wsUrl: process.env.NORTHSTAR_RITHMIC_BRIDGE_WS || '',
  onEvent: acceptProviderEvent,
  onStatus: (next) => { rithmicStatus = next; }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Northstar Live Data Engine v2.1.0 listening on ${port}`);
  if (!ingestToken) console.warn('NORTHSTAR_INGEST_TOKEN is not configured; HTTP ingestion is disabled.');
  if (!distributionApproved) console.warn('Public market-data distribution is disabled pending provider authorization.');
  if (process.env.NORTHSTAR_RITHMIC_BRIDGE_HTTP && process.env.NORTHSTAR_RITHMIC_BRIDGE_WS) {
    console.log('Rithmic bridge adapter configured; connecting to the private bridge.');
    rithmicBridgeAdapter.start();
  } else {
    console.log('Rithmic bridge adapter idle; no bridge URL configured.');
  }
});

function shutdown() {
  rithmicBridgeAdapter.stop();
  for (const client of wss.clients) client.close(1001, 'Service shutting down');
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
