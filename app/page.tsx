import type { CSSProperties } from "react";
import { CatCursor } from "./cat-cursor";

const X_URL = process.env.NEXT_PUBLIC_CC_X_URL?.trim() || process.env.NEXT_PUBLIC_X_URL?.trim();
const CA = process.env.NEXT_PUBLIC_CC_CA?.trim() || process.env.NEXT_PUBLIC_CA?.trim();
const BUY_URL = process.env.NEXT_PUBLIC_BUY_URL?.trim();

const floatingCats = [
  ["5%", "14%", "1.3rem", "18s", "🐾"],
  ["10%", "74%", "1.9rem", "22s", "✨"],
  ["18%", "33%", "1.2rem", "16s", "🧶"],
  ["27%", "86%", "1.5rem", "21s", "🐱"],
  ["36%", "12%", "2.1rem", "19s", "🪄"],
  ["44%", "68%", "1.2rem", "17s", "🐾"],
  ["53%", "38%", "1.8rem", "24s", "✨"],
  ["62%", "10%", "1.4rem", "20s", "🧶"],
  ["70%", "78%", "2rem", "23s", "🐈"],
  ["78%", "20%", "1.2rem", "16s", "🐾"],
  ["86%", "60%", "1.9rem", "25s", "✨"],
  ["94%", "31%", "1.3rem", "18s", "🐱"]
];

const terminalLines = [
  ["genesis", "CryptoCat appeared on-chain and claimed the terminal."],
  ["scan", "Reading holder behavior, meme velocity, liquidity, and community signals."],
  ["treasury", "Funds are watched, budgeted, and routed by public action notes."],
  ["missions", "Bounties, quests, and loyal-holder drops can be posted when the cat decides."],
  ["social", "Automated X personality is preparing to wake up."]
];

const actions = [
  {
    title: "Treasury Sense",
    body: "CryptoCat monitors treasury state before it makes a move."
  },
  {
    title: "Bounty Mode",
    body: "The terminal can ask the timeline to complete missions for CC rewards."
  },
  {
    title: "Holder Drops",
    body: "Loyal wallets can be rewarded when the cat sees conviction."
  },
  {
    title: "Cat Posts",
    body: "The persona learns the room and posts updates in its own voice."
  }
];

const lore = [
  "A strange cat touched the chain.",
  "The wallet blinked.",
  "The terminal purred.",
  "CryptoCat began learning what holders do when no one is watching."
];

function shortAddress(address: string) {
  if (address.length < 12) return address;
  return `${address.slice(0, 5)}...${address.slice(-5)}`;
}

export default function Page() {
  return (
    <main className="cat-page">
      <CatCursor />
      <div className="cat-field" aria-hidden="true">
        {floatingCats.map(([left, top, size, duration, icon], index) => (
          <span
            key={`${left}-${top}-${icon}`}
            style={
              {
                "--x": left,
                "--y": top,
                "--size": size,
                "--dur": duration,
                "--delay": `${index * -1.6}s`
              } as CSSProperties
            }
          >
            {icon}
          </span>
        ))}
      </div>

      <section className="cat-hero" aria-label="CryptoCat overview">
        <div className="hero-copy">
          <p className="eyebrow">AI treasury pet online</p>
          <h1>CryptoCat</h1>
          <p className="ticker">Ticker: $CC</p>
          <p className="cat-copy">
            CryptoCat showed up on the blockchain with a wallet, a terminal, and a problem:
            it needs to learn what to do with power. It scans, posts, drops missions, and
            can reward loyal holders when the treasury brain decides.
          </p>

          <div className="cat-actions" aria-label="CryptoCat links">
            <a className="primary-action" href="#terminal">
              Open Terminal
            </a>
            <a className={X_URL ? "secondary-action" : "secondary-action disabled"} href={X_URL || "#"} aria-disabled={!X_URL}>
              Follow CryptoCat
            </a>
            {BUY_URL ? (
              <a className="secondary-action" href={BUY_URL}>
                Buy $CC
              </a>
            ) : null}
          </div>

          <div className="status-strip">
            <span>Chain life: waking</span>
            <span>Mode: learning</span>
            <span>CA: {CA ? shortAddress(CA) : "soon"}</span>
          </div>
        </div>

        <div className="cat-orb" aria-hidden="true">
          <div className="cat-face">
            <span className="ear left" />
            <span className="ear right" />
            <span className="eye left" />
            <span className="eye right" />
            <span className="nose" />
            <span className="mouth" />
            <span className="whisker left one" />
            <span className="whisker left two" />
            <span className="whisker right one" />
            <span className="whisker right two" />
            <strong>CC</strong>
          </div>
        </div>
      </section>

      <section className="terminal-shell" id="terminal" aria-label="CryptoCat terminal">
        <div className="terminal-topbar">
          <span />
          <strong>cryptocat.terminal</strong>
          <em>live persona</em>
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

      <section className="protocol-grid" aria-label="CryptoCat action logic">
        {actions.map((action) => (
          <article key={action.title} className="protocol-card">
            <h2>{action.title}</h2>
            <p>{action.body}</p>
          </article>
        ))}
      </section>

      <section className="lore-panel" aria-label="CryptoCat lore">
        <div>
          <p className="eyebrow">origin file</p>
          <h2>The cat was given life.</h2>
        </div>
        <ol>
          {lore.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}
