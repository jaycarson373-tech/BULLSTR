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
  updatedAt: string;
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
    sourceSymbol: "HoodX",
    rewardSymbol: "HoodX",
    updatedAt: new Date().toISOString()
  },
  nextDropTime: new Date().toISOString(),
  roundHistory: [],
  recentRewards: []
};

const REFRESH_MS = 12_000;
const HOOD_CA = "D5exVALkCSzqFNtRMARdRF4VuQffyM8LrbTFrpqBpump";
const SOURCE_SYMBOL = process.env.NEXT_PUBLIC_SOURCE_SYMBOL ?? "HoodX";
const REWARD_SYMBOL = process.env.NEXT_PUBLIC_REWARD_SYMBOL ?? "HoodX";
const HOOD_CHART_URL = process.env.NEXT_PUBLIC_HOOD_CHART_URL?.trim() || process.env.NEXT_PUBLIC_DEXSCREENER_URL?.trim() || `https://dexscreener.com/solana/${HOOD_CA}`;
const HOOD_CHART_EMBED_URL = process.env.NEXT_PUBLIC_HOOD_CHART_EMBED_URL?.trim() || "";

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

function statusLabel(status: string) {
  if (status === "completed" || status === "settled") return "Settled";
  if (status === "running") return "Running";
  return status.replace(/_/g, " ");
}

export function useProtocolData() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [now, setNow] = useState(() => Date.now());

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
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return { stats, now };
}

export function HeroCountdown() {
  const { stats, now } = useProtocolData();
  const nextDropTime = stats?.nextDropTime ? Date.parse(stats.nextDropTime) : 0;
  const countdown = nextDropTime ? formatCountdown(nextDropTime - now) : "--:--";
  const totalDistributed = stats ? formatRewardTotals(stats.totalRewardTotals, "Awaiting first drop") : "Awaiting first drop";
  const hoodxAirdropped = stats ? rewardTotalAmount(stats.totalRewardTotals, REWARD_SYMBOL) : 0;

  return (
    <div className="hero-countdown" aria-live="polite">
      <span>Next Strategy Drop</span>
      <strong>{countdown}</strong>
      <div className="hero-total-distributed">
        <span>{`Total $${REWARD_SYMBOL} Airdropped`}</span>
        <b>{totalDistributed}</b>
      </div>
      <div className="hero-mini-dashboard">
        <div>
          <span>{REWARD_SYMBOL} Airdropped</span>
          <b>{hoodxAirdropped > 0 ? `${formatNumber(hoodxAirdropped, 2)} ${REWARD_SYMBOL}` : "0"}</b>
        </div>
        <div>
          <span>{SOURCE_SYMBOL} Eligible</span>
          <b>0</b>
        </div>
        <div>
          <span>Total Epochs</span>
          <b>{stats ? formatCount(stats.totalEpochs) : "0"}</b>
        </div>
        <div>
          <span>Eligible Holders</span>
          <b>0</b>
        </div>
      </div>
    </div>
  );
}

