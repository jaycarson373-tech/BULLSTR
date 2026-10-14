import { ArrowDownRight, ArrowUpRight, ExternalLink, Layers3, Radio, ShieldCheck, TimerReset, Zap } from "lucide-react";
import { CopyContract } from "./copy-contract";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NSTR_CA?.trim() || "";
const X_URL = process.env.NEXT_PUBLIC_NSTR_X_URL?.trim() || "";
const BUY_URL = process.env.NEXT_PUBLIC_NSTR_BUY_URL?.trim() || "https://pump.fun/";
const NEAR_PAIR_MINT = "3ZLekZYq2qkZiSpnSvabjit34tUkjSwD1JFuW9as9wBG";

const mechanics = [
  {
    icon: Layers3,
    number: "01",
    title: "NEAR PAIR",
    text: "NSTR is designed to launch with NEAR as its quote asset on Pump.fun’s custom-pair route. The pair address and market link appear here after launch."
  },
  {
    icon: Radio,
    number: "02",
    title: "TWO FEE STREAMS",
    text: "A Pump-native holder-rewards setting can be configured up to 3%. Separately, the operator can claim available creator fees for the five-minute NSTR epoch pool."
  },
  {
    icon: TimerReset,
    number: "03",
    title: "EPOCH SNAPSHOT",
    text: "At each enabled epoch, the worker snapshots eligible NSTR balances, applies the published hold multiplier, and records any completed distribution."
  }
];

const thesis = [
  ["INTENTS MAKE THE ROUTE THE PRODUCT", "NEAR Intents let applications describe an outcome and let solvers find a route across supported assets. That gives builders a practical surface for chain-abstracted trading and settlement."],
  ["NEAR HAS ROOM FOR MORE THAN ONE APP", "A growing ecosystem needs discovery, liquidity, and applications that make assets easier to reach. NSTR is a community strategy token tied to that ecosystem thesis, not a claim that one token owns or controls it."],
  ["SHOW THE FLOW", "The product is designed around visible mechanics: the quote asset, the reward rules, the epoch snapshot, and the transaction receipts. Any future distribution depends on fees actually collected and the worker being configured and funded."]
];

