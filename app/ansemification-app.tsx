"use client";

import { motion, type Transition } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { AnimatedBackground } from "./animated-background";

type RewardTotal = {
  rewardAsset: string;
  rewardAmount: number;
  normalRewardAmount: number;
  recipients: number;
  latestTime: string | null;
  latestTxSig: string | null;
};

type StatsResponse = {
  totalEpochs: number;
  totalRewardTotals: RewardTotal[];
  latestEligibleHolders: number;
  nextDropTime: string;
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

type PriceResponse = {
  priceUsd: number;
  priceChange24h: number;
  url: string | null;
  updatedAt: string;
};

const X_URL = process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/AI6900SOL_";
const CA = process.env.NEXT_PUBLIC_CA?.trim() || "6UHbrLBSbrUuGR3Qeu1UBAHHruAPTmvf2hsRWGYGpump";
const BUY_URL = "https://jup.ag/?sell=So11111111111111111111111111111111111111112&buy=6UHbrLBSbrUuGR3Qeu1UBAHHruAPTmvf2hsRWGYGpump";
const PUMP_URL = "https://pump.fun/coin/6UHbrLBSbrUuGR3Qeu1UBAHHruAPTmvf2hsRWGYGpump";
const DEXSCREENER_URL = "#";
const REFRESH_MS = 12_000;
const EPOCH_MS = 5 * 60 * 1000;

const emptyStats: StatsResponse = {
  totalEpochs: 0,
  totalRewardTotals: [],
  latestEligibleHolders: 0,
  nextDropTime: new Date().toISOString(),
  recentRewards: []
};

const emptyPrice: PriceResponse = {
  priceUsd: 0,
  priceChange24h: 0,
  url: null,
  updatedAt: new Date().toISOString()
};

const signalCards = [
  ["Hold $AI", "Eligible $AI holders receive ANSEM rewards."],
  ["Buy ANSEM", "Creator fees buy ANSEM every epoch."],
  ["Reward $AI Holders", "ANSEM goes back to eligible $AI holders."],
  ["Buy $AI", "Creator fees also buy the source token."],
  ["Reward ANSEM Holders", "Top ANSEM holders receive $AI."]
];

const terminalLines = ["Waiting for fees...", "Checking $AI holders...", "Checking ANSEM holders...", "Waiting for reward tx..."];
const feeRails = [
  ["50%", "$AI Rewards", "Buys $AI and rewards top ANSEM holders."],
  ["50%", "ANSEM Rewards", "Buys ANSEM and airdrops to $AI holders."]
];

const smoothTransition: Transition = { duration: 0.7, ease: [0.22, 1, 0.36, 1] };

const fadeUp = {
  initial: { opacity: 0, y: 22, filter: "blur(10px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "-80px" },
  transition: smoothTransition
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

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function fallbackNextDropMs() {
  return Math.ceil(Date.now() / EPOCH_MS) * EPOCH_MS;
}

function formatNumber(value: number, maximumFractionDigits = 2) {
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

function formatToken(value: number, symbol: string, maximumFractionDigits = 2) {
  return `${formatNumber(value, maximumFractionDigits)} ${symbol}`;
}

function formatUsd(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: value >= 1 ? 4 : 8 })}`;
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "–" : date.toLocaleString();
}

function compactAddress(address: string) {
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function assetKey(asset: string | undefined) {
  return (asset ?? "").replace(/^\$/, "").trim().toUpperCase();
}

function rewardTotalAmount(totals: RewardTotal[], keys: string[]) {
  const wanted = new Set(keys.map(assetKey));
  return totals.reduce((sum, total) => (wanted.has(assetKey(total.rewardAsset)) ? sum + total.rewardAmount : sum), 0);
}

function displayAsset(asset: string | undefined) {
  const key = assetKey(asset);
  if (key === "AI6900") return "$AI";
  if (key === "AI") return "$AI";
  if (key === "ANSEM") return "$ANSEM";
  return asset ? `$${asset.replace(/^\$/, "")}` : "$ANSEM";
}

function IndexChart() {
  return (
    <div className="ai-chart" aria-hidden="true">
      <svg viewBox="0 0 900 420" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartLine" x1="0" x2="1">
            <stop offset="0%" stopColor="rgba(124, 255, 59, 0)" />
            <stop offset="45%" stopColor="rgba(124, 255, 59, 0.72)" />
            <stop offset="100%" stopColor="rgba(124, 255, 59, 0.12)" />
          </linearGradient>
          <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(124, 255, 59, 0.18)" />
            <stop offset="100%" stopColor="rgba(124, 255, 59, 0)" />
          </linearGradient>
        </defs>
        <path
          className="ai-chart-fill"
          d="M0 315 C80 290 120 248 190 266 C285 291 323 196 406 208 C504 222 520 124 628 142 C716 157 760 87 900 104 L900 420 L0 420 Z"
        />
        <path
          className="ai-chart-line"
          d="M0 315 C80 290 120 248 190 266 C285 291 323 196 406 208 C504 222 520 124 628 142 C716 157 760 87 900 104"
        />
      </svg>
    </div>
  );
}

function TerminalActivity() {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLineIndex((value) => (value + 1) % terminalLines.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="ai-terminal">
      <div className="ai-terminal-top">
        <span>LIVE ACTIVITY</span>
        <span>REWARDS: WAITING</span>
      </div>
      <div className="ai-terminal-feed">
        {terminalLines.map((line, index) => (
          <div className={index === lineIndex ? "is-active" : ""} key={line}>
            <span>{new Date(0).toISOString().slice(11, 19)}</span>
            <strong>{line}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnsemIndexApp() {
  const [stats, setStats] = useState<StatsResponse>(emptyStats);
  const [price, setPrice] = useState<PriceResponse>(emptyPrice);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [nextStats, nextPrice] = await Promise.all([
        getJson<StatsResponse>("/api/stats", emptyStats),
        getJson<PriceResponse>("/api/ansem-price", emptyPrice)
      ]);

      if (!active) return;
      setStats(nextStats);
      setPrice(nextPrice);
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

  const nextDropMs = Math.max(Date.parse(stats.nextDropTime) || 0, fallbackNextDropMs());
  const countdown = formatCountdown(Math.max(0, Math.ceil((nextDropMs - now) / 1000)));
  const totalAnsemDistributed = rewardTotalAmount(stats.totalRewardTotals, ["ANSEM"]);
  const totalAiDistributed = rewardTotalAmount(stats.totalRewardTotals, ["AI", "AI6900"]);
  const transactionCount = stats.recentRewards.filter((reward) => reward.txSig).length;
  const heroMetrics = useMemo(
    () => [
      { label: "$AI DISTRIBUTED TO ANSEM HOLDERS", value: formatToken(totalAiDistributed, "$AI") },
      { label: "$ANSEM DISTRIBUTED TO $AI HOLDERS", value: formatToken(totalAnsemDistributed, "$ANSEM") },
      { label: "ELIGIBLE $AI HOLDERS", value: formatNumber(stats.latestEligibleHolders, 0) },
      { label: "ANSEM PRICE", value: formatUsd(price.priceUsd) },
      { label: "NEXT EPOCH", value: countdown },
      { label: "RECENT TXS", value: formatNumber(transactionCount, 0) }
    ],
    [countdown, price.priceUsd, stats.latestEligibleHolders, totalAiDistributed, totalAnsemDistributed, transactionCount]
  );

  return (
    <div className="ai-index-app">
      <AnimatedBackground />

      <header className="ai-nav">
        <a className="ai-brand" href="#top" aria-label="ANSEM INDEX 6900 home">
          <span className="ai-brand-mark"><img src="/brand/ai6900-logo.png" alt="" /></span>
          <span>ANSEM INDEX 6900</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="/dashboard">Dashboard</a>
          <a href="#transactions">Transactions</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="ai-nav-meta">
          <span>$AI</span>
          <span className="ai-ca-chip">CA: {CA}</span>
          <a href={X_URL} target="_blank" rel="noreferrer">X</a>
        </div>
      </header>

      <main>
        <section className="ai-hero" id="top">
          <motion.div className="ai-hero-copy" {...fadeUp}>
            <span className="ai-kicker">ANSEM INDEX</span>
            <h1>ANSEM INDEX 6900</h1>
            <p>
              The Ansem Index routes creator fees through a 50/50 reward rail: half to ANSEM for $AI holders,
              half to $AI for top ANSEM holders.
            </p>
            <div className="ai-actions">
              <a href="/dashboard">View Dashboard</a>
              <a href="#transactions">View Transactions</a>
            </div>
          </motion.div>

          <motion.aside id="dashboard" className="ai-hero-panel" initial={{ opacity: 0, x: 28, filter: "blur(12px)" }} animate={{ opacity: 1, x: 0, filter: "blur(0px)" }} transition={{ ...smoothTransition, duration: 0.8, delay: 0.15 }}>
            {heroMetrics.map((metric) => (
              <div className="ai-hero-metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </motion.aside>
        </section>

        <motion.section className="ai-section" id="how" {...fadeUp}>
          <div className="ai-section-head">
            <span className="ai-kicker">REWARD STACK</span>
            <h2>How Rewards Work</h2>
          </div>
          <div className="ai-card-grid five">
            {signalCards.map(([title, copy]) => (
              <article className="ai-card" key={title}>
                <small>{title.toUpperCase()}</small>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.section className="ai-section" id="rails" {...fadeUp}>
          <div className="ai-section-head">
            <span className="ai-kicker">CREATOR FEE ROUTING</span>
            <h2>Two rails. Live rewards.</h2>
          </div>
          <div className="ai-rail-grid">
            {feeRails.map(([value, title, copy]) => (
              <article className="ai-rail-card" key={title}>
                <b>{value}</b>
                <span>{title}</span>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.section className="ai-section" id="transactions" {...fadeUp}>
          <div className="ai-section-head split">
            <div>
              <span className="ai-kicker">RECENT TRANSACTIONS</span>
              <h2>Reward Transactions</h2>
            </div>
          </div>
          <div className="ai-table ai-transactions">
            <div className="ai-transaction-head">
              <span>Time</span>
              <span>Wallet</span>
              <span>Asset</span>
              <span>Amount</span>
              <span>Tx</span>
            </div>
            {stats.recentRewards.length ? (
              stats.recentRewards.slice(0, 12).map((reward) => (
                <div className="ai-transaction-row" key={`${reward.epoch}-${reward.wallet}-${reward.time}-${reward.rewardAsset ?? "ANSEM"}`}>
                  <span>{formatTime(reward.time)}</span>
                  <span className="mono">{compactAddress(reward.wallet)}</span>
                  <span>{displayAsset(reward.rewardAsset)}</span>
                  <span className="mono">{formatToken(reward.rewardAmount, displayAsset(reward.rewardAsset), 4)}</span>
                  {reward.txSig ? (
                    <a href={`https://solscan.io/tx/${reward.txSig}`} target="_blank" rel="noreferrer">Solscan</a>
                  ) : (
                    <span>Pending</span>
                  )}
                </div>
              ))
            ) : (
              <div className="ai-empty">No reward transactions yet.</div>
            )}
          </div>
        </motion.section>

        <motion.section className="ai-thesis" {...fadeUp}>
          <span className="ai-kicker">WHY IT EXISTS</span>
          <h2>Hold $AI. Earn ANSEM. Top ANSEM holders earn $AI.</h2>
          <p>The reward rails run every epoch when fees are available.</p>
        </motion.section>

        <motion.section className="ai-section" id="price" {...fadeUp}>
          <div className="ai-section-head split">
            <div>
              <span className="ai-kicker">ANSEM PRICE</span>
              <h2>Live ANSEM Chart</h2>
            </div>
            <span className="ai-status">DEXSCREENER</span>
          </div>
          <div className="ai-performance-card">
            <IndexChart />
            <div className="ai-performance-zero">{formatUsd(price.priceUsd)}</div>
            <div className="ai-price-meta">
              <span>ANSEM / USD</span>
              <strong>{price.priceChange24h >= 0 ? "+" : ""}{formatNumber(price.priceChange24h, 2)}% 24H</strong>
              {price.url ? <a href={price.url} target="_blank" rel="noreferrer">Open chart</a> : null}
            </div>
          </div>
        </motion.section>

        <motion.section className="ai-section" {...fadeUp}>
          <TerminalActivity />
        </motion.section>

        <motion.section className="ai-section" id="faq" {...fadeUp}>
          <div className="ai-section-head">
            <span className="ai-kicker">FAQ</span>
            <h2>Reward Questions</h2>
          </div>
          <div className="ai-faq">
            {[
              ["What is the Index?", "A 50/50 reward system built around ANSEM and $AI."],
              ["How does it work?", "Fees buy ANSEM for $AI holders and buy $AI for top ANSEM holders."],
              ["How often does it run?", "Reward epochs are prepared for five-minute cycles."],
              ["Where do transactions show?", "Settled reward transactions appear in the transaction table with Solscan links."],
              ["What is the ticker?", "The ticker is $AI."]
            ].map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </motion.section>
      </main>

      <footer className="ai-footer">
        <div className="ai-footer-brand">
          <span className="ai-brand-mark"><img src="/brand/ai6900-logo.png" alt="" /></span>
          <span>ANSEM INDEX 6900</span>
        </div>
        <div className="ai-footer-links">
          <a href={DEXSCREENER_URL}>DEXSCREENER</a>
          <a href={PUMP_URL} target="_blank" rel="noreferrer">PUMP.FUN</a>
          <a href={BUY_URL} target="_blank" rel="noreferrer">BUY $AI</a>
        </div>
      </footer>
    </div>
  );
}

