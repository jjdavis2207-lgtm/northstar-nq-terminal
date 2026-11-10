import { useEffect, useState } from 'react';
import { ExternalLink, ShieldCheck, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

type FeedStatus = {
  connected: boolean;
  provider: string;
  lastUpdate: number | null;
  message: string;
};

const initialStatus: FeedStatus = {
  connected: false,
  provider: 'No provider configured',
  lastUpdate: null,
  message: 'Checking Northstar API'
};

export default function DataConnections() {
  const [status, setStatus] = useState<FeedStatus>(initialStatus);
  const [checking, setChecking] = useState(false);

  const refresh = async () => {
    setChecking(true);
    try {
      const response = await fetch('/api/market-data/status', { cache: 'no-store' });
      if (!response.ok) throw new Error('Northstar API returned an error');
      setStatus(await response.json());
    } catch {
      setStatus({
        connected: false,
        provider: 'Northstar API unavailable',
        lastUpdate: null,
        message: 'The Northstar server could not be reached. Check the Render service.'
      });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const lastUpdate = status.lastUpdate
    ? new Date(status.lastUpdate).toLocaleString()
    : 'No feed update received';

  return (
    <div className="connections-page">
      <div className="module-hero">
        <div className="module-symbol"><ShieldCheck size={24} /></div>
        <div><div className="eyebrow">NORTHSTAR / INTEGRATIONS</div><h2>Data Connections</h2>
          <p>Monitor the Northstar feed and use your existing charting accounts without adding a paid data vendor.</p></div>
      </div>
      <div className="connection-alert">
        {status.connected ? <CheckCircle2 size={19} /> : <WifiOff size={19} />}
        <div>
          <b>{status.connected ? 'Authorized market-data feed is active' : 'Northstar market data is not connected'}</b>
          <span>{status.message}. This status is checked against your Northstar server every 15 seconds; an open TradingView chart is not mistaken for a Northstar data connection.</span>
        </div>
      </div>
      <h3 className="connection-section-title">Northstar feed status</h3>
      <div className="provider-grid">
        <article className="provider-card">
          <div className="provider-card-head"><b>Northstar market-data receiver</b><span>{status.connected ? 'CONNECTED' : 'DISCONNECTED'}</span></div>
          <p>The app can receive authorized NQ and MNQ candles, trades, and order-book updates through its secure server endpoints. A real provider must publish the data; this receiver does not generate prices.</p>
          <small>Provider: {status.provider}<br />Last update: {lastUpdate}</small>
          <button className="toolbtn" onClick={() => void refresh()} disabled={checking}><RefreshCw size={13} /> {checking ? 'Checking…' : 'Check connection'}</button>
        </article>
        <article className="provider-card">
          <div className="provider-card-head"><b>Free-use setup</b><span>NO NEW SUBSCRIPTION</span></div>
          <p>Keep using the TradingView chart embed for chart viewing. Its market data stays inside TradingView and is not copied into Northstar. Authorized historical NQ/MNQ CSV files can be used for offline analysis once an import workflow is implemented.</p>
          <small>Northstar symbols: NQ · MNQ</small>
          <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">Open TradingView <ExternalLink size={13}/></a>
        </article>
      </div>
      <h3 className="connection-section-title">Existing trading platforms</h3>
      <div className="platform-grid">
        <article className="platform-card">
          <b>TradingView</b>
          <p>Use your existing TradingView account and supported chart access. The embedded widget is hosted by TradingView; Northstar cannot read its private live data stream or broker session.</p>
          <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">Open TradingView <ExternalLink size={13}/></a>
        </article>
        <article className="platform-card">
          <b>Tradovate · Lucid · Tradeify</b>
          <p>Your prop-firm login remains separate from Northstar. Tradovate's API add-on is not a free shortcut to live CME data, and current official requirements exclude prop-firm/evaluation accounts. No credentials are requested or stored here.</p>
          <a href="https://api.tradovate.com/" target="_blank" rel="noreferrer">Official Tradovate API docs <ExternalLink size={13}/></a>
        </article>
      </div>
      <div className="connection-security">
        <ShieldCheck size={18}/>
        <div><b>Security and cost protection</b><p>No Databento worker is required or enabled by this screen. Do not paste API keys, passwords, or prop-firm credentials into GitHub or this page. Northstar only reports a live connection when its server has actually received a recent authorized data update.</p></div>
      </div>
    </div>
  );
}
