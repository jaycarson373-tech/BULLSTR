import { CopyCaChip } from "./ca-copy-chip";

const CA = process.env.NEXT_PUBLIC_CA?.trim() || process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT?.trim() || "";
const X_URL = process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/HyperHood_";

export function SiteNav() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <a className="brand" href="/" aria-label="HyperHood home">
          <img className="brand-logo" src="/brand/hyperhood-logo.png" alt="" />
          <span>HyperHood</span>
        </a>
        <nav className="nav-links" aria-label="Primary navigation">
          <a href="/">Home</a>
          <a href="/dashboard">Dashboard</a>
          <a href="/lore">Hood Thesis</a>
        </nav>
        <div className="nav-actions">
          {CA ? <CopyCaChip ca={CA} className="nav-ca-chip" /> : null}
          <a className="mini-button x-button" href={X_URL} target="_blank" rel="noreferrer" aria-label="Open X">
            X
          </a>
        </div>
      </div>
    </header>
  );
}
