import { BrandMark } from "./BrandMark";
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
  const isPreLaunch = data.rounds.length === 0 && !brand.tokenMint;

  return (
    <main className="conviction-page">
      <div className="diamond-rain" aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => <span key={index}>◆</span>)}
      </div>
      <TopTicker />
      <SiteHeader />

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="kicker"><span /> Proof of Conviction</p>
          <h1><em>CONVICTION</em></h1>
          <p className="hero-tagline">{brand.tagline}</p>
          <p className="hero-lede">{brand.secondaryTagline}</p>
          <div className="hero-actions">
            <a className="primary-action" href={buyHref} rel={brand.buyUrl ? "noreferrer" : undefined} target={brand.buyUrl ? "_blank" : undefined}>Buy Conviction</a>
            <a className="secondary-action" href="#proofs">View SOL proofs</a>
          </div>
          <p className="minimum-rule">
            Hold at least <strong>{Number(brand.minimumEligibleBalance).toLocaleString()} {brand.ticker}</strong>. Wallets above <strong>{brand.maxHolderPercent}%</strong> are excluded.
            <br />
            <strong>Sell once and your wallet is ineligible forever.</strong>
          </p>
        </div>

        <div className="hero-visual">
          <div className="logo-frame">
            <BrandMark className="hero-mark" />
          </div>
          <div className="next-drop">
            <span>Next SOL epoch</span>
            {isPreLaunch ? (
              <>
                <strong className="launch-message">First epoch begins at launch.</strong>
                <em>CA pending</em>
              </>
            ) : (
              <>
                <strong><EpochCountdown minutes={countdownMinutes} /></strong>
                <em>{brand.rewardInterval} cadence</em>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="protocol-strip" aria-label="Protocol status">
        <article><span>Reward asset</span><strong>SOL</strong><em>settled on-chain</em></article>
        <article><span>Epoch cadence</span><strong>{brand.rewardInterval}</strong><em>automatic snapshots</em></article>
        <article><span>Eligible wallets</span><strong>{data.activeWallets}</strong><em>live holder state</em></article>
        <article><span>SOL distributed</span><strong>{formatAmount(data.totalDistributed, 4)}</strong><em>settled proofs only</em></article>
      </section>

      <section className="how-section" id="how">
        <div className="section-heading">
          <p className="kicker">Diamond hands</p>
          <h2>Hold conviction. Stay eligible.</h2>
          <p>
            Proof of Conviction is a simple holder game: keep your wallet above the threshold, build a hold-time multiplier,
            and remain eligible for SOL reward epochs.
          </p>
        </div>
        <div className="price-grid">
          <article>
            <span>1. Hold</span>
            <strong>{brand.ticker}</strong>
            <em>Minimum balance gates the pool.</em>
          </article>
          <article>
            <span>2. Prove</span>
            <strong>Diamond hands</strong>
            <em>Holding time increases the multiplier.</em>
          </article>
          <article>
            <span>3. Earn</span>
            <strong>SOL</strong>
            <em>Settled epochs publish receipts.</em>
          </article>
        </div>
      </section>

      <section className="boost-section" id="boost">
        <div className="section-heading compact">
          <p className="kicker">Holder multiplier</p>
          <h2>Conviction gets heavier over time.</h2>
          <p>No rank bonus. No hidden status games. The multiplier is based on how long the wallet stays eligible.</p>
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
            <span>Permanent rule</span>
            <strong>Sell once. Fall forever.</strong>
            <p>A wallet that breaks the holding rule is moved to fallen wallets and leaves future reward eligibility.</p>
          </div>
        </div>
        <p className="rule-notice"><strong>Eligibility rule:</strong> holder state tracks wallets that sell after eligibility and marks them ineligible under the current protocol rules.</p>
      </section>

      <section className="leaderboard-section" id="leaderboard">
        <div className="section-heading row-heading">
          <div><p className="kicker">Diamond hands</p><h2>Top conviction wallets.</h2></div>
          <p>Only the top 10 show here. The full holder board lives on the dashboard.</p>
          <a className="section-link" href="/dashboard#leaderboard">View more</a>
        </div>
        <div className="leaderboard-table">
          <div className="table-head"><span>Rank / Wallet</span><span>{brand.ticker} held</span><span>Holding since</span><span>Boost</span></div>
          {data.leaders.length ? data.leaders.map((wallet, index) => (
            <article key={wallet.wallet}>
              <span><b>{String(index + 1).padStart(2, "0")}</b><a href={`https://solscan.io/account/${wallet.wallet}`} rel="noreferrer" target="_blank">{shortWallet(wallet.wallet)}</a></span>
              <strong>{formatAmount(wallet.balance, 2)}</strong>
              <span>{formatDate(wallet.eligibleSince)}</span>
              <em>{wallet.multiplier.toFixed(2)}x</em>
            </article>
          )) : <div className="data-empty"><strong>0 conviction wallets indexed</strong><span>The first holder snapshot will populate this board.</span></div>}
        </div>
      </section>

      <section className="fallen-section" id="fallen">
        <div className="section-heading row-heading">
          <div><p className="kicker">Fallen wallets</p><h2>They sold. They fell.</h2></div>
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
          )) : <div className="data-empty"><strong>0 fallen wallets</strong><span>Clean board until the first wallet breaks the holding rule.</span></div>}
        </div>
      </section>

      <section className="proof-section" id="proofs">
        <div className="section-heading row-heading">
          <div><p className="kicker">SOL proofs</p><h2>Receipts or it did not run.</h2></div>
          <p>Only settled SOL payouts with transaction signatures are published.</p>
          <a className="section-link" href="/dashboard#proofs">Full proofs</a>
        </div>
        <div className="proof-grid">
          {data.rounds.length ? data.rounds.map((round) => (
            <article key={round.epochId}>
              <span>{formatDate(round.startedAt)}</span>
              <strong>{formatAmount(round.amount, 4)} SOL</strong>
              <em>{round.recipients} recipient{round.recipients === 1 ? "" : "s"}</em>
              <div>{round.proofs.map((signature, index) => <a href={`https://solscan.io/tx/${signature}`} key={signature} rel="noreferrer" target="_blank">Proof {index + 1}</a>)}</div>
            </article>
          )) : <div className="data-empty"><strong>0 settled SOL proofs</strong><span>Verified transactions will appear after the first completed conviction epoch.</span></div>}
        </div>
      </section>

      <section className="wallet-section" id="wallet">
        <div className="section-heading row-heading">
          <div><p className="kicker">Wallet checker</p><h2>Check conviction.</h2></div>
          <p>No connection and no signature. Paste a public Solana wallet to inspect eligibility and settled SOL rewards.</p>
        </div>
        <WalletProofLookup />
      </section>

      <SiteFooter />
    </main>
  );
}
