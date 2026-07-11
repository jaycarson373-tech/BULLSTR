"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  FIRST_COIN_REVEAL_COPY,
  FIRST_COIN_REVEAL_HOURS_BEFORE,
  FIRST_LAUNCH_WINDOW_COPY,
  FIRST_SNAPSHOT_AT,
  LAUNCH_CADENCE_COPY,
  LAUNCH_AFTER_SNAPSHOT_MAX_HOURS,
  LAUNCH_POOL_LABEL,
  SNAPSHOT_TIMING_COPY,
  SNAPSHOT_WINDOW_COPY,
  SNAPSHOT_WINDOW_HOURS,
  TAX_SPLIT_COPY
} from "./sherwood-config";

type SolanaProvider = {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey?: { toBase58?: () => string; toString?: () => string } }>;
};

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
  eligibleBullstrHeld: number;
  bagholderSolBalance: number | null;
  sherwoodHoldings?: SherwoodHoldings;
  nextDropTime: string;
  roundHistory: Round[];
  recentRewards: Reward[];
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

type TopHolder = {
  rank: number;
  address: string;
  balance: number;
  percentage: string;
  totalRewardEarned?: number;
  lastAirdropAt?: string | null;
};

type HoldersResponse = {
  topHolders: TopHolder[];
  uniqueHolders: number;
};

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
    sourceSymbol: "SHER",
    rewardSymbol: "SHER",
    updatedAt: null
  },
  nextDropTime: new Date().toISOString(),
  roundHistory: [],
  recentRewards: []
};

const REFRESH_MS = 12_000;
const DEFAULT_CA = "";
const SOURCE_SYMBOL = process.env.NEXT_PUBLIC_SOURCE_SYMBOL ?? "SHER";
const REWARD_SYMBOL = process.env.NEXT_PUBLIC_REWARD_SYMBOL ?? "SHER";
const CA = process.env.NEXT_PUBLIC_CA?.trim() || process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT?.trim() || DEFAULT_CA;
const SHER_CHART_URL = process.env.NEXT_PUBLIC_SHER_CHART_URL?.trim() || process.env.NEXT_PUBLIC_DEXSCREENER_URL?.trim() || (CA ? `https://dexscreener.com/solana/${CA}` : "https://dexscreener.com/solana");
const SHER_CHART_EMBED_URL = process.env.NEXT_PUBLIC_SHER_CHART_EMBED_URL?.trim() || "";
const HOUR_MS = 60 * 60 * 1000;
const PRESALE_MIN_HOLDING = "2.5M+";
const FIRST_PRESALE_AT = process.env.NEXT_PUBLIC_FIRST_PRESALE_AT?.trim() || "";
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function getSolanaProvider() {
  if (typeof window === "undefined") return null;
  return (window as Window & { solana?: SolanaProvider }).solana ?? null;
}

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

