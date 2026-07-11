import {
  AirdropHistory,
  HeroCountdown,
  HoodChart,
  HoodWalletBoard,
  HolderLookup,
  LiveProtocolDashboard,
  RecentAirdrops,
  RobinhoodHoldingsPanel,
  RobinhoodRunnerPanel,
  RewardExplanation
} from "./home-strategy-data";
import {
  FIRST_LAUNCH_WINDOW_COPY,
  FIRST_SNAPSHOT_COPY,
  LAUNCH_CADENCE_COPY,
  LAUNCH_CADENCE_TITLE,
  SNAPSHOT_WINDOW_COPY,
  TAX_SPLIT_COPY
} from "./hood-pump-config";

const X_URL = process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/i/communities/2028470502415835347";
const DEFAULT_CA = "HsD1kibhkv8e46d7FdBcE1vkY7ksjwbqgxEYSfHxpump";
const CA = process.env.NEXT_PUBLIC_CA?.trim() || process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT?.trim() || DEFAULT_CA;
const CHART_URL = process.env.NEXT_PUBLIC_HOOD_CHART_URL?.trim() || process.env.NEXT_PUBLIC_DEXSCREENER_URL?.trim() || `https://dexscreener.com/solana/${CA}`;

export default function Page() {
  return (
    <div className="page hood-strategy-page">
      <header className="nav">
        <div className="container nav-inner">
          <a className="brand" href="#top" aria-label="Hood Pump home">
            <img className="brand-logo" src="/brand/hood-strategy-logo-source.png" alt="" />
            <span>
              Hood Pump
              <small>HPUMP access</small>
            </span>
          </a>
          <nav className="nav-links" aria-label="Primary navigation">
            <a href="#how">How</a>
            <a href="#chart">Chart</a>
            <a href="#dashboard">Live</a>
            <a href="#holdings">Holdings</a>
            <a href="#runners">Launches</a>
            <a href="#wallet-board">Board</a>
            <a href="#airdrops">Access</a>
          </nav>
          <div className="nav-actions">
            <a className="ca-chip" href={CHART_URL} target="_blank" rel="noreferrer" aria-label={`Open contract ${CA}`}>
              <span>CA</span>
              <b>{CA}</b>
            </a>
            <a className="mini-button x-button" href={X_URL} target="_blank" rel="noreferrer" aria-label="Open X community">
              X Community
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="hero hood-hero" id="top">
          <div className="hero-particles" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="hero-shade" />
          <div className="container hero-inner">
            <div className="hero-copy-stack">
              <div className="hero-brand-mark" aria-hidden="true">
                <img src="/logo.png" alt="" />
              </div>
              <div className="section-kicker">HPUMP</div>
              <h1>
                <span>Hood</span>
                <span>Pump</span>
              </h1>
              <p className="hero-subtitle">Creator fees fund Robin Hood launches with a clear {TAX_SPLIT_COPY} model.</p>
              <p className="hero-lead">
                Hood Pump routes creator fees into launch rails. Holders with 2.5M+ HPUMP get presale
                access, with the first snapshot locking at {FIRST_SNAPSHOT_COPY} and the first launch window opening {FIRST_LAUNCH_WINDOW_COPY}.
              </p>
              <div className="hero-actions">
                <a className="cta" href="#lookup">
                  Verify Wallet
                </a>
                <a className="cta secondary ca-copy-button" href={CHART_URL} target="_blank" rel="noreferrer">
                  CA {CA}
                </a>
              </div>
            </div>
            <HeroCountdown />
          </div>
        </section>

        <section className="section hood-rails-section" id="rails">
          <div className="container">
            <div className="section-kicker">{LAUNCH_CADENCE_TITLE}</div>
            <div className="section-head split-head">
              <h2>Creator fees power launches, liquidity, and holder airdrops {LAUNCH_CADENCE_COPY}.</h2>
              <p>
                Hood Pump keeps the launch path obvious: tax-token flow splits into liquidity and airdrops,
                2.5M+ HPUMP holders get presale access, and live sections track countdowns, wallet verification,
                receipts, and holder status.
              </p>
            </div>
            <div className="hood-rail-grid">
              <article>
                <span>50/50</span>
                <strong>Liquidity and Airdrops</strong>
                <p>Creator fees follow the tax-token split: 50% launch liquidity and 50% holder airdrops.</p>
              </article>
              <article>
                <span>2.5M+</span>
                <strong>Holder Presale Access</strong>
                <p>Wallets holding at least 2.5M HPUMP qualify only if they stay above the minimum through the {SNAPSHOT_WINDOW_COPY}.</p>
              </article>
            </div>
          </div>
        </section>

        <RewardExplanation />
        <HoodChart />
        <LiveProtocolDashboard />
        <RobinhoodHoldingsPanel />
        <RobinhoodRunnerPanel />
        <HoodWalletBoard />
        <RecentAirdrops />
        <AirdropHistory />
        <HolderLookup />
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <img className="brand-logo" src="/brand/hood-strategy-logo-source.png" alt="" />
            <div>
              <strong>Hood Pump</strong>
              <p>HPUMP holders. Robin Hood launches {LAUNCH_CADENCE_COPY}.</p>
            </div>
          </div>
          <div className="footer-links">
            <a href={X_URL} target="_blank" rel="noreferrer">
              X Community
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
