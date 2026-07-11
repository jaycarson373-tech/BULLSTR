import {
  AirdropHistory,
  HeroCountdown,
  SherwoodChart,
  SherwoodWalletBoard,
  HolderLookup,
  LiveProtocolDashboard,
  RecentAirdrops,
  SherwoodHoldingsPanel,
  SherwoodRunnerPanel,
  RewardExplanation
} from "./home-strategy-data";
import { SherwoodRunnerGame } from "./sherwood-runner-game";
import {
  FIRST_LAUNCH_WINDOW_COPY,
  FIRST_SNAPSHOT_COPY,
  LAUNCH_CADENCE_COPY,
  LAUNCH_CADENCE_TITLE,
  SNAPSHOT_WINDOW_COPY,
  TAX_SPLIT_COPY
} from "./sherwood-config";

const X_URL = process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/i/communities/2028470502415835347";
const DEFAULT_CA = "";
const CA = process.env.NEXT_PUBLIC_CA?.trim() || process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT?.trim() || DEFAULT_CA;
const CHART_URL = process.env.NEXT_PUBLIC_SHERWOOD_CHART_URL?.trim() || process.env.NEXT_PUBLIC_DEXSCREENER_URL?.trim() || (CA ? `https://dexscreener.com/solana/${CA}` : "https://dexscreener.com/solana");

export default function Page() {
  return (
    <div className="page sherwood-run-page">
      <header className="nav">
        <div className="container nav-inner">
          <a className="brand" href="#top" aria-label="Sherwood Run home">
            <img className="brand-logo" src="/brand/sherwood-fire-logo.png" alt="" />
            <span>
              Sherwood Run
            </span>
          </a>
          <nav className="nav-links" aria-label="Primary navigation">
            <a href="#how">How</a>
            <a href="#lore">Lore</a>
            <a href="#chart">Chart</a>
            <a href="#dashboard">Live</a>
            <a href="#holdings">Holdings</a>
            <a href="#sherwood">Game</a>
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
        <section className="hero sherwood-hero" id="top">
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
                <img src="/brand/sherwood-fire-logo.png" alt="" />
              </div>
              <div className="section-kicker">Sherwood</div>
              <h1>
                <span>Sherwood</span>
                <span>Run</span>
              </h1>
              <p className="hero-subtitle">Creator fees fund Sherwood Run launches with a clear {TAX_SPLIT_COPY} model.</p>
              <p className="hero-lead">
                Sherwood Run routes creator fees into launch rails. Holders with 2.5M+ Sherwood get presale
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

        <section className="section sherwood-rails-section" id="rails">
          <div className="container">
            <div className="section-kicker">{LAUNCH_CADENCE_TITLE}</div>
            <div className="section-head split-head">
              <h2>Creator fees power launches, liquidity, and holder airdrops {LAUNCH_CADENCE_COPY}.</h2>
              <p>
                Sherwood Run keeps the launch path obvious: tax-token flow splits into liquidity and airdrops,
                2.5M+ Sherwood holders get presale access, and live sections track countdowns, wallet verification,
                receipts, and holder status.
              </p>
            </div>
            <div className="sherwood-rail-grid">
              <article>
                <span>50/50</span>
                <strong>Liquidity and Airdrops</strong>
                <p>Creator fees follow the tax-token split: 50% launch liquidity and 50% holder airdrops.</p>
              </article>
              <article>
                <span>2.5M+</span>
                <strong>Holder Presale Access</strong>
                <p>Wallets holding at least 2.5M Sherwood qualify only if they stay above the minimum through the {SNAPSHOT_WINDOW_COPY}.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section lore-section" id="lore">
          <div className="container">
            <div className="section-kicker">Robin Hood lore</div>
            <div className="section-head split-head">
              <h2>Run the forest. Outscore the Sheriff. Share the spoils.</h2>
              <p>
                Sherwood Run pulls from the old Robin Hood myth: a hidden camp in Sherwood, a greedy Sheriff guarding the treasury,
                and fast-moving outlaws taking value back for the people. Here, that legend becomes a playable on-chain arcade loop.
              </p>
            </div>
            <div className="lore-grid">
              <article className="lore-card lore-card-wide">
                <span>The Story</span>
                <strong>Sherwood is the hideout.</strong>
                <p>
                  Players sprint through the forest, dodge fallen logs, collect Sheriff coins, and fire arrows at tax wagons.
                  The higher the loot and distance, the stronger the leaderboard position.
                </p>
              </article>
              <article className="lore-card">
                <span>The Game</span>
                <strong>Play first.</strong>
                <p>Start a run, jump with space or tap, fire with F or release, and chase the best loot score before submitting wallets.</p>
              </article>
              <article className="lore-card">
                <span>The Wallets</span>
                <strong>Submit after.</strong>
                <p>After a run, add one main Solana wallet plus optional extra wallets. Each valid wallet receives that run score.</p>
              </article>
              <article className="lore-card">
                <span>The Board</span>
                <strong>Rank matters.</strong>
                <p>The leaderboard stores each wallet's best loot, best distance, run count, and multiplier tier from Supabase.</p>
              </article>
              <article className="lore-card">
                <span>The Airdrop</span>
                <strong>Holders get boosted.</strong>
                <p>Every 30-minute airdrop checks eligible Sherwood holders, then applies the leaderboard multiplier to matching wallets.</p>
              </article>
            </div>
          </div>
        </section>

        <RewardExplanation />
        <SherwoodChart />
        <LiveProtocolDashboard />
        <SherwoodHoldingsPanel />
        <SherwoodRunnerGame />
        <SherwoodRunnerPanel />
        <SherwoodWalletBoard />
        <RecentAirdrops />
        <AirdropHistory />
        <HolderLookup />
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <img className="brand-logo" src="/brand/sherwood-fire-logo.png" alt="" />
            <div>
              <strong>Sherwood Run</strong>
              <p>Sherwood holders. Sherwood Run launches {LAUNCH_CADENCE_COPY}.</p>
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
