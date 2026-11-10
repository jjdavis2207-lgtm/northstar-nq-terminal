const SYMBOLS = new Set(['NQ', 'MNQ']);
const INTERVALS = new Set(['1m', '5m', '15m']);
const MAX_TRADES = 50000;
const MAX_CANDLES_PER_INTERVAL = 5000;
const TICK_SIZE = 0.25;

const trades = { NQ: [], MNQ: [] };
const quotes = { NQ: null, MNQ: null };
const candles = {
  NQ: { '1m': [], '5m': [], '15m': [] },
  MNQ: { '1m': [], '5m': [], '15m': [] }
};
const seenIds = new Set();
const seenOrder = [];
let accepted = 0;
let rejected = 0;
let lastEventAt = null;
let lastRejectReason = null;

function number(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeSymbol(value) {
  const symbol = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Provider symbols may be exchange-prefixed, e.g. CME_MINI:MNQH6.
  if (symbol.includes('MNQ')) return 'MNQ';
  if (symbol.includes('NQ')) return 'NQ';
  return null;
}

function normalizeTimestamp(value) {
  if (value === undefined || value === null || value === '') return Date.now();
  const parsed = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  // Accept Unix seconds or milliseconds.
  return parsed < 100000000000 ? Math.round(parsed * 1000) : Math.round(parsed);
}

function rememberId(id) {
  if (!id) return false;
  const key = String(id).slice(0, 160);
  if (seenIds.has(key)) return true;
  seenIds.add(key);
  seenOrder.push(key);
  if (seenOrder.length > 100000) seenIds.delete(seenOrder.shift());
  return false;
}

function candleStart(timestamp, intervalMs) {
  return Math.floor(timestamp / intervalMs) * intervalMs;
}

function updateCandles(trade) {
  for (const [interval, intervalMs] of [['1m', 60000], ['5m', 300000], ['15m', 900000]]) {
    const bucket = candleStart(trade.timestamp, intervalMs);
    const list = candles[trade.symbol][interval];
    let candle = list[list.length - 1];
    if (!candle || candle.time !== bucket) {
      candle = {
        symbol: trade.symbol, interval, time: bucket,
        open: trade.price, high: trade.price, low: trade.price,
        close: trade.price, volume: 0, trades: 0
      };
      list.push(candle);
      if (list.length > MAX_CANDLES_PER_INTERVAL) list.shift();
    }
    candle.high = Math.max(candle.high, trade.price);
    candle.low = Math.min(candle.low, trade.price);
    candle.close = trade.price;
    candle.volume += trade.quantity;
    candle.trades += 1;
  }
}

function reject(reason) {
  rejected += 1;
  lastRejectReason = reason;
  return { ok: false, error: reason };
}

export function ingestMarketEvent(input, options = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return reject('Expected a market event object');
  const symbol = normalizeSymbol(input.symbol || input.ticker || input.instrument);
  if (!symbol || !SYMBOLS.has(symbol)) return reject('Unsupported symbol; use NQ or MNQ');
  const type = String(input.type || input.eventType || 'trade').toLowerCase();
  const source = String(input.source || options.source || '').trim().slice(0, 100);
  if (!source) return reject('A named data source is required');
  const timestamp = normalizeTimestamp(input.timestamp ?? input.time);
  if (timestamp === null || timestamp > Date.now() + 60000 || timestamp < 0) return reject('Invalid event timestamp');

  if (type === 'quote') {
    const bid = number(input.bid);
    const ask = number(input.ask);
    const bidSize = number(input.bidSize ?? input.bid_size);
    const askSize = number(input.askSize ?? input.ask_size);
    if (bid === null || ask === null || bid <= 0 || ask <= 0 || bid > ask) return reject('Quote requires valid bid and ask prices with bid <= ask');
    const quote = {
      id: input.id ? String(input.id).slice(0, 160) : null,
      type: 'market.quote', symbol, source, timestamp,
      bid, ask, bidSize, askSize, spread: Number((ask - bid).toFixed(8)),
      mode: options.mode || 'provider'
    };
    quotes[symbol] = quote;
    accepted += 1;
    lastEventAt = Date.now();
    return { ok: true, event: quote, broadcast: true };
  }

  if (type !== 'trade') return reject('Event type must be trade or quote');
  const price = number(input.price);
  const quantity = number(input.quantity ?? input.size ?? input.volume ?? 1);
  if (price === null || price <= 0) return reject('Trade requires a positive price');
  if (quantity === null || quantity <= 0) return reject('Trade quantity must be positive');
  if (Math.abs(price / TICK_SIZE - Math.round(price / TICK_SIZE)) > 1e-7) return reject('NQ/MNQ price must align to the 0.25-point tick size');
  if (rememberId(input.id)) return { ok: true, duplicate: true, event: null, broadcast: false };

  const trade = {
    id: input.id ? String(input.id).slice(0, 160) : null,
    type: 'market.trade', symbol, source, timestamp, price, quantity,
    side: ['buy', 'sell', 'unknown'].includes(String(input.side || 'unknown').toLowerCase())
      ? String(input.side || 'unknown').toLowerCase() : 'unknown',
    mode: options.mode || 'provider'
  };
  trades[symbol].push(trade);
  if (trades[symbol].length > MAX_TRADES) trades[symbol].shift();
  updateCandles(trade);
  accepted += 1;
  lastEventAt = Date.now();
  return { ok: true, event: trade, broadcast: true };
}

export function getMarketSnapshot(symbolInput) {
  const symbol = normalizeSymbol(symbolInput);
  if (!symbol) return null;
  return {
    symbol,
    latestTrade: trades[symbol].at(-1) || null,
    latestQuote: quotes[symbol],
    tradeCount: trades[symbol].length,
    candles: Object.fromEntries(Object.entries(candles[symbol]).map(([interval, values]) => [interval, values.at(-1) || null]))
  };
}

export function getTrades(symbolInput, limit = 500) {
  const symbol = normalizeSymbol(symbolInput);
  if (!symbol) return [];
  return trades[symbol].slice(-Math.min(Math.max(Number(limit) || 500, 1), 5000));
}

export function getCandles(symbolInput, interval = '1m', limit = 500) {
  const symbol = normalizeSymbol(symbolInput);
  if (!symbol || !INTERVALS.has(interval)) return null;
  return candles[symbol][interval].slice(-Math.min(Math.max(Number(limit) || 500, 1), 2000));
}

export function getEngineMetrics() {
  return {
    accepted, rejected, lastEventAt, lastRejectReason,
    retainedTrades: { NQ: trades.NQ.length, MNQ: trades.MNQ.length },
    retainedCandles: Object.fromEntries(['NQ', 'MNQ'].map(s => [s, Object.fromEntries(Object.entries(candles[s]).map(([i, rows]) => [i, rows.length]))]))
  };
}
