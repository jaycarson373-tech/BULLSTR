import { PublicKey } from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ScoreRow = {
  wallet: string;
  player_name: string | null;
  score: number | null;
  distance: number | null;
  created_at: string | null;
};

type LeaderboardRow = {
  wallet: string;
  playerName: string | null;
  bestScore: number;
  bestDistance: number;
  runs: number;
  latestRunAt: string | null;
};

const SHERWOOD_PRIZE_BPS = [1500, 1000, 900, 800, 700, 700, 600, 600, 600, 500, 500, 500, 400, 400, 300] as const;

function supabaseReadConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function supabaseWriteConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function readClient() {
  const config = supabaseReadConfig();
  if (!config) throw new Error("Supabase read configuration is missing.");
  return createClient(config.url, config.key, { auth: { persistSession: false } });
}

function writeClient() {
  const config = supabaseWriteConfig();
  if (!config) throw new Error("Missing SUPABASE_SERVICE_ROLE in the Vercel server environment.");
  return createClient(config.url, config.key, { auth: { persistSession: false } });
}

function normalizeWallet(value: unknown) {
  const wallet = String(value ?? "").trim();
  if (!wallet) return null;
  try {
    return new PublicKey(wallet).toBase58();
  } catch {
    return null;
  }
}

function normalizePlayerName(value: unknown) {
  const name = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!name) return "Holder";
  return name.slice(0, 24);
}

function rankPrizeBps(rank: number) {
  return SHERWOOD_PRIZE_BPS[rank - 1] ?? 0;
}

function currentSeasonStart() {
  const seasonMs = 24 * 60 * 60 * 1000;
  return new Date(Math.floor(Date.now() / seasonMs) * seasonMs).toISOString();
}

async function leaderboard(db = readClient()) {
  const { data, error } = await db
    .from("sherwood_runs")
    .select("wallet,player_name,score,distance,created_at")
    .gte("created_at", currentSeasonStart())
    .order("score", { ascending: false })
    .order("distance", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1000);

  if (error) throw error;

  const bestByWallet = new Map<string, LeaderboardRow>();
  for (const row of (data ?? []) as ScoreRow[]) {
    const existing = bestByWallet.get(row.wallet);
    const score = Number(row.score ?? 0);
    const distance = Number(row.distance ?? 0);
    const createdAt = row.created_at;
    if (!existing) {
      bestByWallet.set(row.wallet, {
        wallet: row.wallet,
        playerName: row.player_name,
        bestScore: score,
        bestDistance: distance,
        runs: 1,
        latestRunAt: createdAt
      });
      continue;
    }

    existing.runs += 1;
    if (createdAt && (!existing.latestRunAt || Date.parse(createdAt) > Date.parse(existing.latestRunAt))) {
      existing.latestRunAt = createdAt;
      existing.playerName = row.player_name ?? existing.playerName;
    }
    if (score > existing.bestScore || (score === existing.bestScore && distance > existing.bestDistance)) {
      existing.bestScore = score;
      existing.bestDistance = distance;
      existing.playerName = row.player_name ?? existing.playerName;
    }
  }

  return [...bestByWallet.values()].sort((a, b) => b.bestScore - a.bestScore || b.bestDistance - a.bestDistance || Date.parse(a.latestRunAt ?? "") - Date.parse(b.latestRunAt ?? "")).slice(0, 25).map((row, index) => ({
    wallet: row.wallet,
    playerName: row.playerName,
    bestScore: row.bestScore,
    bestDistance: row.bestDistance,
    runs: row.runs,
    rank: index + 1,
    prizeBps: rankPrizeBps(index + 1),
    prizePct: rankPrizeBps(index + 1) / 100,
    season: "24h",
    updatedAt: row.latestRunAt
  }));
}

export async function GET() {
  try {
    return NextResponse.json({ leaderboard: await leaderboard() });
  } catch (error) {
    console.error("sherwood leaderboard failed", error);
    return NextResponse.json({ leaderboard: [], error: "HyperHood holder board unavailable." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const wallet = normalizeWallet(body.wallet ?? (Array.isArray(body.wallets) ? body.wallets[0] : body.wallets));
    if (!wallet) {
      return NextResponse.json({ error: "Enter one valid Solana wallet." }, { status: 400 });
    }

    const score = Math.max(0, Math.min(999999, Math.floor(Number(body.score) || 0)));
    const distance = Math.max(0, Math.min(999999, Math.floor(Number(body.distance) || 0)));
    const playerName = normalizePlayerName(body.playerName ?? body.name);
    const now = new Date().toISOString();
    const db = writeClient();

    const { data: existing, error: existingError } = await db
      .from("sherwood_scores")
      .select("best_score,best_distance,runs")
      .eq("wallet", wallet)
      .maybeSingle();
    if (existingError) throw existingError;

    const currentScore = Number(existing?.best_score ?? 0);
    const currentDistance = Number(existing?.best_distance ?? 0);
    const nextBestScore = Math.max(currentScore, score);
    const nextBestDistance = Math.max(currentDistance, distance);
    const nextRuns = Number(existing?.runs ?? 0) + 1;

    const { error: scoreError } = await db.from("sherwood_scores").upsert(
      {
        wallet,
        player_name: playerName,
        best_score: nextBestScore,
        best_distance: nextBestDistance,
        runs: nextRuns,
        updated_at: now
      },
      { onConflict: "wallet" }
    );
    if (scoreError) throw scoreError;

    const { error: runError } = await db.from("sherwood_runs").insert({
      wallet,
      player_name: playerName,
      score,
      distance
    });
    if (runError) throw runError;

    return NextResponse.json({ leaderboard: await leaderboard(db), submitted: 1 });
  } catch (error) {
    console.error("sherwood score submit failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit HyperHood run." },
      { status: 500 }
    );
  }
}