export function RewardsDashboardApp() {
  const [stats, setStats] = useState<StatsResponse>(emptyStats);
  const [price, setPrice] = useState<PriceResponse>(emptyPrice);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [nextStats, nextPrice] = await Promise.all([
        getJson<StatsResponse>("/api/stats", emptyStats),
        getJson<PriceResponse>("/api/ansem-price", emptyPrice)
      ]);

      if (!active) return;
      setStats(nextStats);
      setPrice(nextPrice);
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

  const nextDropMs = Math.max(Date.parse(stats.nextDropTime) || 0, fallbackNextDropMs());
  const countdown = formatCountdown(Math.max(0, Math.ceil((nextDropMs - now) / 1000)));
  const totalAnsemDistributed = rewardTotalAmount(stats.totalRewardTotals, ["ANSEM"]);
  const totalAiDistributed = rewardTotalAmount(stats.totalRewardTotals, ["AI", "AI6900"]);
  const transactionCount = stats.recentRewards.filter((reward) => reward.txSig).length;
  const dashboardMetrics = [
    { label: "$AI to ANSEM holders", value: formatToken(totalAiDistributed, "$AI") },
    { label: "$ANSEM to $AI holders", value: formatToken(totalAnsemDistributed, "$ANSEM") },
    { label: "Eligible $AI holders", value: formatNumber(stats.latestEligibleHolders, 0) },
    { label: "ANSEM price", value: formatUsd(price.priceUsd) },
    { label: "Next epoch", value: countdown },
    { label: "Reward txs", value: formatNumber(transactionCount, 0) }
  ];

  return (
    <div className="ai-index-app">
      <AnimatedBackground />

      <header className="ai-nav">
        <a className="ai-brand" href="/" aria-label="ANSEM INDEX 6900 home">
          <span className="ai-brand-mark"><img src="/brand/ai6900-logo.png" alt="" /></span>
          <span>ANSEM INDEX 6900</span>
        </a>
        <nav aria-label="Dashboard navigation">
          <a href="/">Home</a>
          <a href="#transactions">Transactions</a>
          <a href="#price">ANSEM Price</a>
        </nav>
        <div className="ai-nav-meta">
          <span>$AI</span>
          <span className="ai-ca-chip">CA: {CA}</span>
          <a href={X_URL} target="_blank" rel="noreferrer">X</a>
        </div>
      </header>

      <main className="ai-dashboard-main">
        <motion.section className="ai-section ai-dashboard-hero" {...fadeUp}>
          <div className="ai-section-head split">
            <div>
              <span className="ai-kicker">LIVE DASHBOARD</span>
              <h1>Reward Dashboard</h1>
            </div>
            <span className="ai-status">AUTO REFRESH</span>
          </div>
          <div className="ai-dashboard-grid">
            {dashboardMetrics.map((metric) => (
              <article className="ai-hero-metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.section className="ai-section" id="transactions" {...fadeUp}>
          <div className="ai-section-head split">
            <div>
              <span className="ai-kicker">SETTLED REWARDS</span>
              <h2>Transactions</h2>
            </div>
          </div>
          <div className="ai-table ai-transactions">
            <div className="ai-transaction-head">
              <span>Time</span>
              <span>Wallet</span>
              <span>Asset</span>
              <span>Amount</span>
              <span>Tx</span>
            </div>
            {stats.recentRewards.length ? (
              stats.recentRewards.map((reward) => (
                <div className="ai-transaction-row" key={`${reward.epoch}-${reward.wallet}-${reward.time}-${reward.rewardAsset ?? "ANSEM"}`}>
                  <span>{formatTime(reward.time)}</span>
                  <span className="mono">{compactAddress(reward.wallet)}</span>
                  <span>{displayAsset(reward.rewardAsset)}</span>
                  <span className="mono">{formatToken(reward.rewardAmount, displayAsset(reward.rewardAsset), 4)}</span>
                  {reward.txSig ? (
                    <a href={`https://solscan.io/tx/${reward.txSig}`} target="_blank" rel="noreferrer">Solscan</a>
                  ) : (
                    <span>Pending</span>
                  )}
                </div>
              ))
            ) : (
              <div className="ai-empty">No reward transactions yet.</div>
            )}
          </div>
        </motion.section>

        <motion.section className="ai-section" id="price" {...fadeUp}>
          <div className="ai-section-head split">
            <div>
              <span className="ai-kicker">ANSEM PRICE</span>
              <h2>Live ANSEM Chart</h2>
            </div>
            <span className="ai-status">DEXSCREENER</span>
          </div>
          <div className="ai-performance-card">
            <IndexChart />
            <div className="ai-performance-zero">{formatUsd(price.priceUsd)}</div>
            <div className="ai-price-meta">
              <span>ANSEM / USD</span>
              <strong>{price.priceChange24h >= 0 ? "+" : ""}{formatNumber(price.priceChange24h, 2)}% 24H</strong>
              {price.url ? <a href={price.url} target="_blank" rel="noreferrer">Open chart</a> : null}
            </div>
          </div>
        </motion.section>
      </main>

      <footer className="ai-footer">
        <div className="ai-footer-brand">
          <span className="ai-brand-mark"><img src="/brand/ai6900-logo.png" alt="" /></span>
          <span>ANSEM INDEX 6900</span>
        </div>
        <div className="ai-footer-links">
          <a href={DEXSCREENER_URL}>DEXSCREENER</a>
          <a href={PUMP_URL} target="_blank" rel="noreferrer">PUMP.FUN</a>
          <a href={BUY_URL} target="_blank" rel="noreferrer">BUY $AI</a>
        </div>
      </footer>
    </div>
  );
}
