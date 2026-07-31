import type { CSSProperties } from "react";
import { MarketCursor } from "./market-cursor";

const PROJECT_NAME = process.env.NEXT_PUBLIC_PROJECT_NAME?.trim() || "Inuvestors";
const SOURCE_SYMBOL = process.env.NEXT_PUBLIC_SOURCE_SYMBOL?.trim() || "Inuvestor";
const REWARD_SYMBOL = process.env.NEXT_PUBLIC_REWARD_SYMBOL?.trim() || "STOCK PICKS";
const REWARD_INTERVAL = process.env.NEXT_PUBLIC_REWARD_INTERVAL?.trim() || "5 minutes";
const MINIMUM_BALANCE = process.env.NEXT_PUBLIC_MINIMUM_ELIGIBLE_BALANCE?.trim() || "1000000";
const X_URL =
  process.env.NEXT_PUBLIC_INUVESTORS_X_URL?.trim() ||
  process.env.NEXT_PUBLIC_INUVESTOR_X_URL?.trim() ||
  process.env.NEXT_PUBLIC_X_URL?.trim();
const CA =
  process.env.NEXT_PUBLIC_INUVESTORS_CA?.trim() ||
  process.env.NEXT_PUBLIC_INUVESTOR_CA?.trim() ||
  process.env.NEXT_PUBLIC_CA?.trim();
const BUY_URL = process.env.NEXT_PUBLIC_BUY_URL?.trim();

const marketIcons = [
  ["6%", "16%", "1.4rem", "19s", "$"],
  ["12%", "76%", "1.8rem", "23s", "📈"],
  ["19%", "38%", "1.35rem", "17s", "🐕"],
  ["28%", "85%", "1.7rem", "22s", "💼"],
  ["37%", "12%", "2.05rem", "20s", "🏦"],
  ["45%", "68%", "1.3rem", "18s", "$"],
  ["54%", "35%", "1.8rem", "24s", "📈"],
  ["63%", "11%", "1.35rem", "21s", "🐕"],
  ["72%", "78%", "2rem", "26s", "💼"],
  ["80%", "22%", "1.25rem", "18s", "$"],
  ["87%", "61%", "1.85rem", "25s", "📈"],
  ["95%", "32%", "1.4rem", "20s", "🏦"]
];

const terminalLines = [
  ["open", "Inuvestors terminal is live. The dog has a Bloomberg tab, a vest, and a chain wallet."],
  ["scan", "Performance boards, sector momentum, and social heat are watched before every round."],
  ["rank", "The desk highlights the strongest stock-style picks of the current window."],
  ["qualify", `Wallets holding ${Number(MINIMUM_BALANCE).toLocaleString()}+ $${SOURCE_SYMBOL} enter the reward pool.`],
  ["epoch", `Reward windows cycle every ${REWARD_INTERVAL}. Receipts stay on-chain when live.`],
  ["risk", "Meme intelligence, not financial advice. Markets can bite."]
];

const desks = [
  {
    title: "Performance Scanner",
    body: "Inuvestors watches the tape for the strongest movers and turns market momentum into reward themes."
  },
  {
    title: "Holder Gate",
    body: `Hold at least ${Number(MINIMUM_BALANCE).toLocaleString()} $${SOURCE_SYMBOL} to sit at the desk. No seat, no treats.`
  },
  {
    title: "Five-Minute Rounds",
    body: `Every ${REWARD_INTERVAL}, eligible holders are lined up for the next ${REWARD_SYMBOL.toLowerCase()} distribution cycle.`
  },
  {
    title: "Receipts Matter",
    body: "When the worker is live, actions and airdrops are written into the reporting trail instead of hidden in vibes."
  }
];

const picks = [
  ["Momentum", "AI leaders", "green tape"],
  ["Strength", "mega-cap tech", "institutional bid"],
  ["Rotation", "consumer winners", "trend reclaim"],
  ["Wildcard", "meme beta", "dog sees flow"]
];

