import Image from "next/image";
import { brand } from "./brand";
import { CopyContract } from "./CopyContract";

export function TopTicker() {
  const tickerLines = Array.from({ length: 4 }, () => brand.memeStrips).flat();

  return (
    <div className="meme-ticker" aria-hidden="true">
      <div className="meme-ticker-track">
        {tickerLines.map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}
      </div>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="identity" href="/#top">
        <Image src={brand.logoPath} alt="" width={48} height={48} priority />
        <span><strong>USSR</strong><small>People's Treasury</small></span>
      </a>
      <nav aria-label="Primary navigation">
        <a href="/#how">People's Economy</a>
        <a href="/#leaderboard">Citizens</a>
        <a href="/#fallen">Exiles</a>
        <a href="/#proofs">Distributions</a>
        <a href="/dashboard">Dashboard</a>
      </nav>
      <div className="header-actions">
        {brand.xUrl ? <a className="x-link" href={brand.xUrl} rel="noreferrer" target="_blank">X</a> : null}
        {brand.buyUrl ? <a className="x-link" href={brand.buyUrl} rel="noreferrer" target="_blank">Join</a> : null}
        {brand.tokenMint ? <CopyContract mint={brand.tokenMint} /> : <span className="contract-link is-pending"><span>CA</span>Soon</span>}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <div><Image src={brand.logoPath} alt="" width={56} height={56} /><span><strong>USSR</strong><small>Equality isn't promised. It's programmed.</small></span></div>
      <div className="footer-links">
        {brand.xUrl ? <a href={brand.xUrl} rel="noreferrer" target="_blank">X</a> : null}
        {brand.communityUrl ? <a href={brand.communityUrl} rel="noreferrer" target="_blank">Community</a> : null}
        {brand.dexscreenerUrl ? <a href={brand.dexscreenerUrl} rel="noreferrer" target="_blank">Dex Screener</a> : null}
        {brand.pumpUrl ? <a href={brand.pumpUrl} rel="noreferrer" target="_blank">Pump.fun</a> : null}
        {brand.buyUrl ? <a href={brand.buyUrl} rel="noreferrer" target="_blank">Join the Reserve</a> : null}
      </div>
      <p>Equality isn't promised. It's programmed. Experimental on-chain parody; rewards depend on available funds, eligibility rules, and successful settlement.</p>
    </footer>
  );
}
