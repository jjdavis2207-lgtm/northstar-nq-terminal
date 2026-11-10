import {useState} from 'react';
import {Activity,AlignLeft,ArrowDownUp,BarChart3,BookOpen,BrainCircuit,ChevronDown,CircleHelp,Clock3,Crosshair,Database,Expand,Flame,Layers,LineChart,Maximize2,Menu,MousePointer2,Play,Radio,RefreshCw,Search,Settings,Shield,SlidersHorizontal,Sparkles,Target,TrendingUp,Volume2,WifiOff,Zap} from 'lucide-react';

const sections = [
  ["WORKSPACE",["Chart","Deep Flow","Deep Trades","Deep Radar","Deep Zones","DeepGamma"]],
  ["RESEARCH",["Replay","Backtester","Historical Data","Pattern Builder","Weekly Levels"]],
  ["TOOLS",["Indicators","Big Trades","Risk Manager","Trade Journal","AI Assistant"]],
  ["COMMUNITY",["Orderflow Course","Deeptrader Cup","Profile Framing","Community"]]
];
const featureInfo:Record<string,string>={
"Chart":"Advanced candlestick and footprint chart workspace for NQ and MNQ.",
"Deep Flow":"Order-flow analysis: bid/ask volume, delta, cumulative delta, imbalance and absorption.",
"Deep Trades":"MBO-based large-trade and passive-liquidity interaction analysis.",
"Deep Radar":"Market scanner for volatility expansion, volume surges, liquidity events and level proximity.",
"Deep Zones":"Automatically derived supply, demand, high-volume and reaction zones.",
"DeepGamma":"Options-derived gamma exposure, dealer levels, gamma bands and option-flow analytics.",
"Replay":"Historical market replay with synchronized price, tape, depth and order-flow events.",
"Backtester":"Granular historical strategy testing with fees, slippage and out-of-sample evaluation.",
"Historical Data":"Multi-year NQ/MNQ historical data catalog and download/replay workspace.",
"Pattern Builder":"Visual rule builder for setups, triggers, stops, targets and strategy testing.",
"Weekly Levels":"Workspace for weekly NQ/MNQ levels, notes and reactions.",
"Indicators":"Order-flow and technical indicator library.",
"Big Trades":"Large executed trade detection using configurable thresholds.",
"Risk Manager":"Position sizing, daily loss limits, max drawdown and trade risk controls.",
"Trade Journal":"Trade capture, screenshots, tags, statistics and review.",
"AI Assistant":"Trading research assistant with explainable analysis and journal context.",
"Orderflow Course":"Course library placeholder for original Northstar learning content.",
"Deeptrader Cup":"Competition access placeholder; no third-party membership is included.",
"Profile Framing":"Coaching booking placeholder; no third-party sessions are included.",
"Community":"Community and discussion workspace placeholder."
};
const statusText:Record<string,string>={"Chart":"Awaiting licensed feed","Deep Flow":"Requires trade data","Deep Trades":"Requires MBO data","Deep Radar":"Requires live feed","Deep Zones":"Requires history","DeepGamma":"Requires options data","Replay":"Requires historical tick data","Backtester":"Requires historical tick data","Historical Data":"Provider not connected","Pattern Builder":"Rule editor scaffold","Weekly Levels":"Workspace ready","Indicators":"Library scaffold","Big Trades":"Requires trade data","Risk Manager":"Local tools scaffold","Trade Journal":"Local tools scaffold","AI Assistant":"Not activated","Orderflow Course":"Content placeholder","Deeptrader Cup":"External service","Profile Framing":"External service","Community":"Not connected"};
function App(){
 const [active,setActive]=useState("Chart");const [symbol,setSymbol]=useState("NQ");const [tf,setTf]=useState("5m");const [bottom,setBottom]=useState("Time & Sales");const [search,setSearch]=useState("");const [showMenu,setShowMenu]=useState(false);
 const all=sections.flatMap(s=>s[1] as string[]);const filtered=all.filter(x=>x.toLowerCase().includes(search.toLowerCase()));
 return <div className="shell">
  <aside className="sidebar">
   <div className="logo"><div className="logo-icon"><Activity size={21}/></div><div><b>NORTHSTAR</b><small>ORDERFLOW TERMINAL</small></div><button className="collapse" onClick={()=>setShowMenu(!showMenu)}><Menu size={16}/></button></div>
   <div className="search"><Search size={14}/><input placeholder="Search tools..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
   <nav>{sections.map(([group,items])=><div className="nav-group" key={group as string}><label>{group as string}</label>{(items as string[]).filter(x=>!search||filtered.includes(x)).map(item=><button key={item} className={active===item?'nav active':'nav'} onClick={()=>setActive(item)}><span className="nav-dot"/>{item}{item==="AI Assistant"&&<span className="new">AI</span>}</button>)}</div>)}</nav>
   <div className="sidebar-foot"><div className="connection"><span className="red-dot"/><div><b>Market feed offline</b><small>Connect licensed CME data</small></div></div><div className="profile"><div className="avatar">N</div><div><b>Northstar Workspace</b><small>Local profile</small></div><Settings size={15}/></div></div>
  </aside>
  <main className="main">
   <header className="top"><div className="breadcrumbs">Northstar <span>/</span> {active}</div><div className="topright"><span className="offline"><i/> NOT CONNECTED</span><button className="topicon"><CircleHelp size={16}/></button><button className="topicon"><Settings size={16}/></button></div></header>
   <div className="toolbar"><div className="symbol"><button className={symbol==="NQ"?"chosen":""} onClick={()=>setSymbol("NQ")}>NQ</button><button className={symbol==="MNQ"?"chosen":""} onClick={()=>setSymbol("MNQ")}>MNQ</button><ChevronDown size={13}/><span className="exchange">CME</span></div><div className="tool-sep"/><div className="tf">{["1m","3m","5m","15m","30m","1h","4h","D"].map(x=><button className={tf===x?"sel":""} onClick={()=>setTf(x)} key={x}>{x}</button>)}</div><div className="tool-sep"/><button className="toolbtn"><CandlesIcon/> Chart Type</button><button className="toolbtn"><SlidersHorizontal size={14}/> Indicators</button><button className="toolbtn"><Layers size={14}/> Layout</button><div className="push"/><button className="toolbtn"><Maximize2 size={14}/> Expand</button></div>
   <div className="content">
    <div className="headline"><div><div className="eyebrow">NASDAQ-100 FUTURES · {symbol}</div><h1>{active==="Chart"?"Market Workspace":active}</h1><p>{featureInfo[active]}</p></div><div className="headline-actions"><span className="status-chip">{statusText[active]||"In development"}</span><button className="settings-btn"><Settings size={15}/></button></div></div>
    {active==="Chart"||active==="Deep Flow"||active==="Deep Trades"||active==="Deep Radar"||active==="Deep Zones"||active==="DeepGamma"?<div className="chart-layout">
     <div className="chart-col">
      <div className="chart-panel">
       <div className="chart-head"><div><b>{symbol} · {active==="Chart"?"Candlestick":active}</b><small>Continuous contract · {tf}</small></div><div className="chart-head-right"><span className="market-wait">● Awaiting market data</span><button><Expand size={14}/></button></div></div>
       <div className="chart-tools"><button className="tool-active"><MousePointer2 size={15}/></button><button><Crosshair size={15}/></button><button><TrendingUp size={15}/></button><button><AlignLeft size={15}/></button><button><Target size={15}/></button><span className="vline"/><button><LineChart size={15}/></button><button><Volume2 size={15}/></button><button><Layers size={15}/></button></div>
       <div className="chart-canvas"><div className="gridlines"/><div className="chart-center"><div className="chart-icon"><LineChart size={34}/></div><b>Waiting for authorized real-time CME data</b><span>Live candles, footprint, delta and liquidity overlays are disabled until a genuine feed is connected.</span><small>{symbol} · {tf} · No simulated prices</small></div><div className="axis-y"><span>— —</span><span>— —</span><span>— —</span><span>— —</span><span>— —</span></div><div className="axis-x"><span>09:00</span><span>10:00</span><span>11:00</span><span>12:00</span><span>13:00</span></div></div>
       <div className="indicator-strip"><span><i/> VWAP <em>Not loaded</em></span><span><i/> CVD <em>Needs trades</em></span><span><i/> Delta <em>Needs trades</em></span><span><i/> Volume Profile <em>Needs history</em></span></div>
      </div>
      <div className="bottom-panel"><div className="bottom-tabs">{["Time & Sales","Footprint","Volume Profile","Cumulative Delta","Replay","Trade Journal"].map(x=><button className={bottom===x?"current":""} onClick={()=>setBottom(x)} key={x}>{x}</button>)}</div><div className="bottom-empty"><Clock3 size={17}/><b>{bottom} is waiting for data</b><span>Connect the authorized feed and select the relevant data schema to populate this panel.</span></div></div>
     </div>
     <aside className="right-col">
      <div className="side-panel"><div className="side-head"><b>DOM · Market Depth</b><span className="level2">LEVEL 2</span></div><div className="dom-label"><span>BID SIZE</span><span>PRICE</span><span>ASK SIZE</span></div>{Array.from({length:13},(_,i)=><div className="dom-line" key={i}><span>—</span><b>— —</b><span>—</span></div>)}<div className="dom-foot"><WifiOff size={14}/> Market depth unavailable</div></div>
      <div className="side-panel"><div className="side-head"><b>Deep Radar</b><Radio size={15}/></div><div className="radar-empty"><div className="radar-ring"><Activity size={22}/></div><b>No active signals</b><span>Radar starts after data connection</span></div></div>
      <div className="side-panel"><div className="side-head"><b>Big Trades</b><Flame size={15}/></div><div className="simple-empty">Large trade detector awaiting prints</div></div>
     </aside>
    </div>:<div className="module-page">
      <div className="module-hero"><div className="module-symbol"><BrainCircuit size={26}/></div><div><span className="eyebrow">NORTHSTAR MODULE</span><h2>{active}</h2><p>{featureInfo[active]}</p></div></div>
      <div className="module-status"><Shield size={18}/><div><b>{statusText[active]}</b><span>This module is part of the Northstar build plan. It will be activated when its data, calculations, or service integration is implemented and validated.</span></div></div>
      <div className="module-grid"><div className="module-card"><Database size={20}/><b>Data requirements</b><p>Uses licensed CME futures data for NQ/MNQ. Advanced MBO and depth features require compatible feed schemas and exchange permissions.</p></div><div className="module-card"><Settings size={20}/><b>Configurable workspace</b><p>Settings, thresholds, layouts and saved templates will be configurable in this module.</p></div><div className="module-card"><RefreshCw size={20}/><b>Validation before signals</b><p>Signal logic will be tested against historical data and shown with transparent definitions, timestamps and limitations.</p></div></div>
    </div>}
    <footer><span>NORTHSTAR v0.3</span><span>Independent software · Not affiliated with DeepCharts</span><span>NQ / MNQ only</span></footer>
   </div>
  </main>
 </div>
}
function CandlesIcon(){return <BarChart3 size={14}/>}
export default App;