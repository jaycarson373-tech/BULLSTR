"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ParallaxBackground } from "../parallax-background";

type RewardTotal = {
  rewardAsset: string;
  rewardAmount: number;
  normalRewardAmount: number;
  recipients: number;
  latestTime: string | null;
  latestTxSig: string | null;
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
  epochHistory: Array<{
    epoch: number;
    rewardAmount: number;
    rewardTotals: RewardTotal[];
    recipients: number;
    timestamp: string;
    status: string;
  }>;
  roundHistory: Array<{
    epoch: number;
    status: string;
    startedAt: string;
    duration: string;
    claimedSol: number;
    rewardBought: number;
    normalRewardsSent: number;
    distributedPump: number;
    rewardTotals: RewardTotal[];
    txSig: string | null;
  }>;
  recentRewards: Array<{
    epoch: number;
    rewardAsset?: string;
    wallet: string;
    rewardAmount: number;
    normalRewardAmount: number;
    time: string;
    status: string;
    txSig: string | null;
  }>;
};

type HoldersResponse = {
  topHolders: Array<{
    rank: number;
    address: string;
    balance: number;
    percentage: string;
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
  epochHistory: [],
  roundHistory: [],
  recentRewards: []
};

const emptyHolders: HoldersResponse = { topHolders: [] };
const REFRESH_MS = 12000;
const EPOCH_MS = 5 * 60 * 1000;
const PROJECT_NAME = "Bull Strategy";
const SOURCE_SYMBOL = process.env.NEXT_PUBLIC_SOURCE_SYMBOL ?? "BULLSTR";
const REWARD_SYMBOL = process.env.NEXT_PUBLIC_REWARD_SYMBOL ?? "ANSEM + BULLSTR";

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
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").toUpperCase();
}

