const features = ["Hold BCB", "Every 5 minutes", "$ANSEM airdrops"];

export default function Page() {
  return (
    <main className="site-shell">
      <nav className="topbar" aria-label="BCB navigation">
        <a className="brand" href="#top" aria-label="The Black Cash Bull home">
          <img src="/brand/bcb-logo.png" alt="" />
          <span>BCB</span>
        </a>
        <a className="nav-pill" href="#utility">Utility</a>
      </nav>

      <section className="hero" id="top">
        <div className="copy">
          <p className="eyebrow">The Black Cash Bull</p>
          <h1>BCB</h1>
          <p className="subhead">
            A simple meme coin for holders who like their bags black, cash-heavy,
            and rewarded on repeat.
          </p>

          <div className="feature-row" aria-label="BCB utility highlights">
            {features.map((feature) => (
              <span key={feature}>{feature}</span>
            ))}
          </div>

          <div className="cta-row">
            <a className="button primary" href="#utility">See utility</a>
            <a className="button secondary" href="#airdrop">Airdrop cadence</a>
          </div>
        </div>

        <div className="logo-card" aria-label="The Black Cash Bull logo">
          <img src="/brand/bcb-logo.png" alt="The Black Cash Bull logo" />
        </div>
      </section>

      <section className="utility" id="utility">
        <p className="eyebrow">Utility</p>
        <h2>Every 5 minutes, BCB holders get $ANSEM.</h2>
        <p>
          That is the whole pitch. Hold The Black Cash Bull, stay in the holder
          set, and the airdrop loop runs every 5 minutes.
        </p>
      </section>

      <section className="airdrop-grid" id="airdrop" aria-label="Airdrop details">
        <article>
          <span>01</span>
          <h3>Buy BCB</h3>
          <p>Enter the holder set.</p>
        </article>
        <article>
          <span>02</span>
          <h3>Hold BCB</h3>
          <p>Keep your wallet eligible.</p>
        </article>
        <article>
          <span>03</span>
          <h3>Get $ANSEM</h3>
          <p>Airdrops run every 5 minutes.</p>
        </article>
      </section>

      <footer>
        <strong>The Black Cash Bull</strong>
        <span>Ticker: BCB</span>
      </footer>
    </main>
  );
}
