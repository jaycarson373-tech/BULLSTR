import Image from "next/image";
import { brand } from "../brand";
import { EpochCountdown } from "../EpochCountdown";
import { SiteFooter, SiteHeader, TopTicker } from "../SiteChrome";
import { WalletProofLookup } from "../WalletProofLookup";
import { formatAmount, formatDate, getProtocolData, shortSignature, shortWallet } from "../protocolData";

export const dynamic = "force-dynamic";

function reasonCopy(reason: string | null) {
  if (reason === "sold_after_eligibility") return "Sold after eligibility";
  if (reason === "max_holder_excluded") return "Above max holder cap";
  return reason ?? "Ineligible";
}

export default async function DashboardPage() {
  const data = await getProtocolData({
    epochLimit: 100,
    fallenLimit: 100,
    leaderLimit: 100,
    payoutLimit: 5000,
    proofsPerRound: 8
  });
  const countdownMinutes = Number.parseInt(brand.rewardInterval, 10) || 5;

  return (
    <main className="conviction-page dashboard-page">
      <div className="diamond-rain" aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => <span key={index}>◆</span>)}
      </div>
      <TopTicker />
      <SiteHeader />

      <section className="dashboard-hero">
        <div>
          <p className="kicker"><span /> Live dashboard</p>
          <h1>Conviction command center.</h1>
          <p>Full holder state, fallen wallets, settled SOL proof rows, and wallet lookup in one place.</p>
        </div>
        <div className="dashboard-logo">
          <Image src={brand.logoPath} alt="Proof of Conviction logo" width={400} height={400} priority />
        </div>
      </section>

      <section className="dashboard-stats" aria-label="Dashboard stats">
        <article><span>Next epoch</span><strong><EpochCountdown minutes={countdownMinutes} /></strong><em>{brand.rewardInterval} cadence</em></article>
        <article><span>Eligible wallets</span><strong>{data.activeWallets}</strong><em>current holder state</em></article>
        <article><span>SOL distributed</span><strong>{formatAmount(data.totalDistributed, 4)}</strong><em>settled payouts only</em></article>
        <article><span>Proof rows</span><strong>{data.latestPayouts.length}</strong><em>latest indexed rows</em></article>
      </section>

      <section className="dashboard-section" id="leaderboard">
        <div className="section-heading row-heading">
          <div><p className="kicker">Diamond hands</p><h2>Full holder board.</h2></div>
          <p>Rank is visible for context only. Rewards use hold-time multiplier, not wallet-size rank bonus.</p>
        </div>
        <div className="leaderboard-table dashboard-table holder-dashboard-table">
          <div className="table-head"><span>Rank / Wallet</span><span>{brand.ticker} held</span><span>Holding since</span><span>Streak</span><span>Hold boost</span><span>Status</span></div>
          {data.leaders.length ? data.leaders.map((wallet, index) => (
            <article key={wallet.wallet}>
              <span><b>{String(index + 1).padStart(2, "0")}</b><a href={`https://solscan.io/account/${wallet.wallet}`} rel="noreferrer" target="_blank">{shortWallet(wallet.wallet)}</a></span>
              <strong>{formatAmount(wallet.balance, 2)}</strong>
              <span>{formatDate(wallet.eligibleSince)}</span>
              <span>{wallet.streakEpochs} epoch{wallet.streakEpochs === 1 ? "" : "s"}</span>
              <em>{wallet.multiplier.toFixed(2)}x</em>
              <mark>Eligible</mark>
            </article>
          )) : <div className="data-empty"><strong>0 conviction wallets indexed</strong><span>The first holder snapshot will populate this board.</span></div>}
        </div>
      </section>

      <section className="dashboard-section" id="fallen">
        <div className="section-heading row-heading">
          <div><p className="kicker">Fallen wallets</p><h2>Full fallen list.</h2></div>
          <p>Wallets appear here when holder-state rules mark them permanently ineligible.</p>
        </div>
        <div className="leaderboard-table dashboard-table fallen-dashboard-table">
          <div className="table-head"><span>Wallet</span><span>Last balance</span><span>Reason</span><span>Last seen</span></div>
          {data.fallen.length ? data.fallen.map((wallet) => (
            <article key={wallet.wallet}>
              <span><a href={`https://solscan.io/account/${wallet.wallet}`} rel="noreferrer" target="_blank">{shortWallet(wallet.wallet)}</a></span>
              <strong>{formatAmount(wallet.balance, 2)}</strong>
              <span>{reasonCopy(wallet.reason)}</span>
              <em>{formatDate(wallet.lastSeenAt)}</em>
            </article>
          )) : <div className="data-empty"><strong>0 fallen wallets</strong><span>Clean board until the first wallet breaks the holding rule.</span></div>}
        </div>
      </section>

      <section className="dashboard-section" id="proofs">
        <div className="section-heading row-heading">
          <div><p className="kicker">Proofs</p><h2>Settled SOL rows.</h2></div>
          <p>Every row shown here has a settled status and transaction signature from the payout table.</p>
        </div>
        <div className="leaderboard-table dashboard-table proof-dashboard-table">
          <div className="table-head"><span>Epoch</span><span>Recipient</span><span>Amount</span><span>Updated</span><span>Proof</span></div>
          {data.latestPayouts.length ? data.latestPayouts.map((proof) => (
            <article key={`${proof.epochId}-${proof.wallet}-${proof.txSig}`}>
              <span>{proof.epochId}</span>
              <span><a href={`https://solscan.io/account/${proof.wallet}`} rel="noreferrer" target="_blank">{shortWallet(proof.wallet)}</a></span>
              <strong>{formatAmount(proof.amount, 4)} {proof.rewardAsset}</strong>
              <span>{formatDate(proof.updatedAt)}</span>
              <em><a href={`https://solscan.io/tx/${proof.txSig}`} rel="noreferrer" target="_blank">{shortSignature(proof.txSig)}</a></em>
            </article>
          )) : <div className="data-empty"><strong>0 settled proof rows</strong><span>Verified transactions will appear after the first completed conviction epoch.</span></div>}
        </div>
      </section>

      <section className="dashboard-section" id="wallet">
        <div className="section-heading row-heading">
          <div><p className="kicker">Wallet proof lookup</p><h2>Check one wallet.</h2></div>
          <p>No connection and no signature. Paste a public Solana wallet to inspect eligibility and settled SOL rewards.</p>
        </div>
        <WalletProofLookup />
      </section>

      <SiteFooter />
    </main>
  );
}
