import { ArrowRight } from "lucide-react";
import { CopyCaButton } from "./copy-ca-button";
import {
  BullBoard,
  HolderLookup,
  LiveProtocolDashboard,
  RecentAirdrops,
  RewardExplanation
} from "./home-strategy-data";

const PROJECT_NAME = "Ansemification";
const SOURCE_SYMBOL = process.env.NEXT_PUBLIC_SOURCE_SYMBOL ?? "ANSEMIFY";
const DEFAULT_CA = "9Q86QfqzQ6HyVEeeTwie8PP3Eb3VPDd2S9gfFq5ypump";
const BUY_URL = process.env.NEXT_PUBLIC_BUY_URL ?? "https://pump.fun";
const X_URL = process.env.NEXT_PUBLIC_X_URL ?? "https://x.com/BullStrategySol";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CA ?? process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT ?? DEFAULT_CA;
const DEXSCREENER_URL =
  process.env.NEXT_PUBLIC_DEXSCREENER_URL ??
  (CONTRACT_ADDRESS ? `https://dexscreener.com/solana/${CONTRACT_ADDRESS}` : "https://dexscreener.com/solana");

function Navbar() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <a className="brand" href="/">
          <span className="brand-mark">A</span>
          <span>
            Ansemification
            <small>Ansemify yourself</small>
          </span>
        </a>
        <nav className="nav-links" aria-label="Main navigation">
          <a href="#what">What</a>
          <a href="#machine">Machine</a>
          <a href="#lore">Lore</a>
          <a href="#how">How</a>
          <a href="#dashboard">Dashboard</a>
          <a href="#airdrops">Airdrops</a>
        </nav>
        <div className="nav-actions">
          {CONTRACT_ADDRESS ? (
            <CopyCaButton address={CONTRACT_ADDRESS} label={shortAddress(CONTRACT_ADDRESS)} />
          ) : null}
          <a className="mini-button x-button" href={X_URL} target="_blank" rel="noreferrer" aria-label="Ansemification on X">
            X
          </a>
          <a className="cta secondary" href="/dashboard">
            Dashboard
          </a>
        </div>
      </div>
    </header>
  );
}

export default function Page() {
  return (
    <div className="page hood-strategy-page">
      <Navbar />

      <main>
        <section className="hero hood-hero" id="top">
          <div className="hero-shade" aria-hidden="true" />

          <div className="container hero-inner">
            <div className="hero-copy-stack">
              <div className="section-kicker">Trenches revival machine</div>
              <h1>
                <span>Get</span>
                <span>Ansemified.</span>
              </h1>
              <p className="hero-subtitle">
                The trenches asked for a sign. We built the machine.
              </p>
              <p className="hero-lead">
                A meme movement for becoming higher-conviction, higher-belief, and just delusional enough to survive another market cycle.
              </p>
              <div className="hero-actions">
                <a className="cta" href="#what">
                  Get Ansemified <ArrowRight size={18} />
                </a>
                <a className="cta secondary" href="#dashboard">
                  View Dashboard
                </a>
              </div>
            </div>
          </div>
        </section>

        <WhatSection />
        <MachineSection />
        <LoreSection />
        <RewardExplanation />
        <LiveProtocolDashboard />
        <BullBoard />
        <RecentAirdrops />
        <HolderLookup />

        <section className="section faq-section" id="faq">
          <div className="container">
            <div className="section-kicker">FAQ for the confused but curious</div>
            <h2>Small print, trench edition.</h2>
            <div className="faq-grid">
              <FaqItem title="What is this?" body="A meme site with a real reward dashboard attached. The bit is funny; the airdrop data is not pretend." />
              <FaqItem title="How do I get Ansemified?" body={`Hold $${SOURCE_SYMBOL}. The machine handles the reward math and shows settled activity on the dashboard.`} />
              <FaqItem title="What gets bought?" body="The headline mechanic is simple: creator fees target $ANSEM buys and holder airdrops." />
              <FaqItem title="Do I need to claim?" body="No claim button, no wallet connection ritual. If the backend sends it, the dashboard shows it." />
            </div>
          </div>
        </section>

      </main>

      <footer className="footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <span className="brand-mark">A</span>
            <strong>Ansemification</strong>
          </div>
          <div className="footer-trade-links" aria-label="Trading links">
            <a href={BUY_URL} target="_blank" rel="noreferrer">
              BUY ${SOURCE_SYMBOL}
            </a>
            <a href={DEXSCREENER_URL} target="_blank" rel="noreferrer">
              DEXSCREENER
            </a>
          </div>
          <div className="footer-links">
            <a href="#what">What</a>
            <a href="#machine">Machine</a>
            <a href="#lore">Lore</a>
            <a href="#dashboard">Dashboard</a>
            <a href="#airdrops">Airdrops</a>
            <a href={X_URL} target="_blank" rel="noreferrer">
              X
            </a>
          </div>
          {CONTRACT_ADDRESS ? (
            <div className="footer-ca">
              <span>CA:</span>
              <span>{CONTRACT_ADDRESS}</span>
            </div>
          ) : null}
        </div>
      </footer>
    </div>
  );
}

function WhatSection() {
  return (
    <section className="section ansem-section" id="what">
      <div className="container ansem-two-column">
        <div>
          <div className="section-kicker">What is Ansemification?</div>
          <h2>Regular trench user in. Market creature out.</h2>
        </div>
        <div className="lore-copy">
          <p>Ansemification is the process of turning regular trench users into higher-conviction, higher-belief, higher-delusion market creatures.</p>
          <p>You show up with a wallet, a thesis, and maybe three hours of sleep. The machine handles the rest.</p>
          <p>No boardroom energy. No suit cosplay. Just a clean little ritual for people who still believe the timeline can be funny.</p>
        </div>
      </div>
    </section>
  );
}

function MachineSection() {
  return (
    <section className="section machine-section" id="machine">
      <div className="container">
        <div className="section-kicker">The Machine</div>
        <div className="section-head split-head">
          <h2>Fees go in. $ANSEM comes out.</h2>
          <p>75% of creator fees swap into $ANSEM and get airdropped back to eligible holders.</p>
        </div>
        <div className="ansem-steps">
          <article>
            <span>01</span>
            <strong>Creator fees</strong>
            <p>The engine watches the pot like a sleep-deprived timeline addict.</p>
          </article>
          <article>
            <span>02</span>
            <strong>$ANSEM buys</strong>
            <p>The machine points the flow at the belief token.</p>
          </article>
          <article>
            <span>03</span>
            <strong>Airdrop loop</strong>
            <p>Eligible holders get Ansemified when epochs settle.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

function LoreSection() {
  return (
    <section className="section lore-section" id="lore">
      <div className="container ansem-two-column">
        <div>
          <div className="section-kicker">Lore</div>
          <h2>Ansem revived belief in the trenches.</h2>
        </div>
        <div className="lore-copy">
          <p>He asked for airdrops. He made people believe again. The group chat stopped doomscrolling for twelve seconds and remembered the game is supposed to be fun.</p>
          <p>Ansemification is taking that energy and putting it onchain: a little cult, a little comedy, a little reward machine for the people who keep showing up.</p>
          <p>Become Ansem? Obviously impossible. Get Ansemified? Now we can work with that.</p>
        </div>
      </div>
    </section>
  );
}

function FaqItem({ title, body }: { title: string; body: string }) {
  return (
    <article className="faq-item">
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function shortAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
