import { ArrowRight } from "lucide-react";
import { CopyCaButton } from "./copy-ca-button";
import {
  BullBoard,
  HeroCountdown,
  HolderLookup,
  LiveProtocolDashboard,
  PermanentEligibility,
  RecentAirdrops,
  RewardExplanation
} from "./home-strategy-data";

const PROJECT_NAME = "Bull Strategy";
const DEFAULT_CA = "";
const BUY_URL = process.env.NEXT_PUBLIC_BUY_URL ?? "https://pump.fun";
const X_URL = process.env.NEXT_PUBLIC_X_URL ?? "https://x.com/BullStrategySol";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CA ?? process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT ?? DEFAULT_CA;

function Navbar() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <a className="brand" href="/">
          <img className="brand-logo" src="/brand/bull-strategy-logo.png" alt={`${PROJECT_NAME} logo`} />
          <span>
            Bull Strategy
            <small>ANSEM + BULLSTR Rewards</small>
          </span>
        </a>
        <nav className="nav-links" aria-label="Main navigation">
          <a href="#dashboard">Live Data</a>
          <a href="#strategy">Strategy</a>
          <a href="#how">Rewards</a>
          <a href="#bull-board">Board</a>
          <a href="#airdrops">Airdrops</a>
          <a href="/blackbull-list">BlackBull List</a>
        </nav>
        <div className="nav-actions">
          {CONTRACT_ADDRESS ? (
            <CopyCaButton address={CONTRACT_ADDRESS} label={shortAddress(CONTRACT_ADDRESS)} />
          ) : null}
          <a className="mini-button x-button" href={X_URL} target="_blank" rel="noreferrer" aria-label="Bull Strategy on X">
            X
          </a>
          <a className="cta secondary" href="/dashboard">
            View Airdrops
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
          <div className="hero-art hero-mountains" aria-hidden="true" />
          <div className="hero-shade" aria-hidden="true" />

          <div className="container hero-inner">
            <div className="hero-copy-stack">
              <div className="section-kicker">Dual reward flywheel</div>
              <h1>
                <span>Bull</span>
                <span>Strategy</span>
              </h1>
              <p className="hero-subtitle">
                $ANSEM and $BULLSTR rewards for $BULLSTR holders.
              </p>
              <p className="hero-lead">
                Bull Strategy routes the system into a 45/45/10 engine: 45% buys and airdrops $ANSEM, 45% buys and airdrops $BULLSTR to eligible holders, and 10% routes to the bagworker fund every 5 minutes.
              </p>
              <div className="hero-actions">
                <a className="cta" href="#strategy">
                  View Strategy <ArrowRight size={18} />
                </a>
                <a className="cta secondary" href="#airdrops">
                  View Rewards
                </a>
              </div>
            </div>
            <HeroCountdown />
          </div>
        </section>

        <LiveProtocolDashboard />
        <StrategySection />
        <WhyAnsemSection />
        <RewardExplanation />
        <PermanentEligibility />
        <BullBoard />
        <RecentAirdrops />
        <HolderLookup />

        <section className="section faq-section" id="faq">
          <div className="container">
            <div className="section-kicker">FAQ</div>
            <h2>Strategy notes.</h2>
            <div className="faq-grid">
              <FaqItem title="How do I qualify?" body="Hold at least 250,000 $BULLSTR and stay above that threshold." />
              <FaqItem title="How often are rewards sent?" body="$ANSEM and $BULLSTR rewards run every 5 minutes when live conditions are met." />
              <FaqItem title="What is the split?" body="The target model routes 45% to $ANSEM holder airdrops, 45% to $BULLSTR holder airdrops, and 10% to the bagworker fund." />
              <FaqItem title="Does supply still matter?" body="Yes. The $BULLSTR balance is the base weight, so larger holders can still earn more." />
              <FaqItem title="Is there claiming?" body="No. The backend handles airdrops automatically. No wallet connection is required to receive rewards." />
            </div>
          </div>
        </section>

      </main>

      <footer className="footer">
        <div className="container footer-art-wrap">
          <img className="footer-strategy-art" src="/brand/bull-strategy-footer.png" alt="Bull Strategy 45/45/10 rewards" />
        </div>
        <div className="container footer-grid">
          <div className="footer-brand">
            <img className="brand-logo" src="/brand/bull-strategy-logo.png" alt={`${PROJECT_NAME} logo`} />
            <strong>Bull Strategy</strong>
          </div>
          <p>$ANSEM and $BULLSTR rewards for $BULLSTR holders.</p>
          <div className="footer-links">
            <a href="#dashboard">Live Data</a>
            <a href="#strategy">Strategy</a>
            <a href="#bull-board">Board</a>
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

