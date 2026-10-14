const BASE_MULTIPLIER_BPS = 10_000;

export function streakForEpoch(previousEpoch:string|null|undefined,currentEpoch:string,previousStreak:number,sold:boolean,epochMinutes:number) {
  if (sold || !previousEpoch) return 1;
  if (previousEpoch === currentEpoch) return Math.max(1,previousStreak);
  const previous=Date.parse(previousEpoch.slice(-24)),current=Date.parse(currentEpoch.slice(-24));
  const sameToken=previousEpoch.slice(0,-24)===currentEpoch.slice(0,-24);
  return sameToken && current-previous===epochMinutes*60_000 ? Math.max(0,previousStreak)+1 : 1;
}

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
