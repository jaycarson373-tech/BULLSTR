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

type HyperHoodHoldings = {
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
  sherwoodHoldings?: HyperHoodHoldings;
  nextDropTime: string;
  roundHistory: Round[];
  recentRewards: Reward[];
};

const REFRESH_MS = 12_000;
const DROP_INTERVAL_MINUTES = 15;
const SOURCE_SYMBOL = process.env.NEXT_PUBLIC_SOURCE_SYMBOL ?? "HHOOD";
const REWARD_SYMBOL = process.env.NEXT_PUBLIC_REWARD_SYMBOL ?? "HHOOD";

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

function hoodPurchased(stats: StatsResponse | null) {
  return (stats?.roundHistory ?? []).reduce((sum, round) => sum + Number(round.rewardBought || 0), 0);
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

export function ProtocolTopStrip() {
  const { stats, now } = useProtocolData();
  const purchased = hoodPurchased(stats);
  const airdropped = hoodAirdropped(stats);
  const tickerItems = [
    ["HOOD Purchased", formatAmount(purchased, "HOOD")],
    ["HOOD Airdropped", formatAmount(airdropped, "HOOD")],
    ["Liquidity Added", "Awaiting LP"],
    ["LP Fees Compounded", "Awaiting LP"],
    ["Next Distribution", now ? nextDropCountdown(stats, now) : "15:00"]
  ];

  return (
    <div className="protocol-top-strip" aria-label="HyperHood live protocol strip">
      <div className="protocol-top-strip-inner">
        {[0, 1].map((copy) => (
          <div className="protocol-ticker-track" aria-hidden={copy === 1} key={copy}>
            {tickerItems.map(([label, value]) => (
              <span className="protocol-ticker-item" key={`${copy}-${label}`}>
                {label}
                <strong>{value}</strong>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
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
  const purchased = hoodPurchased(stats);
  const airdropped = hoodAirdropped(stats);

  return (
    <div className="home-airdrop-stats" aria-label="HyperHood live flywheel stats">
      <article>
        <span>HOOD Purchased</span>
        <strong>{formatAmount(purchased, "HOOD")}</strong>
      </article>
      <article>
        <span>HOOD Airdropped</span>
        <strong>{formatAmount(airdropped, "HOOD")}</strong>
      </article>
      <article>
        <span>Next Distribution</span>
        <strong>{now ? nextDropCountdown(stats, now) : "15:00"}</strong>
      </article>
    </div>
  );
}

export function FeeLoopChart() {
  return (
    <section className="fee-loop-card" id="flywheel" aria-label="HyperHood flywheel model">
      <div className="fee-loop-copy">
        <div className="section-kicker">Live Flywheel</div>
        <h2>Every trade pushes the long.</h2>
        <p>
          50% of creator fees buy HOOD for eligible holders. 50% adds HH/HOOD liquidity. LP fees compound back
          into liquidity forever.
        </p>
      </div>
      <div className="fee-loop-visual" aria-label="Fee split visual">
        <div className="fee-pie">
          <div className="fee-pie-core">
            <span>100%</span>
            <strong>Fees</strong>
          </div>
        </div>
        <div className="fee-legend">
          <div>
            <span className="legend-dot legend-airdrop" />
            <strong>50%</strong>
            <p>Buy HOOD, then airdrop holders.</p>
          </div>
          <div>
            <span className="legend-dot legend-lp" />
            <strong>50%</strong>
            <p>Add liquidity with HH and HOOD.</p>
          </div>
          <div>
            <span className="legend-dot legend-compound" />
            <strong>LP fees</strong>
            <p>Compound LP fees back into the pool.</p>
          </div>
        </div>
      </div>
      <div className="flywheel-flow" aria-label="HyperHood flywheel">
        <span>Trading Volume</span>
        <span>Creator Fees</span>
        <span>50% Buy HOOD</span>
        <span>50% Add LP</span>
        <span>HOOD Airdrops</span>
        <span>Deeper Liquidity</span>
        <span>LP Fees</span>
        <span>Compounded Back Into LP</span>
        <span>Repeat Forever</span>
      </div>
      <div className="fee-roadmap" aria-label="HyperHood roadmap">
        <span>Roadmap</span>
        <strong>LP created at bond.</strong>
        <p>Once bonded, the HH/HOOD pool goes live and airdrop windows run every 15 minutes.</p>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <section className="section how-section" id="how-it-works">
      <div className="container">
        <div className="section-kicker">How it works</div>
        <div className="section-head split-head">
          <h2>Buy HOOD. Add liquidity. Compound LP fees.</h2>
          <p>HyperHood keeps the loop easy to follow: fees buy HOOD for holders, add liquidity, then recycle LP fees back into the pool.</p>
        </div>
        <div className="reward-flow">
          <article className="reward-flow-card">
            <span>01</span>
            <strong>Buy HOOD.</strong>
            <p>Every trade creates fees. Half buys fractional Robinhood stock.</p>
          </article>
          <article className="reward-flow-card">
            <span>02</span>
            <strong>Airdrop holders.</strong>
            <p>Purchased HOOD is airdropped to eligible holders.</p>
          </article>
          <article className="reward-flow-card">
            <span>03</span>
            <strong>Compound LP fees.</strong>
            <p>The other half adds liquidity, then LP fees go back into the pool.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

export function LiveProtocolDashboard() {
  const { stats, now } = useProtocolData();
  const purchased = hoodPurchased(stats);
  const total = hoodAirdropped(stats);
  const last = lastHoodAirdrop(stats);
  const latestReward = stats?.recentRewards?.[0];
  const latestHolders = stats?.latestEligibleHolders ?? 0;

  return (
    <section className="section live-section airdrop-section" id="dashboard">
      <div className="container">
        <div className="section-kicker live-kicker"><span>HyperHood flywheel</span><LiveBadge /></div>
        <div className="section-head split-head">
          <h2>Creator fees buy HOOD and add liquidity.</h2>
          <p>Live values only. Empty cards mean the backend has not recorded that on-chain event yet.</p>
        </div>
        <div className="lux-grid dashboard-grid airdrop-grid">
          <MetricCard label="HOOD Purchased" value={formatAmount(purchased, "HOOD")} strong />
          <MetricCard label="HOOD Airdropped" value={formatAmount(total, "HOOD")} />
          <MetricCard label="Liquidity Added" value="Awaiting LP" />
          <MetricCard label="LP Fees Compounded" value="Awaiting LP" />
          <MetricCard label="Next Distribution" value={now ? nextDropCountdown(stats, now) : "15:00"} />
          <MetricCard label="Eligible Holders" value={latestHolders > 0 ? latestHolders.toLocaleString() : "Awaiting holders"} />
          <MetricCard label="Last Airdrop" value={latestReward ? `${compactAddress(latestReward.wallet)} / ${formatMultiplier(latestReward.rewardAmount, latestReward.normalRewardAmount)} / ${formatAmount(latestReward.rewardAmount || last, "HOOD")}` : "Awaiting distribution"} />
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
        <div className="section-kicker live-kicker"><span>Recent HOOD airdrops</span><LiveBadge /></div>
        <div className="section-head split-head">
          <h2>Settled holder receipts.</h2>
          <p>Only settled HyperHood airdrops are shown. Empty rows mean no on-chain receipts are available yet.</p>
        </div>
        <div className="history-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>Asset</th>
                  <th>Base rank share</th>
                  <th>Hold bonus</th>
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
                      <td>HOOD</td>
                      <td>{formatAmount(reward.normalRewardAmount, "HOOD")}</td>
                      <td>{formatMultiplier(reward.rewardAmount, reward.normalRewardAmount)}</td>
                      <td>{formatAmount(reward.rewardAmount, "HOOD")}</td>
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
                    <td className="placeholder-cell" colSpan={7}>Awaiting settled HyperHood distributions.</td>
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
        <div className="section-kicker live-kicker"><span>Distribution history</span><LiveBadge /></div>
        <div className="section-head split-head">
          <h2>15-minute HyperHood distributions.</h2>
          <p>Each distribution records eligible holders, recipients, amounts, and transaction links.</p>
        </div>
        <div className="history-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Distribution</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Recipients</th>
                  <th>Total HOOD</th>
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
                        <td>{formatAmount(total, "HOOD")}</td>
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
                    <td className="placeholder-cell" colSpan={6}>Awaiting settled HyperHood distributions.</td>
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
