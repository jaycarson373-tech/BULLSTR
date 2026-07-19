import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import { brand } from "./brand";

export const dynamic = "force-dynamic";

type RoundRow = {
  epochId: string;
  amount: number;
  recipients: number;
  status: string;
  rewardAsset: string;
};

type Stat = {
  label: string;
  value: string;
  note: string;
};

function formatAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatEpoch(epochId: string) {
  const date = Date.parse(epochId);
  if (!Number.isFinite(date)) return epochId.slice(0, 16);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(date));
}

async function getRewardRounds(): Promise<RoundRow[]> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
  if (!supabaseUrl || !serviceRole) return [];

  try {
    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false }
    });

    const { data: epochs } = await supabase
      .from("epochs")
      .select("epoch_id,status,started_at")
      .order("started_at", { ascending: false })
      .limit(6);

    const epochIds = (epochs ?? []).map((epoch) => String(epoch.epoch_id));
    const { data: payouts } = await supabase
      .from("payouts")
      .select("epoch_id,reward_amount,status,reward_asset")
      .eq("status", "settled")
      .in("epoch_id", epochIds.length ? epochIds : ["__none__"]);

    const totals = new Map<string, { amount: number; recipients: number; rewardAsset: string }>();
    for (const payout of payouts ?? []) {
      const epochId = String(payout.epoch_id);
      const rewardAsset = String(payout.reward_asset ?? brand.rewardSymbol);
      const key = `${epochId}:${rewardAsset}`;
      const current = totals.get(key) ?? { amount: 0, recipients: 0, rewardAsset };
      current.amount += Number(payout.reward_amount ?? 0);
      current.recipients += 1;
      totals.set(key, current);
    }

    return (epochs ?? []).map((epoch) => {
      const epochId = String(epoch.epoch_id);
      const settled = [...totals.entries()].find(([key]) => key.startsWith(`${epochId}:`))?.[1];
      return {
        epochId,
        amount: settled?.amount ?? 0,
        recipients: settled?.recipients ?? 0,
        rewardAsset: settled?.rewardAsset ?? brand.rewardSymbol,
        status: String(epoch.status ?? "scheduled")
      };
    });
  } catch {
    return [];
  }
}

function buildStats(rounds: RoundRow[]): Stat[] {
  const completed = rounds.filter((round) => round.amount > 0);
  const distributed = completed.reduce((sum, round) => sum + round.amount, 0);
  const recipients = completed.reduce((sum, round) => sum + round.recipients, 0);

  return [
    {
      label: "Reward cadence",
      value: brand.rewardInterval,
      note: `${brand.rewardRotation.length}-token rotation`
    },
    {
      label: "Eligible balance",
      value: brand.minimumEligibleBalance,
      note: `${brand.ticker} minimum`
    },
    {
      label: "Settled rewards",
      value: `${formatAmount(distributed)} ${brand.rewardSymbol}`,
      note: `${recipients} recipient records`
    }
  ];
}

