import { useMemo, useState } from 'react';
import { Calculator, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';

const money = (value: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 2
}).format(value);

export default function RiskManager() {
  const [symbol, setSymbol] = useState<'NQ' | 'MNQ'>('MNQ');
  const [direction, setDirection] = useState<'Long' | 'Short'>('Long');
  const [risk, setRisk] = useState('200');
  const [entry, setEntry] = useState('25000');
  const [stop, setStop] = useState('24980');
  const [target, setTarget] = useState('25040');
  const pointValue = symbol === 'NQ' ? 20 : 2;
  const tickValue = symbol === 'NQ' ? 5 : 0.5;

  const result = useMemo(() => {
    const e = Number(entry), s = Number(stop), t = Number(target), r = Number(risk);
    const validNumbers = [e, s, t, r].every(Number.isFinite) && e > 0 && r > 0;
    const correctSide = direction === 'Long' ? s < e && t > e : s > e && t < e;
    const stopPoints = Math.abs(e - s);
    const targetPoints = Math.abs(t - e);
    const perContractRisk = stopPoints * pointValue;
    const contracts = validNumbers && correctSide && perContractRisk > 0
      ? Math.floor(r / perContractRisk) : 0;
    return {
      valid: validNumbers && correctSide && stopPoints > 0 && targetPoints > 0,
      contracts,
      stopPoints,
      targetPoints,
      actualRisk: contracts * perContractRisk,
      targetProfit: contracts * targetPoints * pointValue,
      rr: stopPoints > 0 ? targetPoints / stopPoints : 0
    };
  }, [direction, entry, stop, target, risk, pointValue]);

  const field = (label: string, value: string, set: (value: string) => void) => (
    <label className="risk-field">
      <span>{label}</span>
      <input type="number" step="0.25" value={value} onChange={e => set(e.target.value)} />
    </label>
  );

  return (
    <div className="risk-page">
      <div className="risk-intro">
        <div className="module-symbol"><Calculator size={23} /></div>
        <div><div className="eyebrow">NORTHSTAR / TRADE PLANNING</div><h2>Risk Manager</h2>
          <p>Calculate position size and planned risk before entering a trade.</p></div>
      </div>
      <div className="risk-workspace">
        <section className="risk-card">
          <div className="risk-card-title"><b>Trade parameters</b><span>Futures · CME</span></div>
          <div className="risk-toggle">
            {(['NQ', 'MNQ'] as const).map(s => <button key={s} className={symbol === s ? 'selected' : ''} onClick={() => setSymbol(s)}>{s}</button>)}
          </div>
          <div className="risk-toggle direction-toggle">
            {(['Long', 'Short'] as const).map(d => <button key={d} className={direction === d ? 'selected' : ''} onClick={() => setDirection(d)}>{d === 'Long' ? <TrendingUp size={15}/> : <TrendingDown size={15}/>} {d}</button>)}
          </div>
          {field('Maximum risk ($)', risk, setRisk)}
          <div className="risk-input-grid">
            {field('Entry price', entry, setEntry)}
            {field('Stop-loss price', stop, setStop)}
            {field('Profit target', target, setTarget)}
          </div>
          <div className="contract-note">
            <span>{symbol} point value</span><b>{money(pointValue)} / point</b>
            <span>{symbol} tick value</span><b>{money(tickValue)} / tick (0.25)</b>
          </div>
          <p className="risk-disclaimer">Estimates exclude commissions, fees, slippage, and execution differences. This is a planning calculator, not a broker order ticket.</p>
        </section>
        <section className="risk-card risk-results">
          <div className="risk-card-title"><b>Position sizing</b><ShieldCheck size={17}/></div>
          {!result.valid ? <div className="risk-invalid">Check your prices and risk amount. For a {direction.toLowerCase()} trade, the stop and target must be on the correct sides of entry.</div> : <>
            <div className="contracts-result"><span>Maximum contracts</span><strong>{result.contracts}</strong><small>{symbol} {result.contracts === 1 ? 'contract' : 'contracts'}</small></div>
            {result.contracts === 0 && <div className="risk-invalid">Your risk limit is below the risk of one contract at this stop distance.</div>}
            <div className="result-row"><span>Stop distance</span><b>{result.stopPoints.toFixed(2)} points</b></div>
            <div className="result-row"><span>Target distance</span><b>{result.targetPoints.toFixed(2)} points</b></div>
            <div className="result-row"><span>Estimated risk</span><b className="loss-value">{money(result.actualRisk)}</b></div>
            <div className="result-row"><span>Estimated target profit</span><b className="profit-value">{money(result.targetProfit)}</b></div>
            <div className="result-row"><span>Risk / reward</span><b>1 : {result.rr.toFixed(2)}</b></div>
          </>}
        </section>
      </div>
    </div>
  );
}