function StrategySection() {
  return (
    <section className="section strategy-thesis-section" id="strategy">
      <div className="black-bull-glow" aria-hidden="true" />
      <div className="container black-bull-grid">
        <aside className="black-bull-card">
          <div className="black-bull-portrait">
            <img src="/brand/bull-strategy-logo.png" alt="Bull Strategy mark" />
          </div>
          <div className="black-bull-card-head">
            <span>Strategy stack</span>
            <strong>Bull Strategy</strong>
          </div>
          <div className="bull-signal-list">
            <span>Airdrop tech</span>
            <span>$ANSEM rewards</span>
            <span>BULLSTR rewards</span>
            <span>5-minute epochs</span>
          </div>
        </aside>

        <div className="black-bull-copy">
          <div className="section-kicker">The strategy</div>
          <h2>THE TWO REWARDS HE IS BULLISH ON.</h2>
          <div className="lore-copy">
            <p>Bull Strategy turns holder rewards and token conviction into one loop for eligible $BULLSTR wallets.</p>
            <p>45% of the engine targets $ANSEM airdrops every 5 minutes. Another 45% buys and airdrops $BULLSTR.</p>
            <p>Both reward legs use the same holder scan and weighting model.</p>
            <p>No claiming. No wallet connection. Just a public strategy dashboard backed by live reward data.</p>
          </div>
        </div>
      </div>
      <div className="container black-bull-timeline" aria-label="Bull Strategy reward model">
        {["Creator fees", "45% $ANSEM", "45% $BULLSTR", "10% bagworker fund", "Airdrop ledger"].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}

function WhyAnsemSection() {
  return (
    <section className="section why-ansem-section" id="why-ansem">
      <div className="container why-ansem-grid">
        <div className="why-ansem-copy">
          <div className="section-kicker">Why $ANSEM?</div>
          <h2>ATTENTION IS THE STRATEGY.</h2>
          <div className="lore-copy">
            <p>$ANSEM is the attention side of Bull Strategy: a token built around The Black Bull, aka Ansem, and the Solana culture he has been bullposting for years.</p>
            <p>Ansem crossed 1M+ followers on X, helped make WIF one of the defining Solana memes as it ran toward $5, and rode the SOL conviction arc from the sub-$1 era to a near-$300 all-time high.</p>
            <p>The multi-billion bull case is simple: if attention, liquidity, and Solana meme culture keep concentrating around Ansem, $ANSEM can become the tokenized scoreboard for that crowd.</p>
            <p>Bull Strategy turns that thesis into a holder flywheel: $BULLSTR holders earn $ANSEM and $BULLSTR every epoch, so the rewards stay pointed at the two tokens the strategy is built around.</p>
          </div>
        </div>

        <div className="ansem-proof-grid" aria-label="Ansem market thesis">
          <article className="ansem-proof-card">
            <span>Reach</span>
            <strong>1M+ X followers</strong>
            <p>The Black Bull already has the audience size most meme tokens try to manufacture.</p>
          </article>
          <article className="ansem-proof-card">
            <span>WIF lore</span>
            <strong>Near $5 cycle high</strong>
            <p>WIF became the Solana culture trade, and Ansem was one of its loudest bullposters.</p>
          </article>
          <article className="ansem-proof-card">
            <span>SOL conviction</span>
            <strong>Sub-$1 to near $300</strong>
            <p>The same account is tied to the SOL conviction arc that frames the Bull Strategy thesis.</p>
          </article>
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
