import { useState } from 'react';
import { ExternalLink, ShieldCheck, WifiOff, LockKeyhole, ArrowUpRight, CircleAlert } from 'lucide-react';

type Firm = 'Lucid' | 'Tradeify';

const initialProfiles: Record<Firm, { nickname: string; platform: string }> = {
  Lucid: { nickname: 'Lucid NQ Account', platform: 'Tradovate' },
  Tradeify: { nickname: 'Tradeify NQ Account', platform: 'Tradovate' }
};

export default function PropAccounts() {
  const [activeFirm, setActiveFirm] = useState<Firm>('Lucid');
  const [profiles, setProfiles] = useState(initialProfiles);
  const [symbol, setSymbol] = useState<'NQ' | 'MNQ'>('MNQ');

  const updateNickname = (firm: Firm, nickname: string) => {
    setProfiles(current => ({ ...current, [firm]: { ...current[firm], nickname } }));
  };

  return (
    <div className="prop-page">
      <div className="module-hero">
        <div className="module-symbol"><ShieldCheck size={24} /></div>
        <div>
          <div className="eyebrow">NORTHSTAR / BROKER ACCOUNTS</div>
          <h2>Prop Firm Accounts</h2>
          <p>Manage your Lucid and Tradeify Tradovate account workspaces in one place.</p>
        </div>
      </div>

      <div className="prop-notice">
        <CircleAlert size={19} />
        <div>
          <b>Live account connection is not authorized yet</b>
          <span>Both account profiles are set up below. Direct Tradovate API access is restricted for prop-firm accounts, so Northstar will not claim an account is connected or send live orders until an officially supported integration is available.</span>
        </div>
      </div>

      <div className="prop-account-grid">
        {(['Lucid', 'Tradeify'] as Firm[]).map(firm => (
          <article className={`prop-account-card ${activeFirm === firm ? 'selected' : ''}`} key={firm}>
            <div className="prop-card-top">
              <div>
                <span className="prop-overline">PROP ACCOUNT</span>
                <h3>{firm}</h3>
              </div>
              <span className="prop-status"><i /> Awaiting authorization</span>
            </div>
            <label className="prop-label" htmlFor={`nickname-${firm}`}>Workspace name</label>
            <input id={`nickname-${firm}`} value={profiles[firm].nickname} onChange={e => updateNickname(firm, e.target.value)} maxLength={36} />
            <div className="prop-meta"><span>Platform</span><b>Tradovate</b></div>
            <div className="prop-meta"><span>Markets</span><b>NQ · MNQ</b></div>
            <div className="prop-meta"><span>Account data</span><b>Not connected</b></div>
            <button className={`prop-select ${activeFirm === firm ? 'active' : ''}`} onClick={() => setActiveFirm(firm)}>
              {activeFirm === firm ? 'Selected workspace' : 'Select workspace'}
            </button>
          </article>
        ))}
      </div>

      <section className="prop-workspace">
        <div className="prop-workspace-head">
          <div><span className="prop-overline">ACTIVE WORKSPACE</span><h3>{profiles[activeFirm].nickname || activeFirm}</h3></div>
          <span className="prop-status"><i /> Not connected</span>
        </div>
        <div className="prop-market-switch">
          <span>Trading instrument</span>
          <div>
            {(['NQ', 'MNQ'] as const).map(item => <button key={item} className={symbol === item ? 'active' : ''} onClick={() => setSymbol(item)}>{item}</button>)}
          </div>
        </div>
        <div className="prop-account-stats">
          <div><span>Net liquidation</span><b>—</b><small>Awaiting authorized account feed</small></div>
          <div><span>Open positions</span><b>—</b><small>No account data received</small></div>
          <div><span>Working orders</span><b>—</b><small>No account data received</small></div>
        </div>
        <div className="prop-order-locked">
          <LockKeyhole size={19} />
          <div><b>Live order routing is locked</b><span>Order entry will activate only after a permitted broker connection is verified and tested. This prevents accidental orders being sent to the wrong prop account.</span></div>
        </div>
        <div className="prop-actions">
          <a href="https://trader.tradovate.com/" target="_blank" rel="noreferrer">Open Tradovate <ExternalLink size={14} /></a>
          <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">Open TradingView <ExternalLink size={14} /></a>
        </div>
      </section>

      <section className="prop-security">
        <ShieldCheck size={18} />
        <div><b>Account separation and security</b><p>Lucid and Tradeify remain separate workspaces. No passwords, API keys, balances, positions, or prices are stored or invented by this page. Credentials must never be placed in frontend code or public GitHub files.</p></div>
      </section>
    </div>
  );
}