export default async function Page() {
  const rounds = await getRewardRounds();
  const stats = buildStats(rounds);

  return (
    <main className="diamond-page">
      <div className="diamond-orbit" aria-hidden="true" />
      <div className="chrome-grid" aria-hidden="true" />

      <section className="hero-shell" aria-label={`${brand.name} overview`}>
        <nav className="topbar" aria-label="Primary links">
          <div className="brand-mark">
            <Image src={brand.logoPath} alt="" width={48} height={48} priority />
            <span>{brand.displayName}</span>
          </div>
          <div className="nav-actions">
            {brand.xUrl ? <a href={brand.xUrl}>X</a> : <span>X pending</span>}
            <span>{brand.tokenMint ? `CA: ${brand.tokenMint}` : "CA pending"}</span>
          </div>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">{brand.ticker} on Solana</p>
            <h1>{brand.name}</h1>
            <p className="tagline">{brand.tagline}</p>
            <p className="subcopy">{brand.secondaryTagline}</p>

            <div className="hero-actions">
              <a href="#basket">View Diamond Basket</a>
              <a href="#rounds">Reward Rounds</a>
            </div>
          </div>

          <div className="logo-stage" aria-label={`${brand.displayName} logo`}>
            <Image src={brand.logoPath} alt={`${brand.displayName} logo`} width={520} height={520} priority />
          </div>
        </div>
      </section>

      <section className="stats-panel" aria-label="Diamond Index 6900 live status">
        {stats.map((stat) => (
          <article key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <em>{stat.note}</em>
          </article>
        ))}
      </section>

      <section className="basket-panel" id="basket" aria-label="Current experimental Diamond Basket">
        <div className="basket-heading">
          <div>
            <p className="eyebrow">Current Diamond Basket</p>
            <h2>The strongest holders. The strongest communities.</h2>
          </div>
          <p>{brand.scoreDescription}</p>
        </div>

        <div className="scanner-status" aria-label="Diamond Scanner status">
          <div className="scanner-title">
            <span className="scanner-pulse" aria-hidden="true" />
            <strong>Diamond Scanner</strong>
          </div>
          <article>
            <strong>{brand.scanner.projectsScanned}</strong>
            <span>Projects Scanned</span>
          </article>
          <article>
            <strong>{brand.basket.length}</strong>
            <span>Current Index Members</span>
          </article>
          <article>
            <strong>{brand.scanner.refreshCycle}</strong>
            <span>Refresh Cycle</span>
          </article>
          <article>
            <strong>{brand.scanner.status}</strong>
            <span>Methodology Status</span>
          </article>
        </div>

        <div className="basket-grid">
          {brand.basket.map((token, index) => {
            const statusClass = token.status.toLowerCase().replace(/\s+/g, "-");
            return (
              <article className="basket-card" key={token.name}>
                <div className="token-row">
                  <span className="token-logo" aria-hidden="true">{token.symbol.slice(0, 2)}</span>
                  <div>
                    <span>#{index + 1} Index Member</span>
                    <strong>{token.name}</strong>
                  </div>
                </div>
                <div className="score-row">
                  <span>Diamond Score</span>
                  <strong>{token.score}</strong>
                </div>
                <span className={`status-pill status-${statusClass}`}>{token.status}</span>
              </article>
            );
          })}
        </div>

        <p className="basket-disclosure">
          Experimental launch basket supplied by the project owner. Token mints and score inputs must be verified before
          rewards are enabled. Public rankings and supporting analytics are coming soon.
        </p>
      </section>

      <section className="index-panel" aria-label="Diamond Index 6900 methodology preview">
        <div>
          <p className="eyebrow">How the index works</p>
          <h2>Conviction, measured.</h2>
        </div>
        <ol>
          <li>Wallets are analyzed</li>
          <li>Diamond Scores are calculated</li>
          <li>Top communities qualify</li>
          <li>Index weights are assigned</li>
          <li>Rewards are distributed</li>
        </ol>
      </section>

      <section className="rotation-panel" aria-label="Diamond Index 6900 reward rotation">
        <div>
          <p className="eyebrow">5-token reward rotation</p>
          <h2>Every epoch drops a different basket token.</h2>
        </div>
        <div className="rotation-list">
          {brand.rewardRotation.map((token, index) => (
            <article key={`${token}-${index}`}>
              <span>Slot {index + 1}</span>
              <strong>{token}</strong>
              <em>{index === 0 ? "Current cycle starts here" : "Rotates in sequence"}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="rounds-panel" id="rounds" aria-label="Latest reward rounds">
        <div className="panel-heading">
          <p className="eyebrow">Reward reporting</p>
          <h2>Latest completed distributions</h2>
        </div>
        <div className="round-list">
          {rounds.length ? (
            rounds.map((round) => (
              <article key={round.epochId}>
                <span>{formatEpoch(round.epochId)}</span>
                <strong>{formatAmount(round.amount)} {round.rewardAsset}</strong>
                <em>{round.recipients} wallets · {round.status}</em>
              </article>
            ))
          ) : (
            <article className="empty-round">
              <span>Round data unavailable</span>
              <strong>0 {brand.rewardSymbol}</strong>
              <em>Connect Supabase envs to show settled rewards.</em>
            </article>
          )}
        </div>
      </section>

      <section className="roadmap-panel" aria-label="Diamond Index 6900 roadmap">
        <div>
          <p className="eyebrow">Coming soon</p>
          <h2>The Diamond Terminal expands.</h2>
        </div>
        <div className="roadmap-list">
          {brand.roadmap.map((item) => (
            <article key={item}>
              <span aria-hidden="true" />
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="risk-panel" aria-label="Risk disclosure">
        Diamond Score is an experimental analytical metric. It does not measure future performance and is not financial
        advice. Digital assets are volatile and may lose substantial or all of their value.
      </section>

      <div className="bottom-banner" aria-label={`${brand.displayName} banner`}>
        <Image src={brand.bannerPath} alt={`${brand.displayName} diamond banner`} width={1280} height={426} />
      </div>
    </main>
  );
}
