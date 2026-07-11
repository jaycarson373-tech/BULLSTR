import { CopyCaChip } from "./ca-copy-chip";
import { HomeAirdropStats } from "./home-strategy-data";
import { HowItWorksPrompt, SherwoodRunnerGame } from "./sherwood-runner-game";

const DEFAULT_CA = "E2U8ot8N9i6jF7f41PAQR7ofN4nStkEkjMaeA4izpump";
const CA = process.env.NEXT_PUBLIC_CA?.trim() || process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT?.trim() || DEFAULT_CA;
const X_URL = process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/SherwoodRun";

function MainNav() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <a className="brand" href="/" aria-label="Sherwood Run home">
          <img className="brand-logo" src="/brand/sherwood-fire-logo.png" alt="" />
          <span>Sherwood Run</span>
        </a>
        <nav className="nav-links" aria-label="Primary navigation">
          <a href="/">Play</a>
          <a href="/dashboard">Dashboard</a>
          <a href="/leaderboard">Leaderboard</a>
          <a href="/lore">Lore</a>
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
    <div className="page sherwood-run-page">
      <MainNav />
      <main className="game-home">
        <section className="home-game-hero" id="top">
          <div className="container home-game-layout">
            <div className="home-game-copy">
              <img className="home-game-logo" src="/brand/sherwood-fire-logo.png" alt="" />
              <div className="section-kicker">Sherwood</div>
              <h1>
                <span>Sherwood</span>
                <span>Run</span>
              </h1>
              <p className="hero-subtitle">
                Space to flap. Collect the gold coin in each tree gate. The forest gets faster and tighter the longer you survive.
              </p>
              <HowItWorksPrompt />
            </div>
            <HomeAirdropStats />
            <p className="hero-disclaimer">Cheaters will be blacklisted from all airdrops.</p>
            <SherwoodRunnerGame />
          </div>
        </section>
      </main>
    </div>
  );
}
