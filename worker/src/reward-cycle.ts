export type RewardMode = "sol" | "token" | "alternating";
export type RewardKind = "sol" | "token";

export function rewardKindForEpoch(epochId: string, epochMinutes: number, mode: RewardMode): RewardKind {
  if (mode === "sol") return "sol";
  if (mode === "token") return "token";

  const epochMs = Math.max(1, epochMinutes) * 60_000;
  const timestamp = Date.parse(epochId);
  const epochIndex = Number.isFinite(timestamp) ? Math.floor(timestamp / epochMs) : 0;
  return Math.abs(epochIndex % 2) === 0 ? "sol" : "token";
}
