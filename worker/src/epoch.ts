import { claimFees } from "./claim.js";
import { buyReward, treasurySolBudget } from "./buy.js";
import { config } from "./config.js";
import {
  airdropSolRewards,
  airdropTokenRewards,
  applyGoldenAirdrop,
  computeAllocations,
  computeGoldenRewardPool,
  computeSolAllocations,
  estimateDualPayoutReserveLamports,
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

    const payoutReserveLamports = await estimateDualPayoutReserveLamports(holders.map((holder) => holder.wallet));
    const splitPlan = await treasurySolBudget(payoutReserveLamports);
    const rewardBuyLamports = (splitPlan.usableLamports * BigInt(config.swapBalanceBps)) / 10_000n;
    const solAirdropLamports = (splitPlan.usableLamports * BigInt(config.solAirdropBps)) / 10_000n;
    console.log(
      `[${epochId}] split plan: usable=${lamportsToSol(splitPlan.usableLamports)} SOL, ansemBuy=${lamportsToSol(rewardBuyLamports)} SOL, solAirdrop=${lamportsToSol(solAirdropLamports)} SOL`
    );
    let buy = {
      baseSpentLamports: 0n,
      rewardReceivedRaw: 0n,
      rewardReceivedUi: 0,
      txSig: null as string | null
    };

    if (config.rewardMode === "token") {
      buy = await buyReward(epochId, payoutReserveLamports, rewardBuyLamports);
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
    const goldenPool =
      rewardPoolRaw > config.minRewardRawToAirdrop
        ? await computeGoldenRewardPool(epochId, holders, rewardPoolRaw)
        : { rewardPoolRaw: 0n, snapshotHash: null };
    const allocations = goldenPool.rewardPoolRaw > 0n ? await computeAllocations(holders, goldenPool.rewardPoolRaw) : [];
    const solAllocations = await computeSolAllocations(holders, solAirdropLamports);

    if (!allocations.length && !solAllocations.length) {
      await completeEpoch(epochId, {
        eligible_count: eligibleHolders.length,
        reward_bought: buy.rewardReceivedUi.toString(),
        reward_distributed: "0",
        status: "skipped"
      });
      console.log(`[${epochId}] no ANSEM or SOL reward balance, skipped airdrop`);
      return;
    }

    const golden = allocations.length
      ? await applyGoldenAirdrop(epochId, holders, allocations, rewardPoolRaw, goldenPool.snapshotHash)
      : {
          wallet: null,
          baseRewardRaw: 0n,
          baseRewardUi: 0,
          bonusRewardRaw: 0n,
          bonusRewardUi: 0,
          multiplier: 1,
          capped: false,
          snapshotHash: null
        };
    const tokenAirdrop = allocations.length
      ? await airdropTokenRewards(epochId, allocations, "ANSEM")
      : { settledUi: 0, settledCount: 0, stoppedForReserve: false };
    if (tokenAirdrop.stoppedForReserve && tokenAirdrop.settledCount === 0) {
      throw new Error("ANSEM airdrop stopped before sending any payouts: treasury SOL below airdrop reserve");
    }
    const solAirdrop = solAllocations.length
      ? await airdropSolRewards(epochId, solAllocations, "SOL")
      : { settledUi: 0, settledCount: 0, stoppedForReserve: false };
    if (solAirdrop.stoppedForReserve && solAirdrop.settledCount === 0) {
      throw new Error("SOL airdrop stopped before sending any payouts: treasury SOL below airdrop reserve");
    }
    const distributed = tokenAirdrop.settledUi;
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
      `[${epochId}] summary: eligible=${eligibleHolders.length}, ansemRecipients=${tokenAirdrop.settledCount}/${allocations.length}, solRecipients=${solAirdrop.settledCount}/${solAllocations.length}, bought=${buy.rewardReceivedUi}, ansemDistributed=${distributed}, solDistributed=${solAirdrop.settledUi}, golden=${golden.wallet ?? "none"}`
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
