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

const HOOD_CA = "D5exVALkCSzqFNtRMARdRF4VuQffyM8LrbTFrpqBpump";
const X_URL = process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/HoodStrategy_";
const BUY_URL = process.env.NEXT_PUBLIC_BUY_URL?.trim() || `https://pump.fun/coin/${HOOD_CA}`;
const CA = process.env.NEXT_PUBLIC_CA?.trim() || process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT?.trim() || HOOD_CA;

export default function Page() {
  return (
    <div className="page hood-strategy-page">
      <header className="nav">
        <div className="container nav-inner">
          <a className="brand" href="#top" aria-label="Hood Strategy home">
            <img className="brand-logo" src="/brand/hood-strategy-logo-source.png" alt="" />
            <span>
              Hood Strategy
              <small>HoodX engine</small>
            </span>
          </a>
          <nav className="nav-links" aria-label="Primary navigation">
            <a href="#how">How</a>
            <a href="#chart">Chart</a>
            <a href="#dashboard">Live</a>
            <a href="#holdings">Holdings</a>
            <a href="#runners">Runners</a>
            <a href="#wallet-board">Board</a>
            <a href="#airdrops">Drops</a>
          </nav>
          <div className="nav-actions">
            <a className="mini-button x-button" href={X_URL} target="_blank" rel="noreferrer" aria-label="Open X">
              X
            </a>
            <a className="cta" href={BUY_URL} target="_blank" rel="noreferrer">
              Buy
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="hero hood-hero" id="top">
          <div className="hero-shade" />
          <div className="container hero-inner">
            <div className="hero-copy-stack">
              <div className="section-kicker">Hood Strategy</div>
              <h1>
                <span>Hood</span>
                <span>Strategy</span>
              </h1>
              <p className="hero-subtitle">HoodX airdrops every 5 minutes. Early Hood chain picks every 2 hours.</p>
              <p className="hero-lead">
                The 50/50 engine splits rewards between active HoodX holders and the Robinhood runner basket,
                with a live pick countdown, winner receipts, and on-chain reward history kept on the page.
              </p>
              <div className="hero-actions">
                <a className="cta" href={BUY_URL} target="_blank" rel="noreferrer">
                  Enter Strategy
                </a>
                <a className="cta secondary ca-copy-button" href="#rails">
                  CA: {CA}
                </a>
              </div>
            </div>
            <HeroCountdown />
          </div>
        </section>

        <section className="section hood-rails-section" id="rails">
          <div className="container">
            <div className="section-kicker">50/50 thing</div>
            <div className="section-head split-head">
              <h2>Half to HoodX holders. Half to early Hood chain picks.</h2>
              <p>
                The page keeps the split obvious: holder airdrops run on the fast five-minute rail,
                while the Robinhood runner basket highlights early Hood chain positions and picks one winner every two hours.
                Holders must be active in C to verify.
              </p>
            </div>
            <div className="hood-rail-grid">
              <article>
                <span>50%</span>
                <strong>HoodX Holder Airdrop</strong>
                <p>Airdrops active HoodX holders every 5 minutes through the live reward backend. Must be active in C to verify.</p>
              </article>
              <article>
                <span>50%</span>
                <strong>Robinhood Runners</strong>
                <p>Tracks early Hood chain runner positions and picks one verified holder every 2 hours for the next prize.</p>
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
              <strong>Hood Strategy</strong>
              <p>HoodX rewards. Hood chain picks.</p>
            </div>
          </div>
          <div className="footer-links">
            <a href={X_URL} target="_blank" rel="noreferrer">
              X
            </a>
            <a href={BUY_URL} target="_blank" rel="noreferrer">
              Buy
            </a>
            <span>{CA}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
