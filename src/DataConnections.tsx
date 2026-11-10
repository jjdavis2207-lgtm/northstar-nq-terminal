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
        <div><b>Live data is not connected</b><span>Northstar now includes a server-side API and live WebSocket chart feed receiver. No Lucid or Tradeify publisher is authorized or connected yet, so Northstar account prices and balances remain unavailable. The TradingView chart embed is a separate chart source.</span></div>
      </div>
      <h3 className="connection-section-title">Approved market data providers</h3>
      <div className="provider-grid">
        <article className="provider-card"><div className="provider-card-head"><b>Lucid</b><span>Not connected</span></div><p>Lucid accounts can use CQG through Tradovate and TradingView, or Rithmic through its supported platforms. The selected feed determines which integration path is possible.</p><small>Connection: pending secure backend + provider authorization</small></article>
        <article className="provider-card"><div className="provider-card-head"><b>Tradeify</b><span>Not connected</span></div><p>Tradeify supports Tradovate accounts with TradingView. Level 1 CME data is included; Level 2 depth is a separate subscription for Tradovate accounts.</p><small>Connection: pending secure backend + provider authorization</small></article>
      </div>
      <h3 className="connection-section-title">Trading platforms</h3>
      <div className="platform-grid">
        <article className="platform-card"><b>Tradovate</b><p>Your prop-firm credentials can connect to the Tradovate platform. Tradovate's published API requirements call for a live brokerage account with more than $1,000 equity, an API Access subscription, and an API key. Your prop-firm login does not automatically provide those separate API credentials or permission. We need explicit firm/provider authorization before using the account in Northstar.</p><a href="https://www.tradovate.com/" target="_blank" rel="noreferrer">Open Tradovate <ExternalLink size={13}/></a><a href="https://support.ninjatrader.com/s/article/Tradovate-API-Access?language=en_US" target="_blank" rel="noreferrer">API eligibility details <ExternalLink size={13}/></a></article>
        <article className="platform-card"><b>TradingView</b><p>Northstar now embeds TradingView's official Advanced Chart widget for NQ1! and MNQ1!. The widget gets chart data from TradingView, not from your Lucid/Tradeify account. TradingView confirms that exchange real-time data subscriptions do not carry over to embedded widgets, so CME data in this embed may be delayed. The full TradingView website can show real-time data if you separately subscribe to CME data. Neither option exposes broker balances to Northstar.</p><a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">Open TradingView <ExternalLink size={13}/></a><a href="https://www.tradingview.com/support/solutions/43000471705-how-to-purchase-additional-market-data/" target="_blank" rel="noreferrer">CME real-time data requirements <ExternalLink size={13}/></a><a href="https://support.lucidtrading.com/en/articles/11404614-supported-platforms" target="_blank" rel="noreferrer">Lucid supported platforms <ExternalLink size={13}/></a><a href="https://help.tradeify.co/en/articles/10468221-supported-platforms" target="_blank" rel="noreferrer">Tradeify supported platforms <ExternalLink size={13}/></a></article>
      </div>
      <div className="connection-security"><ShieldCheck size={18}/><div><b>Security requirement</b><p>Do not paste API keys, passwords, or account tokens into this page or a public GitHub file. Credentials must be stored as private server environment variables and handled by a backend service.</p></div></div>
    </div>
  );
}
