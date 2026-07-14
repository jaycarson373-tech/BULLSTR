"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type BoardRow = {
  wallet: string;
  playerName?: string | null;
  bestScore: number;
  bestDistance: number;
  runs: number;
  rank: number;
  prizeBps?: number;
  prizePct?: number;
};

type StatsResponse = {
  totalRewardAirdropped: number;
  totalRewardTotals?: Array<{ rewardAsset: string; rewardAmount: number }>;
  recentRewards?: Array<{ wallet: string; rewardAmount: number; normalRewardAmount?: number; rewardAsset?: string; time: string; txSig: string | null }>;
};

type GameState = ReturnType<typeof createGame>;

type Hud = {
  playing: boolean;
  finished: boolean;
  score: number;
  distance: number;
  speed: number;
};

const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function HyperHoodRunnerGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef(createGame());
  const rafRef = useRef<number | null>(null);
  const hudSyncRef = useRef(0);
  const [hud, setHud] = useState<Hud>({ playing: false, finished: false, score: 0, distance: 0, speed: 1 });
  const [playerName, setPlayerName] = useState("");
  const [primaryWallet, setPrimaryWallet] = useState("");
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [status, setStatus] = useState("Run first, then submit one wallet for holder-board weight.");
  const [submitting, setSubmitting] = useState(false);

  const syncHud = useCallback((force = false) => {
    const game = gameRef.current;
    const now = performance.now();
    if (!force && game.playing && now - hudSyncRef.current < 90) return;
    hudSyncRef.current = now;
    setHud({
      playing: game.playing,
      finished: game.finished,
      score: Math.floor(game.score),
      distance: Math.floor(game.distance),
      speed: game.speed
    });
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawGame(ctx, canvas, gameRef.current);
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const endRun = useCallback(() => {
    if (!gameRef.current.playing) return;
    gameRef.current.playing = false;
    gameRef.current.finished = true;
    stop();
    syncHud(true);
    draw();
  }, [draw, stop, syncHud]);

  const startRun = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (gameRef.current.playing) {
      jump(gameRef.current);
      return;
    }
    stop();
    gameRef.current = createGame();
    resizeCanvas(canvas, gameRef.current);
    gameRef.current.playing = true;
    gameRef.current.runner.y = canvas.clientHeight * 0.42;
    gameRef.current.runner.vy = -300;
    setStatus("Flywheel live. Press space, tap, or click to move.");
    let last = performance.now();
    const loop = (time: number) => {
      const dt = Math.min(0.033, (time - last) / 1000);
      last = time;
      updateGame(gameRef.current, canvas, dt, endRun);
      drawGame(canvas.getContext("2d")!, canvas, gameRef.current);
      syncHud();
      if (gameRef.current.playing) rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    syncHud(true);
  }, [endRun, stop, syncHud]);

  useEffect(() => {
    loadLeaderboard().then(setBoard).catch(() => undefined);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onResize = () => {
      resizeCanvas(canvas, gameRef.current);
      draw();
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === " " || event.key === "ArrowUp") {
        event.preventDefault();
        if (gameRef.current.playing) {
          jump(gameRef.current);
        } else {
          startRun();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startRun]);

  async function submitRun() {
    if (!hud.finished) {
      setStatus("Finish a run before submitting.");
      return;
    }

    const name = playerName.trim().slice(0, 24);
    if (!name) {
      setStatus("Add a runner name.");
      return;
    }

    const wallet = parseWallet(primaryWallet);
    if (!wallet) {
      setStatus("Paste one valid Solana wallet.");
      return;
    }

    setSubmitting(true);
    setStatus("Submitting score to HyperHood...");
    try {
      const response = await fetch("/api/sherwood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, playerName: name, score: hud.score, distance: hud.distance })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "HyperHood submit failed.");
      setBoard(data.leaderboard ?? []);
      setPlayerName("");
      setPrimaryWallet("");
      setStatus("Saved for the active 24-hour board. If this wallet holds 1M+ HHOOD and lands in an eligible top-15 slot, it can receive the next HyperHood distribution.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "HyperHood submit failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={`hyperhood-game-shell${hud.finished ? " has-submit" : " is-game-only"}`} id="play">
      <div className="hyperhood-game-card">
        <div className="hyperhood-hud">
          <GameStat label="Score" value={hud.score.toLocaleString()} />
          <GameStat label="Flight" value={`${hud.distance}m`} />
          <GameStat label="Speed" value={`${hud.speed.toFixed(1)}x`} />
        </div>
        <div className="hyperhood-canvas-wrap">
          <canvas
            ref={canvasRef}
            aria-label="HyperHood holder run"
            onPointerDown={() => (gameRef.current.playing ? jump(gameRef.current) : startRun())}
          />
          {!hud.playing ? (
            <div className="hyperhood-overlay" role="button" tabIndex={0} onPointerDown={startRun} onKeyDown={(event) => {
              if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                startRun();
              }
            }}>
              <div>
                <h3>{hud.finished ? "Run complete" : "HyperHood Run"}</h3>
                <p>
                  {hud.finished
                    ? `You collected ${hud.score} fee pulses across ${hud.distance}m. Submit one wallet to save it.`
                    : "Press space, tap, or click to move. Collect the fee pulse in each HyperHood gate."}
                </p>
                <button type="button" className="cta">{hud.finished ? "Run again" : "Start run"}</button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {hud.finished ? (
        <aside className="hyperhood-submit-card">
          <h3>Save score</h3>
          <p>{hud.score.toLocaleString()} fee pulses / {hud.distance.toLocaleString()}m. Add your name and wallet for the 24-hour holder board.</p>
          <label htmlFor="hyperhood-runner-name">Runner name</label>
          <input
            id="hyperhood-runner-name"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="HyperHood holder"
            maxLength={24}
            spellCheck={false}
          />
          <label htmlFor="hyperhood-primary-wallet">Wallet</label>
          <input
            id="hyperhood-primary-wallet"
            value={primaryWallet}
            onChange={(event) => setPrimaryWallet(event.target.value)}
            placeholder="Paste Solana wallet"
            spellCheck={false}
          />
          <button type="button" className="cta" disabled={submitting} onClick={submitRun}>Submit score</button>
          <p className="wallet-status">{status}</p>
          <div className="mini-leaderboard">
            <strong>Top holders</strong>
            {board.length ? (
              board.slice(0, 3).map((row) => (
                <span key={row.wallet}>#{row.rank} {row.playerName || compactAddress(row.wallet)} - {row.bestScore.toLocaleString()}</span>
              ))
            ) : (
              <span>No runs submitted yet.</span>
            )}
          </div>
        </aside>
      ) : null}
    </section>
  );
}

export function HowItWorksPrompt() {
  const [open, setOpen] = useState(false);

  return (
    <div className="how-it-works-widget">
      <button type="button" className="how-it-works-trigger" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span>?</span>
        <strong>How It Works</strong>
      </button>
      {open ? (
        <div className="how-it-works-modal" role="dialog" aria-modal="true" aria-label="How HyperHood works">
          <button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Close how it works">
            ×
          </button>
          <div className="section-kicker">How It Works</div>
          <h3>Route revenue, rank, earn.</h3>
          <ol>
            <li>
              <strong>Play</strong>
              <span>Press space, tap, or click through the HyperHood fee lane.</span>
            </li>
            <li>
              <strong>Clear</strong>
              <span>Each gate has one fee pulse in the center. Collect the pulse for score; hit a wall, ceiling, or floor and the run ends.</span>
            </li>
            <li>
              <strong>Submit</strong>
              <span>After the run, enter a name and wallet to save your holder-board score.</span>
            </li>
            <li>
              <strong>Earn</strong>
              <span>Every 15 minutes, HHOOD routes to the first 15 board wallets that also hold 1M+ HHOOD. Prize slots start at 15% for first and 10% for second, and holding without selling adds +10% weight per day.</span>
            </li>
          </ol>
        </div>
      ) : null}
    </div>
  );
}

export function HyperHoodLeaderboard() {
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    loadLeaderboard().then(setBoard).catch(() => undefined);
    fetch("/api/stats", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setStats(data))
      .catch(() => undefined);
  }, []);

  const totalAirdropped =
    stats?.totalRewardTotals?.reduce((sum, row) => sum + Number(row.rewardAmount ?? 0), 0) ??
    Number(stats?.totalRewardAirdropped ?? 0);
  const recentHits = stats?.recentRewards?.length ?? 0;
  const latestReward = stats?.recentRewards?.[0];

  return (
    <section className="section leaderboard-page-section">
      <div className="container">
        <div className="section-kicker">Holder board</div>
        <div className="section-head split-head">
          <h2>Top HyperHood holders.</h2>
          <p>The board resets every 24 hours. Every 15 minutes, the first 15 board wallets that also hold 1M+ HHOOD split the HyperHood distribution; ineligible wallets are skipped for the next eligible player.</p>
        </div>
        <div className="leaderboard-summary">
          <article>
            <span>Total Routed</span>
            <strong>{totalAirdropped > 0 ? totalAirdropped.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "Awaiting"}</strong>
          </article>
          <article>
            <span>Receipt Hits</span>
            <strong>{recentHits > 0 ? recentHits.toLocaleString() : "Awaiting"}</strong>
          </article>
          <article>
            <span>Top Prize Slot</span>
            <strong>15%</strong>
          </article>
          <article>
            <span>Hold Bonus</span>
            <strong>{latestReward?.normalRewardAmount && latestReward.normalRewardAmount > 0 ? `${(latestReward.rewardAmount / latestReward.normalRewardAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}x` : "Awaiting"}</strong>
          </article>
        </div>
        <div className="history-card hyperhood-board-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Wallet</th>
                  <th>Best score</th>
                  <th>Best run</th>
                  <th>24h runs</th>
                  <th>Base prize slot</th>
                </tr>
              </thead>
              <tbody>
                {board.length ? (
                  board.map((row) => (
                    <tr key={row.wallet}>
                      <td>#{row.rank}</td>
                      <td>{row.playerName || "Holder"}</td>
                      <td>{compactAddress(row.wallet)}</td>
                      <td>{row.bestScore.toLocaleString()}</td>
                      <td>{row.bestDistance.toLocaleString()}m</td>
                      <td>{row.runs.toLocaleString()}</td>
                      <td>{row.prizePct ? `${row.prizePct}%` : "Next eligible"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="placeholder-cell" colSpan={7}>No HyperHood holder runs submitted yet.</td>
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

function GameStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

async function loadLeaderboard() {
  const response = await fetch("/api/sherwood", { cache: "no-store" });
  if (!response.ok) return [];
  const data = await response.json();
  return (data.leaderboard ?? []) as BoardRow[];
}

function parseWallet(wallet: string) {
  const trimmed = wallet.trim();
  return SOLANA_ADDRESS_RE.test(trimmed) ? trimmed : "";
}

function compactAddress(address: string) {
  return address.length <= 12 ? address : `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function createGame() {
  return {
    playing: false,
    finished: false,
    score: 0,
    distance: 0,
    speed: 1,
    ground: 300,
    runner: { x: 88, y: 0, vy: 0, w: 44, h: 52 },
    obstacles: [] as Array<{ x: number; gapY: number; gapH: number; w: number; coinTaken: boolean }>,
    trees: Array.from({ length: 16 }, (_, index) => ({ x: index * 92, h: 60 + Math.random() * 100, layer: index % 3 }))
  };
}

function resizeCanvas(canvas: HTMLCanvasElement, game: GameState) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(320, Math.floor(rect.width * ratio));
  canvas.height = Math.max(240, Math.floor(rect.height * ratio));
  canvas.getContext("2d")?.setTransform(ratio, 0, 0, ratio, 0, 0);
  game.ground = rect.height - 30;
  game.runner.y = game.runner.y || rect.height * 0.42;
}

function jump(game: GameState) {
  if (!game.playing) return;
  game.runner.vy = -420;
}

function updateGame(game: GameState, canvas: HTMLCanvasElement, dt: number, endRun: () => void) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  game.speed = Math.min(2.75, 1 + game.score * 0.055 + game.distance / 1800);
  const px = 175 * game.speed;
  game.distance += dt * px * 0.1;

  const gapH = Math.max(98, 158 - game.score * 1.9);
  const spacing = Math.max(170, 230 - game.score * 2.2);
  const lastGate = game.obstacles[game.obstacles.length - 1];
  if (!lastGate || lastGate.x < w - spacing) {
    const topSafe = 30;
    const bottomSafe = game.ground - 34 - gapH;
    const wobble = Math.sin((game.distance + game.score * 37) * 0.035) * 34;
    const randomOffset = (Math.random() - 0.5) * 52;
    const target = h * 0.42 + wobble + randomOffset;
    const gapY = Math.max(topSafe, Math.min(bottomSafe, target));
    game.obstacles.push({ x: w + 34, gapY, gapH, w: 62, coinTaken: false });
  }

  game.runner.vy += 1180 * dt;
  game.runner.y += game.runner.vy * dt;

  moveItems(game.obstacles, px, dt);
  game.trees.forEach((tree) => {
    tree.x -= px * dt * (0.16 + tree.layer * 0.12);
    if (tree.x < -90) {
      tree.x = w + 40 + Math.random() * 110;
      tree.h = 60 + Math.random() * 100;
    }
  });

  const runnerBox = { x: game.runner.x, y: game.runner.y, w: game.runner.w, h: game.runner.h };
  if (runnerBox.y < 0 || runnerBox.y + runnerBox.h > game.ground) endRun();
  game.obstacles.forEach((obstacle) => {
    const topTrunk = { x: obstacle.x, y: 0, w: obstacle.w, h: obstacle.gapY };
    const bottomTrunk = { x: obstacle.x, y: obstacle.gapY + obstacle.gapH, w: obstacle.w, h: game.ground - (obstacle.gapY + obstacle.gapH) };
    const coinBox = { x: obstacle.x + obstacle.w / 2 - 9, y: obstacle.gapY + obstacle.gapH / 2 - 9, w: 18, h: 18 };
    if (rectsHit(runnerBox, topTrunk, 7) || rectsHit(runnerBox, bottomTrunk, 7)) endRun();
    if (!obstacle.coinTaken && rectsHit(runnerBox, coinBox, 2)) {
      obstacle.coinTaken = true;
      game.score += 1;
    }
  });
}

function moveItems<T extends { x: number }>(items: T[], px: number, dt: number) {
  items.forEach((item) => (item.x -= px * dt));
  while (items[0] && items[0].x < -140) items.shift();
}

function rectsHit(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }, pad = 0) {
  return a.x + pad < b.x + b.w && a.x + a.w - pad > b.x && a.y + pad < b.y + b.h && a.y + a.h - pad > b.y;
}

function drawGame(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, game: GameState) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#04110a";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#092016";
  ctx.fillRect(0, Math.floor(h * 0.46), w, Math.ceil(h * 0.54));
  ctx.fillStyle = "#c6ff00";
  pixelRect(ctx, w - 92, 36, 10, 10);
  pixelRect(ctx, w - 82, 28, 28, 28);
  pixelRect(ctx, w - 54, 38, 10, 10);
  [...game.trees].sort((a, b) => a.layer - b.layer).forEach((tree) => drawTree(ctx, game, tree));
  ctx.fillStyle = "#061008";
  ctx.fillRect(0, game.ground, w, h - game.ground);
  ctx.fillStyle = "rgba(198,255,0,.42)";
  for (let x = -40; x < w + 40; x += 30) pixelRect(ctx, x, game.ground + ((x + Math.floor(game.distance * 9)) % 14), 18, 3);
  game.obstacles.forEach((obstacle) => {
    drawObstacle(ctx, obstacle);
    if (!obstacle.coinTaken) drawCoin(ctx, obstacle.x + obstacle.w / 2, obstacle.gapY + obstacle.gapH / 2);
  });
  drawRunner(ctx, game);
}

function drawTree(ctx: CanvasRenderingContext2D, game: GameState, tree: GameState["trees"][number]) {
  const base = game.ground + 4;
  const scale = 0.74 + tree.layer * 0.2;
  ctx.fillStyle = tree.layer === 0 ? "rgba(70, 42, 19, .48)" : "rgba(91, 55, 26, .72)";
  pixelRect(ctx, tree.x + 22 * scale, base - tree.h, 16 * scale, tree.h);
  ctx.fillStyle = tree.layer === 0 ? "rgba(32, 68, 28, .42)" : "rgba(26, 86, 31, .78)";
  const crownX = tree.x + 28 * scale;
  const crownY = base - tree.h - 12 * scale;
  pixelRect(ctx, crownX - 38 * scale, crownY + 14 * scale, 78 * scale, 22 * scale);
  pixelRect(ctx, crownX - 28 * scale, crownY - 4 * scale, 58 * scale, 24 * scale);
  pixelRect(ctx, crownX - 16 * scale, crownY - 26 * scale, 34 * scale, 24 * scale);
  pixelRect(ctx, crownX - 48 * scale, crownY + 30 * scale, 24 * scale, 18 * scale);
  pixelRect(ctx, crownX + 24 * scale, crownY + 28 * scale, 28 * scale, 18 * scale);
  ctx.fillStyle = tree.layer === 0 ? "rgba(198,255,0,.08)" : "rgba(198,255,0,.2)";
  pixelRect(ctx, crownX - 8 * scale, crownY - 18 * scale, 14 * scale, 8 * scale);
  pixelRect(ctx, crownX + 16 * scale, crownY + 4 * scale, 12 * scale, 8 * scale);
  ctx.fillStyle = "rgba(2,4,0,.56)";
  pixelRect(ctx, tree.x + 27 * scale, base - tree.h + 18 * scale, 6 * scale, tree.h - 22 * scale);
}

function drawObstacle(ctx: CanvasRenderingContext2D, obstacle: { x: number; gapY: number; gapH: number; w: number }) {
  const trunkX = obstacle.x + 14;
  const trunkW = obstacle.w - 28;
  const topH = obstacle.gapY;
  const bottomY = obstacle.gapY + obstacle.gapH;
  const h = ctx.canvas.clientHeight;

  ctx.fillStyle = "#4c2d16";
  pixelRect(ctx, trunkX, 0, trunkW, topH);
  pixelRect(ctx, trunkX, bottomY, trunkW, h - bottomY);
  ctx.fillStyle = "#7d4a22";
  pixelRect(ctx, trunkX + 5, 0, 5, topH);
  pixelRect(ctx, trunkX + trunkW - 10, bottomY, 5, h - bottomY);
  ctx.fillStyle = "#1e4c25";
  pixelRect(ctx, obstacle.x, topH - 18, obstacle.w, 18);
  pixelRect(ctx, obstacle.x, bottomY, obstacle.w, 18);
  ctx.fillStyle = "#c6ff00";
  pixelRect(ctx, obstacle.x + 6, topH - 12, 12, 5);
  pixelRect(ctx, obstacle.x + obstacle.w - 18, bottomY + 7, 12, 5);
}

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#ffcf2e";
  pixelRect(ctx, x - 7, y - 10, 14, 20);
  pixelRect(ctx, x - 10, y - 7, 20, 14);
  ctx.fillStyle = "#fff07a";
  pixelRect(ctx, x - 3, y - 7, 6, 5);
  pixelRect(ctx, x - 7, y - 2, 4, 4);
  ctx.fillStyle = "#7a4a00";
  pixelRect(ctx, x - 2, y - 5, 4, 12);
  pixelRect(ctx, x - 5, y - 1, 10, 3);
}

function drawRunner(ctx: CanvasRenderingContext2D, game: GameState) {
  const runner = game.runner;
  ctx.save();
  ctx.translate(Math.floor(runner.x), Math.floor(runner.y + Math.sin(game.distance * 1.3) * 1.5));

  ctx.fillStyle = "#020400";
  pixelRect(ctx, -16, 24, 28, 12);
  pixelRect(ctx, -10, 36, 20, 12);
  pixelRect(ctx, -4, 48, 12, 10);

  ctx.fillStyle = "#071108";
  pixelRect(ctx, 14, 44, 9, 16);
  pixelRect(ctx, 30, 44, 9, 16);
  ctx.fillStyle = "#c6ff00";
  pixelRect(ctx, 13, 58, 12, 4);
  pixelRect(ctx, 29, 58, 12, 4);

  ctx.fillStyle = "#1e4c25";
  pixelRect(ctx, 12, 20, 28, 26);
  pixelRect(ctx, 8, 28, 8, 14);
  pixelRect(ctx, 38, 29, 8, 14);
  ctx.fillStyle = "#c6ff00";
  pixelRect(ctx, 14, 34, 24, 5);
  pixelRect(ctx, 20, 23, 4, 6);

  ctx.fillStyle = "#1e4c25";
  pixelRect(ctx, 18, 2, 16, 7);
  pixelRect(ctx, 15, 8, 22, 8);
  pixelRect(ctx, 12, 15, 30, 13);
  ctx.fillStyle = "#020400";
  pixelRect(ctx, 20, 15, 15, 10);
  ctx.fillStyle = "#c6ff00";
  pixelRect(ctx, 22, 17, 3, 2);
  pixelRect(ctx, 31, 17, 3, 2);

  ctx.fillStyle = "#7c4a22";
  pixelRect(ctx, 4, 8, 5, 24);
  ctx.fillStyle = "#c6ff00";
  pixelRect(ctx, 1, 6, 13, 2);
  pixelRect(ctx, 2, 2, 2, 8);
  pixelRect(ctx, 7, 2, 2, 8);
  pixelRect(ctx, 12, 2, 2, 8);

  ctx.fillStyle = "#7c4a22";
  pixelRect(ctx, 48, 12, 4, 32);
  pixelRect(ctx, 43, 10, 9, 4);
  pixelRect(ctx, 43, 42, 9, 4);
  ctx.fillStyle = "#c6ff00";
  pixelRect(ctx, 52, 16, 2, 26);
  pixelRect(ctx, 39, 27, 15, 3);

  ctx.restore();
}

function pixelRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
