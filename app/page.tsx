import { FeeLoopChart, HomeAirdropStats, ProtocolTopStrip } from "./home-strategy-data";
import { SiteNav } from "./site-nav";

export default function Page() {
  return (
    <div className="page hyperhood-page">
      <SiteNav />
      <main className="hyperhood-home">
        <section className="hyperhood-landing" id="top">
          <ProtocolTopStrip />
          <div className="container hyperhood-landing-layout">
            <div className="hyperhood-hero-copy">
              <img className="hyperhood-hero-logo" src="/brand/hyperhood-logo.png" alt="" />
              <div className="section-kicker">HyperHood</div>
              <h1>
                <span>Liquidity</span>
                <span>gets thick.</span>
              </h1>
              <p className="hero-subtitle">
                HyperHood routes fees into HOOD airdrops and HH/HOOD liquidity. The pool gets deeper, LP fees compound back in, and aligned holders track the flywheel from one clean dashboard.
              </p>
              <div className="hero-actions">
                <a className="cta" href="/dashboard">Open Dashboard</a>
                <a className="cta cta-secondary" href="/lore">Read Hood Thesis</a>
              </div>
            </div>
            <div className="hyperhood-hero-panel">
              <HomeAirdropStats />
              <div className="hero-split-grid" aria-label="HyperHood fee split">
                <article>
                  <span>50%</span>
                  <strong>HOOD airdrops</strong>
                  <p>Fees buy HOOD for pool-bonus distributions when possible, or HH holders when routing requires it.</p>
                </article>
                <article>
                  <span>50%</span>
                  <strong>LP reinforcement</strong>
                  <p>Fees add 25% HH and 25% HOOD back into the pool, then LP fees compound depth again.</p>
                </article>
              </div>
            </div>
            <FeeLoopChart />
          </div>
        </section>
      </main>
    </div>
  );
}
