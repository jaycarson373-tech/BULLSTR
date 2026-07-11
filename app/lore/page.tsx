const X_URL = process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/i/communities/2028470502415835347";

function SubpageNav() {
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
        <a className="mini-button x-button" href={X_URL} target="_blank" rel="noreferrer" aria-label="Open X community">
          X
        </a>
      </div>
    </header>
  );
}

export default function LorePage() {
  return (
    <div className="page sherwood-run-page">
      <SubpageNav />
      <main className="subpage-main">
        <section className="section lore-section" id="lore">
          <div className="container">
            <div className="section-kicker">Robin Hood lore</div>
            <div className="section-head split-head">
              <h2>Run the forest. Outscore the Sheriff. Share the spoils.</h2>
              <p>
                Sherwood Run pulls from the Robin Hood myth: a hidden camp in Sherwood Forest, a greedy Sheriff guarding
                the treasury, and fast outlaws taking value back for the people. The site turns that story into a simple
                runner where play, rank, and holder airdrops connect.
              </p>
            </div>
            <div className="lore-grid">
              <article className="lore-card lore-card-wide">
                <span>The Legend</span>
                <strong>Sherwood is the hideout.</strong>
                <p>
                  Robin Hood stories are built around a forest crew beating an unfair treasury. Sherwood Run keeps that
                  spirit: the runner breaks through the woods, grabs coins, and climbs the public board.
                </p>
              </article>
              <article className="lore-card">
                <span>The Game</span>
                <strong>Jump for loot.</strong>
                <p>Press space, tap, or click to jump through Sherwood. Coins increase score. Logs and tree stumps end the run. The speed rises over time.</p>
              </article>
              <article className="lore-card">
                <span>The Wallets</span>
                <strong>Submit after.</strong>
                <p>After a run, submit one main Solana wallet and optional extra wallets. Each valid wallet receives the run score.</p>
              </article>
              <article className="lore-card">
                <span>The Board</span>
                <strong>Rank matters.</strong>
                <p>Top wallets get multiplier tiers from the game leaderboard: first, second, third, top ten, then base weight.</p>
              </article>
              <article className="lore-card">
                <span>The Airdrop</span>
                <strong>Holders get boosted.</strong>
                <p>Every 30-minute airdrop checks eligible Sherwood holders and applies leaderboard multipliers to matching wallets.</p>
              </article>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
