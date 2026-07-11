import { SherwoodLeaderboard } from "../sherwood-runner-game";

const X_URL = process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/SherwoodRun";

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

export default function LeaderboardPage() {
  return (
    <div className="page sherwood-run-page">
      <SubpageNav />
      <main className="subpage-main">
        <SherwoodLeaderboard />
      </main>
    </div>
  );
}
