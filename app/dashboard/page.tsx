import { CopyCaChip } from "../ca-copy-chip";
import { AirdropHistory, LiveProtocolDashboard, RecentAirdrops } from "../home-strategy-data";

const DEFAULT_CA = "E2U8ot8N9i6jF7f41PAQR7ofN4nStkEkjMaeA4izpump";
const CA = process.env.NEXT_PUBLIC_CA?.trim() || process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT?.trim() || DEFAULT_CA;
const X_URL = process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/HyperHood_";

function SubpageNav() {
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
        <CopyCaChip ca={CA} className="nav-ca-chip" />
        <a className="mini-button x-button" href={X_URL} target="_blank" rel="noreferrer" aria-label="Open X community">
          X
        </a>
      </div>
    </header>
  );
}

export default function DashboardPage() {
  return (
    <div className="page hyperhood-page">
      <SubpageNav />
      <main className="subpage-main">
        <LiveProtocolDashboard />
        <RecentAirdrops />
        <AirdropHistory />
      </main>
    </div>
  );
}
