import { useEffect, useMemo, useState } from 'react';

type Trade = { kind: 'trade'; symbol: string; timestamp: number; price: number; size: number; aggressor: 'buy' | 'sell' | 'unknown' };
type Book = { kind: 'book'; symbol: string; timestamp: number; bids: {price:number;size:number}[]; asks: {price:number;size:number}[] };
type Event = Trade | Book | { kind: string; symbol: string; timestamp: number };
type Cell = { price: number; bid: number; ask: number; total: number; delta: number };
const tickSize = 0.25;
const priceKey = (price: number) => Math.round(price / tickSize) * tickSize;
const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
const priceFmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DeepFlow({ symbol }: { symbol: 'NQ' | 'MNQ' }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [book, setBook] = useState<Book | null>(null);
  const [status, setStatus] = useState('Connecting to Northstar order-flow stream…');
  const [lastTrade, setLastTrade] = useState<Trade | null>(null);
  const [largeTradeMin, setLargeTradeMin] = useState(20);
  const [showOnlyImbalances, setShowOnlyImbalances] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;
    let retry: number | undefined;
    let delay = 1000;
    const load = async () => {
      try {
        const response = await fetch(`/api/orderflow/history?symbol=${symbol}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('history unavailable');
        const payload = await response.json();
        if (!cancelled && Array.isArray(payload.events)) {
          const items = payload.events.slice(-2000) as Event[];
          setEvents(items);
          const trades = items.filter((item): item is Trade => item.kind === 'trade');
          if (trades.length) setLastTrade(trades[trades.length - 1]);
          const latestBook = [...items].reverse().find((item): item is Book => item.kind === 'book');
          if (latestBook) setBook(latestBook);
          setStatus(payload.connected ? 'Feed recently active · history loaded' : 'History loaded · waiting for new feed updates');
        }
      } catch { if (!cancelled) setStatus('Waiting for authorized CME order-flow feed'); }
    };
    const connect = () => {
      if (cancelled) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(`${protocol}//${window.location.host}/ws/market-data?symbol=${symbol}&timeframe=1m`);
      socket.onopen = () => { delay = 1000; setStatus('Connected to Northstar · awaiting order-flow events'); void load(); };
      socket.onmessage = event => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'status') {
            if (!String(message.message || '').toLowerCase().includes('active')) setStatus(message.message || message.status);
            return;
          }
          if (message.type !== 'orderflow' || message.symbol !== symbol) return;
          if (message.kind === 'trade') {
            const trade = message as Trade;
            setLastTrade(trade);
            setEvents(current => [...current, trade].slice(-2000));
            setStatus('Receiving live order-flow trades');
          } else if (message.kind === 'book') {
            setBook(message as Book);
            setEvents(current => [...current, message as Book].slice(-2000));
            setStatus('Receiving live market depth');
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

  const trades = useMemo(() => events.filter((event): event is Trade => event.kind === 'trade'), [events]);
  const stats = useMemo(() => {
    const now = Date.now();
    const recent = trades.filter(t => t.timestamp >= now - 5 * 60_000);
    const rows = new Map<number, Cell>();
    let delta = 0, totalVolume = 0, priceVolume = 0;
    for (const trade of recent) {
      const price = priceKey(trade.price);
      const cell = rows.get(price) || { price, bid: 0, ask: 0, total: 0, delta: 0 };
      if (trade.aggressor === 'buy') { cell.ask += trade.size; cell.delta += trade.size; delta += trade.size; }
      if (trade.aggressor === 'sell') { cell.bid += trade.size; cell.delta -= trade.size; delta -= trade.size; }
      cell.total += trade.size;
      rows.set(price, cell);
      totalVolume += trade.size;
      priceVolume += trade.price * trade.size;
    }
    const sorted = [...rows.values()].sort((a,b) => b.price - a.price);
    const lastMinute = trades.filter(t => t.timestamp >= now - 60_000);
    const tenSeconds = trades.filter(t => t.timestamp >= now - 10_000);
    const buyVolume = recent.filter(t => t.aggressor === 'buy').reduce((s,t) => s+t.size, 0);
    const sellVolume = recent.filter(t => t.aggressor === 'sell').reduce((s,t) => s+t.size, 0);
    const large = recent.filter(t => t.size >= largeTradeMin).slice().reverse().slice(0, 20);
    const maxVol = Math.max(1, ...sorted.map(r => r.total));
    const maxDepth = Math.max(1, ...(book?.bids || []).map(x=>x.size), ...(book?.asks || []).map(x=>x.size));
    const imbalances = sorted.filter(r => (r.ask >= 3 * Math.max(1, r.bid) && r.ask >= 10) || (r.bid >= 3 * Math.max(1, r.ask) && r.bid >= 10));
    return {
      rows: showOnlyImbalances ? imbalances : sorted,
      delta, totalVolume, vwap: totalVolume ? priceVolume / totalVolume : null,
      buyVolume, sellVolume, cvd: trades.reduce((s,t)=>s+(t.aggressor==='buy'?t.size:t.aggressor==='sell'?-t.size:0),0),
      tapePerSecond: tenSeconds.length / 10, lastMinuteVolume: lastMinute.reduce((s,t)=>s+t.size,0),
      large, maxVol, maxDepth, imbalanceCount: imbalances.length,
      bidTotal: book?.bids.reduce((s,x)=>s+x.size,0) || 0,
      askTotal: book?.asks.reduce((s,x)=>s+x.size,0) || 0
    };
  }, [trades, book, largeTradeMin, showOnlyImbalances]);

  const pressure = stats.delta > 0 ? 'Aggressive buyers leading' : stats.delta < 0 ? 'Aggressive sellers leading' : 'No directional delta';
  const feedIsLive = status.toLowerCase().includes('receiving live');

  return (
    <div className="deepflow-workspace">
      <div className="deepflow-title">
        <div><div className="eyebrow">NORTHSTAR / ORDER FLOW</div><h1>Deep Flow</h1><p>Footprint, delta, volume profile, large prints and market depth · {symbol}</p></div>
        <div className="deepflow-connection"><span className={feedIsLive ? 'live-dot' : 'waiting-dot'} />{status}</div>
      </div>
      <div className="deepflow-metrics">
        <div><small>5-MINUTE DELTA</small><b className={stats.delta >= 0 ? 'positive' : 'negative'}>{stats.delta > 0 ? '+' : ''}{fmt(stats.delta)}</b></div>
        <div><small>CUMULATIVE DELTA · LOADED TAPE</small><b className={stats.cvd >= 0 ? 'positive' : 'negative'}>{stats.cvd > 0 ? '+' : ''}{fmt(stats.cvd)}</b></div>
        <div><small>5-MINUTE VOLUME</small><b>{fmt(stats.totalVolume)}</b></div>
        <div><small>TRADE SPEED · LAST 10 SEC</small><b>{fmt(stats.tapePerSecond)} <small>prints/sec</small></b></div>
      </div>
      <div className="deepflow-metrics deepflow-metrics-secondary">
        <div><small>TRADE VWAP · LOADED 5 MIN</small><b>{stats.vwap ? priceFmt(stats.vwap) : '—'}</b></div>
        <div><small>BUY / ASK VOLUME</small><b className="positive">{fmt(stats.buyVolume)}</b></div>
        <div><small>SELL / BID VOLUME</small><b className="negative">{fmt(stats.sellVolume)}</b></div>
        <div><small>IMBALANCE PRICE LEVELS</small><b>{stats.imbalanceCount}</b></div>
      </div>
      <div className="deepflow-grid">
        <section className="deepflow-panel">
          <header><b>FOOTPRINT · BID × ASK</b><span>5-minute rolling window · 0.25 tick rows</span></header>
          <div className="deepflow-controls">
            <label><input type="checkbox" checked={showOnlyImbalances} onChange={e=>setShowOnlyImbalances(e.target.checked)} /> Show imbalances only (3:1)</label>
            <span>{pressure}</span>
          </div>
          <div className="footprint-table">
            <div className="footprint-row footprint-header"><span>BID VOL</span><span>PRICE</span><span>ASK VOL</span><span>DELTA</span></div>
            {stats.rows.length ? stats.rows.slice(0, 36).map(cell => {
              const imbalance = cell.ask >= 3 * Math.max(1,cell.bid) && cell.ask >= 10 ? 'ask-imbalance' : cell.bid >= 3 * Math.max(1,cell.ask) && cell.bid >= 10 ? 'bid-imbalance' : '';
              return <div className={`footprint-row ${imbalance}`} key={cell.price}>
                <span className="bid-volume">{cell.bid || '·'}</span>
                <b>{priceFmt(cell.price)}</b>
                <span className="ask-volume">{cell.ask || '·'}</span>
                <span className={cell.delta >= 0 ? 'positive' : 'negative'}>{cell.delta > 0 ? '+' : ''}{cell.delta || '·'}</span>
              </div>;
            }) : <div className="deepflow-empty">Waiting for real trade prints. No sample prices are shown.</div>}
          </div>
          <div className="deepflow-note">Imbalance marks compare ask and bid volume at the same price (3:1 threshold); this is a basic imbalance filter, not a proprietary diagonal algorithm.</div>
        </section>
        <section className="deepflow-panel">
          <header><b>VOLUME PROFILE · LAST 5 MIN</b><span>Executed volume by price</span></header>
          <div className="profile-list">
            {stats.rows.slice().sort((a,b)=>b.total-a.total).slice(0,18).map(row=><div className="profile-row" key={row.price}>
              <span>{priceFmt(row.price)}</span><div className="profile-track"><i style={{width:`${row.total / stats.maxVol * 100}%`}} /></div><b>{fmt(row.total)}</b>
            </div>)}
            {!stats.totalVolume && <div className="deepflow-empty">Volume profile appears when trade prints arrive.</div>}
          </div>
          <div className="deepflow-note">Approximate rolling volume-at-price from received executions. Not a full-session or historical profile.</div>
        </section>
      </div>
      <div className="deepflow-grid deepflow-grid-bottom">
        <section className="deepflow-panel">
          <header><b>LEVEL II · DOM LADDER</b><span>Top 10 displayed levels</span></header>
          <div className="depth-table">
            <div className="depth-row depth-header"><span>BID SIZE</span><span>BID</span><span>ASK</span><span>ASK SIZE</span></div>
            {Array.from({length:10},(_,i)=>({bid:book?.bids[i],ask:book?.asks[i]})).map((row,i)=><div className="depth-row" key={i}>
              <span className="bid-volume">{row.bid ? fmt(row.bid.size) : '—'}</span>
              <b>{row.bid ? priceFmt(row.bid.price) : '—'}</b>
              <b>{row.ask ? priceFmt(row.ask.price) : '—'}</b>
              <span className="ask-volume">{row.ask ? fmt(row.ask.size) : '—'}</span>
            </div>)}
          </div>
          <div className="deepflow-depth-totals"><span>Bid depth <b className="positive">{fmt(stats.bidTotal)}</b></span><span>Ask depth <b className="negative">{fmt(stats.askTotal)}</b></span></div>
          <div className="deepflow-note">Requires a genuine Level 2 feed. Current ladder shows the latest received snapshot; no historical heatmap is inferred.</div>
        </section>
        <section className="deepflow-panel">
          <header><b>BIG TRADES · TIME & SALES</b><span>Recent prints in loaded window</span></header>
          <div className="deepflow-controls"><label>Minimum size <select value={largeTradeMin} onChange={e=>setLargeTradeMin(Number(e.target.value))}><option value={5}>5+</option><option value={10}>10+</option><option value={20}>20+</option><option value={50}>50+</option><option value={100}>100+</option></select> contracts</label><span>{stats.large.length} shown</span></div>
          <div className="large-trades">
            <div className="large-trade-row large-trade-header"><span>TIME</span><span>SIDE</span><span>PRICE</span><span>SIZE</span></div>
            {stats.large.map((trade,i)=><div className="large-trade-row" key={`${trade.timestamp}-${i}`}><span>{new Date(trade.timestamp).toLocaleTimeString()}</span><b className={trade.aggressor==='buy'?'positive':trade.aggressor==='sell'?'negative':''}>{trade.aggressor.toUpperCase()}</b><span>{priceFmt(trade.price)}</span><b>{fmt(trade.size)}</b></div>)}
            {!stats.large.length && <div className="deepflow-empty">No prints meet this size filter yet.</div>}
          </div>
          <div className="deepflow-note">Large-print threshold is user-adjustable. Aggressor direction depends on the provider's trade-side classification.</div>
        </section>
      </div>
    </div>
  );
}
