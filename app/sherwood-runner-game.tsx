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

type GameState = ReturnType<typeof createGame>;

type Hud = {
  playing: boolean;
  finished: boolean;
  score: number;
  distance: number;
  speed: number;
  arrows: number;
};

const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function SherwoodRunnerGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef(createGame());
  const rafRef = useRef<number | null>(null);
  const [hud, setHud] = useState<Hud>({ playing: false, finished: false, score: 0, distance: 0, speed: 1, arrows: 3 });
  const [primaryWallet, setPrimaryWallet] = useState("");
  const [extraWallets, setExtraWallets] = useState("");
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [status, setStatus] = useState("Play, then submit Solana wallets to boost real holder airdrop weight.");
  const [submitting, setSubmitting] = useState(false);

  const syncHud = useCallback(() => {
    const game = gameRef.current;
    setHud({
      playing: game.playing,
      finished: game.finished,
      score: Math.floor(game.score),
      distance: Math.floor(game.distance),
      speed: game.speed,
      arrows: game.arrows
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
    setStatus("Run live. Collect coins, dodge logs, and shoot tax wagons.");
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
    fetch("/api/sherwood", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setBoard(data.leaderboard ?? []))
      .catch(() => undefined);
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
      if (event.key.toLowerCase() === "f") fire(gameRef.current);
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
      setStatus("Saved. Ranked wallets boost real holder airdrop weight when they also qualify as HPUMP holders.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sherwood submit failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section sherwood-section" id="sherwood">
      <div className="container">
        <div className="section-kicker live-kicker"><span>Sherwood run</span><span className="live-dot" /></div>
        <div className="section-head split-head">
          <h2>Play the Robin Hood run. Boost the real holder airdrop.</h2>
          <p>
            Jump logs, collect Sheriff coins, shoot tax wagons, then submit Solana wallets. Ranked Sherwood wallets
            get multiplier weight inside the existing Bullstr/Supabase airdrop worker.
          </p>
        </div>
        <div className="sherwood-layout">
          <div className="sherwood-game-card">
            <div className="sherwood-hud">
              <GameStat label="Loot" value={hud.score.toLocaleString()} />
              <GameStat label="Run" value={`${hud.distance}m`} />
              <GameStat label="Arrows" value={hud.arrows.toString()} />
              <GameStat label="Speed" value={`${hud.speed.toFixed(1)}x`} />
            </div>
            <div className="sherwood-canvas-wrap">
              <canvas
                ref={canvasRef}
                aria-label="Sherwood runner game"
                onPointerDown={() => jump(gameRef.current)}
                onPointerUp={() => fire(gameRef.current)}
              />
              {!hud.playing ? (
                <div className="sherwood-overlay">
                  <div>
                    <h3>{hud.finished ? "Run complete" : "Sherwood Forest Run"}</h3>
                    <p>
                      {hud.finished
                        ? `You looted ${hud.score} across ${hud.distance}m. Submit wallets for leaderboard weight.`
                        : "Space or tap jumps. F or release fires. Wagons are bonus loot."}
                    </p>
                    <button type="button" className="cta" onClick={startRun}>{hud.finished ? "Run again" : "Start run"}</button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="sherwood-submit-card">
            <h3>Submit wallets</h3>
            <p>Use Solana wallets only. Up to 8 unique wallets can receive this run score.</p>
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
              rows={5}
              spellCheck={false}
            />
            <button type="button" className="cta" disabled={submitting} onClick={submitRun}>Save run wallets</button>
            <p className="wallet-status">{status}</p>
          </div>
        </div>

        <div className="history-card sherwood-board-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Wallet</th>
                  <th>Best loot</th>
                  <th>Best run</th>
                  <th>Airdrop weight</th>
                </tr>
              </thead>
              <tbody>
                {board.length ? (
                  board.slice(0, 12).map((row) => (
                    <tr key={row.wallet}>
                      <td>#{row.rank}</td>
                      <td>{compactAddress(row.wallet)}</td>
                      <td>{row.bestScore.toLocaleString()}</td>
                      <td>{row.bestDistance.toLocaleString()}m</td>
                      <td>{row.multiplier}x</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="placeholder-cell" colSpan={5}>No Sherwood wallets submitted yet.</td>
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
    arrows: 3,
    ground: 300,
    spawnTimer: 0,
    coinTimer: 0,
    arrowTimer: 0,
    runner: { x: 96, y: 0, vy: 0, w: 34, h: 54, grounded: true },
    obstacles: [] as Array<{ x: number; y: number; w: number; h: number }>,
    coins: [] as Array<{ x: number; y: number; r: number; taken: boolean }>,
    wagons: [] as Array<{ x: number; y: number; w: number; h: number; hit: boolean }>,
    arrowsLive: [] as Array<{ x: number; y: number; vx: number; live: boolean }>,
    trees: Array.from({ length: 18 }, (_, index) => ({ x: index * 86, h: 70 + Math.random() * 90, layer: index % 3 }))
  };
}

function resizeCanvas(canvas: HTMLCanvasElement, game: GameState) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(320, Math.floor(rect.width * ratio));
  canvas.height = Math.max(230, Math.floor(rect.height * ratio));
  canvas.getContext("2d")?.setTransform(ratio, 0, 0, ratio, 0, 0);
  game.ground = rect.height - 52;
  game.runner.y = Math.min(game.runner.y || game.ground - game.runner.h, game.ground - game.runner.h);
}

function jump(game: GameState) {
  if (!game.playing || !game.runner.grounded) return;
  game.runner.vy = -16;
  game.runner.grounded = false;
}

function fire(game: GameState) {
  if (!game.playing || game.arrows <= 0 || game.arrowTimer > 0) return;
  game.arrows -= 1;
  game.arrowTimer = 0.28;
  game.arrowsLive.push({ x: game.runner.x + 34, y: game.runner.y + 20, vx: 620, live: true });
}

function updateGame(game: GameState, canvas: HTMLCanvasElement, dt: number, endRun: () => void) {
  const w = canvas.clientWidth;
  const px = 220 * game.speed;
  game.speed += dt * 0.025;
  game.distance += dt * 18 * game.speed;
  game.spawnTimer -= dt;
  game.coinTimer -= dt;
  game.arrowTimer -= dt;

  if (game.spawnTimer <= 0) {
    if (Math.random() > 0.64) game.wagons.push({ x: w + 30, y: game.ground - 42, w: 62, h: 42, hit: false });
    else game.obstacles.push({ x: w + 30, y: game.ground - 24, w: 46, h: 24 });
    game.spawnTimer = Math.max(0.72, 1.45 - game.speed * 0.18);
  }

  if (game.coinTimer <= 0) {
    for (let i = 0; i < 5; i += 1) {
      game.coins.push({ x: w + 30 + i * 34, y: game.ground - 84 - Math.sin((i / 4) * Math.PI) * 40, r: 9, taken: false });
    }
    game.coinTimer = 1.1 + Math.random() * 0.8;
  }

  game.runner.vy += 38 * dt;
  game.runner.y += game.runner.vy;
  if (game.runner.y >= game.ground - game.runner.h) {
    game.runner.y = game.ground - game.runner.h;
    game.runner.vy = 0;
    game.runner.grounded = true;
  }

  moveItems(game.obstacles, px, dt);
  moveItems(game.coins, px, dt);
  moveItems(game.wagons, px, dt);
  game.arrowsLive.forEach((arrow) => (arrow.x += arrow.vx * dt));
  game.arrowsLive = game.arrowsLive.filter((arrow) => arrow.x < w + 80 && arrow.live);
  game.trees.forEach((tree) => {
    tree.x -= px * dt * (0.22 + tree.layer * 0.15);
    if (tree.x < -90) {
      tree.x = w + 40 + Math.random() * 80;
      tree.h = 70 + Math.random() * 90;
    }
  });

  const runnerBox = { x: game.runner.x, y: game.runner.y, w: game.runner.w, h: game.runner.h };
  game.coins.forEach((coin) => {
    if (!coin.taken && rectsHit(runnerBox, { x: coin.x - coin.r, y: coin.y - coin.r, w: coin.r * 2, h: coin.r * 2 }, 5)) {
      coin.taken = true;
      game.score += 10;
    }
  });
  game.coins = game.coins.filter((coin) => !coin.taken);

  game.wagons.forEach((wagon) => {
    game.arrowsLive.forEach((arrow) => {
      if (!wagon.hit && arrow.x > wagon.x && arrow.x < wagon.x + wagon.w && arrow.y > wagon.y && arrow.y < wagon.y + wagon.h) {
        wagon.hit = true;
        arrow.live = false;
        game.score += 35;
        if (Math.random() > 0.45) game.arrows = Math.min(5, game.arrows + 1);
      }
    });
    if (!wagon.hit && rectsHit(runnerBox, wagon, 7)) endRun();
  });
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
  ctx.clearRect(0, 0, w, h);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#071b16");
  sky.addColorStop(0.62, "#174331");
  sky.addColorStop(1, "#06120f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(198,255,0,.65)";
  ctx.beginPath();
  ctx.arc(w - 70, 52, 24, 0, Math.PI * 2);
  ctx.fill();
  [...game.trees].sort((a, b) => a.layer - b.layer).forEach((tree) => drawTree(ctx, game, tree));
  ctx.fillStyle = "#07140f";
  ctx.fillRect(0, game.ground, w, h - game.ground);
  ctx.fillStyle = "rgba(198,255,0,.45)";
  for (let x = -20; x < w + 20; x += 28) ctx.fillRect(x, game.ground + ((x + Math.floor(game.distance * 8)) % 12), 18, 3);
  game.coins.forEach((coin) => {
    ctx.fillStyle = "#c6ff00";
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2);
    ctx.fill();
  });
  game.obstacles.forEach((obstacle) => {
    ctx.fillStyle = "#6b3c20";
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
  });
  game.wagons.forEach((wagon) => {
    ctx.globalAlpha = wagon.hit ? 0.35 : 1;
    ctx.fillStyle = wagon.hit ? "#c6ff00" : "#6f2d28";
    ctx.fillRect(wagon.x, wagon.y + 8, wagon.w, wagon.h - 12);
    ctx.fillStyle = "#080c02";
    ctx.beginPath();
    ctx.arc(wagon.x + 14, wagon.y + wagon.h, 8, 0, Math.PI * 2);
    ctx.arc(wagon.x + wagon.w - 14, wagon.y + wagon.h, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
  game.arrowsLive.forEach((arrow) => {
    ctx.strokeStyle = "#f4ffe6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(arrow.x - 18, arrow.y);
    ctx.lineTo(arrow.x + 12, arrow.y);
    ctx.stroke();
  });
  drawRunner(ctx, game);
}

function drawTree(ctx: CanvasRenderingContext2D, game: GameState, tree: GameState["trees"][number]) {
  const base = game.ground + 6;
  const scale = 0.78 + tree.layer * 0.22;
  ctx.fillStyle = tree.layer === 0 ? "rgba(4, 21, 15, .68)" : "rgba(1, 12, 8, .86)";
  ctx.fillRect(tree.x + 18 * scale, base - tree.h, 12 * scale, tree.h);
  ctx.beginPath();
  ctx.moveTo(tree.x, base - tree.h + 22);
  ctx.lineTo(tree.x + 25 * scale, base - tree.h - 42 * scale);
  ctx.lineTo(tree.x + 58 * scale, base - tree.h + 22);
  ctx.closePath();
  ctx.fill();
}

function drawRunner(ctx: CanvasRenderingContext2D, game: GameState) {
  const runner = game.runner;
  ctx.save();
  ctx.translate(runner.x, runner.y + (runner.grounded ? Math.sin(game.distance * 0.8) * 2 : 0));
  ctx.fillStyle = "#14351f";
  ctx.beginPath();
  ctx.moveTo(11, 14);
  ctx.lineTo(28, 4);
  ctx.lineTo(33, 18);
  ctx.lineTo(25, 17);
  ctx.lineTo(23, 41);
  ctx.lineTo(7, 41);
  ctx.lineTo(8, 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#c6ff00";
  ctx.fillRect(8, 22, 20, 5);
  ctx.fillStyle = "#f1c39b";
  ctx.beginPath();
  ctx.arc(19, 12, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7b4b2a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(31, 28, 12, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.restore();
}
