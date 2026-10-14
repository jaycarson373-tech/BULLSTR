import { CopyContract } from './copy-contract';
import { StrategyLab, NearMarket } from './strategy-lab';
import { RewardHistory, RewardSignal } from './reward-history';
const CA = process.env.NEXT_PUBLIC_NSTR_CA?.trim() || '';
const X = process.env.NEXT_PUBLIC_NSTR_X_URL?.trim() || '';
const BUY = process.env.NEXT_PUBLIC_NSTR_BUY_URL?.trim() || (CA ? 'https://pump.fun/coin/'+encodeURIComponent(CA) : '');
const thesis = [
  ['01','NEAR Intents','Applications request an outcome across supported networks. Solvers handle the route.'],
  ['02','An expanding ecosystem','Trading tools, launchpads and agents can build on shared cross-chain infrastructure.'],
  ['03','A defined holder strategy','NSTR brings that community thesis together with transparent, fee-funded reward rules.'],
];
export default function Page() {
  return <div className="site-shell">
    <header className="site-nav">
      <a className="brand-lockup" href="#top"><img src="/favicon.svg" width="34" height="34" alt=""/><span>Near Strategy<small>NSTR</small></span></a>
      <nav aria-label="Main"><a href="#thesis">Thesis</a><a href="#rewards">Rewards</a><a href="#docs">Details</a>{X&&<a href={X} target="_blank" rel="noreferrer" aria-label="Near Strategy on X">X</a>}</nav>
      <span className="launch-state"><i/>{CA?'Mint configured':'Preparing for launch'}</span>
    </header>
    <main id="top">
      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow">NEAR-PAIRED / SOLANA COMMUNITY TOKEN</div>
          <h1>Near<br/><em>Strategy.</em></h1>
          <p className="hero-body">A community thesis on NEAR, with creator-fee rewards weighted by consecutive holding.</p>
          <div className="hero-actions"><a className="primary-action" href="#rewards">How rewards work</a><a className="secondary-action" href="#thesis">Read the thesis</a>{BUY&&<a className="secondary-action" href={BUY} target="_blank" rel="noreferrer">View market</a>}</div>
          <div className="ca-line">{CA?<CopyContract address={CA}/>:<><b>CA</b><span>Published at launch</span></>}</div>
        </div>
        <aside className="strategy-summary" aria-label="NSTR reward framework">
          <div className="summary-header"><span>THE REWARD FRAMEWORK</span><RewardSignal variant="badge"/></div>
          <div className="summary-feature"><span>Eligible holding. Greater weight.</span><strong>1.00<span>–</span>2.00<small>x</small></strong><p>Consecutive snapshots increase your weight in a collected reward pool.</p></div>
          <dl className="summary-rules"><div><dt>Epoch schedule</dt><dd>Every 5 minutes</dd></div><div><dt>Pool funding</dt><dd>Collected creator fees</dd></div><div><dt>Allocation</dt><dd>Balance × hold weight</dd></div></dl>
          <a className="summary-link" href="#weight-model">Explore the weight model <span aria-hidden="true">↗</span></a>
        </aside>
      </section>
      <NearMarket/>
      <section className="thesis-section" id="thesis">
        <div className="section-heading"><div><span className="eyebrow">THE THESIS</span><h2>A strategy around<br/>NEAR infrastructure.</h2></div><p>NSTR is an independent community token focused on the NEAR ecosystem and the applications being built around it.</p></div>
        <div className="thesis-grid">{thesis.map(([number,title,text])=><article key={number}><span className="card-index">{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
        <a className="source-link" href="https://docs.near-intents.org/" target="_blank" rel="noreferrer">Read the NEAR Intents documentation ↗</a>
      </section>
      <section className="rewards-section" id="rewards">
        <div className="section-heading"><div><span className="eyebrow">THE REWARD DESIGN</span><h2>Creator fees,<br/>allocated to holders.</h2></div><p>Each funded epoch follows the same process: collect, snapshot and distribute. Rewards depend on fees actually received.</p></div>
        <div className="reward-flow">
          <article><div className="flow-number">01</div><h3>Collect the fees</h3><p>Available creator fees enter the dedicated treasury. The received asset and amount are recorded.</p></article>
          <article><div className="flow-number">02</div><h3>Weight the holders</h3><p>Five-minute snapshots apply each eligible balance and its consecutive-hold multiplier.</p></article>
          <article><div className="flow-number">03</div><h3>Distribute the pool</h3><p>The collected pool is allocated proportionally. Completed transfers provide the reward receipts.</p></article>
        </div>
        <div className="model-section" id="weight-model"><div className="model-copy"><span className="eyebrow">THE HOLD MULTIPLIER</span><h2>See how your<br/>weight changes.</h2><p>Start at 1.00x. Each additional consecutive eligible snapshot adds 0.01x, up to 2.00x at 101 snapshots.</p><p>A balance decrease or missed eligibility resets the streak. Greater weight changes your share of a funded pool; it does not create a fixed return.</p></div><StrategyLab/></div>
        <RewardSignal variant="note"/>
        <RewardHistory/>
      </section>
      <section className="docs-section" id="docs"><div><span className="eyebrow">PROJECT DETAILS</span><h2>Simple rules.<br/>Clear boundaries.</h2></div><div className="faq">
        <details><summary>What does NEAR-paired mean?</summary><p>NSTR is a Solana token targeting a supported NEAR quote asset. Pairing does not make it a native NEAR-chain token. The exact pair and market will be verified at launch.</p></details>
        <details><summary>How do the five-minute epochs work?</summary><p>The configured NSTR worker claims available creator fees, snapshots eligible holders and allocates the funded pool by weighted balance. Empty or unsettled pools do not produce a payment.</p></details>
        <details><summary>What about the separate 3% holder rewards?</summary><p>If enabled in the token's supported launch settings, Pump-native holder rewards are separate from NSTR's epoch pool. Pump controls their schedule; they are not a five-minute payout promise.</p></details>
        <details><summary>Where will I verify rewards?</summary><p>Completed distributions will need public transfer receipts from the configured worker. Reward amounts and payment history will appear only after actual settlement.</p></details>
      </div></section>
    </main>
    <footer><a className="brand-lockup" href="#top"><img src="/favicon.svg" width="25" height="25" alt=""/>Near Strategy</a><RewardSignal variant="footer"/><a href="https://docs.near-intents.org/" target="_blank" rel="noreferrer">NEAR Intents ↗</a></footer>
  </div>;
}
