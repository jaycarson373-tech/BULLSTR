"use client";

import { FormEvent, useEffect, useState } from "react";

type RewardTotal = {
  rewardAsset: string;
  rewardAmount: number;
  normalRewardAmount: number;
  recipients: number;
  latestTime: string | null;
  latestTxSig: string | null;
};

type Round = {
  epoch: number;
  status: string;
  startedAt: string;
  duration: string;
  rewardBought: number;
  distributedPump: number;
  rewardTotals: RewardTotal[];
  txSig: string | null;
};

type Reward = {
  epoch: number;
  rewardAsset?: string;
  wallet: string;
  rewardAmount: number;
  time: string;
  status: string;
  txSig: string | null;
};

type StatsResponse = {
  currentEpoch: number;
  totalEpochs: number;
  lastRewardAirdropped: number;
  totalRewardAirdropped: number;
  lastRewardTotals: RewardTotal[];
  totalRewardTotals: RewardTotal[];
  latestEligibleHolders: number;
  eligibleBullstrHeld: number;
  bagholderSolBalance: number | null;
  robinhoodHoldings?: RobinhoodHoldings;
  nextDropTime: string;
  roundHistory: Round[];
  recentRewards: Reward[];
};

type RobinhoodHoldings = {
  wallet: string | null;
  solBalance: number | null;
  sourceTokenBalance: number | null;
  rewardTokenBalance: number | null;
  sourceSymbol: string;
  rewardSymbol: string;
  updatedAt: string | null;
};

const emptyStats: StatsResponse = {
  currentEpoch: 0,
  totalEpochs: 0,
  lastRewardAirdropped: 0,
  totalRewardAirdropped: 0,
  lastRewardTotals: [],
  totalRewardTotals: [],
  latestEligibleHolders: 0,
  eligibleBullstrHeld: 0,
  bagholderSolBalance: null,
  robinhoodHoldings: {
    wallet: null,
    solBalance: null,
    sourceTokenBalance: null,
    rewardTokenBalance: null,
    sourceSymbol: "HPUMP",
    rewardSymbol: "HPUMP",
    updatedAt: null
  },
  nextDropTime: new Date().toISOString(),
  roundHistory: [],
  recentRewards: []
};

const REFRESH_MS = 12_000;
const DEFAULT_CA = "3kB163vCjwSFxUPj2zTyTaRPqmCRoQ4wLwa7kc7fpump";
const SOURCE_SYMBOL = process.env.NEXT_PUBLIC_SOURCE_SYMBOL ?? "HPUMP";
const REWARD_SYMBOL = process.env.NEXT_PUBLIC_REWARD_SYMBOL ?? "HPUMP";
const CA = process.env.NEXT_PUBLIC_CA?.trim() || process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT?.trim() || DEFAULT_CA;
const HOOD_CHART_URL = process.env.NEXT_PUBLIC_HOOD_CHART_URL?.trim() || process.env.NEXT_PUBLIC_DEXSCREENER_URL?.trim() || (CA ? `https://dexscreener.com/solana/${CA}` : "https://dexscreener.com/solana");
const HOOD_CHART_EMBED_URL = process.env.NEXT_PUBLIC_HOOD_CHART_EMBED_URL?.trim() || "";
const RUNNER_PICK_INTERVAL_MS = 2 * 60 * 60 * 1000;

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

