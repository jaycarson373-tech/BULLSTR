const DEFAULT_LAUNCH_CADENCE_DAYS = 7;
const DEFAULT_SNAPSHOT_OPENS_HOURS_BEFORE = 4;
const DEFAULT_SNAPSHOT_LOCKS_HOURS_BEFORE = 2;
const DEFAULT_FIRST_COIN_REVEAL_HOURS_BEFORE = 6;

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function launchCadenceDays() {
  const configured = positiveNumber(process.env.NEXT_PUBLIC_LAUNCH_CADENCE_DAYS, DEFAULT_LAUNCH_CADENCE_DAYS);
  return configured === 14 ? 14 : DEFAULT_LAUNCH_CADENCE_DAYS;
}

export const LAUNCH_CADENCE_DAYS = launchCadenceDays();
export const LAUNCH_CADENCE_COPY = `every ${LAUNCH_CADENCE_DAYS} days`;
export const LAUNCH_CADENCE_TITLE = `${LAUNCH_CADENCE_DAYS}-day launch engine`;
export const LAUNCH_POOL_LABEL = `${LAUNCH_CADENCE_DAYS}-Day Launch Pool`;

export const SNAPSHOT_OPENS_HOURS_BEFORE = positiveNumber(
  process.env.NEXT_PUBLIC_SNAPSHOT_OPENS_HOURS_BEFORE,
  DEFAULT_SNAPSHOT_OPENS_HOURS_BEFORE
);
export const SNAPSHOT_LOCKS_HOURS_BEFORE = positiveNumber(
  process.env.NEXT_PUBLIC_SNAPSHOT_LOCKS_HOURS_BEFORE,
  DEFAULT_SNAPSHOT_LOCKS_HOURS_BEFORE
);
export const SNAPSHOT_WINDOW_HOURS = Math.max(0, SNAPSHOT_OPENS_HOURS_BEFORE - SNAPSHOT_LOCKS_HOURS_BEFORE);
export const SNAPSHOT_WINDOW_COPY = `${SNAPSHOT_WINDOW_HOURS}-hour snapshot window`;
export const SNAPSHOT_TIMING_COPY = `opens ${SNAPSHOT_OPENS_HOURS_BEFORE}h before and locks ${SNAPSHOT_LOCKS_HOURS_BEFORE}h before presale`;

export const FIRST_COIN_REVEAL_HOURS_BEFORE = positiveNumber(
  process.env.NEXT_PUBLIC_FIRST_COIN_REVEAL_HOURS_BEFORE,
  DEFAULT_FIRST_COIN_REVEAL_HOURS_BEFORE
);
export const FIRST_COIN_REVEAL_COPY = `${FIRST_COIN_REVEAL_HOURS_BEFORE}h before presale`;
export const TAX_SPLIT_COPY = "50% launch liquidity / 50% holder airdrops";
