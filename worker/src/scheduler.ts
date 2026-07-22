import { runEpoch } from "./epoch.js";
import { config } from "./config.js";
import { msUntilNextEpoch } from "./time.js";

const rewardRotation = config.rewardTokens.map((token) => token.symbol).join(" -> ") || "SOL";

console.log(`Himothy worker started. Schedule: every ${config.epochMinutes} minutes.`);
console.log(
  `Mode: REWARD_MODE=${config.rewardMode}. Gates: CLAIM_ENABLED=${config.claimEnabled}, BUY_ENABLED=${config.buyEnabled}, AIRDROP_ENABLED=${config.airdropEnabled}, EMERGENCY_STOP=${config.emergencyStop}`
);
console.log(
  config.rewardMode === "sol"
    ? `SOL rewards: ${config.solAirdropBalanceBps / 100}% of newly claimed SOL, capped by spendable treasury balance.`
    : config.rewardMode === "alternating"
      ? `Alternating rewards: SOL -> ${rewardRotation} every adjacent ${config.epochMinutes}-minute epoch.`
    : `Token rewards: ${config.swapBalanceBps / 100}% claimed SOL buys ${rewardRotation}; ${config.sideWalletBps / 100}% routes to side wallet.`
);
console.log(`Source token mint: ${config.sourceTokenMint.toBase58()}`);
console.log(`Eligibility gate: holder must hold ${config.eligibilityMin.toLocaleString()} HIMOTHY tokens without decreasing balance`);

async function loop() {
  await runEpoch();
  const waitMs = msUntilNextEpoch(new Date()) + 500;
  setTimeout(loop, waitMs);
}

function scheduleFirstRun() {
  console.log("First epoch run starting immediately.");
  loop().catch((error) => {
    console.error("worker crashed", error);
    process.exit(1);
  });
}

if (config.emergencyStop) {
  console.error("[EMERGENCY STOP] Worker is parked. No claims, buys, or airdrops will execute.");
  setInterval(() => console.log("[EMERGENCY STOP] Worker remains parked."), 60_000);
} else {
  scheduleFirstRun();
}
