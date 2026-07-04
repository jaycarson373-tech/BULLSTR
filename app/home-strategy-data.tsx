"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type RewardTotal = {
  rewardAsset: string;
  rewardAmount: number;
  normalRewardAmount: number;
  goldenBonusReward: number;
  recipients: number;
  latestTime: string | null;
  latestTxSig: string | null;
};

type Round = {
  epoch: number;
  status: string;
  startedAt: string;
  duration: string;
  rewardBought: number;
  distributedPump: number;
  rewardTotals: RewardTotal[];
  txSig: string | null;
};

type Reward = {
  epoch: number;
  rewardAsset?: string;
  wallet: string;
  rewardAmount: number;
  goldenMultiplier: number;
  time: string;
  status: string;
  txSig: string | null;
};

type StatsResponse = {
  currentEpoch: number;
  totalEpochs: number;
  lastRewardAirdropped: number;
  totalRewardAirdropped: number;
  lastRewardTotals: RewardTotal[];
  totalRewardTotals: RewardTotal[];
  latestEligibleHolders: number;
  nextDropTime: string;
  roundHistory: Round[];
  recentRewards: Reward[];
};

type HoldersResponse = {
  topHolders: Array<{
    rank: number;
    address: string;
    balance: number;
    percentage: string;
    currentHoldTime: string | null;
    currentStreak: number | null;
    totalRewardEarned: number;
    lastAirdropAt: string | null;
    permanentlyIneligible: boolean;
    ineligibleReason: string | null;
  }>;
  fallenBulls?: Array<{
    address: string;
    balance: number;
    currentStreak: number | null;
    totalRewardEarned: number;
    lastAirdropAt: string | null;
    ineligibleReason: string;
    ineligibleAt: string | null;
    lastSeenAt: string | null;
  }>;
};

const emptyStats: StatsResponse = {
  currentEpoch: 0,
  totalEpochs: 0,
  lastRewardAirdropped: 0,
  totalRewardAirdropped: 0,
  lastRewardTotals: [],
  totalRewardTotals: [],
  latestEligibleHolders: 0,
  nextDropTime: new Date().toISOString(),
  roundHistory: [],
  recentRewards: []
};

const emptyHolders: HoldersResponse = { topHolders: [] };
const REFRESH_MS = 12_000;
const SOURCE_SYMBOL = process.env.NEXT_PUBLIC_SOURCE_SYMBOL ?? "BULLSTR";
const REWARD_SYMBOL = process.env.NEXT_PUBLIC_REWARD_SYMBOL ?? "ANSEM + SOL";

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

