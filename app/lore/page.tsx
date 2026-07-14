import { SiteNav } from "../site-nav";

export default function LorePage() {
  return (
    <div className="page hyperhood-page">
      <SiteNav />
      <main className="subpage-main">
        <section className="section lore-section" id="lore">
          <div className="container">
            <div className="section-kicker">Hood Thesis</div>
            <div className="section-head split-head">
              <h2>The perpetual long on HOOD.</h2>
              <p>
                Every trade buys more Robinhood stock, airdrops eligible holders, and builds deeper HH/HOOD liquidity.
              </p>
            </div>
            <div className="lore-grid">
              <article className="lore-card lore-card-wide">
                <span>Fee Split</span>
                <strong>Fees split 50/50.</strong>
                <p>
                  Half of creator fees buy HOOD for holder airdrops. The other half adds HH/HOOD liquidity.
                </p>
              </article>
              <article className="lore-card">
                <span>Airdrop Holders</span>
                <strong>HOOD gets sent to eligible holders.</strong>
                <p>Purchased HOOD is distributed from recorded on-chain events. No fake values, no hidden accounting.</p>
              </article>
              <article className="lore-card">
                <span>Roadmap</span>
                <strong>LP created at bond.</strong>
                <p>At bond, the HH/HOOD pool is created. From there, distributions run every 15 minutes while liquidity keeps building.</p>
              </article>
              <article className="lore-card">
                <span>Compounding</span>
                <strong>Compound LP fees.</strong>
                <p>LP fees recycle into more liquidity, creating a long HOOD exposure loop as more volume hits the pool.</p>
              </article>
              <article className="lore-card">
                <span>Receipts</span>
                <strong>On-chain or it does not count.</strong>
                <p>Dashboards show settled distributions, recipient counts, and transaction links so holders can follow the loop.</p>
              </article>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
