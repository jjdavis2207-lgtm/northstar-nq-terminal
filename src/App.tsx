
import { useState } from 'react';
import {
  Activity,
  BarChart3,
  BrainCircuit,
  ChevronDown,
  CircleHelp,
  Clock3,
  Crosshair,
  Database,
  Expand,
  Layers,
  LineChart,
  Maximize2,
  Menu,
  MousePointer2,
  Radio,
  RefreshCw,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Volume2,
  WifiOff,
  Zap
} from 'lucide-react';

const navigation = [
  {
    heading: 'TRADING',
    items: [
      { name: 'Trading Terminal', icon: BarChart3 },
      { name: 'Order Flow', icon: Activity },
      { name: 'DOM / Ladder', icon: Layers },
      { name: 'Market Replay', icon: Clock3 }
    ]
  },
  {
    heading: 'ANALYSIS',
    items: [
      { name: 'Market Structure', icon: TrendingUp },
      { name: 'Volume Analysis', icon: Volume2 },
      { name: 'Trade Scanner', icon: Crosshair },
      { name: 'Strategy Lab', icon: BrainCircuit }
    ]
  },
  {
    heading: 'TOOLS',
    items: [
      { name: 'Risk Manager', icon: Shield },
      { name: 'Performance', icon: Target },
      { name: 'Data Connections', icon: Database },
      { name: 'Settings', icon: Settings }
    ]
  }
];

const timeframes = ['1m', '2m', '5m', '15m', '30m', '1H', '4H', '1D'];

const modules = {
  'Order Flow': {
    subtitle: 'Analyze buying and selling pressure across Nasdaq futures.',
    description: 'Order flow tools will display bid and ask volume, footprint data, and aggressive buying and selling once a supported market data connection is configured.'
  },
  'DOM / Ladder': {
    subtitle: 'Monitor market depth and price levels.',
    description: 'The depth of market ladder requires a supported live market data connection.'
  },
  'Market Replay': {
    subtitle: 'Review historical market activity.',
    description: 'Market replay requires historical market data and playback functionality to be connected.'
  },
  'Market Structure': {
    subtitle: 'Identify key price structure and market direction.',
    description: 'This workspace is designed for swing highs and lows, break of structure, change of character, and support and resistance analysis.'
  },
  'Volume Analysis': {
    subtitle: 'Study volume and participation.',
    description: 'Volume profiles, delta, and related analysis require live or historical market data.'
  },
  'Trade Scanner': {
    subtitle: 'Monitor potential NQ and MNQ trade conditions.',
    description: 'Scanner alerts and signal calculations will be available after market data and strategy rules are configured.'
  },
  'Strategy Lab': {
    subtitle: 'Build and test trading strategies.',
    description: 'Strategy testing requires historical data and a backtesting engine.'
  },
  'Risk Manager': {
    subtitle: 'Plan position size and manage risk.',
    description: 'Risk tools will help calculate contract size, stop distance, and potential profit or loss.'
  },
  'Performance': {
    subtitle: 'Review your trading performance.',
    description: 'Performance analytics will require trade history from a connected trading account or imported statements.'
  },
  'Data Connections': {
    subtitle: 'Connect your trading and market data providers.',
    description: 'Tradovate and other supported providers must be configured and authorized before account data or live prices can appear.'
  },
  'Settings': {
    subtitle: 'Configure your Northstar workspace.',
    description: 'Workspace preferences and platform configuration.'
  }
};

