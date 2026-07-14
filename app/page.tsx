import { FeeLoopChart, HomeAirdropStats, ProtocolTopStrip } from "./home-strategy-data";
import { SiteNav } from "./site-nav";

const DEFAULT_CA = "E2U8ot8N9i6jF7f41PAQR7ofN4nStkEkjMaeA4izpump";
const CA = process.env.NEXT_PUBLIC_CA?.trim() || process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT?.trim() || DEFAULT_CA;
const BUY_URL = process.env.NEXT_PUBLIC_BUY_URL?.trim() || `https://pump.fun/coin/${CA}`;

export default function Page() {
  return (
    <div className="page hyperhood-page">
      <SiteNav />
      <main className="hyperhood-home">
        <section className="hyperhood-landing" id="top">
          <div className="landing-fx" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <ProtocolTopStrip />
          <div className="container hyperhood-landing-layout">
            <div className="hyperhood-hero-copy">
              <img className="hyperhood-hero-logo" src="/brand/hyperhood-logo.png" alt="" />
              <div className="section-kicker">HyperHood</div>
              <h1>
                <span>THE PERPETUAL</span>
                <span>LONG ON HOOD.</span>
              </h1>
              <p className="hero-subtitle">
                Every trade buys more Robinhood stock and builds deeper HH/HOOD liquidity.
              </p>
              <p className="hero-tagline">LIQUIDITY GETS THICK.</p>
              <div className="hero-actions">
                <a className="cta" href={BUY_URL} target="_blank" rel="noreferrer">BUY HYPERHOOD</a>
                <a className="cta cta-secondary" href="#flywheel">VIEW LIVE FLYWHEEL</a>
              </div>
            </div>
            <div className="hyperhood-hero-panel">
              <HomeAirdropStats />
              <div className="hero-split-grid" aria-label="HyperHood fee split">
                <article>
                  <span>50%</span>
                  <strong>HOOD AIRDROPS</strong>
                  <p>Creator fees buy fractional HOOD stock and airdrop it to eligible holders.</p>
                </article>
                <article>
                  <span>50%</span>
                  <strong>ADDED TO LP</strong>
                  <p>Creator fees add HH and HOOD into liquidity so the pool gets deeper.</p>
                </article>
                <article>
                  <span>∞</span>
                  <strong>LP FEES COMPOUND FOREVER</strong>
                  <p>LP fees recycle back into liquidity, then the flywheel repeats.</p>
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
