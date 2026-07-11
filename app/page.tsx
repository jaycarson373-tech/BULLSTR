import { SherwoodRunnerGame } from "./sherwood-runner-game";

const X_URL = process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/i/communities/2028470502415835347";

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
                Space to jump. Collect coins. Survive longer as the forest gets faster.
              </p>
              <div className="simple-how-grid" aria-label="How Sherwood Run works">
                <article>
                  <span>1</span>
                  <strong>Play</strong>
                  <p>Run as a hooded outlaw through Sherwood. Coins are your score. Logs and stumps end the run.</p>
                </article>
                <article>
                  <span>2</span>
                  <strong>Submit</strong>
                  <p>After the run, add Solana wallets that should receive the score.</p>
                </article>
                <article>
                  <span>3</span>
                  <strong>Boost</strong>
                  <p>Leaderboard wallets get a multiplier when they also qualify as Sherwood holders.</p>
                </article>
              </div>
            </div>
            <SherwoodRunnerGame />
          </div>
        </section>
      </main>
    </div>
  );
}
