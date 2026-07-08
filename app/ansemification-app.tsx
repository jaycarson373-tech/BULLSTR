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

const PROJECT_NAME = "Hood Strategy";
const LOGO_SRC = "/brand/hood-strategy-logo.png";
const X_URL = process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/HOODSTR_";
const CA =
  process.env.NEXT_PUBLIC_CA?.trim() ||
  process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT?.trim() ||
  "SOON";
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
  "Hood rail online...",
  "Creator fees received...",
  "Buying HOOD Stock...",
  "Verified holder draw queued...",
  "Stock reward epoch completed...",
  "Waiting for next epoch..."
];
const feeRails = [
  ["50%", "Automatic HOOD Stock", "Airdrops HOOD rewards to wallets holding 1M+ tokens."],
  ["50%", "Verified Holder Draws", "Funds early Hood memecoin holders, active X users, and live draw winners."]
];
const activeBounties = [
  { title: "Verified Holder Draw", reward: "HOOD", category: "Wallet", status: "Open", countdown: "23:41", entries: "0" },
  { title: "Early Mover Draw", reward: "HOOD", category: "Early", status: "Open", countdown: "11:08", entries: "0" },
  { title: "Active X Claim", reward: "HOOD", category: "X.com", status: "Judging", countdown: "04:52", entries: "0" },
  { title: "Hood Memecoin Holder", reward: "HOOD", category: "Chain", status: "Open", countdown: "17:30", entries: "0" },
  { title: "24 Hour Claim Window", reward: "HOOD", category: "Proof", status: "Open", countdown: "35:15", entries: "0" }
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
  if (key === "HOOD6900") return "$HOOD";
  if (key === "HOOD") return "$HOOD";
  if (key === "BEG") return "$HOOD";
  if (key === "BULLSTR") return "$HOOD";
  if (key === "AI6900") return "$HOOD";
  if (key === "AI") return "$HOOD";
  if (key === "ANSEM") return "HOODx";
  if (key === "HOODX") return "HOODx";
  return asset ? asset.replace(/^\$/, "") : "$HOOD";
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

function MemeConveyor() {
  const belt = [...memeImages, ...memeImages];

  return (
    <motion.section className="ai-meme-section" aria-label="Hood Strategy meme conveyor" {...fadeUp}>
      <div className="ai-meme-conveyor" aria-label="Hood Strategy meme gallery">
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
        <a className="ai-brand" href="#top" aria-label="Hood Strategy home">
          <span className="ai-brand-mark"><img src={LOGO_SRC} alt="" /></span>
          <span>{PROJECT_NAME}</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="/dashboard">Dashboard</a>
          <a href="#bounties">Missions</a>
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
            <img className="ai-hero-logo" src={LOGO_SRC} alt="" />
            <span className="ai-kicker">HOOD STRATEGY PROTOCOL</span>
            <h1>Hood Strategy</h1>
            <p>
              Real airdrops. Verified holders. Neon proof.
              <br />
              50% of rewards airdrop HOOD Stock automatically to 1M+ token holders.
              The other 50% funds verified Hood memecoin holders, early movers,
              and live draw prizes with 24-hour X claim windows.
            </p>
            <div className="ai-actions">
              <a href="#bounties">Verified Holders</a>
              <a href="#how">How It Works</a>
            </div>
          </motion.div>

          <motion.aside id="next-bounty" className="ai-hero-panel ai-next-bounty" initial={{ opacity: 0, x: 28, filter: "blur(12px)" }} animate={{ opacity: 1, x: 0, filter: "blur(0px)" }} transition={{ ...smoothTransition, duration: 0.8, delay: 0.15 }}>
            <div className="ai-hero-metric">
              <span>Next Draw</span>
              <strong>Verified Holder Draw</strong>
            </div>
            <div className="ai-hero-metric">
              <span>Reward</span>
              <strong>HOOD</strong>
            </div>
            <div className="ai-hero-metric">
              <span>Time Remaining</span>
              <strong>{countdown}</strong>
            </div>
            <div className="ai-hero-metric">
              <span>Category</span>
              <strong>Wallet Proof</strong>
            </div>
            <div className="ai-hero-metric">
              <span>Entries</span>
              <strong>0</strong>
            </div>
          </motion.aside>
        </section>

        <motion.section className="ai-section" id="bounties" {...fadeUp}>
          <div className="ai-section-head">
            <span className="ai-kicker">VERIFIED HOLDERS</span>
            <h2>Prove the wallet. Stay active on X. Claim the draw.</h2>
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
          <span className="ai-kicker">WHY HOOD STRATEGY EXISTS</span>
          <h2>The Hood needs proof before prizes.</h2>
          <p>
            Hood Strategy turns the green-app energy into a real on-chain
            reward loop for holders and verified early movers.
          </p>
          <p>
            Holders above 1M tokens get automatic airdrops. Verified holders
            can add an ETH wallet after proving ownership, then live draw
            winners have 24 hours to respond on X and claim.
          </p>
        </motion.section>

        <motion.section className="ai-section" id="treasury" {...fadeUp}>
          <div className="ai-section-head">
            <span className="ai-kicker">HOW THE HOOD RAILS WORK</span>
            <h2>Creator fees become 50/50 Hood rewards.</h2>
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
              <span className="ai-kicker">LIVE REWARDS</span>
              <h2>Recent Verified Rewards</h2>
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
                  <span>Hood reward</span>
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
              <div className="ai-empty">No HOOD rewards yet.</div>
            )}
          </div>
        </motion.section>

        <motion.section className="ai-section" id="price" {...fadeUp}>
          <div className="ai-section-head split">
            <div>
              <span className="ai-kicker">$HOOD PRICE</span>
              <h2>Live $HOOD Chart</h2>
            </div>
            <span className="ai-status">DEXSCREENER</span>
          </div>
          <div className="ai-performance-card">
            <IndexChart />
            <div className="ai-performance-zero">{formatUsd(price.priceUsd)}</div>
            <div className="ai-price-meta">
              <span>$HOOD / USD</span>
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
            <h2>Hood Strategy Questions</h2>
          </div>
          <div className="ai-faq">
            {[
              [
                "What is Hood Strategy?",
                "Hood Strategy is the 50/50 reward loop for automatic holder airdrops and verified Hood community draws."
              ],
              ["How do I earn?", "Hold 1M+ HOOD for automatic airdrops, or verify ownership for the live draw rail."],
              ["What kind of verification counts?", "Hood memecoin ownership, wallet ownership proof, active X participation, and early mover status can qualify."],
              ["How does the treasury work?", "50% routes to automatic holder drops and 50% funds verified holder draws."],
              ["Where do winners show?", "Recent verified rewards appear in the table with proof links once rewards settle."],
              ["How do draw winners claim?", "Winners must respond on X within 24 hours and prove ownership of the selected wallet."]
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
          <a href={BUY_URL} target="_blank" rel="noreferrer">BUY $HOOD</a>
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
  const nextDrawMs = now ? Date.parse(stats.nextDrawTime) || 0 : 0;
  const drawCountdown = nextDrawMs ? formatCountdown(Math.max(0, Math.ceil((nextDrawMs - now) / 1000))) : "--:--";
  const totalHoodDistributed = rewardTotalAmount(stats.totalRewardTotals, ["HOODX", "HOOD6900", "ANSEM", "HOOD"]);
  const transactionCount = stats.recentRewards.filter((reward) => reward.txSig).length;
  const dashboardMetrics = [
    { label: "50% HOOD stock", value: formatToken(totalHoodDistributed, "HOOD") },
    { label: "50% verified draws", value: "HOOD" },
    { label: "CA", value: compactAddress(CA) },
    { label: "$HOOD price", value: formatUsd(price.priceUsd) },
    { label: "Next epoch", value: countdown },
    { label: "Reward txs", value: formatNumber(transactionCount, 0) }
  ];

  return (
    <div className="ai-index-app">
      <AnimatedBackground />

      <header className="ai-nav">
        <a className="ai-brand" href="/" aria-label="Hood Strategy home">
          <span className="ai-brand-mark"><img src={LOGO_SRC} alt="" /></span>
          <span>{PROJECT_NAME}</span>
        </a>
        <nav aria-label="Dashboard navigation">
          <a href="/">Home</a>
          <a href="#reward-split">50/50</a>
          <a href="#transactions">Transactions</a>
          <a href="#price">$HOOD Price</a>
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
              <h1>Hood Strategy Dashboard</h1>
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
              <span className="ai-kicker">50 / 50 REWARD DASHBOARD</span>
              <h2>HOODx drops on the left. Reward wallet draws on the right.</h2>
            </div>
            <span className="ai-status">2H DRAW WINDOW</span>
          </div>

          <div className="hood-split-dashboard">
            <article className="hood-split-panel">
              <div className="hood-split-panel-head">
                <span>Left Rail</span>
                <h3>HOODx airdrops each epoch</h3>
                <p>Automatic holder drops show exactly how much was sent and link to settled transaction proof.</p>
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
                <span>Right Rail</span>
                <h3>Reward wallet + verified draws</h3>
                <p>Every {formatNumber(stats.drawIntervalHours, 0)} hours, a random holder can win {formatNumber(stats.drawRewardPct, 2)}% of the reward wallet after X activity and wallet-ownership verification.</p>
              </div>
              <div className="hood-wallet-grid">
                <div>
                  <span>Reward Wallet</span>
                  <strong>{stats.rewardWallet.address ? compactAddress(stats.rewardWallet.address) : "Not set"}</strong>
                </div>
                <div>
                  <span>SOL Owned</span>
                  <strong>{formatBalance(stats.rewardWallet.solBalance, "SOL")}</strong>
                </div>
                <div>
                  <span>HOOD Owned</span>
                  <strong>{formatBalance(stats.rewardWallet.sourceTokenBalance, "HOOD")}</strong>
                </div>
                <div>
                  <span>HOODx Owned</span>
                  <strong>{formatBalance(stats.rewardWallet.rewardTokenBalance, "HOODx")}</strong>
                </div>
                <div>
                  <span>Next Draw</span>
                  <strong>{drawCountdown}</strong>
                </div>
                <div>
                  <span>Eligible Pool</span>
                  <strong>{formatNumber(stats.latestEligibleHolders, 0)}</strong>
                </div>
              </div>
              <div className="hood-claim-rule">
                Winner must be active on X/x.com, reply within 24 hours, prove wallet ownership, then send the claim wallet.
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
                  <div className="hood-empty-proof">Verified draw transaction proof will appear after claims settle.</div>
                )}
              </div>
            </article>
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
                <div className="ai-transaction-row" key={`${reward.epoch}-${reward.wallet}-${reward.time}-${reward.rewardAsset ?? "HOOD"}`}>
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
              <span className="ai-kicker">$HOOD PRICE</span>
              <h2>Live $HOOD Chart</h2>
            </div>
            <span className="ai-status">DEXSCREENER</span>
          </div>
          <div className="ai-performance-card">
            <IndexChart />
            <div className="ai-performance-zero">{formatUsd(price.priceUsd)}</div>
            <div className="ai-price-meta">
              <span>$HOOD / USD</span>
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
          <a href={BUY_URL} target="_blank" rel="noreferrer">BUY $HOOD</a>
        </div>
      </footer>
    </div>
  );
}