function formatLiveNumber(value: number, maximumFractionDigits = 2) {
  if (!Number.isFinite(value) || value < 0) return "Awaiting";
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

function formatCount(value: number) {
  if (!Number.isFinite(value) || value < 0) return "Awaiting";
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatSol(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Awaiting live balance";
  if (value <= 0) return "0 SOL";
  return `${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;
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

function isPlaceholderValue(value: string) {
  return /^(Awaiting|Loading|--)/i.test(value);
}

function DisplayValue({ value }: { value: string }) {
  return <span className={isPlaceholderValue(value) ? "placeholder-value" : undefined}>{value}</span>;
}

function rewardTotalAmount(totals: RewardTotal[] | undefined, asset: string) {
  return totals?.find((total) => total.rewardAsset.toUpperCase() === asset.toUpperCase())?.rewardAmount ?? 0;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Awaiting" : date.toLocaleString();
}

function formatDateTime(value: number) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Awaiting schedule"
    : date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function formatLongCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function firstPresaleTime() {
  const configured = FIRST_PRESALE_AT ? Date.parse(FIRST_PRESALE_AT) : 0;
  return Number.isFinite(configured) && configured > Date.now() ? configured : 0;
}

function firstSnapshotLockTime() {
  const configured = Date.parse(FIRST_SNAPSHOT_AT);
  return Number.isFinite(configured) && configured > Date.now()
    ? configured
    : nextEasternTwoAm();
}

function nextEasternTwoAm() {
  const now = new Date();
  const easternNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const easternTarget = new Date(easternNow);
  easternTarget.setHours(2, 0, 0, 0);
  if (easternTarget.getTime() <= easternNow.getTime()) easternTarget.setDate(easternTarget.getDate() + 1);

  const offset = easternTimeZoneOffset(easternTarget);
  return Date.parse(`${easternTarget.toISOString().slice(0, 10)}T02:00:00${offset}`);
}

function easternTimeZoneOffset(date: Date) {
  const month = date.getMonth();
  return month >= 2 && month <= 10 ? "-04:00" : "-05:00";
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

function AnimatedStat({ value }: { value: string }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const match = value.match(/^(\d[\d,]*(?:\.\d+)?)(.*)$/);
    if (!match) {
      setDisplay(value);
      return;
    }

    const target = Number(match[1].replace(/,/g, ""));
    const suffix = match[2] ?? "";
    if (!Number.isFinite(target) || target === 0) {
      setDisplay(value);
      return;
    }

    const decimals = match[1].includes(".") ? Math.min(4, match[1].split(".")[1]?.length ?? 0) : 0;
    const start = performance.now();
    const duration = 850;
    let frame = 0;

    const tick = (time: number) => {
      const progress = Math.min(1, (time - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      setDisplay(`${current.toLocaleString(undefined, { maximumFractionDigits: decimals })}${suffix}`);
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return <>{display}</>;
}

export function useProtocolData() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const nextStats = await getJson<StatsResponse>("/api/stats", emptyStats);

      if (!active) return;
      setStats(nextStats);
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

function useHolderData() {
  const [holders, setHolders] = useState<HoldersResponse | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const nextHolders = await getJson<HoldersResponse>("/api/holders", { topHolders: [], uniqueHolders: 0 });

      if (!active) return;
      setHolders(nextHolders);
    };

    load();
    const refreshTimer = window.setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  return holders;
}

function usePresaleSchedule() {
  const [snapshotLocksAt] = useState(firstSnapshotLockTime);
  const [configuredPresaleAt] = useState(firstPresaleTime);
  const firstPresaleAt =
    configuredPresaleAt > snapshotLocksAt
      ? configuredPresaleAt
      : snapshotLocksAt + LAUNCH_AFTER_SNAPSHOT_MAX_HOURS * HOUR_MS;
  const snapshotOpensAt = snapshotLocksAt - SNAPSHOT_WINDOW_HOURS * HOUR_MS;
  const firstCoinRevealAt = firstPresaleAt - FIRST_COIN_REVEAL_HOURS_BEFORE * HOUR_MS;

  return { firstPresaleAt, snapshotOpensAt, snapshotLocksAt, firstCoinRevealAt };
}

export function HeroCountdown() {
  const { stats, now } = useProtocolData();
  const { firstPresaleAt, snapshotOpensAt, snapshotLocksAt } = usePresaleSchedule();
  const countdown = snapshotLocksAt && now ? formatLongCountdown(snapshotLocksAt - now) : "--:--:--";
  const sherDeployed = stats ? rewardTotalAmount(stats.totalRewardTotals, REWARD_SYMBOL) : 0;
  const eligibleHolders = stats?.latestEligibleHolders ?? 0;

  return (
    <div className="hero-countdown" aria-live="polite">
      <span>First Snapshot Locks In</span>
      <strong className="countdown-value">{countdown}</strong>
      <div className="hero-total-distributed">
        <span>Launch Window</span>
        <b>{formatDateTime(snapshotLocksAt)} - {formatDateTime(firstPresaleAt)}</b>
      </div>
      <div className="hero-total-distributed">
        <span>Snapshot Window</span>
        <b>{formatDateTime(snapshotOpensAt)} - {formatDateTime(snapshotLocksAt)}</b>
      </div>
      <div className="hero-mini-dashboard">
        <div className="treasury-mini-card">
          <span>Treasury Balance</span>
          <b><DisplayValue value={formatSol(stats?.bagholderSolBalance)} /></b>
        </div>
        <div>
          <span>{REWARD_SYMBOL} Deployed</span>
          <b>{sherDeployed > 0 ? <AnimatedStat value={`${formatNumber(sherDeployed, 2)} ${REWARD_SYMBOL}`} /> : <DisplayValue value="Awaiting live distribution" />}</b>
        </div>
        <div>
          <span>{SOURCE_SYMBOL} Presale Eligible</span>
          <b>{eligibleHolders > 0 ? <AnimatedStat value={formatCount(eligibleHolders)} /> : <DisplayValue value="Awaiting live holders" />}</b>
        </div>
        <div>
          <span>Minimum Hold</span>
          <b>{PRESALE_MIN_HOLDING}</b>
        </div>
        <div>
          <span>Do Not Drop Below</span>
          <b>{PRESALE_MIN_HOLDING}</b>
        </div>
      </div>
    </div>
  );
}

export function LiveProtocolDashboard() {
  const { stats, now } = useProtocolData();
  const { firstPresaleAt, snapshotOpensAt, snapshotLocksAt } = usePresaleSchedule();
  const rounds = stats?.roundHistory ?? [];
  const countdown = snapshotLocksAt && now ? formatLongCountdown(snapshotLocksAt - now) : "--:--:--";
  const latestRound = rounds[0];
  const totalRewardAirdropped = stats ? rewardTotalAmount(stats.totalRewardTotals, REWARD_SYMBOL) : 0;
  const totalRewardBought = rounds.reduce((sum, round) => sum + (Number.isFinite(round.rewardBought) ? round.rewardBought : 0), 0);

  return (
    <section className="section live-section airdrop-section" id="dashboard">
      <div className="container">
        <div className="section-kicker live-kicker"><span>Machine readout</span><LiveBadge /></div>
        <div className="section-head split-head">
          <h2>The Sherwood Forest launch dashboard lives here.</h2>
          <p>Live values come from the existing backend. If the backend has not settled data yet, this stays quiet instead of inventing numbers.</p>
        </div>
        <div className="lux-grid dashboard-grid airdrop-grid">
          <MetricCard label="Creator Fees Routed" value={totalRewardBought > 0 ? formatAmount(totalRewardBought, REWARD_SYMBOL, 4) : "Awaiting live routing"} strong />
          <MetricCard label={LAUNCH_POOL_LABEL} value={totalRewardAirdropped > 0 ? formatAmount(totalRewardAirdropped, REWARD_SYMBOL, 2) : stats ? formatRewardTotals(stats.totalRewardTotals, "Awaiting live routing") : "Loading"} />
          <MetricCard label="Last Window" value={latestRound ? `#${latestRound.epoch} ${statusLabel(latestRound.status)}` : "Awaiting window"} />
          <MetricCard label="Snapshot Lock Timer" value={countdown} />
          <MetricCard label="Snapshot Window" value={`${formatDateTime(snapshotOpensAt)} - ${formatDateTime(snapshotLocksAt)}`} />
          <MetricCard label="First Launch Window" value={`${formatDateTime(snapshotLocksAt)} - ${formatDateTime(firstPresaleAt)}`} />
          <MetricCard label="Tax Token Split" value={TAX_SPLIT_COPY} muted />
        </div>
      </div>
    </section>
  );
}

export function SherwoodChart() {
  return (
    <section className="section sherwood-chart-section" id="chart">
      <div className="container">
        <div className="section-kicker live-kicker"><span>SHER chart</span><LiveBadge /></div>
        <div className="section-head split-head">
          <h2>Live SHER chart.</h2>
          <p>Set NEXT_PUBLIC_SHER_CHART_EMBED_URL to embed the exact DexScreener pair. Until then, this section links directly to the live chart surface.</p>
        </div>
        <div className="sherwood-chart-card">
          {SHER_CHART_EMBED_URL ? (
            <iframe
              title="SHER live chart"
              src={SHER_CHART_EMBED_URL}
              loading="lazy"
              allow="clipboard-write"
            />
          ) : (
            <div className="sherwood-chart-fallback">
              <span>SHER</span>
              <strong>Chart ready</strong>
              <p>Add the DexScreener embed URL in env to show the live candle view here.</p>
            </div>
          )}
          <a className="cta" href={SHER_CHART_URL} target="_blank" rel="noreferrer">
            Open SHER chart
          </a>
        </div>
      </div>
    </section>
  );
}

export function SherwoodHoldingsPanel() {
  const { stats } = useProtocolData();
  const holdings = stats?.sherwoodHoldings ?? emptyStats.sherwoodHoldings;
  const sourceSymbol = holdings?.sourceSymbol ?? SOURCE_SYMBOL;
  const rewardSymbol = holdings?.rewardSymbol ?? REWARD_SYMBOL;
  const sameReward = sourceSymbol.toUpperCase() === rewardSymbol.toUpperCase();
  const rows = [
    ["SOL", formatSol(holdings?.solBalance)],
    [sourceSymbol, formatAmount(holdings?.sourceTokenBalance ?? 0, sourceSymbol)],
    ...(sameReward ? [] : [[rewardSymbol, formatAmount(holdings?.rewardTokenBalance ?? 0, rewardSymbol)]])
  ];

  return (
    <section className="section sherwood-holdings-section" id="holdings">
      <div className="container">
        <div className="section-kicker live-kicker"><span>Sherwood Forest holdings</span><LiveBadge /></div>
        <div className="section-head split-head">
          <h2>Total holdings from the Sherwood Forest wallet.</h2>
          <p>Balances come from the configured Sherwood Forest/bagholder wallet and refresh through the same live stats route.</p>
        </div>
        <div className="sherwood-holdings-card">
          <div>
            <span>Wallet</span>
            <strong>{holdings?.wallet ? compactAddress(holdings.wallet) : "Awaiting wallet"}</strong>
          </div>
          {rows.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong><AnimatedStat value={value} /></strong>
            </div>
          ))}
          <div>
            <span>Updated</span>
            <strong>{holdings?.updatedAt ? formatDate(holdings.updatedAt) : "Awaiting"}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SherwoodRunnerPanel() {
  const { now } = useProtocolData();
  const { firstPresaleAt, snapshotOpensAt, snapshotLocksAt } = usePresaleSchedule();
  const runnerCountdown = now ? formatLongCountdown(snapshotLocksAt - now) : "--:--:--";

  return (
    <section className="section runner-section" id="runners">
      <div className="container">
        <div className="section-kicker live-kicker"><span>Sherwood Forest launches</span><LiveBadge /></div>
        <div className="section-head split-head">
          <h2>Launch pool, snapshot clock, receipts.</h2>
          <p>The Sherwood Forest side shows the tracked launch pool, the first snapshot clock, and exactly when {PRESALE_MIN_HOLDING} holders lock eligibility.</p>
        </div>
        <div className="runner-layout">
          <div className="runner-countdown-card">
            <span>First snapshot locks in</span>
            <strong className="countdown-value">{runnerCountdown}</strong>
            <p>The {SNAPSHOT_WINDOW_COPY} {SNAPSHOT_TIMING_COPY}. Hold at least {PRESALE_MIN_HOLDING} SHER and do not go below before it locks.</p>
          </div>
          <div className="runner-position-grid">
            <article className="runner-position-card">
              <span>Snapshot opens</span>
              <strong>{formatDateTime(snapshotOpensAt)}</strong>
              <b>{SNAPSHOT_WINDOW_COPY}</b>
            </article>
            <article className="runner-position-card">
              <span>Snapshot locks</span>
              <strong>{formatDateTime(snapshotLocksAt)}</strong>
              <b>{PRESALE_MIN_HOLDING} SHER required</b>
            </article>
            <article className="runner-position-card">
              <span>First launch window</span>
              <strong>{formatDateTime(snapshotLocksAt)} - {formatDateTime(firstPresaleAt)}</strong>
              <b>{FIRST_LAUNCH_WINDOW_COPY}</b>
            </article>
          </div>
        </div>
        <div className="history-card runner-winner-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>Access</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Awaiting wallet</td>
                  <td>Presale access</td>
                  <td>Submit Sol wallet and add ETH destination before snapshot</td>
                </tr>
              </tbody>
            </table>
          </div>
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
      <strong>{isPlaceholderValue(value) ? <DisplayValue value={value} /> : <AnimatedStat value={value} />}</strong>
    </article>
  );
}

export function PermanentEligibility() {
  return (
    <section className="section eligibility-section" id="eligibility">
      <div className="container warning-layout">
        <div>
          <div className="section-kicker">Eligibility</div>
          <h2>{`Hold ${PRESALE_MIN_HOLDING} $${SOURCE_SYMBOL} and get presale access.`}</h2>
        </div>
        <div className="eligibility-flow">
          {[`Hold ${PRESALE_MIN_HOLDING}`, "Submit Sol wallet", "Add ETH address", SNAPSHOT_WINDOW_COPY, "Presale access"].map((item, index) => (
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
          <div className="section-kicker">How it works</div>
        <div className="section-head split-head">
          <h2>Three steps. Hold SHER, submit addresses, enter presale.</h2>
          <p>Hold {PRESALE_MIN_HOLDING} SHER, keep that balance through the pre-presale snapshot, submit your Sol wallet, and add the ETH address for allocation. The tax-token model uses {TAX_SPLIT_COPY}.</p>
        </div>
        <div className="reward-flow">
          {[
            `Hold ${PRESALE_MIN_HOLDING} $${SOURCE_SYMBOL}`,
            "Submit Sol + ETH",
            "Snapshot locks access"
          ].map((item, index) => (
            <article className="reward-flow-card" key={item}>
              <span>{index + 1}</span>
              <strong>{item}</strong>
            </article>
          ))}
        </div>
        <div className="share-example">
          {[
            ["Input", "Creator fees", TAX_SPLIT_COPY],
            ["Access", `${PRESALE_MIN_HOLDING} holders`, "presale window opens"],
            ["Receipts", "On-chain", "no fake scoreboard"]
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

export function SherwoodWalletBoard() {
  const holders = useHolderData();
  const topHolders = holders?.topHolders.slice(0, 12) ?? [];

  return (
    <section className="section bull-board-section" id="wallet-board">
      <div className="container">
        <div className="section-kicker live-kicker"><span>Holder board</span><LiveBadge /></div>
        <div className="section-head split-head">
          <h2>Sherwood Forest wallets.</h2>
          <p>Top holders come from the live holder route. Empty states mean the backend has not returned holder rows yet.</p>
        </div>
        <div className="history-card bull-board-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>${SOURCE_SYMBOL} Held</th>
                  <th>Share</th>
                  <th>Total {REWARD_SYMBOL} Routed</th>
                  <th>Last Access</th>
                </tr>
              </thead>
              <tbody>
                {topHolders.length ? (
                  topHolders.map((holder) => (
                    <tr key={holder.address}>
                      <td>{compactAddress(holder.address)}</td>
                      <td>{formatNumber(holder.balance, 0)}</td>
                      <td>{holder.percentage}%</td>
                      <td>
                        {holder.totalRewardEarned && holder.totalRewardEarned > 0
                          ? formatAmount(holder.totalRewardEarned, REWARD_SYMBOL)
                          : "Awaiting settled rewards"}
                      </td>
                      <td>{holder.lastAirdropAt ? formatDate(holder.lastAirdropAt) : "Awaiting presale"}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="placeholder-row">
                    <td className="placeholder-cell" colSpan={5}>Awaiting live holder data.</td>
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
        <div className="section-kicker live-kicker"><span>Recent access</span><LiveBadge /></div>
        <div className="section-head split-head">
          <h2>Receipts or it did not happen.</h2>
          <p>Settled launch and access records from the live backend. Failed or skipped attempts are not counted.</p>
        </div>
        <div className="history-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>Access Type</th>
                  <th>What Opened</th>
                  <th>Time</th>
                  <th>TX Link</th>
                </tr>
              </thead>
              <tbody>
                {rewards.length ? (
                  rewards.slice(0, 50).map((reward) => (
                    <tr key={`${reward.wallet}-${reward.time}-${reward.rewardAmount}`}>
                      <td>{compactAddress(reward.wallet)}</td>
                      <td>{reward.rewardAsset ?? "Base"}</td>
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
                    <td className="placeholder-cell" colSpan={5}>Awaiting settled presale access records.</td>
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
  const { now } = useProtocolData();
  const holders = useHolderData();
  const { firstPresaleAt, snapshotOpensAt, snapshotLocksAt, firstCoinRevealAt } = usePresaleSchedule();
  const [solWallet, setSolWallet] = useState("");
  const [ethWallet, setEthWallet] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [walletStatus, setWalletStatus] = useState("");
  const cleanSolWallet = solWallet.trim();
  const cleanEthWallet = ethWallet.trim();
  const solLooksValid = SOLANA_ADDRESS_RE.test(cleanSolWallet);
  const ethLooksValid = ETH_ADDRESS_RE.test(cleanEthWallet);
  const canSubmit = solLooksValid && ethLooksValid;
  const snapshotCountdown = now ? formatLongCountdown(snapshotLocksAt - now) : "--:--:--";
  const revealCountdown = now ? formatLongCountdown(firstCoinRevealAt - now) : "--:--:--";
  const displayedHolders = holders?.topHolders.slice(0, 8) ?? [];
  const submittedMatchesTopHolder =
    submitted && canSubmit && displayedHolders.some((holder) => holder.address === cleanSolWallet);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  const connectSolWallet = async () => {
    const provider = getSolanaProvider();

    if (!provider) {
      setWalletStatus("No Solana wallet extension detected. Paste your Sol wallet manually.");
      return;
    }

    try {
      const response = await provider.connect();
      const publicKey = response.publicKey?.toBase58?.() ?? response.publicKey?.toString?.() ?? "";

      if (!publicKey) {
        setWalletStatus("Wallet connected, but no public address was returned. Paste it manually.");
        return;
      }

      setSolWallet(publicKey);
      setSubmitted(false);
      setWalletStatus("Sol wallet connected read-only. No signature was requested.");
    } catch {
      setWalletStatus("Wallet connection was cancelled. You can still paste the Sol wallet manually.");
    }
  };

  return (
    <section className="section lookup-section" id="lookup">
      <div className="container split-section">
        <div>
          <div className="section-kicker">Presale verification</div>
          <h2>Submit your Sol wallet. Add your ETH destination.</h2>
          <p className="lead">
            You need {PRESALE_MIN_HOLDING} SHER in the Sol wallet at the snapshot. Do not go under that amount before
            the snapshot window, which opens {formatDateTime(snapshotOpensAt)} and locks by {formatDateTime(snapshotLocksAt)}. The first launch window runs {FIRST_LAUNCH_WINDOW_COPY}.
          </p>
          <div className="presale-countdown-grid" aria-label="First coin countdowns">
            <article>
              <span>First coin reveal</span>
              <strong className="countdown-value">{revealCountdown}</strong>
              <p>Reveal is scheduled {FIRST_COIN_REVEAL_COPY}.</p>
            </article>
            <article>
              <span>First snapshot locks</span>
              <strong className="countdown-value">{snapshotCountdown}</strong>
              <p>Only wallets still holding {PRESALE_MIN_HOLDING} SHER at lock are eligible.</p>
            </article>
          </div>
        </div>
        <form className="lookup-card" onSubmit={handleSubmit}>
          <p className="lookup-reassurance">
            No wallet signature required - connect is read-only and only fills your public Sol address.
            We suggest using a burner ETH receiving wallet for the first presale allocation.
          </p>
          <label htmlFor="sol-wallet">Solana wallet holding SHER</label>
          <div className="lookup-row">
            <input
              id="sol-wallet"
              value={solWallet}
              onChange={(event) => setSolWallet(event.target.value)}
              placeholder="Paste Sol wallet"
              spellCheck={false}
            />
            <button type="button" className="secondary-action" onClick={connectSolWallet}>Connect Sol</button>
          </div>
          {walletStatus ? <p className="wallet-status">{walletStatus}</p> : null}
          <label htmlFor="eth-wallet">ETH address for presale allocation</label>
          <div className="lookup-row">
            <input
              id="eth-wallet"
              value={ethWallet}
              onChange={(event) => setEthWallet(event.target.value)}
              placeholder="0x..."
              spellCheck={false}
            />
            <button type="submit">Save Address</button>
          </div>
          <div className="verification-grid" aria-label="Presale requirements">
            <span>{PRESALE_MIN_HOLDING} SHER minimum</span>
            <span>{SNAPSHOT_WINDOW_COPY}</span>
            <span>{TAX_SPLIT_COPY}</span>
          </div>
          <div className="tax-token-strip" aria-label="Tax token mechanics">
            <article>
              <span>50%</span>
              <strong>Launch liquidity</strong>
            </article>
            <article>
              <span>50%</span>
              <strong>Holder airdrops</strong>
            </article>
            <article>
              <span>2.5M+</span>
              <strong>Snapshot minimum</strong>
            </article>
          </div>
          <div className="lookup-result">
            {submitted ? (
              <>
                <strong>{canSubmit ? "Address format saved for presale review" : "Submission needs attention"}</strong>
                <span>
                  {canSubmit
                    ? `${compactAddress(cleanSolWallet)} is ready for the ${formatDateTime(snapshotLocksAt)} snapshot review. Launch follows ${FIRST_LAUNCH_WINDOW_COPY}. Final eligibility is determined by the live ${PRESALE_MIN_HOLDING} SHER snapshot.`
                    : "Enter a valid Solana wallet and a valid 0x ETH address before the snapshot locks."}
                </span>
              </>
            ) : (
              <span>Submit before snapshot. Holding less than {PRESALE_MIN_HOLDING} SHER at lock means no presale access.</span>
            )}
          </div>
          <div className="presale-holder-list">
            <div>
              <strong>Verified wallets</strong>
              <span>Top SHER holders show here with ETH counterpart status. Connected rows upgrade to Verified Sherwood holder.</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Sol wallet</th>
                    <th>{SOURCE_SYMBOL} held</th>
                    <th>ETH receiver</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {submitted && canSubmit && !submittedMatchesTopHolder ? (
                    <tr className="verified-holder-row">
                      <td>Pending</td>
                      <td>{compactAddress(cleanSolWallet)}</td>
                      <td>Awaiting live holder match</td>
                      <td>{compactAddress(cleanEthWallet)}</td>
                      <td>Verified Sherwood holder</td>
                    </tr>
                  ) : null}
                  {displayedHolders.length ? (
                    displayedHolders.map((holder) => {
                      const isVerified = submitted && canSubmit && holder.address === cleanSolWallet;
                      return (
                        <tr className={isVerified ? "verified-holder-row" : undefined} key={holder.address}>
                          <td>#{holder.rank}</td>
                          <td>{compactAddress(holder.address)}</td>
                          <td>{formatNumber(holder.balance, 0)}</td>
                          <td>{isVerified ? compactAddress(cleanEthWallet) : "Not connected"}</td>
                          <td>{isVerified ? "Verified Sherwood holder" : "SHER holder"}</td>
                        </tr>
                      );
                    })
                  ) : null}
                  {!displayedHolders.length && !(submitted && canSubmit) ? (
                    <tr>
                      <td className="placeholder-cell" colSpan={5}>Awaiting live top-holder data.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
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
        <div className="section-kicker live-kicker"><span>Access history</span><LiveBadge /></div>
        <div className="section-head split-head">
          <h2>{REWARD_SYMBOL} Launch Records</h2>
          <p>Settled launch/access records only. Failed or skipped worker attempts are not counted.</p>
        </div>
        <div className="history-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Window</th>
                  <th>{REWARD_SYMBOL} Routed</th>
                  <th>Recipients</th>
                  <th>Weight</th>
                  <th>Total Routed</th>
                  <th>Transaction</th>
                </tr>
              </thead>
              <tbody>
                {rounds.length ? (
                  rounds.map((round) => (
                    <tr key={`${round.epoch}-${round.startedAt}`}>
                      <td>#{round.epoch}</td>
                      <td>{formatAmount(round.rewardBought, REWARD_SYMBOL)}</td>
                      <td>{round.rewardTotals.some((total) => total.rewardAmount > 0) ? "Settled" : statusLabel(round.status)}</td>
                      <td>Holder share</td>
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
                    <td className="placeholder-cell" colSpan={6}>Awaiting settled launch records.</td>
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
