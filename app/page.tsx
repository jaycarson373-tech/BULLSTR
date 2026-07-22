import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import { brand } from "./brand";
import { CopyContract } from "./CopyContract";
import { EpochCountdown } from "./EpochCountdown";
import { MemeBank } from "./MemeBank";
import { WalletProofLookup } from "./WalletProofLookup";

export const dynamic = "force-dynamic";

type RewardRound = {
  epochId: string;
  startedAt: string | null;
  amount: number;
  recipients: number;
  proofs: string[];
};

type HimothyHolder = {
  wallet: string;
  balance: number;
  multiplier: number;
  eligibleSince: string | null;
};

type FallenHimothy = {
  wallet: string;
  reason: string | null;
  lastSeenAt: string | null;
};

type ProtocolData = {
  rounds: RewardRound[];
  leaders: HimothyHolder[];
  fallen: FallenHimothy[];
  activeWallets: number;
  totalDistributed: number;
};

const emptyData: ProtocolData = { rounds: [], leaders: [], fallen: [], activeWallets: 0, totalDistributed: 0 };

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
    const [epochsResult, leadersResult, fallenResult, activeResult, payoutResult] = await Promise.all([
      supabase.from("epochs").select("epoch_id,started_at").order("started_at", { ascending: false }).limit(10),
      supabase
        .from("holder_states")
        .select("wallet,source_balance,current_multiplier_bps,eligible_since")
        .eq("permanently_ineligible", false)
        .order("source_balance", { ascending: false })
        .limit(10),
      supabase
        .from("holder_states")
        .select("wallet,ineligible_reason,last_seen_at")
        .eq("permanently_ineligible", true)
        .order("last_seen_at", { ascending: false })
        .limit(8),
      supabase.from("holder_states").select("wallet", { count: "exact", head: true }).eq("permanently_ineligible", false),
      supabase
        .from("payouts")
        .select("epoch_id,reward_amount,tx_sig")
        .eq("status", "settled")
        .eq("reward_asset", brand.rewardSymbol)
        .order("updated_at", { ascending: false })
        .limit(2000)
    ]);

    if (epochsResult.error || leadersResult.error || fallenResult.error || activeResult.error || payoutResult.error) return emptyData;

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
          startedAt: epoch.started_at ? String(epoch.started_at) : epochId,
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
      })),
      fallen: (fallenResult.data ?? []).map((row) => ({
        wallet: String(row.wallet),
        reason: row.ineligible_reason ? String(row.ineligible_reason) : null,
        lastSeenAt: row.last_seen_at ? String(row.last_seen_at) : null
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
    <main className="himothy-page">
      <div className="money-rain" aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => <span key={index}>$</span>)}
      </div>
      <div className="meme-ticker" aria-hidden="true">
        {[...brand.memeStrips, ...brand.memeStrips].map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}
      </div>

      <header className="site-header">
        <a className="identity" href="#top">
          <Image src={brand.logoPath} alt="" width={48} height={48} priority />
          <span><strong>HIMOTHY</strong><small>Jimothy reward protocol</small></span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#jimothy">Jimothy</a>
          <a href="#leaderboard">Top Himothys</a>
          <a href="#fallen">Fallen</a>
          <a href="#proofs">Drops</a>
          {brand.communityUrl ? <a href={brand.communityUrl} rel="noreferrer" target="_blank">X</a> : null}
        </nav>
        <div className="header-actions">
          {brand.buyUrl ? <a className="x-link" href={brand.buyUrl} rel="noreferrer" target="_blank">Buy</a> : null}
          {brand.tokenMint ? <CopyContract mint={brand.tokenMint} /> : <span className="contract-link is-pending"><span>CA</span>Pending</span>}
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="kicker"><span /> We are all Himothy</p>
          <h1><em>HIMOTHY</em></h1>
          <p className="hero-tagline">{brand.tagline}</p>
          <p className="hero-lede">{brand.secondaryTagline}</p>
          <div className="hero-actions">
            <a className="primary-action" href="#wallet">Check Himothy status</a>
            <a className="secondary-action" href="#proofs">View Jimothy drops</a>
          </div>
          <p className="minimum-rule">
            Hold at least <strong>{Number(brand.minimumEligibleBalance).toLocaleString()} $HIMOTHY</strong>. Wallets above <strong>{brand.maxHolderPercent}%</strong> are excluded.
          </p>
        </div>

        <div className="hero-visual">
          <div className="logo-frame">
            <Image src={brand.logoPath} alt="Himothy logo" width={1200} height={1200} priority />
          </div>
          <div className="next-drop">
            <span>Next Jimothy drop</span>
            <strong><EpochCountdown minutes={countdownMinutes} /></strong>
            <em>Every five minutes</em>
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
          <p>Only eligible wallets appear. No demo wallets and no fabricated balances.</p>
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
          <p>Wallets that break the holding rule are shown separately once holder-state data exists.</p>
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

      <footer>
        <div><Image src={brand.logoPath} alt="" width={56} height={56} /><span><strong>HIMOTHY</strong><small>We are all Himothy.</small></span></div>
        <div className="footer-links">
          {brand.communityUrl ? <a href={brand.communityUrl} rel="noreferrer" target="_blank">X</a> : null}
          {brand.tokenMint ? <a href={`https://dexscreener.com/solana/${brand.tokenMint}`} rel="noreferrer" target="_blank">Himothy chart</a> : null}
          {brand.rewardTokenMint ? <a href={`https://dexscreener.com/solana/${brand.rewardTokenMint}`} rel="noreferrer" target="_blank">Jimothy chart</a> : null}
        </div>
        <p>Experimental rewards protocol. Rewards depend on available funds, eligibility rules, and successful on-chain settlement. Digital assets are volatile.</p>
      </footer>
    </main>
  );
}
