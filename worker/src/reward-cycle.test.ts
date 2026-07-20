import assert from "node:assert/strict";
import test from "node:test";
import { rewardKindForEpoch } from "./reward-cycle.js";

test("alternating mode switches reward asset every adjacent epoch", () => {
  const first = rewardKindForEpoch("2026-07-20T12:00:00.000Z", 5, "alternating");
  const second = rewardKindForEpoch("2026-07-20T12:05:00.000Z", 5, "alternating");
  const third = rewardKindForEpoch("2026-07-20T12:10:00.000Z", 5, "alternating");

  assert.notEqual(first, second);
  assert.equal(first, third);
});

test("single-asset modes remain fixed", () => {
  assert.equal(rewardKindForEpoch("invalid", 5, "sol"), "sol");
  assert.equal(rewardKindForEpoch("invalid", 5, "token"), "token");
});
