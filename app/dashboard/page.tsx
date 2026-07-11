import { AirdropHistory, LiveProtocolDashboard, RecentAirdrops } from "../home-strategy-data";

const DEFAULT_CA = "E2U8ot8N9i6jF7f41PAQR7ofN4nStkEkjMaeA4izpump";
const CA = process.env.NEXT_PUBLIC_CA?.trim() || process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT?.trim() || DEFAULT_CA;
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
        <a className="ca-chip nav-ca-chip" href={`https://dexscreener.com/solana/${CA}`} target="_blank" rel="noreferrer" aria-label="Open Sherwood Run contract address on DexScreener">
          <span>CA</span>
          <b>{CA}</b>
        </a>
        <a className="mini-button x-button" href={X_URL} target="_blank" rel="noreferrer" aria-label="Open X community">
          X
        </a>
      </div>
    </header>
  );
}

export default function DashboardPage() {
  return (
    <div className="page sherwood-run-page">
      <SubpageNav />
      <main className="subpage-main">
        <LiveProtocolDashboard />
        <RecentAirdrops />
        <AirdropHistory />
      </main>
    </div>
  );
}
