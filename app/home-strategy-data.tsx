"use client";

import { useEffect, useState } from "react";

type RewardTotal = {
  rewardAsset: string;
  rewardAmount: number;
  normalRewardAmount: number;
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
  normalRewardAmount: number;
  time: string;
  status: string;
  txSig: string | null;
};

type SherwoodHoldings = {
  wallet: string | null;
  solBalance: number | null;
  sourceTokenBalance: number | null;
  rewardTokenBalance: number | null;
  sourceSymbol: string;
  rewardSymbol: string;
  updatedAt: string | null;
};

type StatsResponse = {
  currentEpoch: number;
  totalEpochs: number;
  lastRewardAirdropped: number;
  totalRewardAirdropped: number;
  lastRewardTotals: RewardTotal[];
  totalRewardTotals: RewardTotal[];
  latestEligibleHolders: number;
  eligibleBullstrHeld: number;
  bagholderSolBalance: number | null;
  sherwoodHoldings?: SherwoodHoldings;
  nextDropTime: string;
  roundHistory: Round[];
  recentRewards: Reward[];
};

const REFRESH_MS = 12_000;
const DROP_INTERVAL_MINUTES = 30;
const SOURCE_SYMBOL = process.env.NEXT_PUBLIC_SOURCE_SYMBOL ?? "Sherwood";
const REWARD_SYMBOL = process.env.NEXT_PUBLIC_REWARD_SYMBOL ?? "HoodX";

const emptyStats: StatsResponse = {
  currentEpoch: 0,
  totalEpochs: 0,
  lastRewardAirdropped: 0,
  totalRewardAirdropped: 0,
  lastRewardTotals: [],
  totalRewardTotals: [],
  latestEligibleHolders: 0,
  eligibleBullstrHeld: 0,
  bagholderSolBalance: null,
  sherwoodHoldings: {
    wallet: null,
    solBalance: null,
    sourceTokenBalance: null,
    rewardTokenBalance: null,
    sourceSymbol: SOURCE_SYMBOL,
    rewardSymbol: REWARD_SYMBOL,
    updatedAt: null
  },
  nextDropTime: new Date().toISOString(),
  roundHistory: [],
  recentRewards: []
};

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

function useProtocolData() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const nextStats = await getJson<StatsResponse>("/api/stats", emptyStats);
      if (active) setStats(nextStats);
    };

    load();
    const refreshTimer = window.setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return { stats, now };
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

