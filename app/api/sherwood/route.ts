import { PublicKey } from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ScoreRow = {
  wallet: string;
  player_name: string | null;
  best_score: number | null;
  best_distance: number | null;
  runs: number | null;
  updated_at: string | null;
};

function supabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function client() {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase service-role configuration is missing.");
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

function normalizeWallets(value: unknown) {
  const raw = Array.isArray(value) ? value : String(value ?? "").split(/[\n, ]+/);
  return Array.from(new Set(raw.map(normalizeWallet).filter(Boolean) as string[])).slice(0, 8);
}

function normalizePlayerName(value: unknown) {
  const name = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!name) return "Outlaw";
  return name.slice(0, 24);
}

function rankMultiplier(rank: number) {
  if (rank === 1) return 3;
  if (rank === 2) return 2;
  if (rank === 3) return 1.5;
  if (rank <= 10) return 1.15;
  return 1;
}

async function leaderboard(db = client()) {
  const { data, error } = await db
    .from("sherwood_scores")
    .select("wallet,player_name,best_score,best_distance,runs,updated_at")
    .order("best_score", { ascending: false })
    .order("best_distance", { ascending: false })
    .order("updated_at", { ascending: true })
    .limit(25);

  if (error) throw error;
  return ((data ?? []) as ScoreRow[]).map((row, index) => ({
    wallet: row.wallet,
    playerName: row.player_name,
    bestScore: Number(row.best_score ?? 0),
    bestDistance: Number(row.best_distance ?? 0),
    runs: Number(row.runs ?? 0),
    rank: index + 1,
    multiplier: rankMultiplier(index + 1),
    updatedAt: row.updated_at
  }));
}

export async function GET() {
  try {
    return NextResponse.json({ leaderboard: await leaderboard() });
  } catch (error) {
    console.error("sherwood leaderboard failed", error);
    return NextResponse.json({ leaderboard: [], error: "Sherwood leaderboard unavailable." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const wallets = normalizeWallets(body.wallets ?? [body.wallet]);
    if (!wallets.length) {
      return NextResponse.json({ error: "Enter at least one valid Solana wallet." }, { status: 400 });
    }

    const score = Math.max(0, Math.min(999999, Math.floor(Number(body.score) || 0)));
    const distance = Math.max(0, Math.min(999999, Math.floor(Number(body.distance) || 0)));
    const playerName = normalizePlayerName(body.playerName ?? body.name);
    const now = new Date().toISOString();
    const db = client();

    for (const wallet of wallets) {
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
    }

    return NextResponse.json({ leaderboard: await leaderboard(db), submitted: wallets.length });
  } catch (error) {
    console.error("sherwood score submit failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit Sherwood run." },
      { status: 500 }
    );
  }
}
