import { runEpoch } from "./epoch.js";
import { config } from "./config.js";
import { msUntilNextEpoch } from "./time.js";

const rewardRotation = config.rewardTokens.map((token) => token.symbol).join(" -> ") || "SOL";

console.log(`Proof of Conviction worker started. Schedule: every ${config.epochMinutes} minutes.`);
console.log(
  `Mode: REWARD_MODE=${config.rewardMode}. Gates: CLAIM_ENABLED=${config.claimEnabled}, BUY_ENABLED=${config.buyEnabled}, AIRDROP_ENABLED=${config.airdropEnabled}`
);
console.log(
  config.rewardMode === "sol"
    ? `SOL rewards: ${config.solAirdropBalanceBps / 100}% of spendable treasury balance per epoch.`
    : config.rewardMode === "alternating"
      ? `Alternating rewards: SOL -> ${rewardRotation} every adjacent ${config.epochMinutes}-minute epoch.`
    : `Token rewards: ${config.swapBalanceBps / 100}% claimed SOL buys ${rewardRotation}; ${config.sideWalletBps / 100}% routes to side wallet.`
);
console.log(`Source token mint: ${config.sourceTokenMint.toBase58()}`);
console.log(`Eligibility gate: holder must hold ${config.eligibilityMin.toLocaleString()} POC tokens without decreasing balance`);

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