function App() {
  const [activePage, setActivePage] = useState('Trading Terminal');
  const [symbol, setSymbol] = useState('MNQ');
  const [timeframe, setTimeframe] = useState('5m');
  const [bottomTab, setBottomTab] = useState('Positions');
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isTerminal = activePage === 'Trading Terminal';
  const moduleInfo = modules[activePage as keyof typeof modules];

  return (
    <div className="shell">
      {sidebarOpen && (
        <aside className="sidebar">
          <div className="logo">
            <div className="logo-icon"><Activity size={21} /></div>
            <div>
              <b>NORTHSTAR</b>
              <small>NQ FUTURES TERMINAL</small>
            </div>
            <button className="collapse" onClick={() => setSidebarOpen(false)}>
              <Menu size={17} />
            </button>
          </div>

          <div className="search">
            <Search size={15} />
            <input
              placeholder="Search workspace..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <nav>
            {navigation.map((group) => {
              const filtered = group.items.filter((item) =>
                item.name.toLowerCase().includes(search.toLowerCase())
              );

              if (!filtered.length) return null;

              return (
                <div className="nav-group" key={group.heading}>
                  <label>{group.heading}</label>
                  {filtered.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.name}
                        className={`nav ${activePage === item.name ? 'active' : ''}`}
                        onClick={() => setActivePage(item.name)}
                      >
                        <Icon size={16} />
                        {item.name}
                        {activePage === item.name && <span className="nav-dot" />}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          <div className="sidebar-foot">
            <div className="connection">
              <span className="red-dot" />
              <div>
                <b>Market Data</b>
                <small>Not connected</small>
              </div>
            </div>
            <div className="profile">
              <div className="avatar">N</div>
              <div>
                <b>Trader Workspace</b>
                <small>Northstar Account</small>
              </div>
              <Settings size={15} />
            </div>
          </div>
        </aside>
      )}

      <main className="main">
        <header className="top">
          <div className="breadcrumbs">
            {!sidebarOpen && (
              <button className="topicon" onClick={() => setSidebarOpen(true)}>
                <Menu size={17} />
              </button>
            )}
            Northstar <span>/</span> {activePage}
          </div>
          <div className="topright">
            <span className="offline"><i /> DATA DISCONNECTED</span>
            <button className="topicon"><CircleHelp size={17} /></button>
            <button className="topicon"><Settings size={17} /></button>
          </div>
        </header>

        <div className="toolbar">
          <div className="symbol">
            {['NQ', 'MNQ'].map((item) => (
              <button
                key={item}
                className={symbol === item ? 'chosen' : ''}
                onClick={() => setSymbol(item)}
              >
                {item}
              </button>
            ))}
            <span className="exchange">CME</span>
            <ChevronDown size={13} />
          </div>

          <div className="tool-sep" />

          <div className="tf">
            {timeframes.map((item) => (
              <button
                key={item}
                className={timeframe === item ? 'sel' : ''}
                onClick={() => setTimeframe(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="tool-sep" />
          <button className="toolbtn"><MousePointer2 size={14} /> Cursor</button>
          <button className="toolbtn"><SlidersHorizontal size={14} /> Indicators</button>
          <div className="push" />
          <button className="toolbtn"><RefreshCw size={14} /></button>
          <button className="toolbtn"><Expand size={14} /></button>
        </div>

        <section className="content">
          {isTerminal ? (
            <>
              <div className="headline">
                <div>
                  <div className="eyebrow">NORTHSTAR / FUTURES</div>
                  <h1>Trading Terminal</h1>
                  <p>Professional Nasdaq futures trading workspace.</p>
                </div>
                <div className="headline-actions">
                  <span className="status-chip">Awaiting data connection</span>
                  <button className="settings-btn"><Settings size={16} /></button>
                </div>
              </div>

              <div className="chart-layout">
                <div className="chart-col">
                  <div className="chart-panel">
                    <div className="chart-head">
                      <div>
                        <b>{symbol} · Nasdaq Futures</b>
                        <small>{timeframe} Chart · CME</small>
                      </div>
                      <div className="chart-head-right">
                        <span className="market-wait">Market data unavailable</span>
                        <button><Maximize2 size={15} /></button>
                      </div>
                    </div>

                    <div className="chart-tools">
                      <button className="tool-active"><MousePointer2 size={15} /></button>
                      <button><Crosshair size={15} /></button>
                      <button><TrendingUp size={15} /></button>
                      <button><Activity size={15} /></button>
                      <button><Target size={15} /></button>
                      <div className="vline" />
                      <button><Layers size={15} /></button>
                      <button><SlidersHorizontal size={15} /></button>
                    </div>

                    <div className="chart-canvas">
                      <div className="gridlines" />
                      <div className="axis-y">
                        <span>—</span><span>—</span><span>—</span>
                        <span>—</span><span>—</span><span>—</span>
                      </div>
                      <div className="axis-x">
                        <span>09:00</span>
                        <span>10:00</span>
                        <span>11:00</span>
                        <span>12:00</span>
                        <span>13:00</span>
                        <span>14:00</span>
                      </div>
                      <div className="chart-center">
                        <div className="chart-icon"><WifiOff size={25} /></div>
                        <b>Waiting for market data</b>
                        <span>
                          Connect an authorized market data provider to display
                          real-time {symbol} price action and chart candles.
                        </span>
                        <small>NO SIMULATED PRICES ARE DISPLAYED</small>
                      </div>
                    </div>

                    <div className="indicator-strip">
                      <span>VWAP <em>Waiting for data</em></span>
                      <span>Volume <em>Waiting for data</em></span>
                      <span>RSI <em>Waiting for data</em></span>
                    </div>
                  </div>

                  <div className="bottom-panel">
                    <div className="bottom-tabs">
                      {['Positions', 'Orders', 'Executions', 'Account', 'Trade History'].map((tab) => (
                        <button
                          key={tab}
                          className={bottomTab === tab ? 'current' : ''}
                          onClick={() => setBottomTab(tab)}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                    <div className="bottom-empty">
                      <b>No {bottomTab.toLowerCase()} to display</b>
                      <span>Connect your authorized Tradovate account to load account information.</span>
                    </div>
                  </div>
                </div>

                <div className="right-col">
                  <div className="side-panel">
                    <div className="side-head">
                      <b>DOM / MARKET DEPTH</b>
                      <span className="level2">LEVEL II</span>
                    </div>
                    <div className="dom-label">
                      <span>Bid Size</span><span>Price</span><span>Ask Size</span>
                    </div>
                    {[0, 1, 2, 3, 4].map((row) => (
                      <div className="dom-line" key={row}>
                        <b>—</b><span>—</span><b>—</b>
                      </div>
                    ))}
                    <div className="dom-foot"><WifiOff size={13} /> No depth feed</div>
                  </div>

                  <div className="side-panel">
                    <div className="side-head"><b>TRADE RADAR</b><Zap size={15} /></div>
                    <div className="radar-empty">
                      <div className="radar-ring"><Radio size={20} /></div>
                      <b>Radar standing by</b>
                      <span>Waiting for live market data and signal configuration.</span>
                    </div>
                  </div>

                  <div className="side-panel">
                    <div className="side-head"><b>QUICK TOOLS</b></div>
                    <div className="simple-empty">
                      Risk calculator and trade planning tools will be available here.
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="module-page">
              <div className="module-hero">
                <div className="module-symbol"><LineChart size={24} /></div>
                <div>
                  <div className="eyebrow">NORTHSTAR WORKSPACE</div>
                  <h2>{activePage}</h2>
                  <p>{moduleInfo?.subtitle}</p>
                </div>
              </div>

              <div className="module-status">
                <WifiOff size={19} />
                <div>
                  <b>Connection required</b>
                  <span>{moduleInfo?.description}</span>
                </div>
              </div>

              <div className="module-grid">
                <div className="module-card">
                  <Activity size={21} />
                  <b>Nasdaq Futures</b>
                  <p>Designed for NQ and MNQ workflows.</p>
                </div>
                <div className="module-card">
                  <Database size={21} />
                  <b>Data Integration</b>
                  <p>Provider authorization and data feeds are not configured yet.</p>
                </div>
                <div className="module-card">
                  <Settings size={21} />
                  <b>Workspace Tools</b>
                  <p>Platform features will be enabled as their systems are implemented.</p>
                </div>
              </div>
            </div>
          )}

          <footer>
            <span>NORTHSTAR TRADING PLATFORM</span>
            <span>NQ / MNQ · CME</span>
            <span>MARKET DATA NOT CONNECTED</span>
          </footer>
        </section>
      </main>
    </div>
  );
}

export default App;
