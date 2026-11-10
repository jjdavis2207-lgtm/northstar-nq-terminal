import { useEffect, useRef } from 'react';

type Props = {
  symbol: 'NQ' | 'MNQ';
  timeframe: string;
};

const intervals: Record<string, string> = {
  '1m': '1',
  '2m': '2',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1H': '60',
  '4H': '240',
  '1D': 'D'
};

export default function TradingViewChart({ symbol, timeframe }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    host.replaceChildren();
    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.width = '100%';
    widget.style.height = '100%';
    host.appendChild(widget);

    const attribution = document.createElement('div');
    attribution.className = 'tradingview-attribution';
    const link = document.createElement('a');
    link.href = `https://www.tradingview.com/symbols/CME_MINI-${symbol}1!/`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `${symbol} futures chart by TradingView`;
    attribution.appendChild(link);
    host.appendChild(attribution);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `CME_MINI:${symbol}1!`,
      interval: intervals[timeframe] || '5',
      timezone: 'America/Chicago',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: '#0b131e',
      gridColor: 'rgba(46, 62, 82, 0.35)',
      allow_symbol_change: true,
      calendar: false,
      details: false,
      hotlist: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      save_image: true,
      withdateranges: true,
      studies: []
    });
    host.appendChild(script);

    return () => {
      host.replaceChildren();
    };
  }, [symbol, timeframe]);

  return (
    <div className="tradingview-chart-shell">
      <div className="tradingview-widget-container tradingview-chart-host" ref={hostRef} />
      <div className="tradingview-data-note">
        TradingView embedded chart · CME real-time data subscriptions do not carry over to embedded widgets, so CME quotes may be delayed. This embed does not connect your Lucid/Tradeify account.
        {' '}<a href={`https://www.tradingview.com/chart/?symbol=CME_MINI:${symbol}1!`} target="_blank" rel="noopener noreferrer">Open full TradingView for your account data</a>.
      </div>
    </div>
  );
}