function compactAddress(address: string) {
  if (!address) return "Awaiting";
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function formatNumber(value: number, maximumFractionDigits = 2) {
  if (!Number.isFinite(value) || value <= 0) return "Awaiting";
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

function formatCount(value: number) {
  if (!Number.isFinite(value) || value < 0) return "Awaiting";
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatAmount(value: number, symbol: string, maximumFractionDigits = 2) {
  if (!Number.isFinite(value) || value <= 0) return "Awaiting live distribution";
  return `${formatNumber(value, maximumFractionDigits)} ${symbol}`;
}

function rewardDecimals(asset: string) {
  return asset.toUpperCase() === "SOL" ? 4 : 2;
}

function formatRewardTotals(totals: RewardTotal[] | undefined, empty = "Awaiting live distribution") {
  const liveTotals = (totals ?? []).filter((total) => total.rewardAmount > 0);
  if (!liveTotals.length) return empty;
  return liveTotals
    .map((total) => `${formatNumber(total.rewardAmount, rewardDecimals(total.rewardAsset))} ${total.rewardAsset}`)
    .join(" / ");
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Awaiting" : date.toLocaleString();
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function statusLabel(status: string) {
  if (status === "completed" || status === "settled") return "Settled";
  if (status === "running") return "Running";
  return status.replace(/_/g, " ");
}

export function useProtocolData() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [holders, setHolders] = useState<HoldersResponse | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [nextStats, nextHolders] = await Promise.all([
        getJson<StatsResponse>("/api/stats", emptyStats),
        getJson<HoldersResponse>("/api/holders", emptyHolders)
      ]);

      if (!active) return;
      setStats(nextStats);
      setHolders(nextHolders);
    };

    load();
    const refreshTimer = window.setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return { stats, holders, now };
}

export function HeroCountdown() {
  const { stats, now } = useProtocolData();
  const nextDropTime = stats?.nextDropTime ? Date.parse(stats.nextDropTime) : 0;
  const countdown = nextDropTime ? formatCountdown(nextDropTime - now) : "Loading";
  const totalDistributed = stats ? formatRewardTotals(stats.totalRewardTotals, "Awaiting first drop") : "Awaiting first drop";

  return (
    <div className="hero-countdown" aria-live="polite">
      <span>Next Distribution</span>
      <strong>{countdown}</strong>
      <div className="hero-total-distributed">
        <span>Total Rewards Distributed</span>
        <b>{totalDistributed}</b>
      </div>
    </div>
  );
}

export function LiveProtocolDashboard() {
  const { stats, now } = useProtocolData();
  const rounds = stats?.roundHistory ?? [];
  const nextDropTime = stats?.nextDropTime ? Date.parse(stats.nextDropTime) : 0;
  const countdown = nextDropTime ? formatCountdown(nextDropTime - now) : "Loading";
  const latestRound = rounds[0];

  return (
    <section className="section live-section airdrop-section" id="dashboard">
      <div className="container">
        <div className="section-kicker">Live dashboard</div>
        <div className="section-head split-head">
          <h2>Strategy dashboard.</h2>
          <p>Live values come from the existing reward backend. Total distributions, holder count, reward pool, and transactions update from Supabase.</p>
        </div>
        <div className="lux-grid dashboard-grid airdrop-grid">
          <MetricCard label="Total Rewards Distributed" value={stats ? formatRewardTotals(stats.totalRewardTotals) : "Loading"} strong />
          <MetricCard label="Eligible Holders" value={stats ? formatCount(stats.latestEligibleHolders) : "Loading"} />
          <MetricCard label="ANSEM Bought" value={latestRound ? formatAmount(latestRound.rewardBought, "ANSEM", 4) : "Awaiting live distribution"} />
          <MetricCard label="Next Distribution" value={countdown} />
          <MetricCard label="Last Drop TX" value={latestRound?.txSig ? compactAddress(latestRound.txSig) : "Awaiting tx"} muted />
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  strong,
  muted
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <article className={strong ? "metric-card metric-card-strong" : muted ? "metric-card metric-card-muted" : "metric-card"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function PermanentEligibility() {
  return (
    <section className="section eligibility-section" id="eligibility">
      <div className="container warning-layout">
        <div>
          <div className="section-kicker">Eligibility rules</div>
          <h2>Hold 250K+ $BULLSTR.</h2>
        </div>
        <div className="eligibility-flow">
          {[`250K+ $${SOURCE_SYMBOL}`, "Creator Fees", "Every Epoch", "Holder Snapshot", "On-chain Tracking"].map((item, index) => (
            <article className="eligibility-card" key={item}>
              <span>{index + 1}</span>
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RewardExplanation() {
  return (
    <section className="section reward-explainer-section" id="how">
      <div className="container">
          <div className="section-kicker">How rewards work</div>
        <div className="section-head split-head">
          <h2>50% $ANSEM. 50% SOL.</h2>
          <p>Bull Strategy turns creator fees into two live reward streams for eligible $BULLSTR holders.</p>
        </div>
        <div className="reward-flow">
          {[
            `Hold at least 250,000 $${SOURCE_SYMBOL}`,
            "50% routes to $ANSEM reward buys",
            "$ANSEM distributes every epoch",
            "50% distributes as native SOL",
            "$BULLSTR balance sets reward share",
            "Everything is tracked on-chain"
          ].map((item) => (
            <article className="reward-flow-card" key={item}>
              <strong>{item}</strong>
            </article>
          ))}
        </div>
        <div className="share-example">
          {[
            ["Weight", "$BULLSTR held", "proportional share"],
            ["Split", "$ANSEM + SOL", "two reward legs"],
            ["Ledger", "On-chain transfers", "tracked every epoch"]
          ].map(([holder, multiplier, copy]) => (
            <article className="share-card" key={holder}>
              <span>{holder}</span>
              <strong>{multiplier}</strong>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BullBoard() {
  const { stats, holders } = useProtocolData();
  const recentRewards = stats?.recentRewards ?? [];

  const earnedByWallet = useMemo(() => {
    const totals = new Map<string, number>();
    for (const reward of recentRewards) {
      totals.set(reward.wallet, (totals.get(reward.wallet) ?? 0) + reward.rewardAmount);
    }
    return totals;
  }, [recentRewards]);

  const rows = holders?.topHolders ?? [];

  return (
    <section className="section bull-board-section" id="bull-board">
      <div className="container">
        <div className="section-kicker">Strategy board</div>
        <div className="section-head split-head">
          <h2>STRATEGY BOARD</h2>
          <p>Clean holder table showing balance, share, earned rewards, and latest reward activity.</p>
          <a className="cta secondary" href="/fallen-bulls">
            Ineligible Wallets
          </a>
        </div>
        <div className="history-card bull-board-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>$BULLSTR Held</th>
                  <th>Share</th>
                  <th>Total {REWARD_SYMBOL} Earned</th>
                  <th>Last Airdrop</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.slice(0, 25).map((holder) => {
                    const lastReward = recentRewards.find((reward) => reward.wallet === holder.address);
                    const recentEarned = holder.totalRewardEarned ?? earnedByWallet.get(holder.address) ?? 0;
                    return (
                      <tr key={holder.address}>
                        <td>{compactAddress(holder.address)}</td>
                        <td>{formatNumber(holder.balance, 0)}</td>
                        <td>{holder.percentage}%</td>
                        <td>{recentEarned > 0 ? formatAmount(recentEarned, REWARD_SYMBOL) : "Awaiting holder totals"}</td>
                        <td>{holder.lastAirdropAt ? formatDate(holder.lastAirdropAt) : lastReward ? formatDate(lastReward.time) : "Awaiting airdrop"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5}>Awaiting Strategy Board.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

export function RecentAirdrops() {
  const { stats } = useProtocolData();
  const rewards = stats?.recentRewards ?? [];

  return (
    <section className="section recent-airdrops-section" id="airdrops">
      <div className="container">
        <div className="section-kicker">Reward history</div>
        <div className="section-head split-head">
          <h2>Tracked on-chain.</h2>
          <p>Settled reward transfers from the live backend. Failed or skipped attempts are not counted.</p>
        </div>
        <div className="history-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>Reward Type</th>
                  <th>{REWARD_SYMBOL} Received</th>
                  <th>Time</th>
                  <th>TX Link</th>
                </tr>
              </thead>
              <tbody>
                {rewards.length ? (
                  rewards.slice(0, 50).map((reward) => (
                    <tr key={`${reward.wallet}-${reward.time}-${reward.rewardAmount}`}>
                      <td>{compactAddress(reward.wallet)}</td>
                      <td>{reward.goldenMultiplier > 1 ? `${reward.rewardAsset ?? REWARD_SYMBOL} / ${reward.goldenMultiplier.toFixed(2)}x Strategy Bonus` : reward.rewardAsset ?? "Base"}</td>
                      <td>{formatAmount(reward.rewardAmount, reward.rewardAsset ?? REWARD_SYMBOL)}</td>
                      <td>{formatDate(reward.time)}</td>
                      <td>
                        {reward.txSig ? (
                          <a href={`https://solscan.io/tx/${reward.txSig}`} target="_blank" rel="noreferrer">
                            Solscan
                          </a>
                        ) : (
                          "Awaiting tx"
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>Awaiting settled reward airdrops.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HolderLookup() {
  const [wallet, setWallet] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(Boolean(wallet.trim()));
  };

  return (
    <section className="section lookup-section" id="lookup">
      <div className="container split-section">
        <div>
          <div className="section-kicker">Holder lookup</div>
          <h2>Check your place in the Bull.</h2>
          <p className="lead">
            Wallet-level status uses the live holder-state tracker after the first tracked epoch.
          </p>
        </div>
        <form className="lookup-card" onSubmit={handleSubmit}>
          <label htmlFor="wallet">Wallet address</label>
          <div className="lookup-row">
            <input
              id="wallet"
              value={wallet}
              onChange={(event) => setWallet(event.target.value)}
              placeholder="Paste wallet address"
            />
            <button type="submit">Lookup</button>
          </div>
          <div className="lookup-result">
            {submitted ? (
              <>
                <strong>{compactAddress(wallet)}</strong>
                <span>Awaiting live backend integration for wallet-level Bull status.</span>
              </>
            ) : (
              <span>Enter a wallet to check eligibility once lookup integration is live.</span>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

export function AirdropHistory() {
  const { stats } = useProtocolData();
  const rounds = stats?.roundHistory ?? [];

  return (
    <section className="section history-section" id="airdrops-history">
      <div className="container">
        <div className="section-kicker">Airdrop history</div>
        <div className="section-head split-head">
          <h2>ANSEM + SOL Distributions</h2>
          <p>Settled airdrops only. Failed or skipped worker attempts are not counted.</p>
        </div>
        <div className="history-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Epoch</th>
                  <th>ANSEM Bought</th>
                  <th>Recipients</th>
                  <th>Bull Weight</th>
                  <th>Total Distributed</th>
                  <th>Transaction</th>
                </tr>
              </thead>
              <tbody>
                {rounds.length ? (
                  rounds.map((round) => (
                    <tr key={`${round.epoch}-${round.startedAt}`}>
                      <td>#{round.epoch}</td>
                      <td>{formatAmount(round.rewardBought, "ANSEM")}</td>
                      <td>{round.rewardTotals.some((total) => total.rewardAmount > 0) ? "Settled" : statusLabel(round.status)}</td>
                      <td>Bull Score</td>
                      <td>{formatRewardTotals(round.rewardTotals)}</td>
                      <td>
                        {round.txSig ? (
                          <a href={`https://solscan.io/tx/${round.txSig}`} target="_blank" rel="noreferrer">
                            Solscan
                          </a>
                        ) : (
                          "Awaiting tx"
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>Awaiting settled reward airdrops.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
