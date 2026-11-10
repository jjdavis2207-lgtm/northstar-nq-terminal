import WebSocket from 'ws';

const SYMBOLS = ['NQ', 'MNQ'];

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeRithmicQuote(message) {
  if (!message || message.type !== 'quote' || !message.data) return [];
  const q = message.data;
  const raw = q.raw || {};
  const symbolText = String(q.symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const symbol = symbolText.startsWith('MNQ') ? 'MNQ' : symbolText.startsWith('NQ') ? 'NQ' : null;
  if (!symbol || !SYMBOLS.includes(symbol)) return [];

  const events = [];
  const rawTime = finite(raw.ssboe);
  const timestamp = rawTime ? rawTime * 1000 : (Date.parse(q.updatedAt || q.lastTradeTime) || Date.now());

  // The upstream Rithmic bridge marks template 150 as a last-trade update.
  // Do not infer trades from quote changes: only actual last-trade messages count.
  if (Number(raw.templateId) === 150) {
    const price = finite(raw.tradePrice ?? q.lastPrice);
    const quantity = finite(raw.tradeSize ?? q.lastSize);
    if (price !== null && quantity !== null && price > 0 && quantity > 0) {
      events.push({
        type: 'trade', symbol, timestamp, price, quantity,
        side: 'unknown', source: 'rithmic-rprotocol'
      });
    }
  }

  const bid = finite(q.bidPrice);
  const ask = finite(q.askPrice);
  if (bid !== null && ask !== null && bid > 0 && ask > 0 && bid <= ask) {
    events.push({
      type: 'quote', symbol, timestamp, bid, ask,
      bidSize: finite(q.bidSize), askSize: finite(q.askSize),
      source: 'rithmic-rprotocol'
    });
  }
  return events;
}

export function createRithmicBridgeAdapter({ httpUrl, wsUrl, onEvent, onStatus = () => {} }) {
  let socket = null;
  let stopped = true;
  let retryTimer = null;
  let retryMs = 1000;
  let connected = false;
  let lastError = null;
  let received = 0;
  let accepted = 0;

  const report = () => onStatus({
    configured: Boolean(httpUrl && wsUrl), connected, received, accepted, lastError
  });

  async function subscribeSymbols() {
    for (const symbol of SYMBOLS) {
      const response = await fetch(new URL('/api/subscribe', httpUrl), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ symbol: `CME:${symbol}`, exchange: 'CME' }),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error(`Rithmic bridge subscribe failed for ${symbol}: HTTP ${response.status}`);
    }
  }

  function scheduleReconnect() {
    if (stopped || retryTimer) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      connect();
    }, retryMs);
    retryMs = Math.min(retryMs * 2, 30000);
  }

  async function connect() {
    if (stopped) return;
    try {
      await subscribeSymbols();
      socket = new WebSocket(wsUrl);
      socket.on('open', () => {
        connected = true;
        lastError = null;
        retryMs = 1000;
        report();
      });
      socket.on('message', (buffer) => {
        received += 1;
        try {
          const message = JSON.parse(buffer.toString());
          for (const event of normalizeRithmicQuote(message)) {
            const result = onEvent(event);
            if (result && result.ok) accepted += 1;
          }
        } catch (error) {
          lastError = error.message;
        }
        report();
      });
      socket.on('error', (error) => {
        lastError = error.message;
        report();
      });
      socket.on('close', () => {
        connected = false;
        socket = null;
        report();
        scheduleReconnect();
      });
    } catch (error) {
      lastError = error.message;
      connected = false;
      report();
      scheduleReconnect();
    }
  }

  return {
    start() {
      if (!httpUrl || !wsUrl || !stopped) return;
      stopped = false;
      connect();
      report();
    },
    stop() {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
      if (socket) socket.close(1000, 'Northstar adapter stopped');
      socket = null;
      connected = false;
      report();
    },
    status: () => ({ configured: Boolean(httpUrl && wsUrl), connected, received, accepted, lastError })
  };
}
