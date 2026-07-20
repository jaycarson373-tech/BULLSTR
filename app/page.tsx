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

type ConvictionWallet = {
  wallet: string;
  balance: number;
  multiplier: number;
  eligibleSince: string | null;
};

type FallenWallet = {
  wallet: string;
  fallenAt: string | null;
};

type ProtocolData = {
  rounds: RewardRound[];
  leaders: ConvictionWallet[];
  fallen: FallenWallet[];
  activeWallets: number;
};

const emptyData: ProtocolData = { rounds: [], leaders: [], fallen: [], activeWallets: 0 };

function formatAmount(value: number, maximumFractionDigits = 4) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "Not recorded";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(parsed));
}

function shortWallet(wallet: string) {
  return `${wallet.slice(0, 6)}...${wallet.slice(-6)}`;
}

async function getProtocolData(): Promise<ProtocolData> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
  if (!supabaseUrl || !serviceRole) return emptyData;

  try {
    const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    const [epochsResult, leadersResult, activeResult, fallenResult] = await Promise.all([
      supabase.from("epochs").select("epoch_id,started_at").order("started_at", { ascending: false }).limit(8),
      supabase
        .from("holder_states")
        .select("wallet,source_balance,current_multiplier_bps,eligible_since")
        .eq("permanently_ineligible", false)
        .order("source_balance", { ascending: false })
        .limit(10),
      supabase.from("holder_states").select("wallet", { count: "exact", head: true }).eq("permanently_ineligible", false),
      supabase
        .from("holder_states")
        .select("wallet,ineligible_at")
        .eq("permanently_ineligible", true)
        .eq("ineligible_reason", "sold_after_eligibility")
        .order("ineligible_at", { ascending: false })
        .limit(20)
    ]);

    if (epochsResult.error || leadersResult.error || activeResult.error || fallenResult.error) return emptyData;

    const epochIds = (epochsResult.data ?? []).map((epoch) => String(epoch.epoch_id));
    const payoutResult = await supabase
      .from("payouts")
      .select("epoch_id,reward_amount,tx_sig")
      .eq("status", "settled")
      .eq("reward_asset", "SOL")
      .in("epoch_id", epochIds.length ? epochIds : ["__none__"]);

    if (payoutResult.error) return emptyData;

    const totals = new Map<string, { amount: number; recipients: number; proofs: Set<string> }>();
    for (const payout of payoutResult.data ?? []) {
      const epochId = String(payout.epoch_id);
      const current = totals.get(epochId) ?? { amount: 0, recipients: 0, proofs: new Set<string>() };
      current.amount += Number(payout.reward_amount ?? 0);
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
      activeWallets: activeResult.count ?? 0,
      leaders: (leadersResult.data ?? []).map((row) => ({
        wallet: String(row.wallet),
        balance: Number(row.source_balance ?? 0),
        multiplier: Number(row.current_multiplier_bps ?? 10_000) / 10_000,
        eligibleSince: row.eligible_since ? String(row.eligible_since) : null
      })),
      fallen: (fallenResult.data ?? []).map((row) => ({
        wallet: String(row.wallet),
        fallenAt: row.ineligible_at ? String(row.ineligible_at) : null
      }))
    };
  } catch {
    return emptyData;
  }
}

