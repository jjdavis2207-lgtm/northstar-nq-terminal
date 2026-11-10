import { useMemo, useState } from 'react';
import { Upload, Activity, BarChart3, TrendingUp, Target, Database } from 'lucide-react';

type Bar = { time: number; label: string; open: number; high: number; low: number; close: number; volume: number };
type Props = { page: string };

function ema(values: number[], period: number) {
  const k = 2 / (period + 1);
  return values.reduce<number[]>((out, value, index) => {
    out.push(index === 0 ? value : value * k + out[index - 1] * (1 - k));
    return out;
  }, []);
}

function parseCsv(text: string): Bar[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 3) throw new Error('CSV needs a header and at least two candle rows.');
  const headers = lines[0].split(',').map(value => value.trim().replace(/^"|"$/g, '').toLowerCase());
  const find = (...names: string[]) => headers.findIndex(header => names.includes(header));
  const indexes = {
    time: find('time', 'timestamp', 'date', 'datetime', 'bar time'),
    open: find('open', 'o'), high: find('high', 'h'), low: find('low', 'l'),
    close: find('close', 'c'), volume: find('volume', 'vol', 'v')
  };
  if (indexes.time < 0 || indexes.open < 0 || indexes.high < 0 || indexes.low < 0 || indexes.close < 0) {
    throw new Error('Required columns: time/date, open, high, low, close. Volume is optional.');
  }
  const result: Bar[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(',').map(value => value.trim().replace(/^"|"$/g, ''));
    const number = (index: number, fallback = 0) => index < 0 ? fallback : Number(cells[index]);
    const rawTime = cells[indexes.time];
    const numericTime = Number(rawTime);
    const time = Number.isFinite(numericTime) && rawTime !== '' 
      ? (numericTime > 1e12 ? numericTime : numericTime > 1e9 ? numericTime * 1000 : NaN)
      : Date.parse(rawTime);
    const open = number(indexes.open), high = number(indexes.high), low = number(indexes.low), close = number(indexes.close);
    const volume = Math.max(0, number(indexes.volume, 0));
    if (![time, open, high, low, close, volume].every(Number.isFinite) || time <= 0 || Math.min(open, high, low, close) <= 0 || high < Math.max(open, close, low) || low > Math.min(open, close, high)) continue;
    result.push({ time, label: new Date(time).toLocaleString(), open, high, low, close, volume });
  }
  if (result.length < 2) throw new Error('No valid OHLC rows found. Check the CSV column names and timestamp format.');
  return result.sort((a, b) => a.time - b.time);
}