function shortAddress(address: string) {
  if (address.length < 12) return address;
  return `${address.slice(0, 5)}...${address.slice(-5)}`;
}

export default function Page() {
  return (
    <main className="inu-page">
      <MarketCursor />
      <div className="market-field" aria-hidden="true">
        {marketIcons.map(([left, top, size, duration, icon], index) => (
          <span
            key={`${left}-${top}-${icon}`}
            style={
              {
                "--x": left,
                "--y": top,
                "--size": size,
                "--dur": duration,
                "--delay": `${index * -1.7}s`
              } as CSSProperties
            }
          >
            {icon}
          </span>
        ))}
      </div>

      <section className="inu-hero" aria-label={`${PROJECT_NAME} overview`}>
        <div className="hero-copy">
          <p className="eyebrow">meme market intelligence desk</p>
          <h1>{PROJECT_NAME}</h1>
          <p className="ticker">Ticker: ${SOURCE_SYMBOL}</p>
          <p className="inu-copy">
            The vest-wearing market dog scans the best-performing stock themes and routes reward rounds to
            holders with 1M+ tokens every five minutes. Professional terminal energy, meme desk instincts.
          </p>

          <div className="inu-actions" aria-label={`${PROJECT_NAME} links`}>
            <a className="primary-action" href="#terminal">
              Open Market Desk
            </a>
            <a className={X_URL ? "secondary-action" : "secondary-action disabled"} href={X_URL || "#"} aria-disabled={!X_URL}>
              Follow Inuvestors
            </a>
            {BUY_URL ? (
              <a className="secondary-action" href={BUY_URL}>
                Buy ${SOURCE_SYMBOL}
              </a>
            ) : null}
          </div>

          <div className="status-strip">
            <span>Reward cadence: {REWARD_INTERVAL}</span>
            <span>Minimum: {Number(MINIMUM_BALANCE).toLocaleString()} ${SOURCE_SYMBOL}</span>
            <span>CA: {CA ? shortAddress(CA) : "soon"}</span>
          </div>
        </div>

        <div className="inu-orb" aria-hidden="true">
          <div className="inu-badge">
            <span className="dog-head">🐕</span>
            <strong>{SOURCE_SYMBOL}</strong>
            <em>MARKET DOG</em>
          </div>
        </div>
      </section>

      <section className="terminal-shell" id="terminal" aria-label={`${PROJECT_NAME} terminal`}>
        <div className="terminal-topbar">
          <span />
          <strong>inuvestors.market-desk</strong>
          <em>five-minute rewards</em>
        </div>
        <div className="terminal-lines">
          {terminalLines.map(([label, text]) => (
            <p key={label}>
              <span>[{label}]</span>
              {text}
            </p>
          ))}
        </div>
      </section>

      <section className="pick-board" aria-label={`${PROJECT_NAME} stock pick board`}>
        <div>
          <p className="eyebrow">stock dog watchlist</p>
          <h2>Best-performing themes. Meme-speed rounds.</h2>
        </div>
        <div className="pick-grid">
          {picks.map(([label, theme, signal]) => (
            <article key={label} className="pick-card">
              <small>{label}</small>
              <strong>{theme}</strong>
              <span>{signal}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="protocol-grid" aria-label={`${PROJECT_NAME} action logic`}>
        {desks.map((desk) => (
          <article key={desk.title} className="protocol-card">
            <h2>{desk.title}</h2>
            <p>{desk.body}</p>
          </article>
        ))}
      </section>

      <section className="lore-panel" aria-label={`${PROJECT_NAME} thesis`}>
        <div>
          <p className="eyebrow">desk memo</p>
          <h2>Wall Street, but in a vest.</h2>
        </div>
        <ol>
          <li>The dog checks the tape.</li>
          <li>The strongest stock themes rise to the board.</li>
          <li>1M+ holders stay eligible.</li>
          <li>Every five minutes, the desk prepares the next reward round.</li>
        </ol>
      </section>
    </main>
  );
}
