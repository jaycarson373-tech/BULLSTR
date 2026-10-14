import assert from "node:assert/strict";
import test from "node:test";
import { holdMultiplierForStreak } from "./hold-multiplier.js";

test("starts at 1x and grows for each consecutive eligible epoch", () => {
  assert.equal(holdMultiplierForStreak(0, 100, 20_000), 10_000);
  assert.equal(holdMultiplierForStreak(1, 100, 20_000), 10_000);
  assert.equal(holdMultiplierForStreak(2, 100, 20_000), 10_100);
  assert.equal(holdMultiplierForStreak(10, 100, 20_000), 10_900);
});

test("caps the multiplier and never drops below the base weight", () => {
  assert.equal(holdMultiplierForStreak(10_000, 100, 20_000), 20_000);
  assert.equal(holdMultiplierForStreak(10, 0, 20_000), 10_000);
  assert.equal(holdMultiplierForStreak(10, 500, 5_000), 10_000);
});
