import assert from "node:assert/strict";
import test from "node:test";
import { holdMultiplierBps } from "./conviction.js";

const NOW = Date.parse("2026-07-20T12:00:00.000Z");

test("holding tiers reach 15x at one month", () => {
  assert.equal(holdMultiplierBps("2026-07-20T11:30:00.000Z", NOW), 10_000);
  assert.equal(holdMultiplierBps("2026-07-20T11:00:00.000Z", NOW), 12_500);
  assert.equal(holdMultiplierBps("2026-07-20T00:00:00.000Z", NOW), 15_000);
  assert.equal(holdMultiplierBps("2026-07-19T12:00:00.000Z", NOW), 20_000);
  assert.equal(holdMultiplierBps("2026-07-17T12:00:00.000Z", NOW), 30_000);
  assert.equal(holdMultiplierBps("2026-07-13T12:00:00.000Z", NOW), 50_000);
  assert.equal(holdMultiplierBps("2026-06-20T12:00:00.000Z", NOW), 150_000);
});
