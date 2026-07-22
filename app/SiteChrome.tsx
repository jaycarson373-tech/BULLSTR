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
        <span><strong>CONVICTION</strong><small>SOL reward protocol</small></span>
      </a>
      <nav aria-label="Primary navigation">
        <a href="/#how">How it works</a>
        <a href="/#leaderboard">Diamond hands</a>
        <a href="/#fallen">Fallen</a>
        <a href="/#proofs">Proofs</a>
        <a href="/dashboard">Dashboard</a>
        {brand.xUrl ? <a href={brand.xUrl} rel="noreferrer" target="_blank">X</a> : null}
      </nav>
      <div className="header-actions">
        {brand.xUrl ? <a className="x-link" href={brand.xUrl} rel="noreferrer" target="_blank">X</a> : null}
        {brand.buyUrl ? <a className="x-link" href={brand.buyUrl} rel="noreferrer" target="_blank">Buy</a> : null}
        {brand.tokenMint ? <CopyContract mint={brand.tokenMint} /> : <span className="contract-link is-pending"><span>CA</span>Pending</span>}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <div><Image src={brand.logoPath} alt="" width={56} height={56} /><span><strong>CONVICTION</strong><small>Diamond hands only.</small></span></div>
      <div className="footer-links">
        {brand.xUrl ? <a href={brand.xUrl} rel="noreferrer" target="_blank">X</a> : null}
        {brand.communityUrl ? <a href={brand.communityUrl} rel="noreferrer" target="_blank">Community</a> : null}
        <a href={brand.dexscreenerUrl} rel="noreferrer" target="_blank">Dex Screener</a>
        <a href={brand.pumpUrl} rel="noreferrer" target="_blank">Pump.fun</a>
        <a href={brand.buyUrl} rel="noreferrer" target="_blank">Buy Conviction</a>
      </div>
      <p>Experimental rewards protocol. Rewards depend on available funds, eligibility rules, and successful on-chain settlement. Digital assets are volatile.</p>
    </footer>
  );
}
