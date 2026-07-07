"use client";

import { motion, type Transition } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { AnimatedBackground } from "./animated-background";

type StatsResponse = {
  nextDropTime: string;
  recentRewards: Array<{
    epoch: number;
    rewardAsset?: string;
    wallet: string;
    rewardAmount: number;
    time: string;
    status: string;
    txSig: string | null;
  }>;
};

const X_URL = process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/AI6900SOL_";
const BUY_URL = process.env.NEXT_PUBLIC_BUY_URL?.trim() || "#";
const DEXSCREENER_URL = process.env.NEXT_PUBLIC_DEXSCREENER_URL?.trim() || "#";
const CA = process.env.NEXT_PUBLIC_CA?.trim() || "3CV1YaF2dBEpbuvAYaYiqE1K1YEsiehxbJ53b9LQpump";
const EPOCH_MS = 5 * 60 * 1000;

const emptyStats: StatsResponse = {
  nextDropTime: new Date().toISOString(),
  recentRewards: []
};

const smoothTransition: Transition = { duration: 0.75, ease: [0.22, 1, 0.36, 1] };
const fadeUp = {
  initial: { opacity: 0, y: 22, filter: "blur(10px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "-80px" },
  transition: smoothTransition
};

const steps = [
  ["01", "Creator fees accumulate."],
  ["02", "65% automatically buys $ANSEM. Distributed to eligible holders."],
  ["03", "35% funds holder expansion. The protocol continuously airdrops new wallets to increase the ecosystem."],
  ["04", "Repeat forever. More holders. More conviction."]
];

const dashboardCards = [
  ["Total $ANSEM Distributed", "0"],
  ["Eligible Holders", "0"],
  ["Target Holders", "10,000"],
  ["Current Holders", "0"],
  ["Progress to 10,000", "0%"],
  ["Next Distribution", "05:00"],
  ["Latest Distribution TX", "Waiting"],
  ["System Status", "Initializing"]
];

const liveDashboardCards = [
  ["Total ANSEM Distributed", "0"],
  ["Total Wallets Airdropped", "0"],
  ["Current Holder Count", "0"],
  ["Progress To 10,000", "0%"],
  ["Latest TX", "Waiting"],
  ["Next Distribution", "05:00"]
];

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

function fallbackNextDropMs() {
  return Math.ceil(Date.now() / EPOCH_MS) * EPOCH_MS;
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Pending" : date.toLocaleString();
}

function compactTx(tx: string | null) {
  if (!tx) return "Waiting";
  return `${tx.slice(0, 4)}...${tx.slice(-4)}`;
}

function StrategyChart() {
  return (
    <div className="ai-chart strategy-chart" aria-hidden="true">
      <svg viewBox="0 0 900 420" preserveAspectRatio="none">
        <defs>
          <linearGradient id="strategyLine" x1="0" x2="1">
            <stop offset="0%" stopColor="rgba(245, 245, 245, 0)" />
            <stop offset="50%" stopColor="rgba(245, 245, 245, 0.82)" />
            <stop offset="100%" stopColor="rgba(245, 245, 245, 0.12)" />
          </linearGradient>
          <linearGradient id="strategyFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(245, 245, 245, 0.16)" />
            <stop offset="100%" stopColor="rgba(245, 245, 245, 0)" />
          </linearGradient>
        </defs>
        <path className="ai-chart-fill" d="M0 330 C90 295 135 280 215 258 C320 230 372 170 465 190 C560 210 620 122 700 136 C780 150 820 112 900 82 L900 420 L0 420 Z" />
        <path className="ai-chart-line" d="M0 330 C90 295 135 280 215 258 C320 230 372 170 465 190 C560 210 620 122 700 136 C780 150 820 112 900 82" />
      </svg>
    </div>
  );
}

function DistributionTable({ rewards }: { rewards: StatsResponse["recentRewards"] }) {
  return (
    <div className="ai-table ai-transactions">
      <div className="ai-transaction-head">
        <span>Time</span>
        <span>Amount</span>
        <span>Recipients</span>
        <span>TX</span>
        <span>Status</span>
      </div>
      {rewards.length ? (
        rewards.slice(0, 10).map((reward) => (
          <div className="ai-transaction-row" key={`${reward.epoch}-${reward.wallet}-${reward.time}-${reward.txSig ?? "pending"}`}>
            <span>{formatTime(reward.time)}</span>
            <span>{reward.rewardAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {reward.rewardAsset ?? "ANSEM"}</span>
            <span>1</span>
            {reward.txSig ? <a href={`https://solscan.io/tx/${reward.txSig}`} target="_blank" rel="noreferrer">{compactTx(reward.txSig)}</a> : <span>Waiting</span>}
            <span>{reward.status}</span>
          </div>
        ))
      ) : (
        <div className="ai-empty">Waiting for first distribution...</div>
      )}
    </div>
  );
}

export function AnsemIndexApp() {
  const [stats, setStats] = useState<StatsResponse>(emptyStats);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    const load = async () => {
      const nextStats = await getJson<StatsResponse>("/api/stats", emptyStats);
      if (active) setStats(nextStats);
    };
    load();
    const refreshTimer = window.setInterval(load, 12_000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const countdown = formatCountdown(Math.max(0, Math.ceil((Math.max(Date.parse(stats.nextDropTime) || 0, fallbackNextDropMs()) - now) / 1000)));
  const heroMetrics = useMemo(
    () => dashboardCards.map(([label, value]) => (label === "Next Distribution" ? { label, value: countdown } : { label, value })),
    [countdown]
  );

  return (
    <div className="ai-index-app strategy-app">
      <AnimatedBackground />

      <header className="ai-nav">
        <a className="ai-brand" href="#top" aria-label="AI INDEX 6900 home">
          <span className="strategy-brand-mark">AI</span>
          <span>AI INDEX 6900</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#strategy">Strategy</a>
          <a href="#dashboard">Dashboard</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="ai-nav-meta">
          <span className="ai-ca-chip">CA: {CA}</span>
          <span className="strategy-ticker">$AI</span>
          <a href={X_URL} target="_blank" rel="noreferrer">X</a>
        </div>
      </header>

      <main>
        <section className="ai-hero" id="top">
          <motion.div className="ai-hero-copy" {...fadeUp}>
            <span className="ai-kicker">ANSEM INDEX</span>
            <h1>AI INDEX 6900</h1>
            <p>The Ansem Index built around growing the Black Bull economy.</p>
            <div className="ai-actions">
              <a href={BUY_URL} target="_blank" rel="noreferrer">Buy $AI</a>
              <a href="#strategy">View Dashboard</a>
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

        <motion.section className="ai-section" id="strategy" {...fadeUp}>
          <div className="ai-section-head">
            <span className="ai-kicker">HOW THE INDEX WORKS</span>
            <h2>The index, automated.</h2>
          </div>
          <div className="ai-card-grid four">
            {steps.map(([number, copy]) => (
              <article className="ai-card" key={number}>
                <small>{number}</small>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.section className="ai-section holder-strategy" {...fadeUp}>
          <div className="ai-section-head split">
            <div>
              <span className="ai-kicker">THE HOLDER INDEX</span>
              <h2>10,000 Holder Goal</h2>
            </div>
            <span className="ai-status">0% COMPLETE</span>
          </div>
          <div className="holder-panel">
            <div className="holder-progress"><span /></div>
            <div className="holder-stats">
              <article><span>Current Holders</span><strong>0</strong></article>
              <article><span>Remaining Holders</span><strong>10,000</strong></article>
              <article><span>Estimated SOL Required</span><strong>20 SOL</strong></article>
            </div>
            <p>Growing the holder base is part of the index.</p>
          </div>
        </motion.section>

        <motion.section className="ai-section" id="distributions" {...fadeUp}>
          <div className="ai-section-head split">
            <div>
              <span className="ai-kicker">LIVE DISTRIBUTIONS</span>
              <h2>Proof Table</h2>
            </div>
            <span className="ai-status">WAITING</span>
          </div>
          <DistributionTable rewards={[]} />
        </motion.section>

        <motion.section className="ai-section" id="dashboard" {...fadeUp}>
          <div className="ai-section-head">
            <span className="ai-kicker">LIVE DASHBOARD</span>
            <h2>Index metrics.</h2>
          </div>
          <div className="ai-dashboard-grid">
            {liveDashboardCards.map(([label, value]) => (
              <article className="ai-hero-metric" key={label}>
                <span>{label}</span>
                <strong>{label === "Next Distribution" ? countdown : value}</strong>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.section className="ai-thesis" {...fadeUp}>
          <span className="ai-kicker">WHY THIS EXISTS</span>
          <h2>Most projects buy back. We build holders.</h2>
          <p>More holders. More conviction. The index compounds itself.</p>
        </motion.section>

        <motion.section className="ai-section" {...fadeUp}>
          <div className="ai-performance-card">
            <StrategyChart />
            <div className="ai-performance-zero">65 / 35</div>
            <div className="ai-price-meta">
              <span>65% buys ANSEM</span>
              <strong>35% expands holders</strong>
            </div>
          </div>
        </motion.section>

        <motion.section className="ai-section" id="faq" {...fadeUp}>
          <div className="ai-section-head">
            <span className="ai-kicker">FAQ</span>
            <h2>AI Index 6900 Questions</h2>
          </div>
          <div className="ai-faq">
            {[
              ["Why 65%?", "65% of creator fees is dedicated to continuously buying $ANSEM and distributing it to eligible holders."],
              ["Why 35%?", "35% is reserved for holder expansion so the ecosystem can keep reaching new wallets."],
              ["Why 10,000 holders?", "The goal is to make distribution itself part of the index."],
              ["How do distributions work?", "The system runs on timed epochs and displays live proof once connected."],
              ["Who qualifies?", "Eligibility is handled by the index rules and existing wallet logic."]
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
          <span className="strategy-brand-mark">AI</span>
          <span>AI INDEX 6900</span>
        </div>
        <div className="ai-footer-links">
          <a href={DEXSCREENER_URL} target="_blank" rel="noreferrer">DEXSCREENER</a>
          <a href={BUY_URL} target="_blank" rel="noreferrer">BUY $AI</a>
        </div>
      </footer>
    </div>
  );
}

export function RewardsDashboardApp() {
  return <AnsemIndexApp />;
}