function compactAddress(address: string) {
  if (!address) return "Awaiting";
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function formatNumber(value: number, maximumFractionDigits = 2) {
  if (!Number.isFinite(value) || value <= 0) return "Awaiting";
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

function formatLiveNumber(value: number, maximumFractionDigits = 2) {
  if (!Number.isFinite(value) || value < 0) return "Awaiting";
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

function formatCount(value: number) {
  if (!Number.isFinite(value) || value < 0) return "Awaiting";
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatSol(value: number | null | undefined) {
  if (!Number.isFinite(value ?? NaN) || (value ?? 0) <= 0) return "0 SOL";
  return `${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;
}

function formatAmount(value: number, symbol: string, maximumFractionDigits = 2) {
  if (!Number.isFinite(value) || value <= 0) return "Awaiting live distribution";
  return `${formatNumber(value, maximumFractionDigits)} ${symbol}`;
}

function rewardDecimals(asset: string) {
  return asset.toUpperCase() === "SOL" ? 4 : 2;
}

function formatRewardTotals(totals: RewardTotal[] | undefined, empty = "Awaiting live distribution") {
  const liveTotals = (totals ?? []).filter((total) => total.rewardAmount > 0);
  if (!liveTotals.length) return empty;
  return liveTotals
    .map((total) => `${formatNumber(total.rewardAmount, rewardDecimals(total.rewardAsset))} ${total.rewardAsset}`)
    .join(" / ");
}

function rewardTotalAmount(totals: RewardTotal[] | undefined, asset: string) {
  return totals?.find((total) => total.rewardAsset.toUpperCase() === asset.toUpperCase())?.rewardAmount ?? 0;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Awaiting" : date.toLocaleString();
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function formatLongCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function statusLabel(status: string) {
  if (status === "completed" || status === "settled") return "Settled";
  if (status === "running") return "Running";
  return status.replace(/_/g, " ");
}

function LiveBadge() {
  return (
    <span className="live-badge" aria-label="Live data">
      <span />
      Live
    </span>
  );
}

function AnimatedStat({ value }: { value: string }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const match = value.match(/^(\d[\d,]*(?:\.\d+)?)(.*)$/);
    if (!match) {
      setDisplay(value);
      return;
    }

    const target = Number(match[1].replace(/,/g, ""));
    const suffix = match[2] ?? "";
    if (!Number.isFinite(target) || target === 0) {
      setDisplay(value);
      return;
    }

    const decimals = match[1].includes(".") ? Math.min(4, match[1].split(".")[1]?.length ?? 0) : 0;
    const start = performance.now();
    const duration = 850;
    let frame = 0;

    const tick = (time: number) => {
      const progress = Math.min(1, (time - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      setDisplay(`${current.toLocaleString(undefined, { maximumFractionDigits: decimals })}${suffix}`);
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return <>{display}</>;
}

export function useProtocolData() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const nextStats = await getJson<StatsResponse>("/api/stats", emptyStats);

      if (!active) return;
      setStats(nextStats);
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

  return { stats, now };
}

export function HeroCountdown() {
  const { stats, now } = useProtocolData();
  const nextDropTime = stats?.nextDropTime ? Date.parse(stats.nextDropTime) : 0;
  const countdown = nextDropTime && now ? formatCountdown(nextDropTime - now) : "--:--";
  const totalDistributed = stats ? formatRewardTotals(stats.totalRewardTotals, "Awaiting first launch") : "Awaiting first launch";
  const hpumpDeployed = stats ? rewardTotalAmount(stats.totalRewardTotals, REWARD_SYMBOL) : 0;

  return (
    <div className="hero-countdown" aria-live="polite">
      <span>Next Weekly Launch</span>
      <strong className="countdown-value">{countdown}</strong>
      <div className="hero-total-distributed">
        <span>{`Total $${REWARD_SYMBOL} Deployed`}</span>
        <b><AnimatedStat value={totalDistributed} /></b>
      </div>
      <div className="hero-mini-dashboard">
        <div>
          <span>{REWARD_SYMBOL} Deployed</span>
          <b><AnimatedStat value={hpumpDeployed > 0 ? `${formatNumber(hpumpDeployed, 2)} ${REWARD_SYMBOL}` : "0"} /></b>
        </div>
        <div>
          <span>{SOURCE_SYMBOL} Presale Eligible</span>
          <b><AnimatedStat value="0" /></b>
        </div>
        <div>
          <span>Total Windows</span>
          <b><AnimatedStat value={stats ? formatCount(stats.totalEpochs) : "0"} /></b>
        </div>
        <div>
          <span>1M+ Holders</span>
          <b><AnimatedStat value="0" /></b>
        </div>
      </div>
    </div>
  );
}

export function LiveProtocolDashboard() {
  const { stats, now } = useProtocolData();
  const rounds = stats?.roundHistory ?? [];
  const nextDropTime = stats?.nextDropTime ? Date.parse(stats.nextDropTime) : 0;
  const countdown = nextDropTime && now ? formatCountdown(nextDropTime - now) : "--:--";
  const latestRound = rounds[0];
  const totalRewardAirdropped = stats ? rewardTotalAmount(stats.totalRewardTotals, REWARD_SYMBOL) : 0;
  const totalRewardBought = rounds.reduce((sum, round) => sum + (Number.isFinite(round.rewardBought) ? round.rewardBought : 0), 0);

  return (
    <section className="section live-section airdrop-section" id="dashboard">
      <div className="container">
        <div className="section-kicker live-kicker"><span>Machine readout</span><LiveBadge /></div>
        <div className="section-head split-head">
          <h2>The Hood Pump launch dashboard lives here.</h2>
          <p>Live values come from the existing backend. If the backend has not settled data yet, this stays quiet instead of inventing numbers.</p>
        </div>
        <div className="lux-grid dashboard-grid airdrop-grid">
          <MetricCard label="Creator Fees Routed" value={totalRewardBought > 0 ? formatAmount(totalRewardBought, REWARD_SYMBOL, 4) : "Awaiting live routing"} strong />
          <MetricCard label="Weekly Launch Pool" value={totalRewardAirdropped > 0 ? formatAmount(totalRewardAirdropped, REWARD_SYMBOL, 2) : stats ? formatRewardTotals(stats.totalRewardTotals, "Awaiting live routing") : "Loading"} />
          <MetricCard label="Last Window" value={latestRound ? `#${latestRound.epoch} ${statusLabel(latestRound.status)}` : "Awaiting window"} />
          <MetricCard label="Next Launch Timer" value={countdown} />
          <MetricCard label="1M+ Holders" value="0" />
          <MetricCard label="Recent TX" value={latestRound?.txSig ? compactAddress(latestRound.txSig) : "Awaiting tx"} muted />
        </div>
      </div>
    </section>
  );
}

export function HoodChart() {
  return (
    <section className="section hood-chart-section" id="chart">
      <div className="container">
        <div className="section-kicker live-kicker"><span>HPUMP chart</span><LiveBadge /></div>
        <div className="section-head split-head">
          <h2>Live HPUMP chart.</h2>
          <p>Set NEXT_PUBLIC_HOOD_CHART_EMBED_URL to embed the exact DexScreener pair. Until then, this section links directly to the live chart surface.</p>
        </div>
        <div className="hood-chart-card">
          {HOOD_CHART_EMBED_URL ? (
            <iframe
              title="HPUMP live chart"
              src={HOOD_CHART_EMBED_URL}
              loading="lazy"
              allow="clipboard-write"
            />
          ) : (
            <div className="hood-chart-fallback">
              <span>HPUMP</span>
              <strong>Chart ready</strong>
              <p>Add the DexScreener embed URL in env to show the live candle view here.</p>
            </div>
          )}
          <a className="cta" href={HOOD_CHART_URL} target="_blank" rel="noreferrer">
            Open HPUMP chart
          </a>
        </div>
      </div>
    </section>
  );
}

export function RobinhoodHoldingsPanel() {
  const { stats } = useProtocolData();
  const holdings = stats?.robinhoodHoldings ?? emptyStats.robinhoodHoldings;
  const sourceSymbol = holdings?.sourceSymbol ?? SOURCE_SYMBOL;
  const rewardSymbol = holdings?.rewardSymbol ?? REWARD_SYMBOL;
  const sameReward = sourceSymbol.toUpperCase() === rewardSymbol.toUpperCase();
  const rows = [
    ["SOL", formatSol(holdings?.solBalance)],
    [sourceSymbol, formatAmount(holdings?.sourceTokenBalance ?? 0, sourceSymbol)],
    ...(sameReward ? [] : [[rewardSymbol, formatAmount(holdings?.rewardTokenBalance ?? 0, rewardSymbol)]])
  ];

  return (
    <section className="section robinhood-holdings-section" id="holdings">
      <div className="container">
        <div className="section-kicker live-kicker"><span>Robin Hood holdings</span><LiveBadge /></div>
        <div className="section-head split-head">
          <h2>Total holdings from the Robin Hood wallet.</h2>
          <p>Balances come from the configured Robin Hood/bagholder wallet and refresh through the same live stats route.</p>
        </div>
        <div className="robinhood-holdings-card">
          <div>
            <span>Wallet</span>
            <strong>{holdings?.wallet ? compactAddress(holdings.wallet) : "Awaiting wallet"}</strong>
          </div>
          {rows.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong><AnimatedStat value={value} /></strong>
            </div>
          ))}
          <div>
            <span>Updated</span>
            <strong>{holdings?.updatedAt ? formatDate(holdings.updatedAt) : "Awaiting"}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

export function RobinhoodRunnerPanel() {
  const { now } = useProtocolData();
  const nextRunnerPickAt = Math.ceil(now / RUNNER_PICK_INTERVAL_MS) * RUNNER_PICK_INTERVAL_MS;
  const runnerCountdown = now ? formatLongCountdown(nextRunnerPickAt - now) : "--:--:--";

  return (
    <section className="section runner-section" id="runners">
      <div className="container">
        <div className="section-kicker live-kicker"><span>Robin Hood launches</span><LiveBadge /></div>
        <div className="section-head split-head">
          <h2>Launch pool, presale clock, receipts.</h2>
          <p>The Robin Hood side shows the tracked weekly launch pool, the next access window, and exactly when 1M+ holders can enter presale.</p>
        </div>
        <div className="runner-layout">
          <div className="runner-countdown-card">
            <span>Next presale window</span>
            <strong className="countdown-value">{runnerCountdown}</strong>
            <p>1M+ HPUMP holders get presale access when the weekly window opens.</p>
          </div>
          <div className="runner-position-grid">
            <article className="runner-position-card">
              <span>Launch pool</span>
              <strong>Awaiting live routing</strong>
              <b><AnimatedStat value="0" /></b>
            </article>
            <article className="runner-position-card">
              <span>Presale access</span>
              <strong>1M+ HPUMP required</strong>
              <b><AnimatedStat value="0" /></b>
            </article>
          </div>
        </div>
        <div className="history-card runner-winner-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>Access</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Awaiting wallet</td>
                  <td>Presale access</td>
                  <td>Awaiting weekly launch window</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  strong,
  muted
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <article className={strong ? "metric-card metric-card-strong" : muted ? "metric-card metric-card-muted" : "metric-card"}>
      <span>{label}</span>
      <strong><AnimatedStat value={value} /></strong>
    </article>
  );
}

export function PermanentEligibility() {
  return (
    <section className="section eligibility-section" id="eligibility">
      <div className="container warning-layout">
        <div>
          <div className="section-kicker">Eligibility</div>
          <h2>{`Hold 1M+ $${SOURCE_SYMBOL} and get presale access.`}</h2>
        </div>
        <div className="eligibility-flow">
          {["Hold 1M+", "Creator fees", "Weekly launch pool", "Presale access", "On-chain receipt"].map((item, index) => (
            <article className="eligibility-card" key={item}>
              <span>{index + 1}</span>
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RewardExplanation() {
  return (
    <section className="section reward-explainer-section" id="how">
      <div className="container">
          <div className="section-kicker">How it works</div>
        <div className="section-head split-head">
          <h2>Three steps. Hold HPUMP, let creator fees launch.</h2>
          <p>Hold 1M+ HPUMP, let creator fees build the weekly Robin Hood launch pool, and get presale access when the window opens.</p>
        </div>
        <div className="reward-flow">
          {[
            `Hold 1M+ $${SOURCE_SYMBOL}`,
            "Creator fees route",
            "Presale access opens"
          ].map((item) => (
            <article className="reward-flow-card" key={item}>
              <strong>{item}</strong>
            </article>
          ))}
        </div>
        <div className="share-example">
          {[
            ["Input", "Creator fees", "weekly launch fuel"],
            ["Access", "1M+ holders", "presale window opens"],
            ["Receipts", "On-chain", "no fake scoreboard"]
          ].map(([holder, multiplier, copy]) => (
            <article className="share-card" key={holder}>
              <span>{holder}</span>
              <strong>{multiplier}</strong>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HoodWalletBoard() {
  return (
    <section className="section bull-board-section" id="wallet-board">
      <div className="container">
        <div className="section-kicker live-kicker"><span>Holder board</span><LiveBadge /></div>
        <div className="section-head split-head">
          <h2>Hood Pump wallets.</h2>
          <p>The board is reset for the Hood Pump launch and starts clean until the next live presale window settles.</p>
        </div>
        <div className="history-card bull-board-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>${SOURCE_SYMBOL} Held</th>
                  <th>Share</th>
                  <th>Total {REWARD_SYMBOL} Routed</th>
                  <th>Last Access</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Awaiting wallets</td>
                  <td>0</td>
                  <td>0%</td>
                  <td>0 {REWARD_SYMBOL}</td>
                  <td>Awaiting presale</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

export function RecentAirdrops() {
  const { stats } = useProtocolData();
  const rewards = stats?.recentRewards ?? [];

  return (
    <section className="section recent-airdrops-section" id="airdrops">
      <div className="container">
        <div className="section-kicker live-kicker"><span>Recent access</span><LiveBadge /></div>
        <div className="section-head split-head">
          <h2>Receipts or it did not happen.</h2>
          <p>Settled launch and access records from the live backend. Failed or skipped attempts are not counted.</p>
        </div>
        <div className="history-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>Access Type</th>
                  <th>What Opened</th>
                  <th>Time</th>
                  <th>TX Link</th>
                </tr>
              </thead>
              <tbody>
                {rewards.length ? (
                  rewards.slice(0, 50).map((reward) => (
                    <tr key={`${reward.wallet}-${reward.time}-${reward.rewardAmount}`}>
                      <td>{compactAddress(reward.wallet)}</td>
                      <td>{reward.rewardAsset ?? "Base"}</td>
                      <td>{formatAmount(reward.rewardAmount, reward.rewardAsset ?? REWARD_SYMBOL)}</td>
                      <td>{formatDate(reward.time)}</td>
                      <td>
                        {reward.txSig ? (
                          <a href={`https://solscan.io/tx/${reward.txSig}`} target="_blank" rel="noreferrer">
                            Solscan
                          </a>
                        ) : (
                          "Awaiting tx"
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>Awaiting settled presale access records.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HolderLookup() {
  const [wallet, setWallet] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(Boolean(wallet.trim()));
  };

  return (
    <section className="section lookup-section" id="lookup">
      <div className="container split-section">
        <div>
          <div className="section-kicker">Holder lookup</div>
          <h2>Check your Hood Pump status.</h2>
          <p className="lead">
            Wallet-level status uses the live holder-state tracker after the first tracked launch window.
          </p>
        </div>
        <form className="lookup-card" onSubmit={handleSubmit}>
          <label htmlFor="wallet">Wallet address</label>
          <div className="lookup-row">
            <input
              id="wallet"
              value={wallet}
              onChange={(event) => setWallet(event.target.value)}
              placeholder="Paste wallet address"
            />
            <button type="submit">Lookup</button>
          </div>
          <div className="lookup-result">
            {submitted ? (
              <>
                <strong>{compactAddress(wallet)}</strong>
                <span>Awaiting live backend integration for wallet-level Hood Pump status.</span>
              </>
            ) : (
              <span>Enter a wallet to check eligibility once lookup integration is live.</span>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

export function AirdropHistory() {
  const { stats } = useProtocolData();
  const rounds = stats?.roundHistory ?? [];

  return (
    <section className="section history-section" id="airdrops-history">
      <div className="container">
        <div className="section-kicker live-kicker"><span>Access history</span><LiveBadge /></div>
        <div className="section-head split-head">
          <h2>{REWARD_SYMBOL} Launch Records</h2>
          <p>Settled launch/access records only. Failed or skipped worker attempts are not counted.</p>
        </div>
        <div className="history-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Window</th>
                  <th>{REWARD_SYMBOL} Routed</th>
                  <th>Recipients</th>
                  <th>Weight</th>
                  <th>Total Routed</th>
                  <th>Transaction</th>
                </tr>
              </thead>
              <tbody>
                {rounds.length ? (
                  rounds.map((round) => (
                    <tr key={`${round.epoch}-${round.startedAt}`}>
                      <td>#{round.epoch}</td>
                      <td>{formatAmount(round.rewardBought, REWARD_SYMBOL)}</td>
                      <td>{round.rewardTotals.some((total) => total.rewardAmount > 0) ? "Settled" : statusLabel(round.status)}</td>
                      <td>Holder share</td>
                      <td>{formatRewardTotals(round.rewardTotals)}</td>
                      <td>
                        {round.txSig ? (
                          <a href={`https://solscan.io/tx/${round.txSig}`} target="_blank" rel="noreferrer">
                            Solscan
                          </a>
                        ) : (
                          "Awaiting tx"
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>Awaiting settled launch records.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
