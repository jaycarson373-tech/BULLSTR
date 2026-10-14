const BASE_MULTIPLIER_BPS = 10_000;

export function holdMultiplierForStreak(
  streakEpochs: number,
  stepBps: number,
  maxBps: number
) {
  const completedBonusEpochs = Math.max(0, Math.floor(streakEpochs) - 1);
  const safeStepBps = Math.max(0, Math.floor(stepBps));
  const safeMaxBps = Math.max(BASE_MULTIPLIER_BPS, Math.floor(maxBps));
  return Math.min(safeMaxBps, BASE_MULTIPLIER_BPS + completedBonusEpochs * safeStepBps);
}
