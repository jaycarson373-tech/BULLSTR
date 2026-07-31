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

const marketScenes = [
  ["/inuvestors-bg-dog-close.jpg", "dog-close", "0s"],
  ["/inuvestors-bg-wallstreet.jpg", "wallstreet", "-8s"],
  ["/inuvestors-bg-dog-wide.jpg", "dog-wide", "-16s"]
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

const investments = [
  ["Settled airdrops", "0", "Live receipts appear after launch"],
  ["Reward cadence", REWARD_INTERVAL, "Every cycle scans the market board"],
  ["Holder gate", `${Number(MINIMUM_BALANCE).toLocaleString()}+`, `$${SOURCE_SYMBOL} minimum balance`],
  ["Latest reward", "Pending", "No confirmed airdrop yet"]
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
        {marketScenes.map(([src, variant, delay]) => (
          <span
            key={src}
            className={`market-scene ${variant}`}
            style={
              {
                "--bg": `url(${src})`,
                "--delay": delay
              } as CSSProperties
            }
          />
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

        <div className="logo-stage" aria-hidden="true">
          <div className="wall-logo-card">
            <img src="/inuvestors-logo.png" alt="" />
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

      <section className="inuvestments-panel" aria-label="Inuvestments reward reporting">
        <div className="inuvestments-copy">
          <p className="eyebrow">inuvestments</p>
          <h2>Reward rounds, receipts, and market-dog allocations.</h2>
          <p>
            This desk tracks the five-minute airdrop flow: who qualified, what was distributed,
            and when the next reward cycle is expected to settle.
          </p>
        </div>
        <div className="inuvestments-grid">
          {investments.map(([label, value, note]) => (
            <article key={label} className="inuvestment-tile">
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{note}</small>
            </article>
          ))}
        </div>
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