export default function Page() {
  return (
    <main className="site-shell nstr-shell">
      <div className="market-field" aria-hidden="true">
        <span className="nstr-scanline" />
        <span className="nstr-orbit nstr-orbit-one" />
        <span className="nstr-orbit nstr-orbit-two" />
      </div>

      <nav className="site-nav" aria-label="Primary navigation">
        <a className="brand-lockup" href="#top" aria-label="Near Strategy home">
          <span className="nstr-mark" aria-hidden="true">N</span>
          <span>NEAR STRATEGY <i>NSTR</i></span>
        </a>
        <div className="nav-links">
          <a href="#thesis">THESIS</a>
          <a href="#mechanics">MECHANICS</a>
          {X_URL ? <a href={X_URL} target="_blank" rel="noreferrer">X</a> : null}
          <a className="nav-buy" href={BUY_URL} target="_blank" rel="noreferrer">PUMP.FUN <ExternalLink size={14} /></a>
        </div>
      </nav>

      <section className="hero-section nstr-hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="live-dot" /> NEAR ECOSYSTEM THESIS · NSTR</p>
          <h1>THE NEXT MOVE<br /><em>STARTS WITH NEAR.</em></h1>
          <p className="hero-body">
            A NEAR-paired community token built around ecosystem conviction, visible fee flows, and recurring holder epochs. The thesis is simple: make NEAR easier to discover, route into, and build on.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href={BUY_URL} target="_blank" rel="noreferrer">OPEN PUMP.FUN <ArrowUpRight size={17} /></a>
            <a className="secondary-action" href="#thesis">READ THE THESIS <ArrowDownRight size={17} /></a>
            {CONTRACT_ADDRESS ? <CopyContract address={CONTRACT_ADDRESS} /> : <span className="ca-pending">CA: POSTED AFTER LAUNCH</span>}
          </div>
          <p className="mechanic-line">Preview mode. No NSTR contract address or live reward balance has been configured.</p>
        </div>

        <div className="hero-art nstr-console" aria-label="Near Strategy terminal visual">
          <div className="console-top"><span>NEAR / STRATEGY</span><span><b /> NETWORK WATCH</span></div>
          <div className="console-core">
            <div className="near-emblem">N</div>
            <div className="console-rings" aria-hidden="true"><i /><i /><i /></div>
            <div className="console-label">INTENT ROUTING <span>● SIMULATED</span></div>
          </div>
          <div className="console-stats">
            <div><small>PAIR</small><strong>NEAR</strong></div>
            <div><small>REWARD EPOCH</small><strong>05:00</strong></div>
            <div><small>STATUS</small><strong className="muted-status">PREVIEW</strong></div>
          </div>
          <div className="console-footer"><span>Fee flow visualization</span><span className="console-wave" /></div>
        </div>
      </section>

      <section className="thesis-section" id="thesis">
        <div className="section-heading">
          <p className="eyebrow">THE THESIS</p>
          <h2>INTENT IS A NEW<br />WAY TO MOVE.</h2>
          <p className="section-intro">NEAR is building toward a world where people state the outcome they want and the network finds a way to settle it. NSTR is a bet on that direction and the builders who make it real.</p>
        </div>
        <div className="thesis-grid">
          {thesis.map(([title, text], index) => (
            <article className="thesis-card" key={title}>
              <span className="card-index">0{index + 1} / FIELD NOTE</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <a className="source-link" href="https://docs.near.org/tutorials/intents/introduction" target="_blank" rel="noreferrer">NEAR INTENTS DOCUMENTATION <ExternalLink size={14} /></a>
      </section>

      <section className="how-section nstr-mechanics" id="mechanics">
        <div className="section-heading">
          <p className="eyebrow">THE MECHANICS</p>
          <h2>RULES IN THE OPEN.</h2>
          <p className="section-intro">The native Pump rewards and the five-minute NSTR epoch pool are separate mechanisms with separate schedules.</p>
        </div>
        <div className="step-grid">
          {mechanics.map(({ icon: Icon, number, title, text }) => (
            <article key={title} className="step-card">
              <span className="mechanic-icon"><Icon size={18} /> {number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <div className="reward-ledger">
          <div className="ledger-heading"><ShieldCheck size={18} /><span>REWARD DESIGN</span><span className="preview-tag">NOT LIVE</span></div>
          <div className="ledger-row"><div><b>01</b><span>Pump holder rewards</span></div><strong>UP TO 3%</strong><p>Only if selected at launch; Pump controls its distribution timing.</p></div>
          <div className="ledger-row"><div><b>02</b><span>NSTR fee epochs</span></div><strong>EVERY 5 MIN</strong><p>Separate creator-fee claims, subject to the actual fee asset, funded treasury, and enabled worker.</p></div>
          <div className="ledger-row"><div><b>03</b><span>Hold multiplier</span></div><strong>+1% / EPOCH · 2X CAP</strong><p>Starts at 1.00x and adds 0.01x after each consecutive eligible snapshot, up to 2.00x. Selling or falling below eligibility resets the streak.</p></div>
          <p className="ledger-disclosure"><Zap size={15} /> No APY or payout is promised. The preview has no deployed NSTR mint, fee receipts, or live distribution feed. Epoch rewards depend on fees collected, network costs, eligibility, and successful settlement.</p>
        </div>
        <a className="source-link pump-source" href="https://pump.fun/docs/fees" target="_blank" rel="noreferrer">PUMP.FUN FEE DOCUMENTATION <ExternalLink size={14} /></a>
      </section>

      <section className="drops-section" id="status">
        <div className="section-heading"><p className="eyebrow">SYSTEM STATUS</p><h2>BUILDING THE ROUTE.</h2></div>
        <div className="launch-banner status-banner" role="status">
          <strong><span className="status-pulse" /> PRE-LAUNCH PREVIEW</strong>
          <span>NEAR pair target: {NEAR_PAIR_MINT.slice(0, 6)}…{NEAR_PAIR_MINT.slice(-5)} · NSTR contract: pending · Claim and airdrop gates: off</span>
          <a href="https://pump.fun/docs/custom-pairs" target="_blank" rel="noreferrer">Pump.fun custom-pair reference <ExternalLink size={14} /></a>
        </div>
      </section>

      <footer className="site-footer">
        <p>Near Strategy (NSTR) is a community token concept. NEAR pairing, Pump holder rewards, and five-minute epochs require final launch settings, verified fee settlement, a configured treasury, and a tested worker. Digital assets involve risk; no reward or return is guaranteed.</p>
        <div className="footer-links"><a href="#thesis">THESIS</a><a href="#mechanics">MECHANICS</a>{X_URL ? <a href={X_URL}>X</a> : null}</div>
      </footer>
    </main>
  );
}
