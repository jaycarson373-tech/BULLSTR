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

const X_URL = process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/Begwork_";
const CA =
  process.env.NEXT_PUBLIC_CA?.trim() ||
  process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT?.trim() ||
  "8RKuuDHZ8P8FDsGgPeG31LdeLfRii9P8GFxidzGWpump";
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
  recentRewards: []
};

const emptyPrice: PriceResponse = {
  priceUsd: 0,
  priceChange24h: 0,
  url: null,
  updatedAt: new Date().toISOString()
};

const signalCards = [
  ["1.", "The timeline BegWorks."],
  ["2.", "Creator fees accumulate."],
  ["3.", "50% buys $ANSEM for eligible holders."],
  ["4.", "50% rewards verified BegWorkers."]
];

const terminalLines = [
  "New BegWorker verified...",
  "Creator fees received...",
  "Buying $ANSEM...",
  "Reward epoch completed...",
  "Waiting for next epoch..."
];
const feeRails = [
  ["50%", "Buys $ANSEM", "Automatically distributed to eligible holders."],
  ["50%", "Rewards BegWorkers", "The people growing the meta."]
];
const memeImages = [
  "/brand/memes/ai-meme-1.png",
  "/brand/memes/ai-meme-2.png",
  "/brand/memes/ai-meme-3.png",
  "/brand/memes/ai-meme-4.png",
  "/brand/memes/ai-meme-5.png",
  "/brand/memes/ai-meme-6.png"
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
  if (key === "BEG") return "$BEG";
  if (key === "BULLSTR") return "$BEG";
  if (key === "AI6900") return "$BEG";
  if (key === "AI") return "$BEG";
  if (key === "ANSEM") return "$ANSEM";
  return asset ? `$${asset.replace(/^\$/, "")}` : "$BEG";
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

function MemeConveyor() {
  const belt = [...memeImages, ...memeImages];

  return (
    <motion.section className="ai-meme-section" aria-label="Begwork meme conveyor" {...fadeUp}>
      <div className="ai-meme-conveyor" aria-label="Begwork meme gallery">
        <div className="ai-meme-track">
          {belt.map((src, index) => (
            <figure className="ai-meme-card" key={`${src}-${index}`}>
              <a href={src} download>
                <img src={src} alt="" loading="lazy" />
              </a>
            </figure>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

export function AnsemIndexApp() {
  const [stats, setStats] = useState<StatsResponse>(emptyStats);
  const [price, setPrice] = useState<PriceResponse>(emptyPrice);
  const [now, setNow] = useState(0);

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
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const nextDropMs = now ? Math.max(Date.parse(stats.nextDropTime) || 0, fallbackNextDropMs()) : 0;
  const countdown = now ? formatCountdown(Math.max(0, Math.ceil((nextDropMs - now) / 1000))) : "--:--";
  const totalAnsemDistributed = rewardTotalAmount(stats.totalRewardTotals, ["ANSEM"]);
  const transactionCount = stats.recentRewards.filter((reward) => reward.txSig).length;
  const heroMetrics = useMemo(
    () => [
      { label: "50% ANSEM SWAP", value: formatToken(totalAnsemDistributed, "$ANSEM") },
      { label: "50% REWARD WALLET", value: "SOL" },
      { label: "TICKER", value: "$BEG" },
      { label: "REWARDS", value: "5 MIN" },
      { label: "NEXT EPOCH", value: countdown },
      { label: "RECENT TXS", value: formatNumber(transactionCount, 0) }
    ],
    [countdown, totalAnsemDistributed, transactionCount]
  );

  return (
    <div className="ai-index-app">
      <AnimatedBackground />

      <header className="ai-nav">
        <a className="ai-brand" href="#top" aria-label="Begwork home">
          <span className="ai-brand-mark"><img src="/brand/ai6900-logo.png" alt="" /></span>
          <span>Begwork</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="/dashboard">Dashboard</a>
          <a href="#rails">50/50</a>
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
            <img className="ai-hero-logo" src="/brand/begwork-icon.png" alt="" />
            <span className="ai-kicker">CREATOR-FEE REWARDS</span>
            <h1>Begwork</h1>
            <p>
              Ansem turned earning an airdrop into one of the biggest metas on CT.
              <br />
              The timeline stopped asking for pumps.
              <br />
              It started working for attention.
              <br />
              Edits. Replies. Raids. Memes.
              <br />
              We called it BegWork.
              <br />
              Now the strategy is automated.
            </p>
            <div className="ai-actions">
              <a href={BUY_URL} target="_blank" rel="noreferrer">Buy $BEG</a>
              <a href="#rails">50/50 Rewards</a>
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
            <span className="ai-kicker">HOW BEGWORK WORKS</span>
            <h2>The meta became a machine.</h2>
          </div>
          <div className="ai-card-grid four">
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
            <span className="ai-kicker">THE FLYWHEEL</span>
            <h2>Attention turns into fees. Fees turn into rewards.</h2>
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
              <h2>Launch Receipts</h2>
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
          <span className="ai-kicker">WHY BEGWORK EXISTS</span>
          <h2>Ansem changed the attention economy.</h2>
          <p>
            Getting noticed became valuable. The timeline started grinding for a chance at an airdrop.
            That&apos;s not begging anymore. That&apos;s BegWork.
          </p>
        </motion.section>

        <motion.section className="ai-section" id="price" {...fadeUp}>
          <div className="ai-section-head split">
            <div>
              <span className="ai-kicker">$BEG PRICE</span>
              <h2>Live $BEG Chart</h2>
            </div>
            <span className="ai-status">DEXSCREENER</span>
          </div>
          <div className="ai-performance-card">
            <IndexChart />
            <div className="ai-performance-zero">{formatUsd(price.priceUsd)}</div>
            <div className="ai-price-meta">
              <span>$BEG / USD</span>
              <strong>{price.priceChange24h >= 0 ? "+" : ""}{formatNumber(price.priceChange24h, 2)}% 24H</strong>
              {price.url ? <a href={price.url} target="_blank" rel="noreferrer">Open chart</a> : null}
            </div>
          </div>
        </motion.section>

        <motion.section className="ai-section" {...fadeUp}>
          <TerminalActivity />
        </motion.section>

        <MemeConveyor />

        <motion.section className="ai-section" id="faq" {...fadeUp}>
          <div className="ai-section-head">
            <span className="ai-kicker">FAQ</span>
            <h2>Begwork Questions</h2>
          </div>
          <div className="ai-faq">
            {[
              [
                "What is BegWork?",
                "BegWork is the name the trenches gave to the meta of working for Ansem's attention in hopes of earning an airdrop. Instead of paying for attention, the community earned it."
              ],
              ["How does the 50/50 split work?", "Half of claimed SOL swaps into ANSEM and half sends to the reward wallet."],
              ["How often does it run?", "The worker checks for a new epoch every five minutes."],
              ["Where do transactions show?", "Settled launch receipts appear in the transaction table with Solscan links."],
              ["What is the ticker?", "The ticker is $BEG."]
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
          <span>Begwork</span>
        </div>
        <div className="ai-footer-links">
          <a href={COMMUNITY_URL} target="_blank" rel="noreferrer">X</a>
          <a href={DEXSCREENER_URL} target="_blank" rel="noreferrer">DEXSCREENER</a>
          <a href={PUMP_URL} target="_blank" rel="noreferrer">PUMP.FUN</a>
          <a href={BUY_URL} target="_blank" rel="noreferrer">BUY $BEG</a>
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
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const nextDropMs = now ? Math.max(Date.parse(stats.nextDropTime) || 0, fallbackNextDropMs()) : 0;
  const countdown = now ? formatCountdown(Math.max(0, Math.ceil((nextDropMs - now) / 1000))) : "--:--";
  const totalAnsemDistributed = rewardTotalAmount(stats.totalRewardTotals, ["ANSEM"]);
  const transactionCount = stats.recentRewards.filter((reward) => reward.txSig).length;
  const dashboardMetrics = [
    { label: "50% ANSEM swap", value: formatToken(totalAnsemDistributed, "$ANSEM") },
    { label: "50% reward wallet", value: "SOL" },
    { label: "CA", value: compactAddress(CA) },
    { label: "$BEG price", value: formatUsd(price.priceUsd) },
    { label: "Next epoch", value: countdown },
    { label: "Reward txs", value: formatNumber(transactionCount, 0) }
  ];

  return (
    <div className="ai-index-app">
      <AnimatedBackground />

      <header className="ai-nav">
        <a className="ai-brand" href="/" aria-label="Begwork home">
          <span className="ai-brand-mark"><img src="/brand/ai6900-logo.png" alt="" /></span>
          <span>Begwork</span>
        </a>
        <nav aria-label="Dashboard navigation">
          <a href="/">Home</a>
          <a href="#transactions">Transactions</a>
          <a href="#price">$BEG Price</a>
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
              <h1>Begwork Dashboard</h1>
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
              <h2>Launch Receipts</h2>
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
              <span className="ai-kicker">$BEG PRICE</span>
              <h2>Live $BEG Chart</h2>
            </div>
            <span className="ai-status">DEXSCREENER</span>
          </div>
          <div className="ai-performance-card">
            <IndexChart />
            <div className="ai-performance-zero">{formatUsd(price.priceUsd)}</div>
            <div className="ai-price-meta">
              <span>$BEG / USD</span>
              <strong>{price.priceChange24h >= 0 ? "+" : ""}{formatNumber(price.priceChange24h, 2)}% 24H</strong>
              {price.url ? <a href={price.url} target="_blank" rel="noreferrer">Open chart</a> : null}
            </div>
          </div>
        </motion.section>
      </main>

      <footer className="ai-footer">
        <div className="ai-footer-brand">
          <span className="ai-brand-mark"><img src="/brand/ai6900-logo.png" alt="" /></span>
          <span>Begwork</span>
        </div>
        <div className="ai-footer-links">
          <a href={COMMUNITY_URL} target="_blank" rel="noreferrer">X</a>
          <a href={DEXSCREENER_URL} target="_blank" rel="noreferrer">DEXSCREENER</a>
          <a href={PUMP_URL} target="_blank" rel="noreferrer">PUMP.FUN</a>
          <a href={BUY_URL} target="_blank" rel="noreferrer">BUY $BEG</a>
        </div>
      </footer>
    </div>
  );
}
