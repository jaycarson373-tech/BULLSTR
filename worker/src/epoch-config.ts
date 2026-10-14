export function epochMinutesFromEnv(value: string | undefined) {
  const parsed = value === undefined || value === "" ? 5 : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number env EPOCH_MINUTES=${value}`);
  }
  return Math.max(1, Math.floor(parsed));
}