export default async function Page() {
  const data = await getProtocolData();
  const totalDistributed = data.rounds.reduce((sum, round) => sum + round.amount, 0);
  const countdownMinutes = Number.parseInt(brand.rewardInterval, 10) || 5;

  return (
    <main className="poc-page">
      <div className="crystal-field" aria-hidden="true" />
      <header className="site-header">
        <a className="identity" href="#top">
          <Image src={brand.logoPath} alt="" width={42} height={35} priority />
          <span><strong>POC</strong><small>Proof of Conviction</small></span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#multipliers">Multipliers</a>
          <a href="#leaderboard">Leaderboard</a>
          <a href="#proofs">Proofs</a>
          {brand.xUrl ? <a href={brand.xUrl} rel="noreferrer" target="_blank">X</a> : null}
        </nav>
        <a
          className={`contract-link${brand.tokenMint ? "" : " is-pending"}`}
          href={brand.tokenMint ? `https://solscan.io/token/${brand.tokenMint}` : undefined}
          rel="noreferrer"
          target={brand.tokenMint ? "_blank" : undefined}
          title={brand.tokenMint || "Contract address pending"}
        >
          <span>CA</span>{brand.tokenMint ? shortWallet(brand.tokenMint) : "Pending"}
        </a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="kicker"><span /> On-chain reputation protocol</p>
          <h1>PROOF OF<br /><em>CONVICTION.</em></h1>
          <p className="hero-lede">{brand.secondaryTagline}</p>
          <div className="hero-actions">
            <a className="primary-action" href="#wallet">Check your conviction</a>
            <a className="secondary-action" href="#mechanism">View the protocol</a>
          </div>
          <div className="rule-line">
            <span>Diamond hands only</span>
            <strong>Sell once. Eligibility ends forever.</strong>
          </div>
        </div>

        <div className="hero-visual">
          <div className="image-halo" aria-hidden="true" />
          <Image src={brand.logoPath} alt="Hands protecting a diamond" width={1254} height={1254} priority />
          <div className="next-drop">
            <span>Next reward airdrop</span>
            <strong><EpochCountdown minutes={countdownMinutes} /></strong>
            <em>Live 5-minute epoch</em>
          </div>
        </div>
      </section>

      <section className="protocol-strip" aria-label="Protocol status">
        <article><span>Reward rotation</span><strong>SOL / $PUMP</strong><em>alternating airdrop epochs</em></article>
        <article><span>Epoch cadence</span><strong>{brand.rewardInterval}</strong><em>on-chain settlement cycle</em></article>
        <article><span>Eligible wallets</span><strong>{data.activeWallets}</strong><em>currently indexed</em></article>
        <article><span>SOL distributed</span><strong>{formatAmount(totalDistributed)} SOL</strong><em>settled proofs only</em></article>
      </section>

      <section className="mechanism-section" id="mechanism">
        <div className="section-heading">
          <p className="kicker">The mechanism</p>
          <h2>Your wallet becomes<br />your reputation.</h2>
          <p>POC converts uninterrupted holding time and holder rank into a transparent allocation weight. Every round is calculated from public snapshots and settled on Solana.</p>
        </div>
        <div className="mechanism-flow">
          <article><span>01</span><strong>Hold $POC</strong><p>Establish an eligible on-chain balance.</p></article>
          <article><span>02</span><strong>Build conviction</strong><p>Time and rank increase your allocation weight.</p></article>
          <article><span>03</span><strong>Receive rewards</strong><p>SOL and $PUMP alternate every five minutes, with an operating reserve retained.</p></article>
          <article><span>04</span><strong>Keep the proof</strong><p>Every settled payout remains publicly verifiable.</p></article>
        </div>
      </section>

      <section className="multiplier-section" id="multipliers">
        <div className="section-heading compact">
          <p className="kicker">Conviction engine</p>
          <h2>Time × rank.</h2>
          <p>Your holding multiplier and holder-rank multiplier combine to determine reward weight.</p>
        </div>
        <div className="multiplier-grid">
          <div className="tier-panel hold-panel">
            <div className="tier-title"><span>Holding time</span><strong>Up to 15x</strong></div>
            {brand.holdTiers.map((tier, index) => (
              <article className={index === brand.holdTiers.length - 1 ? "tier-peak" : ""} key={tier.window}>
                <span><i>{String(index).padStart(2, "0")}</i>{tier.window}</span>
                <strong>{tier.multiplier}</strong>
              </article>
            ))}
          </div>
          <div className="tier-panel rank-panel">
            <div className="tier-title"><span>Holder rank</span><strong>Stackable</strong></div>
            {brand.rankTiers.map((tier, index) => (
              <article key={tier.rank}>
                <span><i>{String(index + 1).padStart(2, "0")}</i><b>{tier.rank}</b><small>{tier.note}</small></span>
                <strong>{tier.multiplier}</strong>
              </article>
            ))}
            <p className="multiplier-note">Example: one-month conviction at Top 10 rank produces a combined 30x allocation weight.</p>
          </div>
        </div>
      </section>

      <section className="leaderboard-section" id="leaderboard">
        <div className="section-heading row-heading">
          <div><p className="kicker">Live conviction board</p><h2>Reputation, ranked.</h2></div>
          <p>Only current, eligible wallet snapshots appear. Balances and weights update with the worker.</p>
        </div>
        <div className="leaderboard-table">
          <div className="table-head"><span>Rank / Wallet</span><span>POC held</span><span>Conviction since</span><span>Weight</span></div>
          {data.leaders.length ? data.leaders.map((wallet, index) => (
            <article key={wallet.wallet}>
              <span><b>{String(index + 1).padStart(2, "0")}</b><a href={`https://solscan.io/account/${wallet.wallet}`} rel="noreferrer" target="_blank">{shortWallet(wallet.wallet)}</a></span>
              <strong>{formatAmount(wallet.balance, 2)}</strong>
              <span>{formatDate(wallet.eligibleSince)}</span>
              <em>{wallet.multiplier.toFixed(2)}x</em>
            </article>
          )) : (
            <div className="data-empty"><strong>0 indexed wallets</strong><span>The first completed holder snapshot will populate this board.</span></div>
          )}
        </div>
      </section>

      <section className="proof-section" id="proofs">
        <div className="section-heading row-heading">
          <div><p className="kicker">On-chain proofs</p><h2>Every SOL matters.</h2></div>
          <p>Only settled distributions with transaction signatures are published.</p>
        </div>
        <div className="proof-grid">
          {data.rounds.length ? data.rounds.map((round) => (
            <article key={round.epochId}>
              <span>{formatDate(round.epochId)}</span>
              <strong>{formatAmount(round.amount)} SOL</strong>
              <em>{round.recipients} recipient{round.recipients === 1 ? "" : "s"}</em>
              <div>{round.proofs.map((signature, index) => <a href={`https://solscan.io/tx/${signature}`} key={signature} rel="noreferrer" target="_blank">Proof {index + 1}</a>)}</div>
            </article>
          )) : <div className="data-empty"><strong>0 settled distributions</strong><span>Verified SOL transactions will appear after the first completed epoch.</span></div>}
        </div>
      </section>

      <section className="wallet-section" id="wallet">
        <div className="section-heading row-heading">
          <div><p className="kicker">Wallet reputation</p><h2>Read your proof.</h2></div>
          <p>No connection and no signature. Paste a public Solana wallet to inspect its reputation and settled rewards.</p>
        </div>
        <WalletProofLookup />
      </section>

      <section className="fallen-section">
        <div className="section-heading row-heading">
          <div><p className="kicker danger">Permanent record</p><h2>Fallen wallets.</h2></div>
          <p>Any indexed balance decrease permanently ends reward eligibility for that wallet.</p>
        </div>
        <div className="fallen-table">
          {data.fallen.length ? data.fallen.map((wallet) => (
            <article key={wallet.wallet}>
              <a href={`https://solscan.io/account/${wallet.wallet}`} rel="noreferrer" target="_blank">{shortWallet(wallet.wallet)}</a>
              <strong>Conviction broken</strong>
              <span>{formatDate(wallet.fallenAt)}</span>
            </article>
          )) : <div className="data-empty"><strong>0 fallen wallets</strong><span>No permanent sell disqualifications have been recorded.</span></div>}
        </div>
      </section>

      <section className="roadmap-section">
        <div className="section-heading compact"><p className="kicker">Beyond the beta</p><h2>The conviction ecosystem.</h2></div>
        <div className="roadmap-grid">
          {brand.roadmap.map((item) => <article key={item.title}><span>{item.phase}</span><strong>{item.title}</strong><p>{item.copy}</p></article>)}
        </div>
      </section>

      <footer>
        <div><Image src={brand.logoPath} alt="" width={46} height={38} /><span><strong>Proof of Conviction</strong><small>Diamond hands leave a record.</small></span></div>
        <p>Experimental on-chain rewards protocol. Digital assets are volatile. Eligibility and rewards depend on published rules, available treasury funds, and successful settlement.</p>
      </footer>
    </main>
  );
}
