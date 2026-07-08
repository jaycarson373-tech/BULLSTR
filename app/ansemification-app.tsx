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

const terminalLines = [
  "New BegWorker verified...",
  "Creator fees received...",
  "Buying $ANSEM...",
  "Bounty payout queued...",
  "Reward epoch completed...",
  "Waiting for next epoch..."
];
const feeRails = [
  ["50%", "Community Bounties", "Funds new BegWork challenges."],
  ["50%", "Verified BegWorkers", "Rewards contributors after successful participation."]
];
const activeBounties = [
  { title: "Tattoo BLACK BULL", reward: "2 SOL", category: "Stunt", status: "Open", countdown: "23:41", entries: "0" },
  { title: "Best Ansem Edit", reward: "0.5 SOL", category: "Edit", status: "Open", countdown: "11:08", entries: "0" },
  { title: "Funniest Reply", reward: "100k $ANSEM", category: "Reply", status: "Judging", countdown: "04:52", entries: "0" },
  { title: "Best Raid", reward: "0.5 SOL", category: "Raid", status: "Open", countdown: "17:30", entries: "0" },
  { title: "Best Video", reward: "250k $ANSEM", category: "Video", status: "Open", countdown: "35:15", entries: "0" }
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
          <a href="#bounties">Bounties</a>
          <a href="#treasury">Treasury</a>
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
            <span className="ai-kicker">BEGWORK ECONOMY</span>
            <h1>Begwork</h1>
            <p>
              The protocol funding the BegWork economy.
              <br />
              Ansem made working for attention one of the biggest metas on CT.
              Instead of paying influencers, BegWork funds the community.
              Complete bounties. Grow the Black Bull economy. Earn SOL and $ANSEM.
            </p>
            <div className="ai-actions">
              <a href="#bounties">View Bounties</a>
              <a href="#how">How It Works</a>
            </div>
          </motion.div>

          <motion.aside id="next-bounty" className="ai-hero-panel ai-next-bounty" initial={{ opacity: 0, x: 28, filter: "blur(12px)" }} animate={{ opacity: 1, x: 0, filter: "blur(0px)" }} transition={{ ...smoothTransition, duration: 0.8, delay: 0.15 }}>
            <div className="ai-hero-metric">
              <span>Next Bounty</span>
              <strong>Best Ansem Edit</strong>
            </div>
            <div className="ai-hero-metric">
              <span>Reward</span>
              <strong>0.5 SOL</strong>
            </div>
            <div className="ai-hero-metric">
              <span>Time Remaining</span>
              <strong>{countdown}</strong>
            </div>
            <div className="ai-hero-metric">
              <span>Category</span>
              <strong>Edit</strong>
            </div>
            <div className="ai-hero-metric">
              <span>Entries</span>
              <strong>0</strong>
            </div>
          </motion.aside>
        </section>

        <motion.section className="ai-section" id="bounties" {...fadeUp}>
          <div className="ai-section-head">
            <span className="ai-kicker">ACTIVE BEGWORK</span>
            <h2>Complete bounties. Compete for attention. Win rewards.</h2>
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

        <motion.section className="ai-thesis" id="how" {...fadeUp}>
          <span className="ai-kicker">WHY BEGWORK EXISTS</span>
          <h2>Attention became work.</h2>
          <p>
            One reply became worth more than a paid ad. People started making edits,
            posting memes, raiding timelines, and competing for attention.
          </p>
          <p>
            BegWork funds that behavior. The more the community builds, the stronger
            the ecosystem becomes.
          </p>
        </motion.section>

        <motion.section className="ai-section" id="treasury" {...fadeUp}>
          <div className="ai-section-head">
            <span className="ai-kicker">HOW THE TREASURY WORKS</span>
            <h2>The treasury supports the BegWork economy.</h2>
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
              <span className="ai-kicker">LIVE WINNERS</span>
              <h2>Recent BegWorkers</h2>
            </div>
          </div>
          <div className="ai-table ai-transactions">
            <div className="ai-transaction-head">
              <span>Wallet</span>
              <span>Bounty</span>
              <span>Reward</span>
              <span>Time</span>
              <span>Proof</span>
            </div>
            {stats.recentRewards.length ? (
              stats.recentRewards.slice(0, 12).map((reward) => (
                <div className="ai-transaction-row" key={`${reward.epoch}-${reward.wallet}-${reward.time}-${reward.rewardAsset ?? "ANSEM"}`}>
                  <span className="mono">{compactAddress(reward.wallet)}</span>
                  <span>BegWork reward</span>
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
              <div className="ai-empty">No winners yet.</div>
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
                "BegWork is the economy for earning through attention, contribution, and community work around Ansem."
              ],
              ["How do I earn?", "Complete open bounties, post proof, and compete for rewards when your contribution grows the Black Bull economy."],
              ["What kind of work counts?", "Edits, replies, raids, memes, videos, clips, and bold CT stunts can become BegWork."],
              ["How does the treasury work?", "The treasury funds community bounties and rewards verified BegWorkers after successful participation."],
              ["Where do winners show?", "Recent BegWorkers appear in the winners table with proof links once rewards settle."],
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
    { label: "50% bounty wallet", value: "$ANSEM" },
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
