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
        <span><strong>HIMOTHY</strong><small>Jimothy reward protocol</small></span>
      </a>
      <nav aria-label="Primary navigation">
        <a href="/#jimothy">Jimothy</a>
        <a href="/#leaderboard">Top Himothys</a>
        <a href="/#fallen">Fallen</a>
        <a href="/#proofs">Drops</a>
        <a href="/dashboard">Dashboard</a>
        <a href={brand.xUrl} rel="noreferrer" target="_blank">X</a>
      </nav>
      <div className="header-actions">
        {brand.buyUrl ? <a className="x-link" href={brand.buyUrl} rel="noreferrer" target="_blank">Buy</a> : null}
        {brand.tokenMint ? <CopyContract mint={brand.tokenMint} /> : <span className="contract-link is-pending"><span>CA</span>Pending</span>}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <div><Image src={brand.logoPath} alt="" width={56} height={56} /><span><strong>HIMOTHY</strong><small>We are all Himothy.</small></span></div>
      <div className="footer-links">
        <a href={brand.xUrl} rel="noreferrer" target="_blank">X</a>
        <a href={brand.communityUrl} rel="noreferrer" target="_blank">Community</a>
        <a href={brand.dexscreenerUrl} rel="noreferrer" target="_blank">Dex Screener</a>
        <a href={brand.pumpUrl} rel="noreferrer" target="_blank">Pump.fun</a>
        <a href={brand.buyUrl} rel="noreferrer" target="_blank">Buy Himothy</a>
      </div>
      <p>Experimental rewards protocol. Rewards depend on available funds, eligibility rules, and successful on-chain settlement. Digital assets are volatile.</p>
    </footer>
  );
}
