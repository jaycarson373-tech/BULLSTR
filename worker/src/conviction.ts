const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

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