function formatAmount(value: number, symbol: string, maximumFractionDigits = 2) {
  if (!Number.isFinite(value) || value <= 0) return `Awaiting ${symbol}`;
  return `${formatNumber(value, maximumFractionDigits)} ${symbol}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Awaiting";
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

function LiveBadge() {
  return (
    <span className="live-badge" aria-label="Live data">
      <span />
      Live
    </span>
  );
}

function rewardTotalAmount(totals: RewardTotal[] | undefined, asset: string) {
  return totals?.find((total) => total.rewardAsset.toUpperCase() === asset.toUpperCase())?.rewardAmount ?? 0;
}

function rewardTotalsSum(totals: RewardTotal[] | undefined) {
  return (totals ?? []).reduce((sum, total) => sum + Number(total.rewardAmount || 0), 0);
}

function hoodAirdropped(stats: StatsResponse | null) {
  if (!stats) return 0;
  return rewardTotalAmount(stats.totalRewardTotals, REWARD_SYMBOL) || rewardTotalsSum(stats.totalRewardTotals) || Number(stats.totalRewardAirdropped || 0);
}

function lastHoodAirdrop(stats: StatsResponse | null) {
  if (!stats) return 0;
  return rewardTotalAmount(stats.lastRewardTotals, REWARD_SYMBOL) || rewardTotalsSum(stats.lastRewardTotals) || Number(stats.lastRewardAirdropped || 0);
}

function formatMultiplier(rewardAmount: number, normalRewardAmount: number) {
  if (!Number.isFinite(rewardAmount) || !Number.isFinite(normalRewardAmount) || normalRewardAmount <= 0) return "1x";
  const multiplier = rewardAmount / normalRewardAmount;
  return `${multiplier.toLocaleString(undefined, { maximumFractionDigits: 2 })}x`;
}

function nextDropCountdown(stats: StatsResponse | null, now: number) {
  const configured = stats?.nextDropTime ? Date.parse(stats.nextDropTime) : 0;
  const next = Number.isFinite(configured) && configured > 0 ? configured : Math.ceil(Date.now() / (DROP_INTERVAL_MINUTES * 60_000)) * DROP_INTERVAL_MINUTES * 60_000;
  return formatCountdown(next - now);
}

function MetricCard({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <article className={strong ? "metric-card metric-card-strong" : "metric-card"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function HomeAirdropStats() {
  const { stats, now } = useProtocolData();
  const total = hoodAirdropped(stats);

  return (
    <div className="home-airdrop-stats" aria-label="HoodX airdrop stats">
      <article>
        <span>Total HoodX Airdropped</span>
        <strong>{formatAmount(total, REWARD_SYMBOL)}</strong>
      </article>
      <article>
        <span>Next Airdrop</span>
        <strong>{now ? nextDropCountdown(stats, now) : "30:00"}</strong>
      </article>
      <article>
        <span>Utility</span>
        <strong>Claim, snapshot, boost, send</strong>
      </article>
    </div>
  );
}

export function LiveProtocolDashboard() {
  const { stats, now } = useProtocolData();
  const total = hoodAirdropped(stats);
  const last = lastHoodAirdrop(stats);
  const latestReward = stats?.recentRewards?.[0];
  const latestHolders = stats?.latestEligibleHolders ?? 0;

  return (
    <section className="section live-section airdrop-section" id="dashboard">
      <div className="container">
        <div className="section-kicker live-kicker"><span>HoodX airdrops</span><LiveBadge /></div>
        <div className="section-head split-head">
          <h2>Every 30 minutes, holders get HoodX.</h2>
          <p>Each cycle claims, snapshots 1M+ Sherwood holders, checks the current 6-hour leaderboard, and applies the wallet's best rank multiplier before HoodX is sent.</p>
        </div>
        <div className="lux-grid dashboard-grid airdrop-grid">
          <MetricCard label="Total HoodX Airdropped" value={formatAmount(total, REWARD_SYMBOL)} strong />
          <MetricCard label="Last HoodX Airdrop" value={formatAmount(last, REWARD_SYMBOL)} />
          <MetricCard label="Next Airdrop" value={now ? nextDropCountdown(stats, now) : "30:00"} />
          <MetricCard label="Drop Cadence" value="Every 30 minutes" />
          <MetricCard label="Eligible Holders" value={latestHolders > 0 ? latestHolders.toLocaleString() : "Awaiting holders"} />
          <MetricCard label="Leaderboard Boost" value="#1 10x / #2 5x / #3 3x / #4-10 2.75x-1.5x" />
          <MetricCard label="Last Hit" value={latestReward ? `${compactAddress(latestReward.wallet)} / ${formatMultiplier(latestReward.rewardAmount, latestReward.normalRewardAmount)} / ${formatAmount(latestReward.rewardAmount, REWARD_SYMBOL)}` : "Awaiting airdrop"} />
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
        <div className="section-kicker live-kicker"><span>Recent HoodX drops</span><LiveBadge /></div>
        <div className="section-head split-head">
          <h2>Holder airdrop receipts.</h2>
          <p>Only settled HoodX airdrops from the live backend are shown. Empty rows mean no settled payouts are available yet.</p>
        </div>
        <div className="history-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>Asset</th>
                  <th>Base</th>
                  <th>Multiplier</th>
                  <th>HoodX Received</th>
                  <th>Time</th>
                  <th>TX Link</th>
                </tr>
              </thead>
              <tbody>
                {rewards.length ? (
                  rewards.slice(0, 50).map((reward) => (
                    <tr key={`${reward.wallet}-${reward.time}-${reward.rewardAmount}`}>
                      <td>{compactAddress(reward.wallet)}</td>
                      <td>{REWARD_SYMBOL}</td>
                      <td>{formatAmount(reward.normalRewardAmount, REWARD_SYMBOL)}</td>
                      <td>{formatMultiplier(reward.rewardAmount, reward.normalRewardAmount)}</td>
                      <td>{formatAmount(reward.rewardAmount, REWARD_SYMBOL)}</td>
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
                    <td className="placeholder-cell" colSpan={7}>Awaiting settled HoodX airdrops.</td>
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

export function AirdropHistory() {
  const { stats } = useProtocolData();
  const rounds = stats?.roundHistory ?? [];

  return (
    <section className="section history-section" id="airdrops-history">
      <div className="container">
        <div className="section-kicker live-kicker"><span>Airdrop history</span><LiveBadge /></div>
        <div className="section-head split-head">
          <h2>30-minute HoodX windows.</h2>
          <p>Each window claims, snapshots eligible 1M+ Sherwood holders, applies the active 6-hour leaderboard multiplier, and records settled payouts.</p>
        </div>
        <div className="history-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Window</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Recipients</th>
                  <th>Total HoodX</th>
                  <th>Transaction</th>
                </tr>
              </thead>
              <tbody>
                {rounds.length ? (
                  rounds.map((round) => {
                    const total = rewardTotalAmount(round.rewardTotals, REWARD_SYMBOL) || rewardTotalsSum(round.rewardTotals);
                    const recipients = round.rewardTotals.reduce((sum, reward) => sum + Number(reward.recipients || 0), 0);
                    return (
                      <tr key={`${round.epoch}-${round.startedAt}`}>
                        <td>#{round.epoch}</td>
                        <td>{statusLabel(round.status)}</td>
                        <td>{round.duration}</td>
                        <td>{recipients > 0 ? recipients.toLocaleString() : "Awaiting"}</td>
                        <td>{formatAmount(total, REWARD_SYMBOL)}</td>
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
                    );
                  })
                ) : (
                  <tr>
                    <td className="placeholder-cell" colSpan={6}>Awaiting settled HoodX windows.</td>
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
