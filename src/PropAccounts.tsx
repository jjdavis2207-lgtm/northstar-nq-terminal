import { useState } from 'react';
import { ExternalLink, ShieldCheck, LockKeyhole, CircleAlert, CheckCircle2 } from 'lucide-react';

type Firm = 'Lucid' | 'Tradeify';

const initialProfiles: Record<Firm, { nickname: string; platform: string }> = {
  Lucid: { nickname: 'Lucid NQ Account', platform: 'Tradovate / CQG' },
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
          <p>Separate Lucid and Tradeify workspaces for your NQ and MNQ trading.</p>
        </div>
      </div>

      <div className="prop-notice">
        <CircleAlert size={19} />
        <div>
          <b>Broker sign-in and Northstar connection are two different steps</b>
          <span>You can sign in to Tradovate using your firm's credentials below. That signs you into Tradovate only; it does not yet authorize Northstar to read account data or place orders. Northstar will show connected only after an approved integration has been provisioned and verified.</span>
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
              <span className="prop-status"><i /> Northstar not connected</span>
            </div>
            <label className="prop-label" htmlFor={`nickname-${firm}`}>Workspace name</label>
            <input id={`nickname-${firm}`} value={profiles[firm].nickname} onChange={e => updateNickname(firm, e.target.value)} maxLength={36} />
            <div className="prop-meta"><span>Broker / feed</span><b>{profiles[firm].platform}</b></div>
            <div className="prop-meta"><span>Markets</span><b>NQ · MNQ</b></div>
            <div className="prop-meta"><span>Northstar account data</span><b>Not authorized</b></div>
            <button className={`prop-select ${activeFirm === firm ? 'active' : ''}`} onClick={() => setActiveFirm(firm)}>
              {activeFirm === firm ? 'Selected workspace' : 'Select workspace'}
            </button>
          </article>
        ))}
      </div>

      <section className="prop-workspace">
        <div className="prop-workspace-head">
          <div><span className="prop-overline">ACTIVE WORKSPACE</span><h3>{profiles[activeFirm].nickname || activeFirm}</h3></div>
          <span className="prop-status"><i /> Awaiting approved integration</span>
        </div>
        <div className="prop-market-switch">
          <span>Trading instrument</span>
          <div>
            {(['NQ', 'MNQ'] as const).map(item => <button key={item} className={symbol === item ? 'active' : ''} onClick={() => setSymbol(item)}>{item}</button>)}
          </div>
        </div>
        <div className="prop-account-stats">
          <div><span>Net liquidation</span><b>—</b><small>Not available until authorized</small></div>
          <div><span>Open positions</span><b>—</b><small>Not available until authorized</small></div>
          <div><span>Working orders</span><b>—</b><small>Not available until authorized</small></div>
        </div>

        <div className="prop-setup">
          <div className="prop-setup-title"><CheckCircle2 size={17} /><b>Step 1 · Sign in to your prop broker</b></div>
          <p>Use the Tradovate username and password issued by {activeFirm}. This opens the broker's secure site; Northstar never receives or stores your password.</p>
          <a className="prop-connect-link" href="https://trader.tradovate.com/" target="_blank" rel="noreferrer">Open Tradovate sign-in <ExternalLink size={14} /></a>
          <div className="prop-setup-title"><CheckCircle2 size={17} /><b>Step 2 · Confirm your CME market-data agreement</b></div>
          <p>On first Tradovate login, complete the applicable CME Non-Professional Data Agreement if prompted. Tradeify states that Level 1 CME data is included for Tradovate accounts; Level 2 depth is a separate add-on.</p>
          <div className="prop-setup-title pending"><LockKeyhole size={17} /><b>Step 3 · Authorize a Northstar-compatible feed</b></div>
          <p>This is the remaining blocker. Tradovate's published API requirements call for a live brokerage account with more than $1,000 equity, an API Access subscription, and an API key. Your prop-firm Tradovate login does not automatically provide Northstar with those API credentials or permission. We need a separate firm-approved provider integration before Northstar can receive account data or route orders.</p>
        </div>

        <div className="prop-order-locked">
          <LockKeyhole size={19} />
          <div><b>Live account data and order routing remain locked</b><span>Northstar will not display invented balances or prices, and it will not send orders until the provider integration is authorized, tested, and explicitly enabled.</span></div>
        </div>
        <div className="prop-actions">
          <a href="https://trader.tradovate.com/" target="_blank" rel="noreferrer">Tradovate <ExternalLink size={14} /></a>
          <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">TradingView <ExternalLink size={14} /></a>
          {activeFirm === 'Lucid' ? (
            <a href="https://support.lucidtrading.com/en/articles/11404614-lucid-trading-supported-platforms" target="_blank" rel="noreferrer">Lucid supported platforms <ExternalLink size={14} /></a>
          ) : (
            <a href="https://help.tradeify.co/en/articles/10468221-supported-platforms" target="_blank" rel="noreferrer">Tradeify supported platforms <ExternalLink size={14} /></a>
          )}
        </div>
      </section>

      <section className="prop-security">
        <ShieldCheck size={18} />
        <div><b>Account separation and security</b><p>Lucid and Tradeify remain separate. Do not enter broker passwords or API keys into Northstar's frontend or GitHub. Any future connection must use a provider-approved authorization flow and private server-side secrets.</p></div>
      </section>
    </div>
  );
}
