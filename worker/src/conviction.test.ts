import assert from "node:assert/strict";
import test from "node:test";
import { combinedMultiplierBps, holdMultiplierBps, rankMultiplierBps } from "./conviction.js";

const NOW = Date.parse("2026-07-20T12:00:00.000Z");
const rankConfig = { top10MultiplierBps: 20_000, top50MultiplierBps: 15_000, top100MultiplierBps: 12_500 };

test("holding tiers reach 15x at one month", () => {
  assert.equal(holdMultiplierBps("2026-07-20T11:30:00.000Z", NOW), 10_000);
  assert.equal(holdMultiplierBps("2026-07-20T11:00:00.000Z", NOW), 12_500);
  assert.equal(holdMultiplierBps("2026-07-20T00:00:00.000Z", NOW), 15_000);
  assert.equal(holdMultiplierBps("2026-07-19T12:00:00.000Z", NOW), 20_000);
  assert.equal(holdMultiplierBps("2026-07-17T12:00:00.000Z", NOW), 30_000);
  assert.equal(holdMultiplierBps("2026-07-13T12:00:00.000Z", NOW), 50_000);
  assert.equal(holdMultiplierBps("2026-06-20T12:00:00.000Z", NOW), 150_000);
});

test("rank tiers apply at exact boundaries", () => {
  assert.equal(rankMultiplierBps(10, rankConfig), 20_000);
  assert.equal(rankMultiplierBps(11, rankConfig), 15_000);
  assert.equal(rankMultiplierBps(50, rankConfig), 15_000);
  assert.equal(rankMultiplierBps(51, rankConfig), 12_500);
  assert.equal(rankMultiplierBps(100, rankConfig), 12_500);
  assert.equal(rankMultiplierBps(101, rankConfig), 10_000);
});

test("one-month Top 10 conviction combines to 30x", () => {
  assert.equal(combinedMultiplierBps(150_000, 20_000), 300_000);
});
