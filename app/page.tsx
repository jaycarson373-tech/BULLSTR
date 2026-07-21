import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import { brand } from "./brand";
import { EpochCountdown } from "./EpochCountdown";
import { WalletProofLookup } from "./WalletProofLookup";

export const dynamic = "force-dynamic";

type RewardRound = {
  epochId: string;
  amount: number;
  recipients: number;
  proofs: string[];
};

type RewardReceipt = {
  epochId: string;
  wallet: string;
  amount: number;
  status: string;
  txSig: string | null;
  updatedAt: string | null;
};

type CashbullHolder = {
  wallet: string;
  balance: number;
  multiplier: number;
  eligibleSince: string | null;
};

type ProtocolData = {
  rounds: RewardRound[];
  receipts: RewardReceipt[];
  leaders: CashbullHolder[];
  activeWallets: number;
  totalDistributed: number;
  distributedToday: number;
  completedCycles: number;
  latestConfirmedTx: string | null;
};

const emptyData: ProtocolData = {
  rounds: [],
  receipts: [],
  leaders: [],
  activeWallets: 0,
  totalDistributed: 0,
  distributedToday: 0,
  completedCycles: 0,
  latestConfirmedTx: null
};

function formatAmount(value: number, maximumFractionDigits = 4) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

function formatDate(value: string | null) {
  if (!value) return "Not indexed";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "Not indexed";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(parsed));
}

function shortWallet(wallet: string) {
  return `${wallet.slice(0, 5)}...${wallet.slice(-5)}`;
}

function statusLabel(status: string) {
  if (status === "settled") return "CONFIRMED";
  if (status === "planned") return "QUEUED";
  if (status === "failed") return "FAILED";
  return status.toUpperCase();
}

async function getProtocolData(): Promise<ProtocolData> {
  if (!brand.tokenMint) return emptyData;
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
  if (!supabaseUrl || !serviceRole) return emptyData;

  try {
    const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    const [epochsResult, leadersResult, activeResult, payoutResult] = await Promise.all([
      supabase.from("epochs").select("epoch_id,started_at").order("started_at", { ascending: false }).limit(10),
      supabase
        .from("holder_states")
        .select("wallet,source_balance,current_multiplier_bps,eligible_since")
        .eq("permanently_ineligible", false)
        .order("source_balance", { ascending: false })
        .limit(10),
      supabase.from("holder_states").select("wallet", { count: "exact", head: true }).eq("permanently_ineligible", false),
      supabase
        .from("payouts")
        .select("epoch_id,wallet,reward_amount,status,tx_sig,updated_at")
        .eq("reward_asset", brand.rewardSymbol)
        .order("updated_at", { ascending: false })
        .limit(2000)
    ]);

    if (epochsResult.error || leadersResult.error || activeResult.error || payoutResult.error) return emptyData;

    const epochIds = new Set((epochsResult.data ?? []).map((epoch) => String(epoch.epoch_id)));
    const totals = new Map<string, { amount: number; recipients: number; proofs: Set<string> }>();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    let totalDistributed = 0;
    let distributedToday = 0;
    const settledEpochs = new Set<string>();
    for (const payout of payoutResult.data ?? []) {
      if (payout.status !== "settled") continue;
      const amount = Number(payout.reward_amount ?? 0);
      totalDistributed += Number.isFinite(amount) ? amount : 0;
      if (payout.updated_at && Date.parse(String(payout.updated_at)) >= todayStart.getTime()) {
        distributedToday += Number.isFinite(amount) ? amount : 0;
      }
      const epochId = String(payout.epoch_id);
      settledEpochs.add(epochId);
      if (!epochIds.has(epochId)) continue;
      const current = totals.get(epochId) ?? { amount: 0, recipients: 0, proofs: new Set<string>() };
      current.amount += amount;
      current.recipients += 1;
      if (payout.tx_sig) current.proofs.add(String(payout.tx_sig));
      totals.set(epochId, current);
    }

    const rounds = (epochsResult.data ?? [])
      .map((epoch) => {
        const epochId = String(epoch.epoch_id);
        const total = totals.get(epochId);
        return {
          epochId,
          amount: total?.amount ?? 0,
          recipients: total?.recipients ?? 0,
          proofs: [...(total?.proofs ?? [])].slice(0, 3)
        };
      })
      .filter((round) => round.amount > 0 && round.proofs.length > 0);

    const receipts = (payoutResult.data ?? [])
      .slice(0, 12)
      .map((payout) => ({
        epochId: String(payout.epoch_id),
        wallet: String(payout.wallet),
        amount: Number(payout.reward_amount ?? 0),
        status: String(payout.status ?? "planned"),
        txSig: payout.tx_sig ? String(payout.tx_sig) : null,
        updatedAt: payout.updated_at ? String(payout.updated_at) : null
      }));

    const latestConfirmedTx = receipts.find((receipt) => receipt.status === "settled" && receipt.txSig)?.txSig ?? null;

    return {
      rounds,
      receipts,
      totalDistributed,
      distributedToday,
      completedCycles: settledEpochs.size,
      latestConfirmedTx,
      activeWallets: activeResult.count ?? 0,
      leaders: (leadersResult.data ?? []).map((row) => ({
        wallet: String(row.wallet),
        balance: Number(row.source_balance ?? 0),
        multiplier: Number(row.current_multiplier_bps ?? 10_000) / 10_000,
        eligibleSince: row.eligible_since ? String(row.eligible_since) : null
      }))
    };
  } catch {
    return emptyData;
  }
}

