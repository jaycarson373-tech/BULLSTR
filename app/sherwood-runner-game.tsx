"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type BoardRow = {
  wallet: string;
  playerName?: string | null;
  bestScore: number;
  bestDistance: number;
  runs: number;
  rank: number;
  multiplier: number;
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

export function SherwoodRunnerGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef(createGame());
  const rafRef = useRef<number | null>(null);
  const [hud, setHud] = useState<Hud>({ playing: false, finished: false, score: 0, distance: 0, speed: 1 });
  const [playerName, setPlayerName] = useState("");
  const [primaryWallet, setPrimaryWallet] = useState("");
  const [extraWallets, setExtraWallets] = useState("");
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [status, setStatus] = useState("Play first, then submit wallets for leaderboard weight.");
  const [submitting, setSubmitting] = useState(false);

  const syncHud = useCallback(() => {
    const game = gameRef.current;
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
    gameRef.current.playing = false;
    gameRef.current.finished = true;
    stop();
    syncHud();
    draw();
  }, [draw, stop, syncHud]);

  const startRun = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    stop();
    gameRef.current = createGame();
    resizeCanvas(canvas, gameRef.current);
    gameRef.current.playing = true;
    gameRef.current.runner.y = gameRef.current.ground - gameRef.current.runner.h;
    setStatus("Run live. Press space, tap, or click to jump.");
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
    syncHud();
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
        jump(gameRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

    const wallets = parseWallets(primaryWallet, extraWallets);
    if (!wallets.length) {
      setStatus("Paste at least one valid Solana wallet.");
      return;
    }

    setSubmitting(true);
    setStatus(`Submitting ${wallets.length} wallet${wallets.length === 1 ? "" : "s"} to Sherwood...`);
    try {
      const response = await fetch("/api/sherwood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallets, playerName: name, score: hud.score, distance: hud.distance })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Sherwood submit failed.");
      setBoard(data.leaderboard ?? []);
      setPlayerName("");
      setPrimaryWallet("");
      setExtraWallets("");
      setStatus("Saved for the active 6-hour board. If this wallet is a 1M+ holder, its rank can boost the next HoodX drops.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sherwood submit failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={`sherwood-game-shell${hud.finished ? " has-submit" : " is-game-only"}`} id="play">
      <div className="sherwood-game-card">
        <div className="sherwood-hud">
          <GameStat label="Coins" value={hud.score.toLocaleString()} />
          <GameStat label="Run" value={`${hud.distance}m`} />
          <GameStat label="Speed" value={`${hud.speed.toFixed(1)}x`} />
        </div>
        <div className="sherwood-canvas-wrap">
          <canvas
            ref={canvasRef}
            aria-label="Sherwood Run game"
            onPointerDown={() => (hud.playing ? jump(gameRef.current) : startRun())}
          />
          {!hud.playing ? (
            <div className="sherwood-overlay">
              <div>
                <h3>{hud.finished ? "Run complete" : "Sherwood Run"}</h3>
                <p>
                  {hud.finished
                    ? `You scored ${hud.score} coins across ${hud.distance}m. Submit wallets to save it.`
                    : "Press space, tap, or click to jump. Grab Sheriff coins. Do not hit logs or stumps."}
                </p>
                <button type="button" className="cta" onClick={startRun}>{hud.finished ? "Run again" : "Start run"}</button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {hud.finished ? (
        <aside className="sherwood-submit-card">
          <h3>Save score</h3>
          <p>{hud.score.toLocaleString()} coins / {hud.distance.toLocaleString()}m. Add your name and wallet for the multiplier board.</p>
          <label htmlFor="sherwood-runner-name">Runner name</label>
          <input
            id="sherwood-runner-name"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Robin of Sherwood"
            maxLength={24}
            spellCheck={false}
          />
          <label htmlFor="sherwood-primary-wallet">Wallet</label>
          <input
            id="sherwood-primary-wallet"
            value={primaryWallet}
            onChange={(event) => setPrimaryWallet(event.target.value)}
            placeholder="Paste Solana wallet"
            spellCheck={false}
          />
          <label htmlFor="sherwood-extra-wallets">Extra wallets</label>
          <textarea
            id="sherwood-extra-wallets"
            value={extraWallets}
            onChange={(event) => setExtraWallets(event.target.value)}
            placeholder="Optional: one per line"
            rows={3}
            spellCheck={false}
          />
          <button type="button" className="cta" disabled={submitting} onClick={submitRun}>Submit score</button>
          <p className="wallet-status">{status}</p>
          <div className="mini-leaderboard">
            <strong>Top runners</strong>
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
        <div className="how-it-works-modal" role="dialog" aria-modal="true" aria-label="How Sherwood Run works">
          <button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Close how it works">
            ×
          </button>
          <div className="section-kicker">How It Works</div>
          <h3>Run, rank, boost the drop.</h3>
          <ol>
            <li>
              <strong>Play</strong>
              <span>Press space, tap, or click to jump through Sherwood as the hooded runner.</span>
            </li>
            <li>
              <strong>Collect</strong>
              <span>Grab coins for score. Logs and stumps end the run.</span>
            </li>
            <li>
              <strong>Submit</strong>
              <span>After the run, enter a name and wallet to save your leaderboard score.</span>
            </li>
            <li>
              <strong>Boost</strong>
              <span>#1 gets 10x, #2 gets 5x, #3 gets 3x, and #4-10 scale from 2.75x to 1.5x. Every 30 minutes, eligible 1M+ holders get HoodX; the active 6-hour board adds the matching wallet's best rank.</span>
            </li>
          </ol>
        </div>
      ) : null}
    </div>
  );
}

export function SherwoodLeaderboard() {
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
        <div className="section-kicker">Leaderboard</div>
        <div className="section-head split-head">
          <h2>Top Sherwood runners.</h2>
          <p>The board resets every 6 hours. Only wallets that also qualify as 1M+ Sherwood holders receive the HoodX multiplier during each 30-minute airdrop.</p>
        </div>
        <div className="leaderboard-summary">
          <article>
            <span>Total Airdropped</span>
            <strong>{totalAirdropped > 0 ? totalAirdropped.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "Awaiting"}</strong>
          </article>
          <article>
            <span>Airdrop Hits</span>
            <strong>{recentHits > 0 ? recentHits.toLocaleString() : "Awaiting"}</strong>
          </article>
          <article>
            <span>Top Multiplier</span>
            <strong>10x</strong>
          </article>
          <article>
            <span>Latest Multiplier</span>
            <strong>{latestReward?.normalRewardAmount && latestReward.normalRewardAmount > 0 ? `${(latestReward.rewardAmount / latestReward.normalRewardAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}x` : "Awaiting"}</strong>
          </article>
        </div>
        <div className="history-card sherwood-board-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Wallet</th>
                  <th>Best coins</th>
                  <th>Best run</th>
                  <th>6h runs</th>
                  <th>HoodX multiplier</th>
                </tr>
              </thead>
              <tbody>
                {board.length ? (
                  board.map((row) => (
                    <tr key={row.wallet}>
                      <td>#{row.rank}</td>
                      <td>{row.playerName || "Outlaw"}</td>
                      <td>{compactAddress(row.wallet)}</td>
                      <td>{row.bestScore.toLocaleString()}</td>
                      <td>{row.bestDistance.toLocaleString()}m</td>
                      <td>{row.runs.toLocaleString()}</td>
                      <td>{row.multiplier}x</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="placeholder-cell" colSpan={7}>No Sherwood runs submitted yet.</td>
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

function parseWallets(primary: string, extras: string) {
  return Array.from(new Set([primary, ...extras.split(/[\n, ]+/)].map((wallet) => wallet.trim()).filter((wallet) => SOLANA_ADDRESS_RE.test(wallet)))).slice(0, 8);
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
    obstacleTimer: 1.2,
    coinTimer: 0.7,
    runner: { x: 78, y: 0, vy: 0, w: 46, h: 62, grounded: true },
    obstacles: [] as Array<{ x: number; y: number; w: number; h: number; kind: "log" | "stump" }>,
    coins: [] as Array<{ x: number; y: number; r: number; taken: boolean }>,
    trees: Array.from({ length: 16 }, (_, index) => ({ x: index * 92, h: 60 + Math.random() * 100, layer: index % 3 }))
  };
}

function resizeCanvas(canvas: HTMLCanvasElement, game: GameState) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(320, Math.floor(rect.width * ratio));
  canvas.height = Math.max(240, Math.floor(rect.height * ratio));
  canvas.getContext("2d")?.setTransform(ratio, 0, 0, ratio, 0, 0);
  game.ground = rect.height - 46;
  game.runner.y = Math.min(game.runner.y || game.ground - game.runner.h, game.ground - game.runner.h);
}

function jump(game: GameState) {
  if (!game.playing || !game.runner.grounded) return;
  game.runner.vy = -16.8;
  game.runner.grounded = false;
}

function updateGame(game: GameState, canvas: HTMLCanvasElement, dt: number, endRun: () => void) {
  const w = canvas.clientWidth;
  game.distance += dt * 22 * game.speed;
  game.speed = Math.min(4.2, 1 + game.distance / 520);
  const px = 250 * game.speed;
  game.obstacleTimer -= dt;
  game.coinTimer -= dt;

  if (game.obstacleTimer <= 0) {
    const kind = Math.random() > 0.54 ? "stump" : "log";
    const width = kind === "log" ? 46 + Math.random() * 24 : 28 + Math.random() * 14;
    const height = kind === "log" ? 22 + Math.random() * 10 : 36 + Math.random() * 18;
    game.obstacles.push({ x: w + 40, y: game.ground - height, w: width, h: height, kind });
    game.obstacleTimer = Math.max(0.58, 1.28 - game.speed * 0.15 + Math.random() * 0.28);
  }

  if (game.coinTimer <= 0) {
    const arcHeight = 54 + Math.random() * 70;
    for (let index = 0; index < 4; index += 1) {
      game.coins.push({
        x: w + 34 + index * 34,
        y: game.ground - arcHeight - Math.sin((index / 3) * Math.PI) * 28,
        r: 8,
        taken: false
      });
    }
    game.coinTimer = 0.95 + Math.random() * 0.55;
  }

  game.runner.vy += 37 * dt;
  game.runner.y += game.runner.vy;
  if (game.runner.y >= game.ground - game.runner.h) {
    game.runner.y = game.ground - game.runner.h;
    game.runner.vy = 0;
    game.runner.grounded = true;
  }

  moveItems(game.obstacles, px, dt);
  moveItems(game.coins, px, dt);
  game.trees.forEach((tree) => {
    tree.x -= px * dt * (0.16 + tree.layer * 0.12);
    if (tree.x < -90) {
      tree.x = w + 40 + Math.random() * 110;
      tree.h = 60 + Math.random() * 100;
    }
  });

  const runnerBox = { x: game.runner.x, y: game.runner.y, w: game.runner.w, h: game.runner.h };
  game.coins.forEach((coin) => {
    if (!coin.taken && rectsHit(runnerBox, { x: coin.x - coin.r, y: coin.y - coin.r, w: coin.r * 2, h: coin.r * 2 }, 3)) {
      coin.taken = true;
      game.score += 10;
    }
  });
  game.coins = game.coins.filter((coin) => !coin.taken);
  game.obstacles.forEach((obstacle) => {
    if (rectsHit(runnerBox, obstacle, 7)) endRun();
  });
}

function moveItems<T extends { x: number }>(items: T[], px: number, dt: number) {
  items.forEach((item) => (item.x -= px * dt));
  while (items[0] && items[0].x < -120) items.shift();
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
  game.coins.forEach((coin) => {
    ctx.fillStyle = "#c6ff00";
    pixelRect(ctx, coin.x - 6, coin.y - 9, 12, 18);
    pixelRect(ctx, coin.x - 9, coin.y - 6, 18, 12);
    ctx.fillStyle = "#f1ff72";
    pixelRect(ctx, coin.x - 2, coin.y - 7, 4, 4);
    ctx.fillStyle = "#020400";
    pixelRect(ctx, coin.x - 2, coin.y - 4, 4, 10);
    pixelRect(ctx, coin.x - 5, coin.y - 1, 10, 3);
  });
  game.obstacles.forEach((obstacle) => drawObstacle(ctx, obstacle));
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

function drawObstacle(ctx: CanvasRenderingContext2D, obstacle: { x: number; y: number; w: number; h: number; kind: "log" | "stump" }) {
  if (obstacle.kind === "log") {
    ctx.fillStyle = "#5d381d";
    pixelRect(ctx, obstacle.x, obstacle.y + 5, obstacle.w, obstacle.h - 5);
    ctx.fillStyle = "#8a5426";
    pixelRect(ctx, obstacle.x + 4, obstacle.y + 7, 10, obstacle.h - 9);
    pixelRect(ctx, obstacle.x + obstacle.w - 14, obstacle.y + 7, 10, obstacle.h - 9);
    ctx.fillStyle = "rgba(198,255,0,.25)";
    pixelRect(ctx, obstacle.x + 16, obstacle.y + 10, obstacle.w - 32, 3);
    return;
  }

  ctx.fillStyle = "#4c2d16";
  pixelRect(ctx, obstacle.x + obstacle.w * 0.18, obstacle.y, obstacle.w * 0.64, obstacle.h);
  ctx.fillStyle = "#7d4a22";
  pixelRect(ctx, obstacle.x + obstacle.w * 0.1, obstacle.y, obstacle.w * 0.8, 8);
  ctx.fillStyle = "rgba(198,255,0,.28)";
  pixelRect(ctx, obstacle.x + obstacle.w * 0.32, obstacle.y + obstacle.h * 0.32, obstacle.w * 0.36, 3);
}

function drawRunner(ctx: CanvasRenderingContext2D, game: GameState) {
  const runner = game.runner;
  ctx.save();
  ctx.translate(Math.floor(runner.x), Math.floor(runner.y + (runner.grounded ? Math.sin(game.distance * 0.9) * 2 : 0)));

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
