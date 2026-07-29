import { runCatAgent } from "./agent.js";
import { runEpoch } from "./epoch.js";
import { runXAgent } from "./x-agent.js";
import { config } from "./config.js";
import { msUntilNextEpoch } from "./time.js";

console.log(`${config.projectName} worker started. Schedule: every ${config.epochMinutes} minutes.`);
console.log(
  `Mode: REWARD_MODE=${config.rewardMode}. Gates: CLAIM_ENABLED=${config.claimEnabled}, BUY_ENABLED=${config.buyEnabled}, AIRDROP_ENABLED=${config.airdropEnabled}`
);
console.log(
  `CryptoCat agent: CAT_AGENT_ENABLED=${config.catAgentEnabled}, CAT_AGENT_EXECUTE=${config.catAgentExecute}, CAT_AGENT_ALLOW_SELLS=${config.catAgentAllowSells}`
);
console.log(
  `X agent: X_AGENT_ENABLED=${config.xAgentEnabled}, X_AGENT_POST_ENABLED=${config.xAgentPostEnabled}, X_AGENT_REPLY_TO_MENTIONS=${config.xAgentReplyToMentions}`
);
console.log(
  `Reward split: ${config.swapBalanceBps / 100}% claimed SOL buys ${config.rewardSymbol} for eligible ${config.sourceSymbol} holder actions; ${config.sideWalletBps / 100}% routes to side wallet.`
);
console.log(`Source token mint: ${config.sourceTokenMint.toBase58()}`);
console.log(`Eligibility gate: holder must hold ${config.eligibilityMin.toLocaleString()} ${config.sourceSymbol} tokens`);

async function loop() {
  await runEpoch();
  await runCatAgent().catch((error) => {
    console.error("CryptoCat agent failed", error);
  });
  await runXAgent().catch((error) => {
    console.error("X agent failed", error);
  });
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
