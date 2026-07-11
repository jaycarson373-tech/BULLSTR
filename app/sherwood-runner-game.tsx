"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type BoardRow = {
  wallet: string;
  bestScore: number;
  bestDistance: number;
  runs: number;
  rank: number;
  multiplier: number;
};

type StatsResponse = {
  totalRewardAirdropped: number;
  totalRewardTotals?: Array<{ rewardAsset: string; rewardAmount: number }>;
  recentRewards?: Array<{ wallet: string; rewardAmount: number; rewardAsset?: string; time: string; txSig: string | null }>;
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
        body: JSON.stringify({ wallets, score: hud.score, distance: hud.distance })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Sherwood submit failed.");
      setBoard(data.leaderboard ?? []);
      setPrimaryWallet("");
      setExtraWallets("");
      setStatus("Saved. Leaderboard rank boosts matching eligible holder wallets during airdrops.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sherwood submit failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="sherwood-game-shell" id="play">
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

      <aside className="sherwood-submit-card">
        <h3>Save score</h3>
        <p>Submit Solana wallets after a run. The leaderboard gives matching eligible holders a multiplier.</p>
        <label htmlFor="sherwood-primary-wallet">Main Solana wallet</label>
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
          placeholder="One per line, comma, or space separated"
          rows={4}
          spellCheck={false}
        />
        <button type="button" className="cta" disabled={submitting} onClick={submitRun}>Submit to leaderboard</button>
        <p className="wallet-status">{status}</p>
        <div className="mini-leaderboard">
          <strong>Top runners</strong>
          {board.length ? (
            board.slice(0, 5).map((row) => (
              <span key={row.wallet}>#{row.rank} {compactAddress(row.wallet)} - {row.bestScore.toLocaleString()}</span>
            ))
          ) : (
            <span>No runs submitted yet.</span>
          )}
        </div>
      </aside>
    </section>
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

  return (
    <section className="section leaderboard-page-section">
      <div className="container">
        <div className="section-kicker">Leaderboard</div>
        <div className="section-head split-head">
          <h2>Top Sherwood runners.</h2>
          <p>These ranks feed the airdrop multiplier. A wallet must also qualify as an eligible Sherwood holder to receive the boosted airdrop weight.</p>
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
            <strong>3x</strong>
          </article>
        </div>
        <div className="history-card sherwood-board-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Wallet</th>
                  <th>Best coins</th>
                  <th>Best run</th>
                  <th>Runs</th>
                  <th>Airdrop multiplier</th>
                </tr>
              </thead>
              <tbody>
                {board.length ? (
                  board.map((row) => (
                    <tr key={row.wallet}>
                      <td>#{row.rank}</td>
                      <td>{compactAddress(row.wallet)}</td>
                      <td>{row.bestScore.toLocaleString()}</td>
                      <td>{row.bestDistance.toLocaleString()}m</td>
                      <td>{row.runs.toLocaleString()}</td>
                      <td>{row.multiplier}x</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="placeholder-cell" colSpan={6}>No Sherwood runs submitted yet.</td>
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
    runner: { x: 84, y: 0, vy: 0, w: 34, h: 50, grounded: true },
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
  game.runner.vy = -15.8;
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
    pixelRect(ctx, coin.x - 7, coin.y - 7, 14, 14);
    ctx.fillStyle = "#020400";
    pixelRect(ctx, coin.x - 3, coin.y - 5, 6, 2);
    pixelRect(ctx, coin.x - 4, coin.y - 1, 8, 2);
    pixelRect(ctx, coin.x - 3, coin.y + 3, 6, 2);
    ctx.fillStyle = "#020400";
  });
  game.obstacles.forEach((obstacle) => drawObstacle(ctx, obstacle));
  drawRunner(ctx, game);
}

function drawTree(ctx: CanvasRenderingContext2D, game: GameState, tree: GameState["trees"][number]) {
  const base = game.ground + 4;
  const scale = 0.74 + tree.layer * 0.2;
  ctx.fillStyle = tree.layer === 0 ? "rgba(4, 21, 15, .55)" : "rgba(1, 12, 8, .82)";
  pixelRect(ctx, tree.x + 18 * scale, base - tree.h, 12 * scale, tree.h);
  ctx.fillStyle = tree.layer === 0 ? "rgba(198,255,0,.08)" : "rgba(198,255,0,.13)";
  const crownX = tree.x + 28 * scale;
  const crownY = base - tree.h - 12 * scale;
  pixelRect(ctx, crownX - 22 * scale, crownY, 44 * scale, 18 * scale);
  pixelRect(ctx, crownX - 14 * scale, crownY - 16 * scale, 28 * scale, 16 * scale);
  pixelRect(ctx, crownX - 30 * scale, crownY + 12 * scale, 60 * scale, 20 * scale);
  ctx.fillStyle = "rgba(198,255,0,.18)";
  pixelRect(ctx, crownX - 6 * scale, crownY - 8 * scale, 10 * scale, 8 * scale);
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
  pixelRect(ctx, -8, 26, 18, 10);
  pixelRect(ctx, -2, 34, 12, 8);
  ctx.fillStyle = "#18371f";
  pixelRect(ctx, 10, 18, 18, 25);
  ctx.fillStyle = "#c6ff00";
  pixelRect(ctx, 12, 28, 16, 4);
  ctx.fillStyle = "#071108";
  pixelRect(ctx, 15, 24, 10, 8);
  ctx.fillStyle = "#18371f";
  pixelRect(ctx, 14, 8, 14, 10);
  pixelRect(ctx, 10, 14, 22, 7);
  ctx.fillStyle = "#c6ff00";
  pixelRect(ctx, 12, 15, 4, 3);
  pixelRect(ctx, 26, 15, 4, 3);
  pixelRect(ctx, 6, 42, 8, 8);
  pixelRect(ctx, 24, 42, 8, 8);
  ctx.strokeStyle = "#7c4a22";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(35, 26, 14, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.strokeStyle = "#c6ff00";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(35, 12);
  ctx.lineTo(35, 40);
  ctx.stroke();
  ctx.fillStyle = "#c6ff00";
  pixelRect(ctx, 3, 10, 5, 20);
  pixelRect(ctx, 5, 8, 14, 2);
  ctx.restore();
}

function pixelRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
