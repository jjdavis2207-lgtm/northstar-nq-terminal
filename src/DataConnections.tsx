import { ExternalLink, ShieldCheck, WifiOff } from 'lucide-react';

export default function DataConnections() {
  return (
    <div className="connections-page">
      <div className="module-hero">
        <div className="module-symbol"><ShieldCheck size={24} /></div>
        <div><div className="eyebrow">NORTHSTAR / INTEGRATIONS</div><h2>Data Connections</h2>
          <p>Configure the approved sources for your NQ and MNQ workflow.</p></div>
      </div>
      <div className="connection-alert">
        <WifiOff size={19} />
        <div><b>Live data is not connected</b><span>The current repository contains a browser-only frontend. A secure server-side integration is still required before Northstar can authenticate or receive live prices. No market prices are being fabricated.</span></div>
      </div>
      <h3 className="connection-section-title">Approved market data providers</h3>
      <div className="provider-grid">
        <article className="provider-card"><div className="provider-card-head"><b>Lucid</b><span>Not connected</span></div><p>Use your Lucid-authorized market data access for supported NQ / MNQ feeds.</p><small>Connection: pending secure backend + provider authorization</small></article>
        <article className="provider-card"><div className="provider-card-head"><b>Tradeify</b><span>Not connected</span></div><p>Use your Tradeify-authorized market data access for supported NQ / MNQ feeds.</p><small>Connection: pending secure backend + provider authorization</small></article>
      </div>
      <h3 className="connection-section-title">Trading platforms</h3>
      <div className="platform-grid">
        <article className="platform-card"><b>Tradovate</b><p>Account connection and order routing require authorized API access and a server-side OAuth/token flow.</p><a href="https://www.tradovate.com/" target="_blank" rel="noreferrer">Open Tradovate <ExternalLink size={13}/></a></article>
        <article className="platform-card"><b>TradingView</b><p>Charting workflow and supported integrations. TradingView access does not automatically grant Northstar permission to stream broker data.</p><a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">Open TradingView <ExternalLink size={13}/></a></article>
      </div>
      <div className="connection-security"><ShieldCheck size={18}/><div><b>Security requirement</b><p>Do not paste API keys, passwords, or account tokens into this page or a public GitHub file. Credentials must be stored as private server environment variables and handled by a backend service.</p></div></div>
    </div>
  );
}