function statusClass(status: string) {
  if (status === "completed" || status === "settled") return "status-pill completed";
  if (status === "failed") return "status-pill failed";
  if (status === "skipped" || status === "dry_run") return "status-pill skipped";
  return "status-pill running";
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function fallbackNextDropMs() {
  return Math.ceil(Date.now() / EPOCH_MS) * EPOCH_MS;
}

function formatNumber(value: number, maximumFractionDigits = 2) {
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

function rewardDecimals(asset: string) {
  return asset.toUpperCase() === "SOL" ? 4 : 2;
}

function formatRewardTotals(totals: RewardTotal[] | undefined, empty = "Awaiting first drop") {
  const liveTotals = (totals ?? []).filter((total) => total.rewardAmount > 0);
  if (!liveTotals.length) return empty;
  return liveTotals
    .map((total) => `${formatNumber(total.rewardAmount, rewardDecimals(total.rewardAsset))} ${total.rewardAsset}`)
    .join(" / ");
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "–" : date.toLocaleString();
}

function useAnimatedNumber(value: number | null) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    if (value === null) {
      setDisplayValue(null);
      previousValue.current = null;
      return;
    }

    const from = previousValue.current ?? value;
    const to = value;
    previousValue.current = value;

    if (from === to) {
      setDisplayValue(to);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const duration = 650;

    const tick = (time: number) => {
      const progress = Math.min(1, (time - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(from + (to - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return displayValue;
}

function AnimatedValue({
  value,
  empty = "–",
  suffix = "",
  maximumFractionDigits = 2
}: {
  value: number | null;
  empty?: string;
  suffix?: string;
  maximumFractionDigits?: number;
}) {
  const displayValue = useAnimatedNumber(value);
  if (displayValue === null) return <>{empty}</>;
  return (
    <>
      {formatNumber(displayValue, maximumFractionDigits)}
      {suffix}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="stats">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="stat skeleton-card" key={index}>
            <div className="skeleton-line wide" />
            <div className="skeleton-line" />
          </div>
        ))}
      </div>
      <section className="history-card skeleton-block" style={{ marginTop: 16 }}>
        <div className="history-head">
          <div className="skeleton-line heading" />
          <div className="skeleton-line" />
        </div>
        <div className="skeleton-table">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="skeleton-row" key={index}>
              <span />
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export function DashboardClient() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [holders, setHolders] = useState<HoldersResponse | null>(null);
  const [loading, setLoading] = useState(true);
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
      setLoading(false);
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

  const liveStats = stats ?? emptyStats;
  const liveHolders = holders ?? emptyHolders;
  const hasRewards =
    liveStats.recentRewards.length > 0 ||
    liveStats.totalRewardTotals.some((total) => total.rewardAmount > 0) ||
    liveStats.totalRewardAirdropped > 0;
  const nextDropMs = Math.max(Date.parse(liveStats.nextDropTime) || 0, fallbackNextDropMs());
  const countdown = formatCountdown(nextDropMs - now);
  const progress = useMemo(() => {
    const lastBoundary = nextDropMs - EPOCH_MS;
    return ((now - lastBoundary) / EPOCH_MS) * 100;
  }, [nextDropMs, now]);

  return (
    <div className="page">
      <ParallaxBackground />
      <header className="nav">
        <div className="container nav-inner">
          <Link className="brand" href="/">
            <img className="brand-logo" src="/brand/bull-strategy-logo.png" alt={`${PROJECT_NAME} logo`} />
            <span>
              Bull Strategy
              <small>ANSEM + BULLSTR Rewards</small>
            </span>
          </Link>
          <div className="nav-links">
            <Link href="/">Landing</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/fallen-bulls">BlackBull List</Link>
          </div>
        </div>
      </header>

      <main className="dashboard">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                <span className="pulse" />
                Live reward ledger
              </div>
              <h1 className="dashboard-title">Airdrop Ledger</h1>
            </div>
          </div>

          {loading ? (
            <DashboardSkeleton />
          ) : (
            <>
              <div className="stats dashboard-stats">
                <div className="stat live-stat">
                  <strong>{countdown}</strong>
                  <span>Next Distribution</span>
                  <div className="round-progress tiny" aria-hidden="true">
                    <span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
                  </div>
                </div>
                <div className="stat">
                  <strong className={hasRewards ? "" : "empty-value"}>
                    {hasRewards ? formatRewardTotals(liveStats.lastRewardTotals) : "Awaiting first drop"}
                  </strong>
                  <span>Last Drop</span>
                </div>
                <div className="stat">
                  <strong>
                    <AnimatedValue value={liveStats.latestEligibleHolders} maximumFractionDigits={0} />
                  </strong>
                  <span>Eligible Holders</span>
                </div>
                <div className="stat">
                  <strong className={hasRewards ? "" : "empty-value"}>
                    {hasRewards ? formatRewardTotals(liveStats.totalRewardTotals) : "Awaiting first drop"}
                  </strong>
                  <span>Total Rewards Distributed</span>
                </div>
              </div>

              <section className="history-card" style={{ marginTop: 16 }}>
                <div className="history-head">
                  <h3>Epoch History</h3>
                  <span>Latest settled reward rounds</span>
                </div>
                <div className="table-wrap">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Round</th>
                        <th>Status</th>
                        <th>Started</th>
                        <th>Duration</th>
                        <th className="right">Fees Collected</th>
                        <th className="right">ANSEM Bought</th>
                        <th className="right">ANSEM Sent</th>
                        <th className="right">Rewards Distributed</th>
                        <th className="right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveStats.roundHistory.length ? (
                        liveStats.roundHistory.map((round) => (
                          <tr key={`${round.epoch}-${round.startedAt}`}>
                            <td className="mono">#{round.epoch}</td>
                            <td>
                              <span className={statusClass(round.status)}>{statusLabel(round.status)}</span>
                            </td>
                            <td>{formatTime(round.startedAt)}</td>
                            <td>{round.duration}</td>
                            <td className="right mono">
                              {round.claimedSol ? (
                                <AnimatedValue value={round.claimedSol} maximumFractionDigits={4} suffix=" SOL" />
                              ) : (
                                "–"
                              )}
                            </td>
                            <td className="right mono">
                              {round.rewardBought ? (
                                <AnimatedValue value={round.rewardBought} maximumFractionDigits={2} suffix=" ANSEM" />
                              ) : (
                                "–"
                              )}
                            </td>
                            <td className="right mono">
                              {round.normalRewardsSent ? (
                                <AnimatedValue value={round.normalRewardsSent} maximumFractionDigits={2} suffix=" ANSEM" />
                              ) : (
                                "–"
                              )}
                            </td>
                            <td className="right mono">
                              {round.rewardTotals.some((total) => total.rewardAmount > 0) ? (
                                formatRewardTotals(round.rewardTotals, "–")
                              ) : (
                                "–"
                              )}
                            </td>
                            <td className="right">
                              {round.txSig ? (
                                <a
                                  className="details-button"
                                  href={`https://solscan.io/tx/${round.txSig}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Details
                                </a>
                              ) : (
                                <span className="details-button disabled">Awaiting tx</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9}>Awaiting first reward distribution.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="dash-grid" style={{ marginTop: 16 }}>
                <section className="card">
                  <h3>Recent Drops</h3>
                  <div className="activity-feed" style={{ marginTop: 14 }}>
                    {liveStats.recentRewards.length ? (
                      liveStats.recentRewards.map((reward) => (
                        <div className="activity-row" key={`${reward.epoch}-${reward.wallet}-${reward.time}`}>
                          <div>
                            <strong className="mono">{compactAddress(reward.wallet)}</strong>
                            <span>{formatTime(reward.time)}</span>
                          </div>
                          <div className="activity-meta">
                            <span className="mono">
                              {reward.rewardAmount ? (
                                <AnimatedValue value={reward.rewardAmount} maximumFractionDigits={4} suffix={` ${reward.rewardAsset ?? REWARD_SYMBOL}`} />
                              ) : (
                                "–"
                              )}
                            </span>
                            <span className={statusClass(reward.status)}>{statusLabel(reward.status)}</span>
                            {reward.txSig ? (
                              <a
                                className="details-button"
                                href={`https://solscan.io/tx/${reward.txSig}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Solscan
                              </a>
                            ) : (
                              <span className="details-button disabled">Pending</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">Drops will appear here after settled reward payouts.</div>
                    )}
                  </div>
                </section>

                <section className="card">
                  <h3>Eligible {SOURCE_SYMBOL} Holders</h3>
                  <div className="table-wrap" style={{ marginTop: 14 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Wallet</th>
                          <th className="right">Balance</th>
                          <th className="right">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveHolders.topHolders.length ? (
                          liveHolders.topHolders.map((holder) => (
                            <tr key={holder.address}>
                              <td>#{holder.rank}</td>
                              <td className="mono">{compactAddress(holder.address)}</td>
                              <td className="right">
                                <AnimatedValue value={holder.balance} maximumFractionDigits={2} />
                              </td>
                              <td className="right">{holder.percentage}%</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4}>No snapshot yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
