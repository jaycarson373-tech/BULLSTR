import { runEpoch } from "./epoch.js";
import { config } from "./config.js";
import { msUntilNextEpoch } from "./time.js";

console.log(`AI Index worker started. Schedule: every ${config.epochMinutes} minutes.`);
console.log(
  `Mode: REWARD_MODE=${config.rewardMode}. Gates: CLAIM_ENABLED=${config.claimEnabled}, BUY_ENABLED=${config.buyEnabled}, AIRDROP_ENABLED=${config.airdropEnabled}`
);
console.log(
  `Reward split: ${config.swapBalanceBps / 100}% ANSEM to source holders, ${config.indexAirdropBps / 100}% AI6900 to ANSEM holders, ${config.sideWalletBps / 100}% side wallet.`
);
console.log(`Source token mint: ${config.sourceTokenMint.toBase58()}`);
console.log(`Eligibility minimum: ${config.eligibilityMin.toLocaleString()} source tokens`);

async function loop() {
  await runEpoch();
  const waitMs = msUntilNextEpoch(new Date()) + 500;
  setTimeout(loop, waitMs);
}

function scheduleFirstRun() {
  const waitMs = msUntilNextEpoch(new Date()) + 500;
  console.log(`First epoch run scheduled in ${Math.round(waitMs / 1000)}s.`);
  setTimeout(() => {
    loop().catch((error) => {
      console.error("worker crashed", error);
      process.exit(1);
    });
  }, waitMs);
}

scheduleFirstRun();
