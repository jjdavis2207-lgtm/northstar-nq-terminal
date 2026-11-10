import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const PORT = Number(process.env.PORT || 8787);
const INGEST_TOKEN = process.env.NORTHSTAR_INGEST_TOKEN || '';
const STALE_AFTER_MS = 30_000;
const MAX_BARS_PER_SERIES = 5_000;
const validSymbols = new Set(['NQ', 'MNQ']);
const validTimeframes = new Set(['1m', '2m', '5m', '15m', '30m', '1H', '4H', '1D']);
const history = new Map();
let lastIngestAt = 0;
let providerName = process.env.NORTHSTAR_MARKET_DATA_PROVIDER || 'No provider configured';

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '256kb' }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) return next();

  const configured = (process.env.NORTHSTAR_ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  const isLocalDev = process.env.NODE_ENV !== 'production'
    && /^https?:\\/\\/(localhost|127\\.0\\.0\\.1)(:\\d+)?$/.test(origin);
  const sameOrigin = origin === `${req.protocol}://${req.get('host')}`;

  if (configured.length && !configured.includes(origin)) {
    return res.status(403).json({ error: 'Origin is not allowed' });
  }
  if (!configured.length && !sameOrigin && !isLocalDev) {
    return res.status(403).json({ error: 'Origin is not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function isFresh() {
  return lastIngestAt > 0 && Date.now() - lastIngestAt <= STALE_AFTER_MS;
}

function statusMessage() {
  return {
    type: 'status',
    status: isFresh() ? 'connected' : 'disconnected',
    message: isFresh()
      ? `Authorized feed active · ${providerName}`
      : 'Waiting for authorized market-data feed',
    provider: providerName,
    lastUpdate: lastIngestAt || null
  };
}

function validBar(bar) {
  if (!bar || !Number.isInteger(bar.time) || bar.time <= 0) return false;
  const values = [bar.open, bar.high, bar.low, bar.close];
  if (!values.every(value => Number.isFinite(value) && value > 0)) return false;
  if (bar.high < Math.max(bar.open, bar.close, bar.low)) return false;
  if (bar.low > Math.min(bar.open, bar.close, bar.high)) return false;
  return bar.volume === undefined || (Number.isFinite(bar.volume) && bar.volume >= 0);
}

function sendToMatchingClients(message) {
  const payload = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    if (client.symbol !== message.symbol || client.timeframe !== message.timeframe) continue;
    client.send(payload);
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ service: 'Northstar API', ok: true, timestamp: Date.now() });
});

app.get('/api/market-data/status', (_req, res) => {
  res.json({
    connected: isFresh(),
    provider: providerName,
    lastUpdate: lastIngestAt || null,
    message: isFresh() ? 'Authorized market-data feed active' : 'No authorized market-data feed is publishing'
  });
});

app.get('/api/market-data/history', (req, res) => {
  const symbol = String(req.query.symbol || 'MNQ').toUpperCase();
  const timeframe = String(req.query.timeframe || '5m');
  if (!validSymbols.has(symbol) || !validTimeframes.has(timeframe)) {
    return res.status(400).json({ error: 'Unsupported symbol or timeframe' });
  }
  const key = `${symbol}:${timeframe}`;
  res.setHeader('Cache-Control', 'no-store');
  res.json({ symbol, timeframe, bars: history.get(key) || [], connected: isFresh() });
});

app.post('/api/market-data/ingest', (req, res) => {
  if (!INGEST_TOKEN) {
    return res.status(503).json({ error: 'Market-data ingestion is disabled until NORTHSTAR_INGEST_TOKEN is configured' });
  }
  const authorization = req.get('authorization') || '';
  if (authorization !== `Bearer ${INGEST_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized market-data publisher' });
  }

  const { symbol, timeframe, bar, provider } = req.body || {};
  const normalizedSymbol = String(symbol || '').toUpperCase();
  const normalizedTimeframe = String(timeframe || '');
  if (!validSymbols.has(normalizedSymbol) || !validTimeframes.has(normalizedTimeframe) || !validBar(bar)) {
    return res.status(400).json({ error: 'Expected a valid NQ/MNQ OHLCV bar and supported timeframe' });
  }

  const key = `${normalizedSymbol}:${normalizedTimeframe}`;
  const bars = history.get(key) || [];
  const last = bars[bars.length - 1];
  if (last && bar.time < last.time) {
    return res.status(409).json({ error: 'Bar timestamp is older than the latest stored bar' });
  }
  if (last && bar.time === last.time) bars[bars.length - 1] = bar;
  else bars.push(bar);
  if (bars.length > MAX_BARS_PER_SERIES) bars.splice(0, bars.length - MAX_BARS_PER_SERIES);
  history.set(key, bars);

  if (typeof provider === 'string' && provider.trim()) {
    providerName = provider.trim().slice(0, 80);
  }
  lastIngestAt = Date.now();
  sendToMatchingClients({ type: 'bar', symbol: normalizedSymbol, timeframe: normalizedTimeframe, bar });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(statusMessage()));
  }
  res.status(202).json({ accepted: true, symbol: normalizedSymbol, timeframe: normalizedTimeframe, storedBars: bars.length });
});

app.use(express.static(path.resolve(__dirname, '../dist')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.resolve(__dirname, '../dist/index.html'));
});

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname !== '/ws/market-data') {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, ws => {
    const symbol = String(url.searchParams.get('symbol') || 'MNQ').toUpperCase();
    const timeframe = String(url.searchParams.get('timeframe') || '5m');
    if (!validSymbols.has(symbol) || !validTimeframes.has(timeframe)) {
      ws.close(1008, 'Unsupported symbol or timeframe');
      return;
    }
    ws.symbol = symbol;
    ws.timeframe = timeframe;
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', ws => {
  ws.send(JSON.stringify(statusMessage()));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Northstar API listening on port ${PORT}`);
});

function shutdown() {
  for (const client of wss.clients) client.close(1001, 'Server shutting down');
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
