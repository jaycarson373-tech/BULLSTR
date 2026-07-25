import Image from "next/image";
import { brand } from "./brand";
import { EpochCountdown } from "./EpochCountdown";
import { SiteFooter, SiteHeader, TopTicker } from "./SiteChrome";
import { WalletProofLookup } from "./WalletProofLookup";
import { formatAmount, formatDate, getProtocolData, shortWallet } from "./protocolData";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getProtocolData({ epochLimit: 10, fallenLimit: 10, leaderLimit: 10, payoutLimit: 2000 });
  const countdownMinutes = Number.parseInt(brand.rewardInterval, 10) || 5;
  const buyHref = brand.buyUrl || "#top";
  const isLive = Boolean(brand.tokenMint);

  return (
    <main className="reserve-page">
      <div className="star-rain" aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => <span key={index}>★</span>)}
      </div>
      <TopTicker />
      <SiteHeader />

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="kicker"><span /> The People's Treasury</p>
          <h1><em>THE UNITED SOLANA SOCIALIST RESERVE</em></h1>
          <p className="hero-tagline">{brand.tagline}</p>
          <p className="hero-lede">Every creator fee enters the People's Treasury. Every 5 minutes the reserve redistributes to eligible holders.</p>
          <p className="hero-lede propaganda-line">Communism worked on paper. Now we're testing it on-chain.</p>
          <div className="hero-actions">
            <a className="primary-action" href={buyHref} rel={brand.buyUrl ? "noreferrer" : undefined} target={brand.buyUrl ? "_blank" : undefined}>Join the Reserve</a>
            <a className="secondary-action" href="#proofs">View Redistributions</a>
          </div>
          <p className="minimum-rule">
            Hold at least <strong>{Number(brand.minimumEligibleBalance).toLocaleString()} {brand.ticker}</strong> to become an eligible citizen. Wallets above <strong>{brand.maxHolderPercent}%</strong> are excluded.
            <br />
            <strong>Power to the holders. Audited by the chain.</strong>
          </p>
        </div>

        <div className="hero-visual">
          <div className="logo-frame">
            <Image src={brand.logoPath} alt="United Solana Socialist Reserve logo" width={1200} height={1200} priority />
          </div>
          <div className="next-drop">
            <span>Next Redistribution</span>
            {isLive ? (
              <>
                <strong><EpochCountdown minutes={countdownMinutes} /></strong>
                <em>{brand.rewardInterval} treasury cycle</em>
              </>
            ) : (
              <>
                <strong className="launch-message">Reserve opens at launch.</strong>
                <em>Countdown starts once live</em>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="protocol-strip" aria-label="Protocol status">
        <article><span>Treasury asset</span><strong>SOL</strong><em>settled on-chain</em></article>
        <article><span>Redistribution cadence</span><strong>{brand.rewardInterval}</strong><em>automatic cycles</em></article>
        <article><span>Eligible citizens</span><strong>{data.activeWallets}</strong><em>live holder state</em></article>
        <article><span>Total redistributed</span><strong>{formatAmount(data.totalDistributed, 4)}</strong><em>settled receipts only</em></article>
      </section>

      <section className="how-section" id="how">
        <div className="section-heading">
          <p className="kicker">The People's Economy</p>
          <h2>Creator fees enter. Citizens receive.</h2>
          <p>
            United Solana Socialist Reserve is an on-chain parody treasury. The reserve watches eligible holders,
            records every redistribution cycle, and publishes receipts when the treasury settles.
          </p>
        </div>
        <div className="price-grid">
          <article>
            <span>Treasury</span>
            <strong>People's Treasury</strong>
            <em>Every creator fee enters the reserve.</em>
          </article>
          <article>
            <span>Redistribution</span>
            <strong>Every 5 minutes</strong>
            <em>The treasury cycle is settled on Solana.</em>
          </article>
          <article>
            <span>Equality</span>
            <strong>One reserve</strong>
            <em>Eligible holders share the public distribution pool.</em>
          </article>
        </div>
      </section>

      <section className="boost-section" id="boost">
        <div className="section-heading compact">
          <p className="kicker">Reserve doctrine</p>
          <h2>Equality. Enforced by Code.</h2>
          <p>A satirical government portal for a live crypto treasury: transparent inputs, scheduled redistributions, and receipts anyone can inspect.</p>
        </div>
        <div className="boost-layout">
          <div className="time-track">
            <article><span>01</span><strong>Workers Loading</strong></article>
            <article><span>02</span><strong>Calculating Equality</strong></article>
            <article><span>03</span><strong>Redistributing Wealth</strong></article>
            <article><span>04</span><strong>Power to Holders</strong></article>
          </div>
          <div className="hold-only-panel">
            <span>Government notice</span>
            <strong>The Treasury Grows.</strong>
            <p>Rewards depend on live treasury funds, eligible holder state, and successful on-chain execution.</p>
          </div>
        </div>
        <p className="rule-notice"><strong>Protocol rule:</strong> eligibility is evaluated by the reserve at each redistribution cycle.</p>
      </section>

      <section className="leaderboard-section" id="leaderboard">
        <div className="section-heading row-heading">
          <div><p className="kicker">Eligible citizens</p><h2>The citizen ledger.</h2></div>
          <p>Only the top 10 show here. The full public ledger lives on the dashboard.</p>
          <a className="section-link" href="/dashboard#leaderboard">View more</a>
        </div>
        <div className="leaderboard-table">
          <div className="table-head"><span>Citizen / Wallet</span><span>{brand.ticker} held</span><span>Indexed since</span><span>Status</span></div>
          {data.leaders.length ? data.leaders.map((wallet, index) => (
            <article key={wallet.wallet}>
              <span><b>{String(index + 1).padStart(2, "0")}</b><a href={`https://solscan.io/account/${wallet.wallet}`} rel="noreferrer" target="_blank">{shortWallet(wallet.wallet)}</a></span>
              <strong>{formatAmount(wallet.balance, 2)}</strong>
              <span>{formatDate(wallet.eligibleSince)}</span>
              <em>Citizen</em>
            </article>
          )) : <div className="data-empty"><strong>0 eligible citizens indexed</strong><span>The first reserve snapshot will populate this board.</span></div>}
        </div>
      </section>

      <section className="fallen-section" id="fallen">
        <div className="section-heading row-heading">
          <div><p className="kicker">Removed citizens</p><h2>The exile registry.</h2></div>
          <p>Only the latest 10 show here. The full public registry lives on the dashboard.</p>
          <a className="section-link" href="/dashboard#fallen">View more</a>
        </div>
        <div className="fallen-grid">
          {data.fallen.length ? data.fallen.map((wallet) => (
            <article key={wallet.wallet}>
              <strong>{shortWallet(wallet.wallet)}</strong>
              <span>{wallet.reason === "sold_after_eligibility" ? "Sold after eligibility" : wallet.reason ?? "Ineligible"}</span>
              <em>{formatDate(wallet.lastSeenAt)}</em>
            </article>
          )) : <div className="data-empty"><strong>0 removed citizens</strong><span>The registry is clean before the first reserve cycle.</span></div>}
        </div>
      </section>

      <section className="proof-section" id="proofs">
        <div className="section-heading row-heading">
          <div><p className="kicker">People's Distribution</p><h2>Receipts or it did not happen.</h2></div>
          <p>Only settled redistributions with transaction signatures are published.</p>
          <a className="section-link" href="/dashboard#proofs">Full receipts</a>
        </div>
        <div className="proof-grid">
          {data.rounds.length ? data.rounds.map((round) => (
            <article key={round.epochId}>
              <span>{formatDate(round.startedAt)}</span>
              <strong>{formatAmount(round.amount, 4)} SOL</strong>
              <em>{round.recipients} recipient{round.recipients === 1 ? "" : "s"}</em>
              <div>{round.proofs.map((signature, index) => <a href={`https://solscan.io/tx/${signature}`} key={signature} rel="noreferrer" target="_blank">Proof {index + 1}</a>)}</div>
            </article>
          )) : <div className="data-empty"><strong>0 settled redistributions</strong><span>Verified transactions will appear after the first completed reserve cycle.</span></div>}
        </div>
      </section>

      <section className="wallet-section" id="wallet">
        <div className="section-heading row-heading">
          <div><p className="kicker">Citizen lookup</p><h2>Check reserve status.</h2></div>
          <p>No connection and no signature. Paste a public Solana wallet to inspect eligibility and settled redistributions.</p>
        </div>
        <WalletProofLookup />
      </section>

      <section className="banner-section" aria-label="United Solana Socialist Reserve banner">
        <Image src={brand.bannerPath} alt="United Solana Socialist Reserve banner" width={1280} height={426} loading="eager" />
      </section>

      <SiteFooter />
    </main>
  );
}