export default async function Page() {
  const data = await getProtocolData();
  const countdownMinutes = Number.parseInt(brand.rewardInterval, 10) || 5;
  const buyHref = brand.buyUrl || "#top";

  return (
    <main className="cashbull-page">
      <div className="cash-rain" aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => <span key={index}>$</span>)}
      </div>

      <header className="site-header">
        <a className="identity" href="#top">
          <Image src={brand.logoPath} alt="" width={48} height={48} priority />
          <span><strong>CASHBULL</strong><small>USDC rewards protocol</small></span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#terminal">Live Payouts</a>
          <a href="#how">How it works</a>
          <a href="#eligibility">Eligibility</a>
          <a href="#receipts">Receipts</a>
          <a href="#treasury">Treasury</a>
          {brand.articleUrl ? <a href={brand.articleUrl} rel="noreferrer" target="_blank">Article</a> : null}
          <a href={buyHref} rel={brand.buyUrl ? "noreferrer" : undefined} target={brand.buyUrl ? "_blank" : undefined}>Buy</a>
          <a href="#wallet">Connect Wallet</a>
        </nav>
        {brand.tokenMint ? (
          <a className="contract-link" href={`https://solscan.io/token/${brand.tokenMint}`} rel="noreferrer" target="_blank">
            <span>CA</span>{shortWallet(brand.tokenMint)}
          </a>
        ) : <span className="contract-link is-pending"><span>CA</span>Pending</span>}
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="kicker"><span /> Live USDC distribution terminal</p>
          <h1>The bull that pays in cash.</h1>
          <p className="hero-lede">{brand.secondaryTagline}</p>
          <div className="hero-actions">
            <a className={`primary-action${brand.buyUrl ? "" : " is-disabled"}`} href={buyHref} rel={brand.buyUrl ? "noreferrer" : undefined} target={brand.buyUrl ? "_blank" : undefined}>Buy $CASHBULL</a>
            <a className="secondary-action" href="#receipts">View live payouts</a>
          </div>
          <p className="minimum-rule">Hold at least <strong>{Number(brand.minimumEligibleBalance).toLocaleString()} $CASHBULL</strong> to enter the reward pool.</p>
          <div className="hero-metrics" aria-label="Hero live metrics">
            <article><span>Next distribution</span><strong><EpochCountdown minutes={countdownMinutes} /></strong></article>
            <article><span>Current USDC pool</span><strong>$0</strong><em>No live pool source</em></article>
            <article><span>Eligible holders</span><strong>{data.activeWallets}</strong></article>
            <article><span>Total USDC distributed</span><strong>${formatAmount(data.totalDistributed, 2)}</strong></article>
          </div>
        </div>

        <div className="hero-visual">
          <div className="bull-frame">
            <Image src={brand.logoPath} alt="Bull folded from US dollar bills" width={1200} height={982} priority />
          </div>
          <div className="next-drop">
            <span>Next USDC drop</span>
            <strong><EpochCountdown minutes={countdownMinutes} /></strong>
            <em>Settles on Solana</em>
          </div>
        </div>
      </section>

      <section className="terminal-section" id="terminal">
        <div className="terminal-head">
          <div><p className="kicker"><span /> Live cash terminal</p><h2>Protocol cash flow.</h2></div>
          <p>Real values appear as the worker records snapshots, payouts, and settled transaction signatures.</p>
        </div>
        <div className="terminal-grid">
          <article><span>Treasury balance</span><strong>0 SOL</strong><em>Balance feed not exposed</em></article>
          <article><span>Current distribution pool</span><strong>$0</strong><em>No live pool source</em></article>
          <article><span>Next payout</span><strong><EpochCountdown minutes={countdownMinutes} /></strong><em>{brand.rewardInterval} cycles</em></article>
          <article><span>USDC distributed today</span><strong>${formatAmount(data.distributedToday, 2)}</strong><em>Settled today only</em></article>
          <article><span>Total USDC distributed</span><strong>${formatAmount(data.totalDistributed, 2)}</strong><em>Confirmed receipts</em></article>
          <article><span>Completed cycles</span><strong>{data.completedCycles}</strong><em>Settled epochs</em></article>
          <article><span>Eligible holders</span><strong>{data.activeWallets}</strong><em>Current holder state</em></article>
          <article><span>Latest confirmed tx</span><strong>{data.latestConfirmedTx ? shortWallet(data.latestConfirmedTx) : "None yet"}</strong><em>{data.latestConfirmedTx ? "Solana confirmed" : "Waiting for first receipt"}</em></article>
        </div>
      </section>

      <section className="how-section" id="how">
        <div className="section-heading">
          <p className="kicker"><span /> How it works</p>
          <h2>Hold. Qualify. Distribute. Receive.</h2>
          <p>Cashbull tracks eligible holders, routes protocol revenue into the active USDC distribution pool, and publishes settled payouts on-chain.</p>
        </div>
        <div className="step-flow">
          <article><span>01</span><strong>Hold</strong><p>Hold the required amount of $CASHBULL.</p></article>
          <i aria-hidden="true" />
          <article><span>02</span><strong>Qualify</strong><p>The protocol identifies eligible wallets at each snapshot.</p></article>
          <i aria-hidden="true" />
          <article><span>03</span><strong>Distribute</strong><p>Protocol revenue funds the active USDC distribution pool.</p></article>
          <i aria-hidden="true" />
          <article><span>04</span><strong>Receive</strong><p>Qualifying wallets receive USDC when a cycle completes.</p></article>
        </div>
        <p className="disclosure-line">Payout amounts depend on available protocol revenue, eligibility rules, network conditions, and successful transaction execution.</p>
      </section>

      <section className="boost-section" id="eligibility">
        <div className="section-heading compact">
          <p className="kicker"><span /> Eligibility</p>
          <h2>Stay in the cycle.</h2>
          <p>Eligibility is evaluated from the live holder state and configurable protocol rules.</p>
        </div>
        <div className="eligibility-grid">
          <article><span>Minimum token balance</span><strong>{Number(brand.minimumEligibleBalance).toLocaleString()} $CASHBULL</strong></article>
          <article><span>Snapshot cadence</span><strong>{brand.rewardInterval}</strong></article>
          <article><span>Excluded wallets</span><strong>Config driven</strong></article>
          <article><span>Selling rule</span><strong>Balance decrease can end eligibility</strong></article>
        </div>
        <div className="boost-layout">
          <div className="time-track">
            {brand.holdTiers.map((tier, index) => (
              <article className={index === brand.holdTiers.length - 1 ? "is-max" : ""} key={tier.window}>
                <span>{tier.window}</span><strong>{tier.multiplier}</strong>
              </article>
            ))}
          </div>
          <div className="rank-boosts">
            <span>Rank boost</span>
            {brand.rankTiers.map((tier) => <article key={tier.rank}><strong>{tier.rank}</strong><em>{tier.multiplier}</em></article>)}
          </div>
        </div>
        <p className="rule-notice"><strong>Holding rule:</strong> an indexed balance decrease ends eligibility under the current protocol rules.</p>
      </section>

      <section className="leaderboard-section" id="holders">
        <div className="section-heading row-heading">
          <div><p className="kicker">Live holders</p><h2>The bull pen.</h2></div>
          <p>Only current eligible snapshots appear. No demo wallets and no fabricated balances.</p>
        </div>
        <div className="leaderboard-table">
          <div className="table-head"><span>Rank / Wallet</span><span>CASHBULL held</span><span>Holding since</span><span>Boost</span></div>
          {data.leaders.length ? data.leaders.map((wallet, index) => (
            <article key={wallet.wallet}>
              <span><b>{String(index + 1).padStart(2, "0")}</b><a href={`https://solscan.io/account/${wallet.wallet}`} rel="noreferrer" target="_blank">{shortWallet(wallet.wallet)}</a></span>
              <strong>{formatAmount(wallet.balance, 2)}</strong>
              <span>{formatDate(wallet.eligibleSince)}</span>
              <em>{wallet.multiplier.toFixed(2)}x</em>
            </article>
          )) : <div className="data-empty"><strong>0 indexed wallets</strong><span>The first Cashbull holder snapshot will populate this board.</span></div>}
        </div>
      </section>

      <section className="proof-section" id="receipts">
        <div className="section-heading row-heading">
          <div><p className="kicker"><span /> Payout receipts</p><h2>Cash leaves proof.</h2></div>
          <p>Every confirmed row links to a real Solana transaction. No fake hashes, no demo payouts.</p>
        </div>
        <div className="receipt-table">
          <div className="table-head"><span>Recipient</span><span>Amount</span><span>Cycle</span><span>Timestamp</span><span>Status</span><span>Explorer</span></div>
          {data.receipts.length ? data.receipts.map((receipt) => (
            <article key={`${receipt.epochId}-${receipt.wallet}-${receipt.txSig ?? receipt.status}`}>
              <span>{shortWallet(receipt.wallet)}</span>
              <strong>${formatAmount(receipt.amount, 2)} USDC</strong>
              <span>{receipt.epochId}</span>
              <span>{formatDate(receipt.updatedAt)}</span>
              <em className={`status-pill status-${receipt.status}`}>{statusLabel(receipt.status)}</em>
              {receipt.txSig ? <a href={`https://solscan.io/tx/${receipt.txSig}`} rel="noreferrer" target="_blank">View</a> : <span>No tx yet</span>}
            </article>
          )) : <div className="data-empty"><strong>0 payout receipts</strong><span>Confirmed USDC transactions will appear here after the first completed Cashbull cycle.</span></div>}
        </div>
      </section>

      <section className="treasury-section" id="treasury">
        <div className="section-heading row-heading">
          <div><p className="kicker"><span /> Treasury transparency</p><h2>Follow the cash.</h2></div>
          <p>Addresses are configurable so the public can verify movement through Solana explorers.</p>
        </div>
        <div className="treasury-grid">
          <article><span>Treasury wallet</span><strong>{brand.treasuryAddress ? shortWallet(brand.treasuryAddress) : "Not configured"}</strong>{brand.treasuryAddress ? <a href={`https://solscan.io/account/${brand.treasuryAddress}`} rel="noreferrer" target="_blank">Open explorer</a> : null}</article>
          <article><span>Distribution wallet</span><strong>{brand.distributionAddress ? shortWallet(brand.distributionAddress) : "Not configured"}</strong>{brand.distributionAddress ? <a href={`https://solscan.io/account/${brand.distributionAddress}`} rel="noreferrer" target="_blank">Open explorer</a> : null}</article>
          <article><span>Current USDC balance</span><strong>$0</strong><em>No live balance source</em></article>
          <article><span>Recent inflows</span><strong>0</strong><em>Not exposed by current API</em></article>
          <article><span>Recent distributions</span><strong>{data.completedCycles}</strong><em>Settled cycles</em></article>
        </div>
      </section>

      <section className="wallet-section" id="wallet">
        <div className="section-heading row-heading">
          <div><p className="kicker"><span /> Wallet checker</p><h2>Count your cash.</h2></div>
          <p>No connection and no signature. Paste a public Solana wallet to inspect eligibility and settled USDC rewards.</p>
        </div>
        <WalletProofLookup />
      </section>

      <section className="banner-cta">
        <Image src={brand.bannerPath} alt="Cashbull market banner" loading="eager" width={1500} height={490} />
        <div>
          <p className="kicker"><span /> Final call</p>
          <h2>Stay bullish. Stay in the cycle.</h2>
          <p>Hold $CASHBULL, remain eligible, and follow every USDC distribution on-chain.</p>
          <div className="hero-actions">
            <a className={`primary-action${brand.buyUrl ? "" : " is-disabled"}`} href={buyHref} rel={brand.buyUrl ? "noreferrer" : undefined} target={brand.buyUrl ? "_blank" : undefined}>Buy $CASHBULL</a>
            <a className="secondary-action" href="#receipts">View receipts</a>
          </div>
        </div>
      </section>

      <footer>
        <div><Image src={brand.logoPath} alt="" width={56} height={56} /><span><strong>CASHBULL</strong><small>Hold the bull. Catch the cash.</small></span></div>
        <div className="footer-links">
          {brand.articleUrl ? <a href={brand.articleUrl} rel="noreferrer" target="_blank">Article</a> : null}
          {brand.communityUrl ? <a href={brand.communityUrl} rel="noreferrer" target="_blank">Community</a> : null}
          {brand.tokenMint ? <a href={`https://dexscreener.com/solana/${brand.tokenMint}`} rel="noreferrer" target="_blank">Dexscreener</a> : null}
        </div>
        <p>Experimental rewards protocol. Rewards depend on available fees, eligibility rules, and successful on-chain settlement. Digital assets are volatile.</p>
      </footer>
    </main>
  );
}
