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
    <main className="reserve-page dashboard-page">
      <div className="star-rain" aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => <span key={index}>★</span>)}
      </div>
      <TopTicker />
      <SiteHeader />

      <section className="dashboard-hero">
        <div>
          <p className="kicker"><span /> Reserve dashboard</p>
          <h1>The People's Treasury.</h1>
          <p>Current treasury state, eligible citizens, redistribution receipts, and wallet lookup in one government-grade terminal.</p>
        </div>
        <div className="dashboard-logo">
          <Image src={brand.logoPath} alt="United Solana Socialist Reserve logo" width={400} height={400} priority />
        </div>
      </section>

      <section className="dashboard-stats" aria-label="Dashboard stats">
        <article><span>Next Redistribution</span><strong><EpochCountdown minutes={countdownMinutes} /></strong><em>{brand.rewardInterval} cycle</em></article>
        <article><span>Eligible Citizens</span><strong>{data.activeWallets}</strong><em>current holder state</em></article>
        <article><span>Total Redistributed</span><strong>{formatAmount(data.totalDistributed, 4)}</strong><em>settled payouts only</em></article>
        <article><span>Distribution Receipts</span><strong>{data.latestPayouts.length}</strong><em>latest indexed rows</em></article>
      </section>

      <section className="dashboard-section" id="leaderboard">
        <div className="section-heading row-heading">
          <div><p className="kicker">Eligible Citizens</p><h2>Full citizen ledger.</h2></div>
          <p>The reserve records holder state for the next redistribution cycle.</p>
        </div>
        <div className="leaderboard-table dashboard-table holder-dashboard-table">
          <div className="table-head"><span>Citizen / Wallet</span><span>{brand.ticker} held</span><span>Indexed since</span><span>Cycles</span><span>Ledger factor</span><span>Status</span></div>
          {data.leaders.length ? data.leaders.map((wallet, index) => (
            <article key={wallet.wallet}>
              <span><b>{String(index + 1).padStart(2, "0")}</b><a href={`https://solscan.io/account/${wallet.wallet}`} rel="noreferrer" target="_blank">{shortWallet(wallet.wallet)}</a></span>
              <strong>{formatAmount(wallet.balance, 2)}</strong>
              <span>{formatDate(wallet.eligibleSince)}</span>
              <span>{wallet.streakEpochs} cycle{wallet.streakEpochs === 1 ? "" : "s"}</span>
              <em>{wallet.multiplier.toFixed(2)}x</em>
              <mark>Citizen</mark>
            </article>
          )) : <div className="data-empty"><strong>0 eligible citizens indexed</strong><span>The first reserve snapshot will populate this board.</span></div>}
        </div>
      </section>

      <section className="dashboard-section" id="fallen">
        <div className="section-heading row-heading">
          <div><p className="kicker">Exile registry</p><h2>Removed citizens.</h2></div>
          <p>Wallets appear here when holder-state rules mark them ineligible.</p>
        </div>
        <div className="leaderboard-table dashboard-table fallen-dashboard-table">
          <div className="table-head"><span>Wallet</span><span>Last balance</span><span>Registry reason</span><span>Last seen</span></div>
          {data.fallen.length ? data.fallen.map((wallet) => (
            <article key={wallet.wallet}>
              <span><a href={`https://solscan.io/account/${wallet.wallet}`} rel="noreferrer" target="_blank">{shortWallet(wallet.wallet)}</a></span>
              <strong>{formatAmount(wallet.balance, 2)}</strong>
              <span>{reasonCopy(wallet.reason)}</span>
              <em>{formatDate(wallet.lastSeenAt)}</em>
            </article>
          )) : <div className="data-empty"><strong>0 removed citizens</strong><span>The registry is clean before the first reserve cycle.</span></div>}
        </div>
      </section>

      <section className="dashboard-section" id="proofs">
        <div className="section-heading row-heading">
          <div><p className="kicker">Recent Distributions</p><h2>Settled receipt rows.</h2></div>
          <p>Every row shown here has a settled status and transaction signature from the payout table.</p>
        </div>
        <div className="leaderboard-table dashboard-table proof-dashboard-table">
          <div className="table-head"><span>Cycle</span><span>Citizen</span><span>Amount</span><span>Updated</span><span>Receipt</span></div>
          {data.latestPayouts.length ? data.latestPayouts.map((proof) => (
            <article key={`${proof.epochId}-${proof.wallet}-${proof.txSig}`}>
              <span>{proof.epochId}</span>
              <span><a href={`https://solscan.io/account/${proof.wallet}`} rel="noreferrer" target="_blank">{shortWallet(proof.wallet)}</a></span>
              <strong>{formatAmount(proof.amount, 4)} {proof.rewardAsset}</strong>
              <span>{formatDate(proof.updatedAt)}</span>
              <em><a href={`https://solscan.io/tx/${proof.txSig}`} rel="noreferrer" target="_blank">{shortSignature(proof.txSig)}</a></em>
            </article>
          )) : <div className="data-empty"><strong>0 settled receipt rows</strong><span>Verified transactions will appear after the first completed reserve cycle.</span></div>}
        </div>
      </section>

      <section className="dashboard-section" id="wallet">
        <div className="section-heading row-heading">
          <div><p className="kicker">Citizen lookup</p><h2>Check one wallet.</h2></div>
          <p>No connection and no signature. Paste a public Solana wallet to inspect eligibility and settled redistributions.</p>
        </div>
        <WalletProofLookup />
      </section>

      <SiteFooter />
    </main>
  );
}
