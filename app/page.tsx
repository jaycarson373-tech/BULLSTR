import type { CSSProperties } from "react";
import { CopyContract } from "./copy-contract";

const DEFAULT_CA = "92DwRWtorPC1UxugproBwmdvGJss99LWB4QeRX7Qpump";
const PROJECT_NAME = process.env.NEXT_PUBLIC_PROJECT_NAME?.trim() || "Inuvestors";
const SOURCE_SYMBOL = process.env.NEXT_PUBLIC_SOURCE_SYMBOL?.trim() || "Inuvestor";
const REWARD_INTERVAL = process.env.NEXT_PUBLIC_REWARD_INTERVAL?.trim() || "5 minutes";
const MINIMUM_BALANCE = process.env.NEXT_PUBLIC_MINIMUM_ELIGIBLE_BALANCE?.trim() || "1000000";
const X_URL = process.env.NEXT_PUBLIC_INUVESTOR_X_URL?.trim() || process.env.NEXT_PUBLIC_X_URL?.trim();
const CA = process.env.NEXT_PUBLIC_INUVESTOR_CA?.trim() || process.env.NEXT_PUBLIC_CA?.trim() || DEFAULT_CA;
const BUY_URL =
  process.env.NEXT_PUBLIC_BUY_URL?.trim() ||
  `https://jup.ag/?sell=So11111111111111111111111111111111111111112&buy=${CA}`;

const marketScenes = [["/inuvestors-bg-wallstreet.jpg", "wallstreet", "0s"]];

const steps = [
  {
    title: "SCAN",
    body: "Inuvestors ranks the supported stock assets using the configured performance data."
  },
  {
    title: "BUY",
    body: "Every five minutes, the protocol purchases a basket of current market leaders."
  },
  {
    title: "DROP",
    body: "The purchased stock basket is distributed across eligible 1M+ $Inuvestor holders."
  }
];

export default function Page() {
  return (
    <main className="site-shell">
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

      <nav className="site-nav" aria-label="Primary navigation">
        <a className="brand-lockup" href="#" aria-label={`${PROJECT_NAME} home`}>
          <img src="/inuvestors-logo.png" alt="" />
          <span>{PROJECT_NAME}</span>
        </a>
        <div className="nav-links">
          <a href="#how-it-works">HOW IT WORKS</a>
          <a href="#live-drops">INUVESTMENTS</a>
          {X_URL ? <a href={X_URL}>X</a> : null}
          {BUY_URL ? (
            <a className="nav-buy" href={BUY_URL}>
              BUY
            </a>
          ) : null}
        </div>
      </nav>

      <section className="hero-section" aria-label={`${PROJECT_NAME} overview`}>
        <div className="hero-copy">
          <p className="eyebrow">THE DOG THAT ACTUALLY INVESTS</p>
          <h1>HE INVESTS. YOU HOLD.</h1>
          <p className="hero-body">
            Every five minutes, Inuvestor buys a basket of top-performing tokenized stocks and distributes it
            across eligible holders.
          </p>
          <div className="hero-actions" aria-label={`${PROJECT_NAME} actions`}>
            {BUY_URL ? (
              <a className="primary-action" href={BUY_URL}>
                BUY ${SOURCE_SYMBOL.toUpperCase()}
              </a>
            ) : null}
            <a className="secondary-action" href="#live-drops">
              VIEW INUVESTMENTS
            </a>
            <CopyContract address={CA} />
          </div>
          <p className="mechanic-line">{Number(MINIMUM_BALANCE).toLocaleString()}+ ${SOURCE_SYMBOL} required to qualify.</p>
        </div>

        <div className="hero-art" aria-hidden="true">
          <img src="/inuvestors-logo.png" alt="" />
        </div>
      </section>

      <section className="how-section" id="how-it-works" aria-label="How Inuvestors works">
        <div className="section-heading">
          <p className="eyebrow">MECHANICS</p>
          <h2>HOW IT WORKS</h2>
        </div>
        <div className="step-grid">
          {steps.map((step, index) => (
            <article key={step.title} className="step-card">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="drops-section" id="live-drops" aria-label="Inuvestments">
        <div className="section-heading">
          <p className="eyebrow">REWARD REPORTING</p>
          <h2>INUVESTMENTS</h2>
        </div>
        <div className="launch-banner" role="status">
          <strong>INUVESTMENTS BEGIN AT LAUNCH.</strong>
          <span>EVERY PURCHASE AND AIRDROP WILL BE PUBLISHED HERE.</span>
        </div>
      </section>

      <footer className="site-footer">
        <p>
          Every five minutes, Inuvestor buys a basket of top-performing tokenized stocks and distributes it
          across eligible holders. Digital assets and reward availability involve risk. Nothing on this site is
          financial advice.
        </p>
        <div className="footer-links">
          <a href="#how-it-works">HOW IT WORKS</a>
          <a href="#live-drops">INUVESTMENTS</a>
          {X_URL ? <a href={X_URL}>X</a> : null}
          {BUY_URL ? <a href={BUY_URL}>BUY ${SOURCE_SYMBOL.toUpperCase()}</a> : null}
        </div>
      </footer>
    </main>
  );
}
