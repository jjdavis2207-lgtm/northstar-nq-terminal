import { useEffect, useMemo, useState } from 'react';

type Trade = { kind: 'trade'; symbol: string; timestamp: number; price: number; size: number; aggressor: 'buy' | 'sell' | 'unknown' };
type Book = { kind: 'book'; symbol: string; timestamp: number; bids: {price:number;size:number}[]; asks: {price:number;size:number}[] };
type Event = Trade | Book | { kind: string; symbol: string; timestamp: number };
type Cell = { price: number; bid: number; ask: number };

const tickSize = 0.25;
const priceKey = (price: number) => Math.round(price / tickSize) * tickSize;

export default function DeepFlow({ symbol }: { symbol: 'NQ' | 'MNQ' }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [book, setBook] = useState<Book | null>(null);
  const [status, setStatus] = useState('Connecting to Northstar order-flow stream…');
  const [lastTrade, setLastTrade] = useState<Trade | null>(null);

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;
    let retry: number | undefined;
    let delay = 1000;

    const load = async () => {
      try {
        const response = await fetch(`/api/orderflow/history?symbol=${symbol}`);
        if (!response.ok) throw new Error('history unavailable');
        const payload = await response.json();
        if (!cancelled && Array.isArray(payload.events)) {
          const trades = payload.events.filter((item: Event) => item.kind === 'trade').slice(-1500) as Trade[];
          setEvents(trades);
          if (trades.length) setLastTrade(trades[trades.length - 1]);
          const latestBook = [...payload.events].reverse().find((item: Event) => item.kind === 'book') as Book | undefined;
          if (latestBook) setBook(latestBook);
        }
      } catch { if (!cancelled) setStatus('Waiting for authorized CME order-flow feed'); }
    };

    const connect = () => {
      if (cancelled) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(`${protocol}//${window.location.host}/ws/market-data?symbol=${symbol}&timeframe=1m`);
      socket.onopen = () => { delay = 1000; setStatus('Connected · waiting for CME trades and depth'); void load(); };
      socket.onmessage = event => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'status') { setStatus(message.message || message.status); return; }
          if (message.type !== 'orderflow' || message.symbol !== symbol) return;
          if (message.kind === 'trade') {
            const trade = message as Trade;
            setLastTrade(trade);
            setEvents(current => [...current, trade].slice(-1500));
            setStatus('Live CME order flow');
          } else if (message.kind === 'book') {
            setBook(message as Book);
            setStatus('Live CME market depth');
          }
        } catch { setStatus('Received an invalid order-flow message'); }
      };
      socket.onclose = () => {
        if (cancelled) return;
        setStatus('Order-flow stream disconnected · reconnecting');
        retry = window.setTimeout(connect, delay);
        delay = Math.min(delay * 2, 15000);
      };
      socket.onerror = () => setStatus('Order-flow connection error · reconnecting');
    };

    connect();
    return () => { cancelled = true; if (retry) window.clearTimeout(retry); socket?.close(); };
  }, [symbol]);

  const footprint = useMemo(() => {
    const minute = Math.floor(Date.now() / 60000) * 60000;
    const rows = new Map<number, Cell>();
    for (const event of events) {
      if (event.kind !== 'trade') continue;
      const trade = event as Trade;
      if (trade.timestamp < minute - 5 * 60000) continue;
      const price = priceKey(trade.price);
      const cell = rows.get(price) || { price, bid: 0, ask: 0 };
      if (trade.aggressor === 'buy') cell.ask += trade.size;
      if (trade.aggressor === 'sell') cell.bid += trade.size;
      rows.set(price, cell);
    }
    return [...rows.values()].sort((a,b) => b.price - a.price).slice(0, 24);
  }, [events]);

  const delta = events.reduce((sum, event) => {
    if (event.kind !== 'trade') return sum;
    const trade = event as Trade;
    return sum + (trade.aggressor === 'buy' ? trade.size : trade.aggressor === 'sell' ? -trade.size : 0);
  }, 0);
  const bidTotal = book?.bids.reduce((sum, level) => sum + level.size, 0) || 0;
  const askTotal = book?.asks.reduce((sum, level) => sum + level.size, 0) || 0;

  return (
    <div className="deepflow-workspace">
      <div className="deepflow-title">
        <div><div className="eyebrow">NORTHSTAR / ORDER FLOW</div><h1>Deep Flow</h1><p>Live footprint, bid/ask delta and ten-level market depth for {symbol}</p></div>
        <div className="deepflow-connection"><span className={status.startsWith('Live') ? 'live-dot' : 'waiting-dot'} />{status}</div>
      </div>
      <div className="deepflow-metrics">
        <div><small>RECENT TAPE DELTA · LAST 1,500 TRADES</small><b className={delta >= 0 ? 'positive' : 'negative'}>{delta > 0 ? '+' : ''}{delta}</b></div>
        <div><small>TOP 10 BID SIZE</small><b>{bidTotal.toLocaleString()}</b></div>
        <div><small>TOP 10 ASK SIZE</small><b>{askTotal.toLocaleString()}</b></div>
        <div><small>LAST TRADE</small><b>{lastTrade ? lastTrade.price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'}</b></div>
      </div>
      <div className="deepflow-grid">
        <section className="deepflow-panel">
          <header><b>FOOTPRINT · BID × ASK</b><span>0.25 price increments · recent 5 minutes</span></header>
          <div className="footprint-table">
            <div className="footprint-row footprint-header"><span>BID VOL</span><span>PRICE</span><span>ASK VOL</span><span>DELTA</span></div>
            {footprint.length ? footprint.map(cell => {
              const rowDelta = cell.ask - cell.bid;
              return <div className="footprint-row" key={cell.price}>
                <span className="bid-volume">{cell.bid || '·'}</span>
                <b>{cell.price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</b>
                <span className="ask-volume">{cell.ask || '·'}</span>
                <span className={rowDelta >= 0 ? 'positive' : 'negative'}>{rowDelta > 0 ? '+' : ''}{rowDelta || '·'}</span>
              </div>;
            }) : <div className="deepflow-empty">Waiting for real trade prints. No sample prices are shown.</div>}
          </div>
        </section>
        <section className="deepflow-panel">
          <header><b>LEVEL II · MARKET DEPTH</b><span>Top 10 aggregated levels</span></header>
          <div className="depth-table">
            <div className="depth-row depth-header"><span>BID SIZE</span><span>BID</span><span>ASK</span><span>ASK SIZE</span></div>
            {Array.from({length:10},(_,i)=>({bid:book?.bids[i],ask:book?.asks[i]})).map((row,i)=><div className="depth-row" key={i}>
              <span className="bid-volume">{row.bid?.size ?? '—'}</span>
              <b>{row.bid ? row.bid.price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'}</b>
              <b>{row.ask ? row.ask.price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'}</b>
              <span className="ask-volume">{row.ask?.size ?? '—'}</span>
            </div>)}
          </div>
          <div className="deepflow-note">Depth is only populated when your licensed feed includes MBP-10 data. Bid/ask trade delta is based on the exchange aggressor side.</div>
        </section>
      </div>
    </div>
  );
}
