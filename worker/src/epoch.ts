import { claimFees } from "./claim.js";
import { buyReward } from "./buy.js";
import { config } from "./config.js";
import {
  airdropRewards,
  applyGoldenAirdrop,
  computeAllocations,
  computeGoldenRewardPool,
  estimatePayoutReserveLamports,
  treasuryRewardBalanceRaw
} from "./airdrop.js";
import { completeEpoch, failEpoch, getEpoch, persistSnapshot, recordBuy, startEpoch } from "./db.js";
import { applyHolderState } from "./holder-state.js";
import { currentEpochId } from "./time.js";
import { eligibleHoldersFromSnapshot, selectRewardRecipients, snapshotSourceHolders } from "./snapshot.js";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

let running = false;

function lamportsToSol(lamports: bigint) {
  return Number(lamports) / LAMPORTS_PER_SOL;
}

export async function runEpoch(date = new Date()) {
  if (running) {
    console.log("[SKIP] previous epoch still running");
    return;
  }

  running = true;
  const epochId = currentEpochId(date);

  try {
    const existing = await getEpoch(epochId);
    if (existing?.status === "completed") {
      console.log(`[${epochId}] already completed, skipping`);
      return;
    }

    await startEpoch(epochId);
    await claimFees(epochId);

    const sourceHolders = await snapshotSourceHolders();
    const balanceEligibleHolders = await eligibleHoldersFromSnapshot(sourceHolders);
    const eligibleHolders = await applyHolderState(epochId, balanceEligibleHolders, sourceHolders);
    await persistSnapshot(
      epochId,
      eligibleHolders.map((holder) => ({
        wallet: holder.wallet,
        source_balance: holder.uiBalance.toString(),
        source_balance_raw: holder.rawBalance.toString(),
        holder_pct: holder.holderPct.toString()
      }))
    );
    console.log(
      `[${epochId}] snapshot eligible holders: ${eligibleHolders.length}/${balanceEligibleHolders.length} after holder-state rules`
    );
    const selectedHolders = selectRewardRecipients(epochId, eligibleHolders);
    const holders = selectedHolders;
    console.log(`[${epochId}] selected reward recipients: ${holders.length}`);

    if (!holders.length) {
      await recordBuy(epochId, "0", "0", "0", null);
      await completeEpoch(epochId, {
        eligible_count: eligibleHolders.length,
        reward_bought: "0",
        reward_distributed: "0",
        status: "skipped"
      });
      console.log(`[${epochId}] no reward-ready holders, skipped reward distribution`);
      return;
    }

    const payoutReserveLamports = await estimatePayoutReserveLamports(holders.map((holder) => holder.wallet));
    let buy = {
      baseSpentLamports: 0n,
      rewardReceivedRaw: 0n,
      rewardReceivedUi: 0,
      txSig: null as string | null
    };

    if (config.rewardMode === "token") {
      buy = await buyReward(epochId, payoutReserveLamports);
      await recordBuy(
        epochId,
        buy.baseSpentLamports.toString(),
        buy.rewardReceivedRaw.toString(),
        buy.rewardReceivedUi.toString(),
        buy.txSig
      );
    } else {
      console.log(`[${epochId}] REWARD_MODE=sol, skipping buy; creator fees remain SOL for direct airdrop`);
    }

    const availableRewardRaw = await treasuryRewardBalanceRaw(payoutReserveLamports);
    const rewardPoolRaw = (availableRewardRaw * BigInt(config.airdropRewardBps)) / 10_000n;
    if (config.rewardMode === "sol") {
      buy = {
        baseSpentLamports: 0n,
        rewardReceivedRaw: rewardPoolRaw,
        rewardReceivedUi: lamportsToSol(rewardPoolRaw),
        txSig: null
      };
      await recordBuy(epochId, "0", rewardPoolRaw.toString(), buy.rewardReceivedUi.toString(), null);
    }
    console.log(
      `[${epochId}] reward pool: ${rewardPoolRaw.toString()} raw of ${availableRewardRaw.toString()} raw treasury balance (${config.airdropRewardBps} bps)`
    );
    if (rewardPoolRaw <= config.minRewardRawToAirdrop) {
      await completeEpoch(epochId, {
        eligible_count: eligibleHolders.length,
        reward_bought: buy.rewardReceivedUi.toString(),
        reward_distributed: "0",
        status: "skipped"
      });
      console.log(`[${epochId}] insufficient usable SOL after 0.30 reserve and 0.05 buffer, skipped epoch`);
      return;
    }
    const goldenPool = await computeGoldenRewardPool(epochId, holders, rewardPoolRaw);
    const allocations = await computeAllocations(holders, goldenPool.rewardPoolRaw);
    if (!allocations.length) {
      await completeEpoch(epochId, {
        eligible_count: eligibleHolders.length,
        reward_bought: buy.rewardReceivedUi.toString(),
        reward_distributed: "0",
        status: "skipped"
      });
      console.log(`[${epochId}] no reward balance or eligible holders, skipped airdrop`);
      return;
    }

    const golden = await applyGoldenAirdrop(epochId, holders, allocations, rewardPoolRaw, goldenPool.snapshotHash);
    const airdrop = await airdropRewards(epochId, allocations);
    if (airdrop.stoppedForReserve && airdrop.settledCount === 0) {
      throw new Error("Airdrop stopped before sending any payouts: treasury SOL below airdrop reserve");
    }
    const distributed = airdrop.settledUi;
    await completeEpoch(epochId, {
      eligible_count: eligibleHolders.length,
      reward_bought: buy.rewardReceivedUi.toString(),
      reward_distributed: distributed.toString(),
      golden_winner_wallet: golden.wallet,
      golden_base_reward: golden.baseRewardUi.toString(),
      golden_base_reward_raw: golden.baseRewardRaw.toString(),
      golden_bonus_reward: golden.bonusRewardUi.toString(),
      golden_bonus_reward_raw: golden.bonusRewardRaw.toString(),
      golden_multiplier: golden.multiplier,
      golden_capped: golden.capped,
      golden_snapshot_hash: golden.snapshotHash
    });
    console.log(
      `[${epochId}] summary: eligible=${eligibleHolders.length}, recipients=${airdrop.settledCount}/${allocations.length}, bought=${buy.rewardReceivedUi}, distributed=${distributed}, golden=${golden.wallet ?? "none"}`
    );
  } catch (error) {
    await failEpoch(epochId, error).catch((dbError) => {
      console.error(`[${epochId}] failed to mark epoch failed`, dbError);
    });
    console.error(`[${epochId}] epoch failed`, error);
  } finally {
    running = false;
  }
}
