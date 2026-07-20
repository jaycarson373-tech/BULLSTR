const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type RankMultiplierConfig = {
  top10MultiplierBps: number;
  top50MultiplierBps: number;
  top100MultiplierBps: number;
};

export function holdMultiplierBps(eligibleSince: string | null | undefined, nowMs: number) {
  const startedAt = eligibleSince ? Date.parse(eligibleSince) : nowMs;
  const heldMs = Number.isFinite(startedAt) ? Math.max(0, nowMs - startedAt) : 0;
  if (heldMs >= 30 * DAY_MS) return 150_000;
  if (heldMs >= 7 * DAY_MS) return 50_000;
  if (heldMs >= 3 * DAY_MS) return 30_000;
  if (heldMs >= DAY_MS) return 20_000;
  if (heldMs >= 12 * HOUR_MS) return 15_000;
  if (heldMs >= HOUR_MS) return 12_500;
  return 10_000;
}

export function rankMultiplierBps(rank: number, multipliers: RankMultiplierConfig) {
  if (rank <= 10) return multipliers.top10MultiplierBps;
  if (rank <= 50) return multipliers.top50MultiplierBps;
  if (rank <= 100) return multipliers.top100MultiplierBps;
  return 10_000;
}

export function combinedMultiplierBps(holdingBps: number, rankingBps: number) {
  return Math.floor((holdingBps * rankingBps) / 10_000);
}
