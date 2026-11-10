import { useEffect, useRef, useState } from 'react';
import { CandlestickSeries, ColorType, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts';

type Bar = { time: number; open: number; high: number; low: number; close: number; volume?: number };
type FeedMessage = { type: 'bar'; symbol: string; timeframe: string; bar: Bar } | { type: 'status'; status: string; message?: string };

type Props = { symbol: string; timeframe: string };

export default function LiveMarketChart({ symbol, timeframe }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [status, setStatus] = useState('Connecting to Northstar data service…');
  const [lastUpdate, setLastUpdate] = useState('');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const chart = createChart(host, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: '#0b131e' }, textColor: '#8494a8' },
      grid: { vertLines: { color: '#1c2a3a' }, horzLines: { color: '#1c2a3a' } },
      rightPriceScale: { borderColor: '#263648' },
      timeScale: { borderColor: '#263648', timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 }
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#35bd91', downColor: '#e16d72',
      borderUpColor: '#35bd91', borderDownColor: '#e16d72',
      wickUpColor: '#35bd91', wickDownColor: '#e16d72'
    });
    chartRef.current = chart;
    seriesRef.current = series;

    let socket: WebSocket | null = null;
    let cancelled = false;
    const params = new URLSearchParams({ symbol, timeframe });
    fetch(`/api/market-data/history?${params.toString()}`)
      .then(async response => {
        if (!response.ok) throw new Error(`History endpoint returned ${response.status}`);
        return response.json();
      })
      .then(payload => {
        if (cancelled) return;
        if (Array.isArray(payload.bars)) {
          series.setData(payload.bars.map((bar: Bar) => ({ ...bar, time: bar.time as UTCTimestamp })));
          chart.timeScale().fitContent();
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('Waiting for authorized market-data feed');
      });

    const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${scheme}//${window.location.host}/ws/market-data?${params.toString()}`);
    socket.onopen = () => setStatus('Connected to Northstar data service · awaiting CME ticks');
    socket.onmessage = event => {
      try {
        const message = JSON.parse(event.data) as FeedMessage;
        if (message.type === 'status') {
          setStatus(message.message || message.status);
          return;
        }
        if (message.type === 'bar' && message.symbol === symbol && message.timeframe === timeframe && message.bar) {
          const bar = message.bar;
          series.update({ ...bar, time: bar.time as UTCTimestamp });
          setLastUpdate(new Date().toLocaleTimeString());
          setStatus('Live market data');
        }
      } catch {
        setStatus('Received an unreadable market-data message');
      }
    };
    socket.onerror = () => setStatus('Market-data service unavailable');
    socket.onclose = () => {
      if (!cancelled) setStatus('Disconnected · waiting for market-data service');
    };

    const resize = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) chart.applyOptions({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    resize.observe(host);

    return () => {
      cancelled = true;
      resize.disconnect();
      socket?.close();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [symbol, timeframe]);

  return (
    <div className="live-chart-wrap">
      <div className="live-chart-status"><span className={status === 'Live market data' ? 'live-dot' : 'waiting-dot'} />{status}<small>{lastUpdate ? `Last update ${lastUpdate}` : 'No prices are displayed until real data arrives'}</small></div>
      <div className="live-chart-host" ref={hostRef} />
    </div>
  );
}
