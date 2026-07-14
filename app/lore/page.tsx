import { CopyCaChip } from "../ca-copy-chip";

const DEFAULT_CA = "E2U8ot8N9i6jF7f41PAQR7ofN4nStkEkjMaeA4izpump";
const CA = process.env.NEXT_PUBLIC_CA?.trim() || process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT?.trim() || DEFAULT_CA;
const X_URL = process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/HyperHood_";

function SubpageNav() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <a className="brand" href="/" aria-label="HyperHood home">
          <img className="brand-logo" src="/brand/hyperhood-logo.svg" alt="" />
          <span>HyperHood</span>
        </a>
        <nav className="nav-links" aria-label="Primary navigation">
          <a href="/">Flywheel</a>
          <a href="/dashboard">Dashboard</a>
          <a href="/leaderboard">Holders</a>
          <a href="/lore">Thesis</a>
        </nav>
        <CopyCaChip ca={CA} className="nav-ca-chip" />
        <a className="mini-button x-button" href={X_URL} target="_blank" rel="noreferrer" aria-label="Open X community">
          X
        </a>
      </div>
    </header>
  );
}

export default function LorePage() {
  return (
    <div className="page hyperhood-page">
      <SubpageNav />
      <main className="subpage-main">
        <section className="section lore-section" id="lore">
          <div className="container">
            <div className="section-kicker">HyperHood thesis</div>
            <div className="section-head split-head">
              <h2>Real revenue. Hood yield. One flywheel.</h2>
              <p>
                HyperHood adapts the real-revenue thesis for the Hood ecosystem: fees accrue to the treasury, the treasury
                routes capital into buybacks, launch liquidity, and holder airdrops, and every receipt stays visible for holders.
              </p>
            </div>
            <div className="lore-grid">
              <article className="lore-card lore-card-wide">
                <span>The Engine</span>
                <strong>Fees become fuel.</strong>
                <p>
                  Creator fees and token taxes flow into the Hood treasury. HyperHood turns that revenue into recurring
                  market support, new launch capital, and transparent holder distributions.
                </p>
              </article>
              <article className="lore-card">
                <span>Buybacks</span>
                <strong>Support the base token.</strong>
                <p>The flywheel can route revenue back into HHOOD buy pressure, keeping the main token connected to activity across the ecosystem.</p>
              </article>
              <article className="lore-card">
                <span>Launch Liquidity</span>
                <strong>Fund the next Hood launch.</strong>
                <p>Each cycle compounds toward fresh liquidity so the next Hood token can start stronger instead of relying on scattered one-off funding.</p>
              </article>
              <article className="lore-card">
                <span>Holder Access</span>
                <strong>Snapshots decide eligibility.</strong>
                <p>Qualified holders enter non-custodial snapshots for airdrops and allocation windows. No signature is required just to save a receiving address.</p>
              </article>
              <article className="lore-card">
                <span>Receipts</span>
                <strong>On-chain or it does not count.</strong>
                <p>Dashboards show settled windows, recipient counts, and transaction links so holders can follow the loop from revenue to distribution.</p>
              </article>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
