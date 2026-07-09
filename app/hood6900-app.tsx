"use client";

import { motion, type Transition } from "framer-motion";
import { useEffect, useState } from "react";
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
  nextDrawTime: string;
  drawIntervalHours: number;
  drawRewardPct: number;
  rewardWallet: {
    address: string | null;
    solBalance: number | null;
    sourceTokenBalance: number | null;
    rewardTokenBalance: number | null;
  };
  holderEpochDrops: Array<{
    epoch: number;
    time: string;
    recipients: number;
    totalSent: number;
    rewardTotals: RewardTotal[];
    txSig: string | null;
  }>;
  drawProofs: Array<{
    epoch: number;
    wallet: string;
    rewardAsset?: string;
    rewardAmount: number;
    time: string;
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

type PriceResponse = {
  priceUsd: number;
  priceChange24h: number;
  url: string | null;
  updatedAt: string;
};

const PROJECT_NAME = "HOOD6900";
const LOGO_SRC = "/brand/hood6900-logo.jpg";
const X_URL = process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/HOOD6900_";
const CA =
  process.env.NEXT_PUBLIC_CA?.trim() ||
  process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT?.trim() ||
  "FTAat9Wt3wHkLkjHXXifJG6TmbUH5yVVWEfAGBhMpump";
const BUY_URL =
  process.env.NEXT_PUBLIC_BUY_URL?.trim() ||
  "https://pump.fun";
const PUMP_URL =
  process.env.NEXT_PUBLIC_PUMP_URL?.trim() ||
  "https://pump.fun";
const DEXSCREENER_URL =
  process.env.NEXT_PUBLIC_DEXSCREENER_URL?.trim() ||
  "https://dexscreener.com/solana";
const COMMUNITY_URL =
  process.env.NEXT_PUBLIC_COMMUNITY_URL?.trim() ||
  X_URL;
const REFRESH_MS = 12_000;
const EPOCH_MS = 5 * 60 * 1000;

const emptyStats: StatsResponse = {
  totalEpochs: 0,
  totalRewardTotals: [],
  latestEligibleHolders: 0,
  nextDropTime: new Date().toISOString(),
  nextDrawTime: new Date().toISOString(),
  drawIntervalHours: 2,
  drawRewardPct: 10,
  rewardWallet: {
    address: null,
    solBalance: null,
    sourceTokenBalance: null,
    rewardTokenBalance: null
  },
  holderEpochDrops: [],
  drawProofs: [],
  recentRewards: []
};

const emptyPrice: PriceResponse = {
  priceUsd: 0,
  priceChange24h: 0,
  url: null,
  updatedAt: new Date().toISOString()
};

const terminalLines = [
  "Robinhood built the chain.",
  "The trenches built the meme.",
  "Creator fees buy back HOODx.",
  "100% airdrops HOODx to holders.",
  "0% goes anywhere else.",
  "Sell once and you're out."
];
const feeRails = [
  ["5 MIN", "Every epoch", "Creator fees buy back HOODx."],
  ["100%", "Holder airdrops", "Automatic HOODx to eligible holders."],
  ["0%", "Side fund", "Nothing leaves the holder rail."],
  ["REPEAT", "The Hood loop", "Buy. Airdrop. Grow. Repeat."]
];
const activeBounties = [
  { title: "Every 5 minutes", reward: "Fees in", category: "01", status: "Open", countdown: "00:05", entries: "Loop" },
  { title: "Creator fees buy back HOODx", reward: "Buyback", category: "02", status: "Open", countdown: "100%", entries: "Holders" },
  { title: "100% airdropped as HOODx to holders", reward: "Auto", category: "03", status: "Open", countdown: "100K+", entries: "Eligible" },
  { title: "0% side fund", reward: "Pure", category: "04", status: "Open", countdown: "0%", entries: "Leak" },
  { title: "Repeat", reward: "HOODx", category: "05", status: "Open", countdown: "Forever", entries: "Loop" }
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
  if (key === "HOODX") return "HOODx";
  return asset ? asset.replace(/^\$/, "") : "HOODx";
}

function formatRewardTotals(totals: RewardTotal[] | undefined, empty = "Awaiting") {
  const liveTotals = (totals ?? []).filter((total) => total.rewardAmount > 0);
  if (!liveTotals.length) return empty;
  return liveTotals
    .map((total) => formatToken(total.rewardAmount, displayAsset(total.rewardAsset), displayAsset(total.rewardAsset) === "SOL" ? 4 : 2))
    .join(" / ");
}

function formatBalance(value: number | null | undefined, symbol: string, empty = "Awaiting") {
  if (!Number.isFinite(value) || value === null || value === undefined) return empty;
  return formatToken(value, symbol, symbol === "SOL" ? 4 : 2);
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
        <span>REWARDS: ACTIVE</span>
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

export function Hood6900App() {
  const [stats, setStats] = useState<StatsResponse>(emptyStats);
  const [price, setPrice] = useState<PriceResponse>(emptyPrice);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [nextStats, nextPrice] = await Promise.all([
        getJson<StatsResponse>("/api/stats", emptyStats),
        getJson<PriceResponse>("/api/hood-price", emptyPrice)
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
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const nextDropMs = now ? Math.max(Date.parse(stats.nextDropTime) || 0, fallbackNextDropMs()) : 0;
  const countdown = now ? formatCountdown(Math.max(0, Math.ceil((nextDropMs - now) / 1000))) : "--:--";

  return (
    <div className="ai-index-app">
      <AnimatedBackground />

      <header className="ai-nav">
        <a className="ai-brand" href="#top" aria-label="Hood 6900 home">
          <span className="ai-brand-mark"><img src={LOGO_SRC} alt="" /></span>
          <span>{PROJECT_NAME}</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="/dashboard">HOOD Board</a>
          <a href="#loop">Loop</a>
          <a href="#hold">Hold</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="ai-nav-meta">
          <span className="ai-ca-chip">CA: {CA}</span>
          <a href={X_URL} target="_blank" rel="noreferrer">X</a>
        </div>
      </header>

      <main>
        <section className="ai-hero" id="top">
          <motion.div className="ai-hero-copy" {...fadeUp}>
            <img className="ai-hero-logo" src={LOGO_SRC} alt="" />
            <span className="ai-kicker">ROBINHOOD HAS A CHAIN</span>
            <h1>THE MEMECOIN OF THE HOOD.</h1>
            <p>
              Robinhood built the chain.
              <br />
              The trenches built the meme.
              <br />
              <br />
              HOOD6900 is the community token for the Hood ecosystem.
              <br />
              Every 5 minutes creator fees buy back HOODx.
              <br />
              100% is automatically airdropped as HOODx to eligible holders.
              <br />
              0% goes anywhere else.
              <br />
              Hold 100K+. Stay eligible. Sell once and you're out.
            </p>
            <div className="ai-actions">
              <a href={BUY_URL} target="_blank" rel="noreferrer">Buy HOOD</a>
              <a href="/dashboard">View Rewards</a>
            </div>
          </motion.div>

          <motion.aside id="next-bounty" className="ai-hero-panel ai-next-bounty" initial={{ opacity: 0, x: 28, filter: "blur(12px)" }} animate={{ opacity: 1, x: 0, filter: "blur(0px)" }} transition={{ ...smoothTransition, duration: 0.8, delay: 0.15 }}>
            <div className="ai-hero-metric">
              <span>Next Buyback</span>
              <strong>{countdown}</strong>
            </div>
            <div className="ai-hero-metric">
              <span>Holder Split</span>
              <strong>100%</strong>
            </div>
            <div className="ai-hero-metric">
              <span>Side Fund</span>
              <strong>0%</strong>
            </div>
            <div className="ai-hero-metric">
              <span>Eligibility</span>
              <strong>100K+</strong>
            </div>
            <div className="ai-hero-metric">
              <span>Rule</span>
              <strong>Sell = Out</strong>
            </div>
          </motion.aside>
        </section>

        <motion.section className="ai-section" id="loop" {...fadeUp}>
          <div className="ai-section-head">
            <span className="ai-kicker">THE HOOD LOOP</span>
            <h2>Buy. Airdrop. Grow. Repeat.</h2>
          </div>
          <div className="ai-bounty-grid">
            {activeBounties.map((bounty) => (
              <article className="ai-card ai-bounty-card" key={bounty.title}>
                <div className="ai-bounty-top">
                  <small>{bounty.category}</small>
                  <span className={`ai-badge ${bounty.status.toLowerCase()}`}>{bounty.status}</span>
                </div>
                <h3>{bounty.title}</h3>
                <strong>{bounty.reward}</strong>
                <div className="ai-bounty-meta">
                  <span>{bounty.countdown}</span>
                  <span>{bounty.entries} entries</span>
                </div>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.section className="ai-section" id="hold" {...fadeUp}>
          <div className="ai-section-head">
            <span className="ai-kicker">WHY HOLD</span>
            <h2>Hold 100K+. Receive HOODx every epoch.</h2>
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
          <div className="ai-hold-lines">
            <span>No claiming.</span>
            <span>No staking.</span>
            <span>No locking.</span>
            <span>Just hold.</span>
            <span>Sell once.</span>
            <span>Lose future eligibility.</span>
          </div>
        </motion.section>

        <motion.section className="ai-section" id="transactions" {...fadeUp}>
          <div className="ai-section-head split">
            <div>
              <span className="ai-kicker">LIVE REWARDS</span>
              <h2>Recent HOODx Airdrops</h2>
            </div>
          </div>
          <div className="ai-table ai-transactions">
            <div className="ai-transaction-head">
              <span>Wallet</span>
              <span>Mission</span>
              <span>Reward</span>
              <span>Time</span>
              <span>Proof</span>
            </div>
            {stats.recentRewards.length ? (
              stats.recentRewards.slice(0, 12).map((reward) => (
                <div className="ai-transaction-row" key={`${reward.epoch}-${reward.wallet}-${reward.time}-${reward.rewardAsset ?? "HOOD"}`}>
                  <span className="mono">{compactAddress(reward.wallet)}</span>
                  <span>HOODx reward</span>
                  <span className="mono">{formatToken(reward.rewardAmount, displayAsset(reward.rewardAsset), 4)}</span>
                  <span>{formatTime(reward.time)}</span>
                  {reward.txSig ? (
                    <a href={`https://solscan.io/tx/${reward.txSig}`} target="_blank" rel="noreferrer">Solscan</a>
                  ) : (
                    <span>Pending</span>
                  )}
                </div>
              ))
            ) : (
              <div className="ai-empty">No HOODx rewards yet.</div>
            )}
          </div>
        </motion.section>

        <motion.section className="ai-section" id="price" {...fadeUp}>
          <div className="ai-section-head split">
            <div>
              <span className="ai-kicker">$HOOD6900 PRICE</span>
              <h2>Live $HOOD6900 Chart</h2>
            </div>
            <span className="ai-status">DEXSCREENER</span>
          </div>
          <div className="ai-performance-card">
            <IndexChart />
            <div className="ai-performance-zero">{formatUsd(price.priceUsd)}</div>
            <div className="ai-price-meta">
              <span>$HOOD6900 / USD</span>
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
            <h2>HOOD6900 Questions</h2>
          </div>
          <div className="ai-faq">
            {[
              [
                "What is HOOD6900?",
                "The community memecoin for the Hood ecosystem."
              ],
              ["How do I earn?", "Hold 100K+ HOOD6900."],
              ["Do I claim?", "No claiming. No staking. No locking."],
              ["What happens if I sell?", "Sell once and you lose future eligibility."],
              ["Where do rewards show?", "The HOOD Board shows buybacks, airdrops, holders, and proof."]
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
          <span className="ai-brand-mark"><img src={LOGO_SRC} alt="" /></span>
          <span>{PROJECT_NAME}</span>
        </div>
        <div className="ai-footer-links">
          <a href={COMMUNITY_URL} target="_blank" rel="noreferrer">X</a>
          <a href={DEXSCREENER_URL} target="_blank" rel="noreferrer">DEXSCREENER</a>
          <a href={PUMP_URL} target="_blank" rel="noreferrer">PUMP.FUN</a>
          <a href={BUY_URL} target="_blank" rel="noreferrer">BUY HOOD</a>
        </div>
      </footer>
    </div>
  );
}

export function RewardsDashboardApp() {
  const [stats, setStats] = useState<StatsResponse>(emptyStats);
  const [price, setPrice] = useState<PriceResponse>(emptyPrice);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [nextStats, nextPrice] = await Promise.all([
        getJson<StatsResponse>("/api/stats", emptyStats),
        getJson<PriceResponse>("/api/hood-price", emptyPrice)
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
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const nextDropMs = now ? Math.max(Date.parse(stats.nextDropTime) || 0, fallbackNextDropMs()) : 0;
  const countdown = now ? formatCountdown(Math.max(0, Math.ceil((nextDropMs - now) / 1000))) : "--:--";
  const totalHoodDistributed = rewardTotalAmount(stats.totalRewardTotals, ["HOODX"]);
  const transactionCount = stats.recentRewards.filter((reward) => reward.txSig).length;
  const latestDrop = stats.holderEpochDrops[0];
  const totalAirdropped = stats.holderEpochDrops.reduce((sum, drop) => sum + drop.totalSent, 0);
  const latestBuyback = latestDrop ? formatRewardTotals(latestDrop.rewardTotals, formatToken(latestDrop.totalSent, "HOODx", 2)) : "Awaiting";
  const dashboardMetrics = [
    { label: "Total HOODx Bought", value: formatToken(totalHoodDistributed, "HOODx") },
    { label: "Total HOODx Airdropped", value: formatToken(totalAirdropped, "HOODx") },
    { label: "Eligible Holders", value: formatNumber(stats.latestEligibleHolders, 0) },
    { label: "Side Fund", value: "0%" },
    { label: "Next Buyback", value: countdown },
    { label: "Latest Buyback", value: latestBuyback }
  ];

  return (
    <div className="ai-index-app">
      <AnimatedBackground />

      <header className="ai-nav">
        <a className="ai-brand" href="/" aria-label="Hood 6900 home">
          <span className="ai-brand-mark"><img src={LOGO_SRC} alt="" /></span>
          <span>{PROJECT_NAME}</span>
        </a>
        <nav aria-label="Dashboard navigation">
          <a href="/">Home</a>
          <a href="#reward-split">HOOD Board</a>
          <a href="#transactions">Transactions</a>
          <a href="#price">Price</a>
        </nav>
        <div className="ai-nav-meta">
          <span className="ai-ca-chip">CA: {CA}</span>
          <a href={X_URL} target="_blank" rel="noreferrer">X</a>
        </div>
      </header>

      <main className="ai-dashboard-main">
        <motion.section className="ai-section ai-dashboard-hero" {...fadeUp}>
          <div className="ai-section-head split">
            <div>
              <span className="ai-kicker">LIVE DASHBOARD</span>
              <h1>HOOD BOARD</h1>
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

        <motion.section className="ai-section" id="reward-split" {...fadeUp}>
          <div className="ai-section-head split">
            <div>
              <span className="ai-kicker">THE HOOD BOARD</span>
              <h2>Every 5 minutes. Buy back HOODx. Reward holders. 100/0.</h2>
            </div>
            <span className="ai-status">100K+ HOLDERS</span>
          </div>

          <div className="hood-split-dashboard">
            <article className="hood-split-panel">
              <div className="hood-split-panel-head">
                <span>100% Holder Rail</span>
                <h3>HOODx airdrops each epoch</h3>
                <p>No claiming. No staking. No locking. Just hold 100K+.</p>
              </div>
              <div className="hood-epoch-list">
                {stats.holderEpochDrops.length ? (
                  stats.holderEpochDrops.map((drop) => (
                    <div className="hood-epoch-row" key={`${drop.epoch}-${drop.time}`}>
                      <div>
                        <strong>Epoch #{drop.epoch}</strong>
                        <span>{formatTime(drop.time)}</span>
                      </div>
                      <div>
                        <strong>{formatRewardTotals(drop.rewardTotals, formatToken(drop.totalSent, "HOODx", 2))}</strong>
                        <span>{drop.recipients.toLocaleString()} recipients</span>
                      </div>
                      {drop.txSig ? (
                        <a href={`https://solscan.io/tx/${drop.txSig}`} target="_blank" rel="noreferrer">
                          Proof
                        </a>
                      ) : (
                        <span className="hood-proof-muted">Pending</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="hood-empty-proof">Awaiting settled HOODx epoch drops.</div>
                )}
              </div>
            </article>

            <article className="hood-split-panel">
              <div className="hood-split-panel-head">
                <span>0% Side Fund</span>
                <h3>Nothing leaves the holder rail</h3>
                <p>Creator fees buy HOODx. HOODx goes to eligible holders. That's the loop.</p>
              </div>
              <div className="hood-wallet-grid">
                <div>
                  <span>Side Wallet</span>
                  <strong>{stats.rewardWallet.address ? compactAddress(stats.rewardWallet.address) : "Not set"}</strong>
                </div>
                <div>
                  <span>SOL Owned</span>
                  <strong>{formatBalance(stats.rewardWallet.solBalance, "SOL")}</strong>
                </div>
                <div>
                  <span>HOOD6900 Held</span>
                  <strong>{formatBalance(stats.rewardWallet.sourceTokenBalance, "HOOD6900")}</strong>
                </div>
                <div>
                  <span>Airdrop Pool</span>
                  <strong>{formatBalance(stats.rewardWallet.rewardTokenBalance, "HOODx")}</strong>
                </div>
                <div>
                  <span>Next Buyback</span>
                  <strong>{countdown}</strong>
                </div>
                <div>
                  <span>Eligible Pool</span>
                  <strong>{formatNumber(stats.latestEligibleHolders, 0)}</strong>
                </div>
              </div>
              <div className="hood-claim-rule">
                100% goes to holder airdrops. 0% goes anywhere else. Sell once and you're out.
              </div>
              <div className="hood-epoch-list compact">
                {stats.drawProofs.length ? (
                  stats.drawProofs.map((proof) => (
                    <div className="hood-epoch-row" key={`${proof.epoch}-${proof.wallet}-${proof.time}`}>
                      <div>
                        <strong>{compactAddress(proof.wallet)}</strong>
                        <span>{formatTime(proof.time)}</span>
                      </div>
                      <div>
                        <strong>{formatToken(proof.rewardAmount, displayAsset(proof.rewardAsset), 4)}</strong>
                        <span>Epoch #{proof.epoch}</span>
                      </div>
                      {proof.txSig ? (
                        <a href={`https://solscan.io/tx/${proof.txSig}`} target="_blank" rel="noreferrer">
                          Proof
                        </a>
                      ) : (
                        <span className="hood-proof-muted">Pending</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="hood-empty-proof">Buyback and airdrop proof will appear after epochs settle.</div>
                )}
              </div>
            </article>
          </div>
        </motion.section>

        <motion.section className="ai-section" id="transactions" {...fadeUp}>
          <div className="ai-section-head split">
            <div>
              <span className="ai-kicker">SETTLED REWARDS</span>
              <h2>HOODx Receipts</h2>
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
            <div className="ai-transaction-row" key={`${reward.epoch}-${reward.wallet}-${reward.time}-${reward.rewardAsset ?? "HOOD6900"}`}>
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
              <span className="ai-kicker">$HOOD6900 PRICE</span>
              <h2>Live HOODx Chart</h2>
            </div>
            <span className="ai-status">DEXSCREENER</span>
          </div>
          <div className="ai-performance-card">
            <IndexChart />
            <div className="ai-performance-zero">{formatUsd(price.priceUsd)}</div>
            <div className="ai-price-meta">
              <span>HOODx / USD</span>
              <strong>{price.priceChange24h >= 0 ? "+" : ""}{formatNumber(price.priceChange24h, 2)}% 24H</strong>
              {price.url ? <a href={price.url} target="_blank" rel="noreferrer">Open chart</a> : null}
            </div>
          </div>
        </motion.section>
      </main>

      <footer className="ai-footer">
        <div className="ai-footer-brand">
          <span className="ai-brand-mark"><img src={LOGO_SRC} alt="" /></span>
          <span>{PROJECT_NAME}</span>
        </div>
        <div className="ai-footer-links">
          <a href={COMMUNITY_URL} target="_blank" rel="noreferrer">X</a>
          <a href={DEXSCREENER_URL} target="_blank" rel="noreferrer">DEXSCREENER</a>
          <a href={PUMP_URL} target="_blank" rel="noreferrer">PUMP.FUN</a>
          <a href={BUY_URL} target="_blank" rel="noreferrer">BUY HOOD</a>
        </div>
      </footer>
    </div>
  );
}