export default function MarketLab({ page }: Props) {
  const [bars, setBars] = useState<Bar[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [replayIndex, setReplayIndex] = useState(0);
  const [fastPeriod, setFastPeriod] = useState(9);
  const [slowPeriod, setSlowPeriod] = useState(21);

  const analysis = useMemo(() => {
    if (!bars.length) return null;
    const closes = bars.map(bar => bar.close);
    const fast = ema(closes, fastPeriod);
    const slow = ema(closes, slowPeriod);
    const typicalVolume = bars.reduce((sum, bar) => sum + bar.volume, 0);
    const vwap = typicalVolume ? bars.reduce((sum, bar) => sum + ((bar.high + bar.low + bar.close) / 3) * bar.volume, 0) / typicalVolume : null;
    const pivotsHigh: number[] = [];
    const pivotsLow: number[] = [];
    for (let i = 2; i < bars.length - 2; i++) {
      if (bars[i].high > bars[i-1].high && bars[i].high > bars[i-2].high && bars[i].high > bars[i+1].high && bars[i].high > bars[i+2].high) pivotsHigh.push(i);
      if (bars[i].low < bars[i-1].low && bars[i].low < bars[i-2].low && bars[i].low < bars[i+1].low && bars[i].low < bars[i+2].low) pivotsLow.push(i);
    }
    const last = bars[bars.length - 1];
    const lastHigh = pivotsHigh.length ? bars[pivotsHigh[pivotsHigh.length - 1]].high : null;
    const lastLow = pivotsLow.length ? bars[pivotsLow[pivotsLow.length - 1]].low : null;
    const structure = lastHigh !== null && last.close > lastHigh ? 'Bullish break of structure'
      : lastLow !== null && last.close < lastLow ? 'Bearish break of structure'
      : 'No confirmed structure break';
    const profile = new Map<number, number>();
    for (const bar of bars) {
      const price = Math.round(((bar.high + bar.low + bar.close) / 3) / 0.25) * 0.25;
      profile.set(price, (profile.get(price) || 0) + bar.volume);
    }
    const volumeNodes = [...profile.entries()].sort((a,b) => b[1] - a[1]).slice(0, 12);
    let position = 0, entry = 0, trades = 0, wins = 0, points = 0, equity = 0, peak = 0, maxDrawdown = 0;
    for (let i = 1; i < bars.length; i++) {
      const priorFast = fast[i-1], priorSlow = slow[i-1];
      const signal = priorFast <= priorSlow && fast[i] > slow[i] ? 1 : priorFast >= priorSlow && fast[i] < slow[i] ? -1 : 0;
      if (signal && position !== signal) {
        if (position) {
          const pnl = (bars[i].close - entry) * position;
          points += pnl; equity += pnl; peak = Math.max(peak, equity); maxDrawdown = Math.max(maxDrawdown, peak - equity);
          trades++; if (pnl > 0) wins++;
        }
        position = signal; entry = bars[i].close;
      }
    }
    if (position) {
      const pnl = (last.close - entry) * position;
      points += pnl; equity += pnl; peak = Math.max(peak, equity); maxDrawdown = Math.max(maxDrawdown, peak - equity);
      trades++; if (pnl > 0) wins++;
    }
    const recentVolume = bars.slice(-20).reduce((sum, bar) => sum + bar.volume, 0) / Math.min(20, bars.length);
    const priorVolume = bars.slice(-40, -20).reduce((sum, bar) => sum + bar.volume, 0) / Math.max(1, Math.min(20, bars.length - 20));
    return {
      last, vwap, typicalVolume, structure, lastHigh, lastLow, volumeNodes,
      fast: fast[fast.length - 1], slow: slow[slow.length - 1],
      scanner: fast[fast.length - 1] > slow[slow.length - 1] ? 'Bullish EMA alignment' : 'Bearish EMA alignment',
      volumeSurge: priorVolume > 0 && recentVolume > priorVolume * 1.5,
      trades, wins, points, winRate: trades ? wins / trades * 100 : 0, maxDrawdown
    };
  }, [bars, fastPeriod, slowPeriod]);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      const parsed = parseCsv(await file.text());
      setBars(parsed); setFileName(file.name); setReplayIndex(0);
    } catch (err) {
      setBars([]); setFileName('');
      setError(err instanceof Error ? err.message : 'Unable to read CSV file.');
    }
  };

  const titles: Record<string, string> = {
    'Market Structure': 'Market Structure',
    'Volume Analysis': 'Volume Analysis',
    'Trade Scanner': 'Trade Scanner',
    'Strategy Lab': 'Strategy Lab',
    'Market Replay': 'Market Replay'
  };

  return (
    <div className="marketlab-page">
      <div className="module-hero">
        <div className="module-symbol"><Activity size={24} /></div>
        <div><div className="eyebrow">NORTHSTAR / OFFLINE MARKET TOOLS</div><h2>{titles[page] || page}</h2>
          <p>Analyze your own NQ/MNQ historical candles locally without a paid market-data subscription.</p></div>
      </div>
      <section className="marketlab-import">
        <div><b><Database size={16}/> Historical CSV data</b><p>Import an authorized OHLCV export. Required columns: time/date, open, high, low, close. Volume is optional. The file is processed in your browser and is not uploaded to Northstar.</p></div>
        <label className="marketlab-upload"><Upload size={15}/> Choose CSV<input type="file" accept=".csv,text/csv" onChange={event => void handleFile(event.target.files?.[0])}/></label>
        {fileName && <span className="marketlab-file">{fileName} · {bars.length.toLocaleString()} bars</span>}
      </section>
      {error && <div className="marketlab-error">{error}</div>}
      {!bars.length ? <div className="marketlab-empty"><BarChart3 size={28}/><b>Import historical NQ or MNQ candles to begin</b><span>No example prices are loaded. Upload your own CSV to calculate structure, volume, scanner conditions, and EMA backtests.</span></div> : <>
        <div className="marketlab-metrics">
          <div><small>LAST CLOSE</small><b>{analysis?.last.close.toLocaleString(undefined,{maximumFractionDigits:2})}</b></div>
          <div><small>BAR COUNT</small><b>{bars.length.toLocaleString()}</b></div>
          <div><small>VWAP · IMPORTED RANGE</small><b>{analysis?.vwap?.toLocaleString(undefined,{maximumFractionDigits:2}) || '—'}</b></div>
          <div><small>TOTAL VOLUME</small><b>{analysis?.typicalVolume.toLocaleString()}</b></div>
        </div>
        {page === 'Market Replay' ? <section className="marketlab-card">
          <h3>Historical replay · {bars[replayIndex]?.label}</h3>
          <input className="marketlab-range" type="range" min="0" max={bars.length - 1} value={replayIndex} onChange={event => setReplayIndex(Number(event.target.value))}/>
          <div className="marketlab-replay-values">{['Open','High','Low','Close','Volume'].map((key,i)=><div key={key}><small>{key}</small><b>{[bars[replayIndex].open,bars[replayIndex].high,bars[replayIndex].low,bars[replayIndex].close,bars[replayIndex].volume][i].toLocaleString()}</b></div>)}</div>
          <p className="marketlab-muted">Move the slider to step through imported bars in chronological order.</p>
        </section> : null}
        {page === 'Market Structure' ? <section className="marketlab-card">
          <h3>Structure analysis</h3><div className="marketlab-signal">{analysis?.structure}</div>
          <div className="marketlab-replay-values"><div><small>LAST CONFIRMED SWING HIGH</small><b>{analysis?.lastHigh?.toLocaleString() || 'Not found'}</b></div><div><small>LAST CONFIRMED SWING LOW</small><b>{analysis?.lastLow?.toLocaleString() || 'Not found'}</b></div><div><small>LAST BAR</small><b>{analysis?.last.label}</b></div></div>
          <p className="marketlab-muted">Swing points use two completed bars on each side. A break is confirmed only when the latest close moves beyond the most recent detected swing.</p>
        </section> : null}
        {page === 'Volume Analysis' ? <section className="marketlab-card">
          <h3>Volume by typical-price level · 0.25 increments</h3><div className="marketlab-volume-list">{analysis?.volumeNodes.map(([price,volume])=><div key={price}><span>{price.toLocaleString(undefined,{maximumFractionDigits:2})}</span><div><i style={{width: ((volume / (analysis?.volumeNodes[0]?.[1] || 1))*100)+'%'}}/></div><b>{volume.toLocaleString()}</b></div>)}</div>
          <p className="marketlab-muted">This is a candle-based approximation using each bar's typical price, not exchange-level bid/ask volume or a true footprint.</p>
        </section> : null}
        {page === 'Trade Scanner' ? <section className="marketlab-card">
          <h3>EMA and volume conditions</h3><div className="marketlab-signal">{analysis?.scanner}</div>
          <div className="marketlab-replay-values"><div><small>EMA {fastPeriod}</small><b>{analysis?.fast.toFixed(2)}</b></div><div><small>EMA {slowPeriod}</small><b>{analysis?.slow.toFixed(2)}</b></div><div><small>VOLUME</small><b>{analysis?.volumeSurge ? 'Above prior 20-bar average' : 'No 1.5× surge detected'}</b></div></div>
          <p className="marketlab-muted">Scanner conditions are calculated from imported candles only. They are analytical conditions, not trade recommendations or live alerts.</p>
        </section> : null}
        {page === 'Strategy Lab' ? <section className="marketlab-card">
          <h3>EMA crossover backtest · imported bars</h3><div className="marketlab-parameters"><label>Fast EMA<input type="number" min="2" max="100" value={fastPeriod} onChange={event => setFastPeriod(Math.max(2,Math.min(100,Number(event.target.value)||2)))}/></label><label>Slow EMA<input type="number" min="3" max="300" value={slowPeriod} onChange={event => setSlowPeriod(Math.max(3,Math.min(300,Number(event.target.value)||3)))}/></label></div>
          <div className="marketlab-replay-values"><div><small>COMPLETED TRADES</small><b>{analysis?.trades}</b></div><div><small>WIN RATE</small><b>{analysis?.winRate.toFixed(1)}%</b></div><div><small>NET POINTS</small><b>{analysis?.points.toFixed(2)}</b></div><div><small>MAX DRAWDOWN · POINTS</small><b>{analysis?.maxDrawdown.toFixed(2)}</b></div></div>
          <p className="marketlab-muted">Simple close-based EMA crossover simulation. One position at a time; excludes commissions, slippage, fills, and contract-dollar conversion. Historical results do not predict future performance.</p>
        </section> : null}
      </>}
    </div>
  );
}
