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

type CashbullHolder = {
  wallet: string;
  balance: number;
  multiplier: number;
  eligibleSince: string | null;
};

type ProtocolData = {
  rounds: RewardRound[];
  leaders: CashbullHolder[];
  activeWallets: number;
  totalDistributed: number;
};

const emptyData: ProtocolData = { rounds: [], leaders: [], activeWallets: 0, totalDistributed: 0 };

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
        .select("epoch_id,reward_amount,tx_sig")
        .eq("status", "settled")
        .eq("reward_asset", brand.rewardSymbol)
        .order("updated_at", { ascending: false })
        .limit(2000)
    ]);

    if (epochsResult.error || leadersResult.error || activeResult.error || payoutResult.error) return emptyData;

    const epochIds = new Set((epochsResult.data ?? []).map((epoch) => String(epoch.epoch_id)));
    const totals = new Map<string, { amount: number; recipients: number; proofs: Set<string> }>();
    let totalDistributed = 0;
    for (const payout of payoutResult.data ?? []) {
      const amount = Number(payout.reward_amount ?? 0);
      totalDistributed += Number.isFinite(amount) ? amount : 0;
      const epochId = String(payout.epoch_id);
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

    return {
      rounds,
      totalDistributed,
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
          <a href="#how">How it works</a>
          <a href="#boost">Multiplier</a>
          <a href="#proofs">Proofs</a>
          {brand.articleUrl ? <a href={brand.articleUrl} rel="noreferrer" target="_blank">Article</a> : null}
          {brand.communityUrl ? <a href={brand.communityUrl} rel="noreferrer" target="_blank">Community</a> : null}
        </nav>
        {brand.tokenMint ? (
          <a className="contract-link" href={`https://solscan.io/token/${brand.tokenMint}`} rel="noreferrer" target="_blank">
            <span>CA</span>{shortWallet(brand.tokenMint)}
          </a>
        ) : <span className="contract-link is-pending"><span>CA</span>Pending</span>}
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="kicker"><span /> Five-minute USDC rewards</p>
          <h1>CASH<br /><em>BULL.</em></h1>
          <p className="hero-tagline">{brand.tagline}</p>
          <p className="hero-lede">{brand.secondaryTagline}</p>
          <div className="hero-actions">
            <a className="primary-action" href="#wallet">Check eligibility</a>
            {brand.articleUrl ? <a className="secondary-action" href={brand.articleUrl} rel="noreferrer" target="_blank">Read the article</a> : <a className="secondary-action" href="#how">See how it works</a>}
          </div>
          <p className="minimum-rule">Hold at least <strong>{Number(brand.minimumEligibleBalance).toLocaleString()} $CASHBULL</strong> to enter the reward pool.</p>
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

      <section className="protocol-strip" aria-label="Protocol status">
        <article><span>Reward asset</span><strong>USDC</strong><em>one clear reward</em></article>
        <article><span>Drop cadence</span><strong>{brand.rewardInterval}</strong><em>automatic epochs</em></article>
        <article><span>Eligible wallets</span><strong>{data.activeWallets}</strong><em>live indexed holders</em></article>
        <article><span>USDC distributed</span><strong>${formatAmount(data.totalDistributed, 2)}</strong><em>settled proofs only</em></article>
      </section>

      <section className="how-section" id="how">
        <div className="section-heading">
          <p className="kicker">Simple by design</p>
          <h2>Hold. Boost. Get paid.</h2>
          <p>Cashbull tracks eligible holders, converts claimed creator fees into USDC, and publishes every settled reward on-chain.</p>
        </div>
        <div className="step-flow">
          <article><span>01</span><strong>Hold $CASHBULL</strong><p>Meet the minimum balance and stay indexed.</p></article>
          <i aria-hidden="true" />
          <article><span>02</span><strong>Build your boost</strong><p>Longer holds and higher rank increase reward weight.</p></article>
          <i aria-hidden="true" />
          <article><span>03</span><strong>Receive USDC</strong><p>Eligible wallets share each settled five-minute reward epoch.</p></article>
        </div>
      </section>

      <section className="boost-section" id="boost">
        <div className="section-heading compact">
          <p className="kicker">Holder multiplier</p>
          <h2>Strong hands earn more weight.</h2>
          <p>Time and holder rank stack together. Rewards still depend on available fees and successful settlement.</p>
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

      <section className="proof-section" id="proofs">
        <div className="section-heading row-heading">
          <div><p className="kicker">On-chain receipts</p><h2>Cash leaves proof.</h2></div>
          <p>Only settled USDC payouts with transaction signatures are published.</p>
        </div>
        <div className="proof-grid">
          {data.rounds.length ? data.rounds.map((round) => (
            <article key={round.epochId}>
              <span>{formatDate(round.epochId)}</span>
              <strong>${formatAmount(round.amount, 2)} USDC</strong>
              <em>{round.recipients} recipient{round.recipients === 1 ? "" : "s"}</em>
              <div>{round.proofs.map((signature, index) => <a href={`https://solscan.io/tx/${signature}`} key={signature} rel="noreferrer" target="_blank">Proof {index + 1}</a>)}</div>
            </article>
          )) : <div className="data-empty"><strong>0 settled USDC drops</strong><span>Verified transactions will appear after the first completed Cashbull epoch.</span></div>}
        </div>
      </section>

      <section className="wallet-section" id="wallet">
        <div className="section-heading row-heading">
          <div><p className="kicker">Wallet checker</p><h2>Count your cash.</h2></div>
          <p>No connection and no signature. Paste a public Solana wallet to inspect eligibility and settled USDC rewards.</p>
        </div>
        <WalletProofLookup />
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
