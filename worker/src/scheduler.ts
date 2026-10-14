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
  `${config.projectName} signal agent: CAT_AGENT_ENABLED=${config.catAgentEnabled}, CAT_AGENT_EXECUTE=${config.catAgentExecute}, CAT_AGENT_ALLOW_SELLS=${config.catAgentAllowSells}`
);
console.log(
  `X agent: X_AGENT_ENABLED=${config.xAgentEnabled}, X_AGENT_POST_ENABLED=${config.xAgentPostEnabled}, X_AGENT_REPLY_TO_MENTIONS=${config.xAgentReplyToMentions}`
);
console.log(`Rewards: claimed ${config.rewardSymbol} fee assets are distributed directly to eligible NSTR holders.`);
console.log(`Source token mint: ${config.sourceTokenMint.toBase58()}`);
console.log(`Eligibility gate: holder must hold ${config.eligibilityMin.toLocaleString()} ${config.sourceSymbol} tokens`);

async function loop() {
  try {
  await runEpoch();
  await runCatAgent().catch((error) => {
    console.error(`${config.projectName} signal agent failed`, error);
  });
  await runXAgent().catch((error) => {
    console.error("X agent failed", error);
  });
  } catch { console.error("NSTR epoch failed; the next scheduled epoch will retry safely."); }
  finally { const waitMs = msUntilNextEpoch(new Date()) + 500; setTimeout(() => { void loop(); }, waitMs); }
}

export async function startScheduler() {
  console.log("First epoch run starting immediately.");
  void loop();
}
