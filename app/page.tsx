import { CopyCaChip } from "./ca-copy-chip";
import { FeeLoopChart, HomeAirdropStats } from "./home-strategy-data";
import { HowItWorksPrompt, HyperHoodRunnerGame } from "./hyperhood-runner-game";

const DEFAULT_CA = "E2U8ot8N9i6jF7f41PAQR7ofN4nStkEkjMaeA4izpump";
const CA = process.env.NEXT_PUBLIC_CA?.trim() || process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT?.trim() || DEFAULT_CA;
const X_URL = process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/HyperHood_";

function MainNav() {
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
        <div className="nav-actions">
          <CopyCaChip ca={CA} className="nav-ca-chip" />
          <a className="mini-button x-button" href={X_URL} target="_blank" rel="noreferrer" aria-label="Open X community">
            X
          </a>
        </div>
      </div>
    </header>
  );
}

export default function Page() {
  return (
    <div className="page hyperhood-page">
      <MainNav />
      <main className="game-home">
        <section className="home-game-hero" id="top">
          <div className="container home-game-layout">
            <div className="home-game-copy">
              <img className="home-game-logo" src="/brand/hyperhood-logo.svg" alt="" />
              <div className="section-kicker">HyperHood</div>
              <h1>
                <span>Hyper</span>
                <span>Hood</span>
              </h1>
              <p className="hero-subtitle">
                Fees turn into HOOD airdrops and thicker HH/HOOD liquidity. Half feeds holders, half reinforces the pool.
              </p>
              <HowItWorksPrompt />
            </div>
            <HomeAirdropStats />
            <FeeLoopChart />
            <p className="hero-disclaimer">Non-custodial snapshots. No wallet signature required for address submission.</p>
            <HyperHoodRunnerGame />
          </div>
        </section>
      </main>
    </div>
  );
}
