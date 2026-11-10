import { ExternalLink, ShieldCheck, WifiOff } from 'lucide-react';

export default function DataConnections() {
  return (
    <div className="connections-page">
      <div className="module-hero">
        <div className="module-symbol"><ShieldCheck size={24} /></div>
        <div><div className="eyebrow">NORTHSTAR / INTEGRATIONS</div><h2>Data Connections</h2>
          <p>Connect an independent CME market-data feed directly to Northstar.</p></div>
      </div>
      <div className="connection-alert">
        <WifiOff size={19} />
        <div><b>Live data is not connected</b><span>Northstar now includes a server-side API and live WebSocket chart feed receiver. Northstar now has an independent Databento feed worker path. It is not connected until a licensed Databento API key is configured on a Render Background Worker. TradingView's embedded chart is separate and may show delayed CME quotes.</span></div>
      </div>
      <h3 className="connection-section-title">Independent live market data</h3>
      <div className="provider-grid">
        <article className="provider-card"><div className="provider-card-head"><b>Databento · CME Globex</b><span>Ready for setup</span></div><p>Independent market data for NQ and MNQ. Northstar's new background worker subscribes to CME trades and MBP-10 market depth, then streams the events into the original Deep Flow footprint and Level II workspace. No Lucid or Tradeify login is needed.</p><small>Feed: GLBX.MDP3 · NQ.FUT / MNQ.FUT · MBP-10</small><a href="https://databento.com/pricing/" target="_blank" rel="noreferrer">View plans and CME licensing <ExternalLink size={13}/></a><a href="https://databento.com/docs/api-live" target="_blank" rel="noreferrer">Live API documentation <ExternalLink size={13}/></a></article>
      </div>
      <h3 className="connection-section-title">Charting</h3>
      <div className="platform-grid">
        <article className="platform-card"><b>Northstar Deep Flow</b><p>Original Northstar code for footprint bid/ask volume, exchange aggressor delta, and ten-level aggregated market depth. It requires an authorized live MBP-10 feed to populate; no sample prices or fabricated volume are displayed.</p><a href="https://github.com/jjdavis2207-lgtm/northstar-nq-terminal/blob/main/server/databento_feed.py" target="_blank" rel="noreferrer">View the Databento bridge <ExternalLink size={13}/></a></article>
        <article className="platform-card"><b>TradingView embed</b><p>The embedded chart uses TradingView's hosted feed and does not expose data to Northstar. CME exchange subscriptions do not carry over to embedded widgets, so quotes may be delayed. Use Northstar Deep Flow for the independent feed once configured.</p><a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">Open TradingView <ExternalLink size={13}/></a><a href="https://www.tradingview.com/support/solutions/43000471705-how-to-purchase-additional-market-data/" target="_blank" rel="noreferrer">CME data requirements <ExternalLink size={13}/></a></article>
      </div>
      <div className="connection-security"><ShieldCheck size={18}/><div><b>Security requirement</b><p>Do not paste API keys, passwords, or account tokens into this page or a public GitHub file. Store the Databento API key and Northstar ingest token only as private environment variables on the Render Background Worker and Web Service. Never put them in the browser or GitHub.</p></div></div>
    </div>
  );
}
