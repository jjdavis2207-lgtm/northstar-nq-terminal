import { useEffect, useRef, useState } from 'react';

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

// TradingView's continuous CME futures symbols. MNQ and NQ are distinct
// contracts; do not silently fall back to a stock ticker.
const tradingViewSymbol: Record<Props['symbol'], string> = {
  NQ: 'CME_MINI:NQ1!',
  MNQ: 'CME_MINI:MNQ1!'
};

export default function TradingViewChart({ symbol, timeframe }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'fallback'>('loading');
  const ticker = tradingViewSymbol[symbol];

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let active = true;
    setLoadState('loading');
    host.replaceChildren();

    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.width = '100%';
    widget.style.height = '100%';
    host.appendChild(widget);

    const attribution = document.createElement('div');
    attribution.className = 'tradingview-attribution';
    const link = document.createElement('a');
    link.href = `https://www.tradingview.com/symbols/${ticker.replace(':', '-')}/`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `${symbol} futures chart by TradingView`;
    attribution.appendChild(link);
    host.appendChild(attribution);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    // The official embed reads its JSON configuration from the script body.
    // Use textContent so React/DOM does not interpret the JSON as markup.
    script.textContent = JSON.stringify({
      autosize: true,
      symbol: ticker,
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
    script.onload = () => {
      if (active) setLoadState('loaded');
    };
    script.onerror = () => {
      if (active) setLoadState('fallback');
    };
    host.appendChild(script);

    // If the external widget never finishes loading, give the user a direct
    // link to the exact NQ/MNQ chart rather than leaving a misleading blank.
    const watchdog = window.setTimeout(() => {
      if (active) setLoadState(current => current === 'loading' ? 'fallback' : current);
    }, 12000);

    return () => {
      active = false;
      window.clearTimeout(watchdog);
      host.replaceChildren();
    };
  }, [ticker, symbol, timeframe]);

  return (
    <div className="tradingview-chart-shell">
      <div className="tradingview-widget-container tradingview-chart-host" ref={hostRef} />
      {loadState === 'fallback' && (
        <div className="tradingview-data-note">
          TradingView's embedded chart did not finish loading. Open the correct {symbol} futures chart directly:
          {' '}<a href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(ticker)}`} target="_blank" rel="noopener noreferrer">Open {ticker} in TradingView</a>.
        </div>
      )}
      <div className="tradingview-data-note">
        <b>{ticker}</b> · {timeframe} · CME futures. Embedded chart data may be delayed; a paid TradingView CME entitlement does not automatically transfer into an embedded widget or Northstar.
        {' '}<a href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(ticker)}`} target="_blank" rel="noopener noreferrer">Open full TradingView for your account data</a>.
      </div>
    </div>
  );
}
