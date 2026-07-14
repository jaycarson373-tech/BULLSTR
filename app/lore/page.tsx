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
              <h2>Fees in. HOOD out. Liquidity gets thicker.</h2>
              <p>
                HyperHood is built around a simple pool flywheel: fees strengthen a HyperHood pool with HyperHood and HoodXStock,
                buy HOOD for distributions, and compound LP fees back into deeper HH/HOOD liquidity.
              </p>
            </div>
            <div className="lore-grid">
              <article className="lore-card lore-card-wide">
                <span>The Engine</span>
                <strong>Fees split 50/50.</strong>
                <p>
                  Half of fees buy HOOD for pool-bonus airdrops when possible, or HH holders when pool routing is not available.
                  The other half is reserved to strengthen liquidity.
                </p>
              </article>
              <article className="lore-card">
                <span>Pool Bonus</span>
                <strong>HOOD gets pushed to aligned holders.</strong>
                <p>HOOD bought with fees is aimed at the pool first when possible, then HH holders, giving deeper participation a stronger bonus path.</p>
              </article>
              <article className="lore-card">
                <span>Roadmap</span>
                <strong>LP created at bond.</strong>
                <p>At bond, the HH/HOOD pool is created. From there, airdrop windows run every 15 minutes while liquidity keeps building.</p>
              </article>
              <article className="lore-card">
                <span>Compounding</span>
                <strong>LP fees go back in.</strong>
                <p>Fees earned from the LP are recycled into more liquidity, creating a leveraged HOOD exposure loop as more volume hits the pool.</p>
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
