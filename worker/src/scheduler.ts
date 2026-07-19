import { runEpoch } from "./epoch.js";
import { config } from "./config.js";
import { msUntilNextEpoch } from "./time.js";

const rewardRotation = config.rewardTokens.map((token) => token.symbol).join(" -> ") || "SOL";

console.log(`Diamond Index 6900 worker started. Schedule: every ${config.epochMinutes} minutes.`);
console.log(
  `Mode: REWARD_MODE=${config.rewardMode}. Gates: CLAIM_ENABLED=${config.claimEnabled}, BUY_ENABLED=${config.buyEnabled}, AIRDROP_ENABLED=${config.airdropEnabled}`
);
console.log(
  `Reward split: ${config.swapBalanceBps / 100}% claimed SOL buys the current Diamond Index rotation token for eligible $DIAMOND holder airdrops; ${config.sideWalletBps / 100}% routes to side wallet.`
);
console.log(`Reward rotation: ${rewardRotation}`);
console.log(`Source token mint: ${config.sourceTokenMint.toBase58()}`);
console.log(`Eligibility gate: holder must hold ${config.eligibilityMin.toLocaleString()} DIAMOND tokens`);

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

scheduleFirstRun();