export function LiveProtocolDashboard() {
  const { stats, now } = useProtocolData();
  const rounds = stats?.roundHistory ?? [];
  const nextDropTime = stats?.nextDropTime ? Date.parse(stats.nextDropTime) : 0;
  const countdown = nextDropTime ? formatCountdown(nextDropTime - now) : "--:--";
  const latestRound = rounds[0];
  const totalRewardAirdropped = stats ? rewardTotalAmount(stats.totalRewardTotals, REWARD_SYMBOL) : 0;
  const totalRewardBought = rounds.reduce((sum, round) => sum + (Number.isFinite(round.rewardBought) ? round.rewardBought : 0), 0);

  return (
    <section className="section live-section airdrop-section" id="dashboard">
      <div className="container">
        <div className="section-kicker">Machine readout</div>
        <div className="section-head split-head">
          <h2>The Hood Strategy dashboard lives here.</h2>
          <p>Live values come from the existing reward backend. If the backend has not settled data yet, this stays quiet instead of inventing numbers.</p>
        </div>
        <div className="lux-grid dashboard-grid airdrop-grid">
          <MetricCard label={`Total $${REWARD_SYMBOL} Bought`} value={totalRewardBought > 0 ? formatAmount(totalRewardBought, REWARD_SYMBOL, 4) : "Awaiting live distribution"} strong />
          <MetricCard label="Total Airdropped" value={totalRewardAirdropped > 0 ? formatAmount(totalRewardAirdropped, REWARD_SYMBOL, 2) : stats ? formatRewardTotals(stats.totalRewardTotals) : "Loading"} />
          <MetricCard label="Last Epoch" value={latestRound ? `#${latestRound.epoch} ${statusLabel(latestRound.status)}` : "Awaiting epoch"} />
          <MetricCard label="Next Epoch Timer" value={countdown} />
          <MetricCard label="Eligible Holders" value="0" />
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
        <div className="section-kicker">HOOD chart</div>
        <div className="section-head split-head">
          <h2>Live HOOD chart.</h2>
          <p>Set NEXT_PUBLIC_HOOD_CHART_EMBED_URL to embed the exact DexScreener pair. Until then, this section links directly to the live chart surface.</p>
        </div>
        <div className="hood-chart-card">
          {HOOD_CHART_EMBED_URL ? (
            <iframe
              title="HOOD live chart"
              src={HOOD_CHART_EMBED_URL}
              loading="lazy"
              allow="clipboard-write"
            />
          ) : (
            <div className="hood-chart-fallback">
              <span>HOOD</span>
              <strong>Chart ready</strong>
              <p>Add the DexScreener embed URL in env to show the live candle view here.</p>
            </div>
          )}
          <a className="cta" href={HOOD_CHART_URL} target="_blank" rel="noreferrer">
            Open HOOD chart
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
    ...(sameReward ? [] : [[rewardSymbol, formatAmount(holdings?.rewardTokenBalance ?? 0, rewardSymbol)]]),
    ["Cashcat", "1,000,000 Cashcat"],
    ["DIH", "1,000,000 DIH"]
  ];

  return (
    <section className="section robinhood-holdings-section" id="holdings">
      <div className="container">
        <div className="section-kicker">Robinhood holdings</div>
        <div className="section-head split-head">
          <h2>Total holdings from the Robinhood wallet.</h2>
          <p>Balances come from the configured Robinhood/bagholder wallet and refresh through the same live stats route.</p>
        </div>
        <div className="robinhood-holdings-card">
          <div>
            <span>Wallet</span>
            <strong>{holdings?.wallet ? compactAddress(holdings.wallet) : "Awaiting wallet"}</strong>
          </div>
          {rows.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
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
      <strong>{value}</strong>
    </article>
  );
}

export function PermanentEligibility() {
  return (
    <section className="section eligibility-section" id="eligibility">
      <div className="container warning-layout">
        <div>
          <div className="section-kicker">Eligibility</div>
          <h2>{`Hold $${SOURCE_SYMBOL} and let the machine work.`}</h2>
        </div>
        <div className="eligibility-flow">
          {["Hold", "Creator fees", `$${REWARD_SYMBOL} buys`, "Airdrop epoch", "On-chain receipt"].map((item, index) => (
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
          <h2>Three steps. Hold the strategy, let the rails work.</h2>
          <p>Hold HoodX, let fees buy rewards, receive the Hood Strategy drop when epochs settle.</p>
        </div>
        <div className="reward-flow">
          {[
            `Hold $${SOURCE_SYMBOL}`,
            `Fees buy $${REWARD_SYMBOL}`,
            "Holders get paid"
          ].map((item) => (
            <article className="reward-flow-card" key={item}>
              <strong>{item}</strong>
            </article>
          ))}
        </div>
        <div className="share-example">
          {[
            ["Input", "Creator fees", "the machine eats"],
            ["Output", `$${REWARD_SYMBOL}`, "reward token appears"],
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
        <div className="section-kicker">Holder board</div>
        <div className="section-head split-head">
          <h2>Hood Strategy wallets.</h2>
          <p>The board is reset for the Hood Strategy launch and starts clean until the next live reward epoch settles.</p>
        </div>
        <div className="history-card bull-board-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>${SOURCE_SYMBOL} Held</th>
                  <th>Share</th>
                  <th>Total {REWARD_SYMBOL} Earned</th>
                  <th>Last Airdrop</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Awaiting wallets</td>
                  <td>0</td>
                  <td>0%</td>
                  <td>0 {REWARD_SYMBOL}</td>
                  <td>Awaiting airdrop</td>
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
        <div className="section-kicker">Recent drops</div>
        <div className="section-head split-head">
          <h2>Receipts or it did not happen.</h2>
          <p>Settled reward transfers from the live backend. Failed or skipped attempts are not counted.</p>
        </div>
        <div className="history-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>Reward Type</th>
                  <th>Reward Received</th>
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
                    <td colSpan={5}>Awaiting settled reward airdrops.</td>
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
          <h2>Check your Hood Strategy status.</h2>
          <p className="lead">
            Wallet-level status uses the live holder-state tracker after the first tracked epoch.
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
                <span>Awaiting live backend integration for wallet-level Hood Strategy status.</span>
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
        <div className="section-kicker">Airdrop history</div>
        <div className="section-head split-head">
          <h2>{REWARD_SYMBOL} Distributions</h2>
          <p>Settled airdrops only. Failed or skipped worker attempts are not counted.</p>
        </div>
        <div className="history-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Epoch</th>
                  <th>{REWARD_SYMBOL} Bought</th>
                  <th>Recipients</th>
                  <th>Weight</th>
                  <th>Total Distributed</th>
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
                    <td colSpan={6}>Awaiting settled reward airdrops.</td>
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
