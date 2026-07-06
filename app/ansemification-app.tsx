"use client";

import { motion, type Transition } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { AnimatedBackground } from "./animated-background";

const SOURCE_MINT = process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT?.trim() ?? "7aCs6WabHiXYGmqaLN68T2oM4QeStTqSN3EoFXG3pump";

const dashboardMetrics = [
  { label: "INDEX VALUE", value: "0.00" },
  { label: "INDEX CHANGE", value: "0%" },
  { label: "INDEX SIGNAL", value: "0" },
  { label: "FEE RAILS", value: "50/50" }
];

const signalCards = [
  ["Market Attention", "Measures mentions across X."],
  ["Conviction", "Tracks repeat posting and engagement quality."],
  ["Momentum", "Monitors volume and velocity."],
  ["Mindshare", "Ranks discussion dominance."],
  ["Allocation", "Routes rewards through the index."]
];

const holdings = ["ANSEM", "PENDING 02", "PENDING 03", "PENDING 04", "PENDING 05"];
const tabs = ["1D", "7D", "30D", "ALL"];
const terminalLines = ["Watching attention...", "Collecting narratives...", "Ranking conviction...", "Waiting for $AI6900 rebalance..."];
const feeRails = [
  ["50%", "Ansem Index", "Routes into the index allocation engine."],
  ["50%", "ANSEM Distribution", "Buys ANSEM and airdrops to $AI6900 holders."]
];

const smoothTransition: Transition = { duration: 0.7, ease: [0.22, 1, 0.36, 1] };

const fadeUp = {
  initial: { opacity: 0, y: 22, filter: "blur(10px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "-80px" },
  transition: smoothTransition
};

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
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
        <span>INDEX: WAITING</span>
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
  const [countdown, setCountdown] = useState(300);
  const [activeTab, setActiveTab] = useState("1D");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((value) => (value <= 1 ? 300 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const heroMetrics = useMemo(
    () => [...dashboardMetrics, { label: "NEXT REBALANCE", value: formatCountdown(countdown) }, { label: "LIVE SIGNAL", value: "WAITING..." }],
    [countdown]
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
          <a href="#index">Index</a>
          <a href="#rebalances">Rebalances</a>
          <a href="#performance">Performance</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="ai-nav-meta">
          <span>$AI6900</span>
          <span>{SOURCE_MINT}</span>
        </div>
      </header>

      <main>
        <section className="ai-hero" id="top">
          <motion.div className="ai-hero-copy" {...fadeUp}>
            <span className="ai-kicker">ANSEM ATTENTION INDEX</span>
            <h1>ANSEM INDEX 6900</h1>
            <p>
              Attention index tracking the strongest narratives across Crypto Twitter and routing creator fees through a 50/50
              rail: half to ANSEM for $AI6900 holders, half to $AI6900 for top ANSEM holders.
            </p>
            <div className="ai-actions">
              <a href="#index">View Index</a>
              <a href="#rebalances">View Rebalances</a>
            </div>
          </motion.div>

          <motion.aside className="ai-hero-panel" initial={{ opacity: 0, x: 28, filter: "blur(12px)" }} animate={{ opacity: 1, x: 0, filter: "blur(0px)" }} transition={{ ...smoothTransition, duration: 0.8, delay: 0.15 }}>
            {heroMetrics.map((metric) => (
              <div className="ai-hero-metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </motion.aside>
        </section>

        <motion.section className="ai-section ai-culture-section" {...fadeUp}>
          <div className="ai-section-head split">
            <div>
              <span className="ai-kicker">$AI6900 CULTURE TAPE</span>
              <h2>Attention becomes allocation.</h2>
            </div>
            <span className="ai-status">VISUAL SYSTEM ONLINE</span>
          </div>
          <div className="ai-culture-grid">
            <article className="ai-culture-panel is-cathedral">
              <span>ANSEM INDEX</span>
              <strong>6900</strong>
            </article>
            <article className="ai-culture-panel is-terminal">
              <span>GREEN TAPE</span>
              <strong>+6900%</strong>
            </article>
            <article className="ai-culture-panel is-coin">
              <span>SIGNAL COIN</span>
              <strong>AI6900</strong>
            </article>
            <article className="ai-culture-panel is-grid">
              <span>NARRATIVE MATRIX</span>
              <strong>LIVE</strong>
            </article>
          </div>
        </motion.section>

        <motion.section className="ai-section" id="how" {...fadeUp}>
          <div className="ai-section-head">
            <span className="ai-kicker">INDEX STACK</span>
            <h2>How The Index Works</h2>
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
            <h2>Two rails. One index.</h2>
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

        <motion.section className="ai-section" id="index" {...fadeUp}>
          <div className="ai-section-head split">
            <div>
              <span className="ai-kicker">LIVE INDEX</span>
              <h2>ETF Style Allocation</h2>
            </div>
            <span className="ai-status">NO LIVE HOLDINGS YET</span>
          </div>
          <div className="ai-holdings">
            {holdings.map((asset) => (
              <article className="ai-holding-card" key={asset}>
                <div>
                  <span>{asset}</span>
                  <strong>Weight</strong>
                </div>
                <b>0%</b>
                <div>
                  <span>Confidence</span>
                  <strong>0</strong>
                </div>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.section className="ai-section" id="rebalances" {...fadeUp}>
          <div className="ai-section-head split">
            <div>
              <span className="ai-kicker">LIVE REBALANCES</span>
              <h2>Allocation Timeline</h2>
            </div>
          </div>
          <div className="ai-table">
            <div className="ai-table-head">
              <span>Time</span>
              <span>Action</span>
              <span>Reason</span>
              <span>Score</span>
            </div>
            <div className="ai-empty">Waiting for first rebalance...</div>
          </div>
        </motion.section>

        <motion.section className="ai-thesis" {...fadeUp}>
          <span className="ai-kicker">WHY THE INDEX EXISTS</span>
          <h2>Markets follow attention. Attention follows conviction. The index tracks both.</h2>
          <p>$AI6900 turns attention into an allocation system.</p>
        </motion.section>

        <motion.section className="ai-section" id="performance" {...fadeUp}>
          <div className="ai-section-head split">
            <div>
              <span className="ai-kicker">PERFORMANCE</span>
              <h2>Index Chart</h2>
            </div>
            <div className="ai-tabs">
              {tabs.map((tab) => (
                <button className={activeTab === tab ? "is-active" : ""} key={tab} type="button" onClick={() => setActiveTab(tab)}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="ai-performance-card">
            <IndexChart />
            <div className="ai-performance-zero">0.00</div>
          </div>
        </motion.section>

        <motion.section className="ai-section" {...fadeUp}>
          <TerminalActivity />
        </motion.section>

        <motion.section className="ai-section" id="faq" {...fadeUp}>
          <div className="ai-section-head">
            <span className="ai-kicker">FAQ</span>
            <h2>Index Questions</h2>
          </div>
          <div className="ai-faq">
            {[
              ["What is the Index?", "An attention index designed to track and allocate toward the strongest crypto narratives."],
              ["How does the index work?", "It follows attention, conviction, momentum, and mindshare before producing allocation signals."],
              ["How often does it rebalance?", "The interface is prepared for five-minute rebalance cycles."],
              ["How are allocations decided?", "Allocations remain at zero until live index data is connected."],
              ["What is the ticker?", "The ticker is $AI6900."]
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
        <span className="ai-brand-mark"><img src="/brand/ai6900-logo.png" alt="" /></span>
        <span>ANSEM INDEX 6900</span>
      </footer>
    </div>
  );
}
