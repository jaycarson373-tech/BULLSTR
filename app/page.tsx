import Image from "next/image";
import { brand } from "./brand";
import { EpochCountdown } from "./EpochCountdown";
import { MemeBank } from "./MemeBank";
import { SiteFooter, SiteHeader, TopTicker } from "./SiteChrome";
import { WalletProofLookup } from "./WalletProofLookup";
import { formatAmount, formatDate, getProtocolData, shortWallet } from "./protocolData";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getProtocolData({ epochLimit: 10, fallenLimit: 10, leaderLimit: 10, payoutLimit: 2000 });
  const countdownMinutes = Number.parseInt(brand.rewardInterval, 10) || 5;
  const buyHref = brand.buyUrl || "#top";
  const isPreLaunch = data.rounds.length === 0 && !brand.tokenMint;

  return (
    <main className="himothy-page">
      <div className="money-rain" aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => <span key={index}>$</span>)}
      </div>
      <TopTicker />
      <SiteHeader />

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="kicker"><span /> We are all Himothy</p>
          <h1><em>HIMOTHY</em></h1>
          <p className="hero-tagline">{brand.tagline}</p>
          <p className="hero-lede">{brand.secondaryTagline}</p>
          <div className="hero-actions">
            <a className="primary-action" href={buyHref} rel={brand.buyUrl ? "noreferrer" : undefined} target={brand.buyUrl ? "_blank" : undefined}>Buy Himothy</a>
            <a className="secondary-action" href="#proofs">View Jimothy drops</a>
          </div>
          <p className="minimum-rule">
            Hold at least <strong>{Number(brand.minimumEligibleBalance).toLocaleString()} $HIMOTHY</strong>. Wallets above <strong>{brand.maxHolderPercent}%</strong> are excluded.
            <br />
            <strong>Sell once and your wallet is blacklisted. Forever not Himothy.</strong>
          </p>
        </div>

        <div className="hero-visual">
          <div className="logo-frame">
            <Image src={brand.logoPath} alt="Himothy logo" width={1200} height={1200} priority />
          </div>
          <div className="next-drop">
            <span>Next Jimothy drop</span>
            {isPreLaunch ? (
              <>
                <strong className="launch-message">First epoch begins at launch.</strong>
                <em>CA pending</em>
              </>
            ) : (
              <>
                <strong><EpochCountdown minutes={countdownMinutes} /></strong>
                <em>Every five minutes</em>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="protocol-strip" aria-label="Protocol status">
        <article><span>Reward asset</span><strong>JIMOTHY</strong><em>runner rewards</em></article>
        <article><span>Drop cadence</span><strong>{brand.rewardInterval}</strong><em>automatic epochs</em></article>
        <article><span>Eligible Himothys</span><strong>{data.activeWallets}</strong><em>live holder state</em></article>
        <article><span>Jimothy distributed</span><strong>{formatAmount(data.totalDistributed, 2)}</strong><em>settled proofs only</em></article>
      </section>

      <section className="lore-section" id="jimothy">
        <div className="section-heading">
          <p className="kicker">Jimothy lore</p>
          <h2>Jimothy ran. Himothy held.</h2>
          <p>
            Jimothy is the runner. Himothy is the status. Holders who stay in the race keep their airdrop eligibility;
            wallets that sell once leave the rotation.
          </p>
        </div>
        <div className="price-grid">
          <article>
            <span>Himothy price</span>
            <strong>Live chart</strong>
            {brand.tokenMint ? <a href={`https://dexscreener.com/solana/${brand.tokenMint}`} rel="noreferrer" target="_blank">Open chart</a> : <em>CA pending</em>}
          </article>
          <article>
            <span>Jimothy price</span>
            <strong>Live chart</strong>
            {brand.rewardTokenMint ? <a href={`https://dexscreener.com/solana/${brand.rewardTokenMint}`} rel="noreferrer" target="_blank">Open chart</a> : <em>Jimothy CA pending</em>}
          </article>
          <article>
            <span>Rule</span>
            <strong>Sell once, not Himothy.</strong>
            <em>Permanent ineligibility is tracked in holder state.</em>
          </article>
        </div>
      </section>

      <section className="boost-section" id="boost">
        <div className="section-heading compact">
          <p className="kicker">Holder multiplier</p>
          <h2>Longer holds become more Himothy.</h2>
          <p>Only holding time boosts rewards. Wallet size and leaderboard rank do not add extra multipliers.</p>
        </div>
        <div className="boost-layout">
          <div className="time-track">
            {brand.holdTiers.map((tier) => (
              <article key={tier.window}>
                <span>{tier.window}</span><strong>{tier.multiplier}</strong>
              </article>
            ))}
          </div>
          <div className="hold-only-panel">
            <span>No rank bonus</span>
            <strong>Hold longer. That is it.</strong>
            <p>Top holders still appear on the board, but the reward boost comes from staying eligible over time.</p>
          </div>
        </div>
        <p className="rule-notice"><strong>Eligibility rule:</strong> selling after eligibility makes a wallet a fallen Himothy under the current protocol rules.</p>
      </section>

      <section className="leaderboard-section" id="leaderboard">
        <div className="section-heading row-heading">
          <div><p className="kicker">Top Himothys</p><h2>The Himothy board.</h2></div>
          <p>Only the top 10 show here. The full holder board lives on the dashboard.</p>
          <a className="section-link" href="/dashboard#leaderboard">View more</a>
        </div>
        <div className="leaderboard-table">
          <div className="table-head"><span>Rank / Wallet</span><span>HIMOTHY held</span><span>Holding since</span><span>Hold boost</span></div>
          {data.leaders.length ? data.leaders.map((wallet, index) => (
            <article key={wallet.wallet}>
              <span><b>{String(index + 1).padStart(2, "0")}</b><a href={`https://solscan.io/account/${wallet.wallet}`} rel="noreferrer" target="_blank">{shortWallet(wallet.wallet)}</a></span>
              <strong>{formatAmount(wallet.balance, 2)}</strong>
              <span>{formatDate(wallet.eligibleSince)}</span>
              <em>{wallet.multiplier.toFixed(2)}x</em>
            </article>
          )) : <div className="data-empty"><strong>0 Himothys indexed</strong><span>The first holder snapshot will populate this board.</span></div>}
        </div>
      </section>

      <section className="fallen-section" id="fallen">
        <div className="section-heading row-heading">
          <div><p className="kicker">Fallen Himothys</p><h2>They sold. They fell.</h2></div>
          <p>Only the latest 10 show here. The full fallen list lives on the dashboard.</p>
          <a className="section-link" href="/dashboard#fallen">View more</a>
        </div>
        <div className="fallen-grid">
          {data.fallen.length ? data.fallen.map((wallet) => (
            <article key={wallet.wallet}>
              <strong>{shortWallet(wallet.wallet)}</strong>
              <span>{wallet.reason === "sold_after_eligibility" ? "Sold after eligibility" : wallet.reason ?? "Ineligible"}</span>
              <em>{formatDate(wallet.lastSeenAt)}</em>
            </article>
          )) : <div className="data-empty"><strong>0 fallen Himothys</strong><span>Clean board until the first wallet breaks the holding rule.</span></div>}
        </div>
      </section>

      <section className="proof-section" id="proofs">
        <div className="section-heading row-heading">
          <div><p className="kicker">Jimothy drops</p><h2>Receipts or it did not run.</h2></div>
          <p>Only settled JIMOTHY payouts with transaction signatures are published.</p>
          <a className="section-link" href="/dashboard#proofs">Full proofs</a>
        </div>
        <div className="proof-grid">
          {data.rounds.length ? data.rounds.map((round) => (
            <article key={round.epochId}>
              <span>{formatDate(round.startedAt)}</span>
              <strong>{formatAmount(round.amount, 2)} JIMOTHY</strong>
              <em>{round.recipients} recipient{round.recipients === 1 ? "" : "s"}</em>
              <div>{round.proofs.map((signature, index) => <a href={`https://solscan.io/tx/${signature}`} key={signature} rel="noreferrer" target="_blank">Proof {index + 1}</a>)}</div>
            </article>
          )) : <div className="data-empty"><strong>0 settled Jimothy drops</strong><span>Verified transactions will appear after the first completed Himothy epoch.</span></div>}
        </div>
      </section>

      <section className="meme-bank">
        <div className="section-heading">
          <p className="kicker">Meme bank</p>
          <h2>The Himothy archive.</h2>
          <p>Click any image to pause the belt. Download the selected meme directly from the archive.</p>
        </div>
        <MemeBank />
      </section>

      <section className="wallet-section" id="wallet">
        <div className="section-heading row-heading">
          <div><p className="kicker">Wallet checker</p><h2>Check your Himothy.</h2></div>
          <p>No connection and no signature. Paste a public Solana wallet to inspect eligibility and settled JIMOTHY rewards.</p>
        </div>
        <WalletProofLookup />
      </section>

      <section className="banner-section" aria-label="Himothy banner">
        <Image src={brand.bannerPath} alt="Himothy banner" width={1280} height={500} loading="eager" />
      </section>

      <SiteFooter />
    </main>
  );
}
