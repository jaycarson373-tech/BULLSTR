import { claimFees } from "./claim.js";
import { buyReward, treasurySolBudget } from "./buy.js";
import { config } from "./config.js";
import {
  airdropTokenRewards,
  computeAllocations,
  estimateTokenPayoutReserveLamports,
  selectSherwoodPrizeRecipients,
  treasuryRewardBalanceRaw
} from "./airdrop.js";
import { completeEpoch, failEpoch, getEpoch, persistSnapshot, recordBuy, recordClaim, startEpoch } from "./db.js";
import { applyHolderState } from "./holder-state.js";
import { currentEpochId } from "./time.js";
import { eligibleHoldersFromSnapshot, snapshotSourceHolders } from "./snapshot.js";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { connection } from "./solana.js";
import { treasuryKeypair } from "./config.js";
import { routeSideWalletShare } from "./side-wallet.js";

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
    const treasury = treasuryKeypair();
    const treasuryBalanceBeforeClaim = BigInt(await connection.getBalance(treasury.publicKey, "confirmed"));
    const claim = await claimFees(epochId);
    const treasuryBalanceAfterClaim = BigInt(await connection.getBalance(treasury.publicKey, "confirmed"));
    const claimedLamports =
      claim.txSig && treasuryBalanceAfterClaim > treasuryBalanceBeforeClaim
        ? treasuryBalanceAfterClaim - treasuryBalanceBeforeClaim
        : 0n;
    console.log(`[${epochId}] claimed fee delta available for leaderboard airdrops: ${lamportsToSol(claimedLamports)} SOL`);
    if (claim.txSig && claimedLamports > 0n) {
      await recordClaim(epochId, lamportsToSol(claimedLamports).toString(), claim.txSig);
    }

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
      `[${epochId}] snapshot 1M+ eligible holders: ${eligibleHolders.length}/${balanceEligibleHolders.length} after holder-state rules`
    );
    const holders = await selectSherwoodPrizeRecipients(eligibleHolders);
    console.log(`[${epochId}] selected eligible Sherwood prize recipients from leaderboard: ${holders.length}`);

    const payoutReserveLamports = await estimateTokenPayoutReserveLamports([
      { wallets: holders.map((holder) => holder.wallet), mint: config.rewardTokenMint, label: "HoodX-to-eligible-top-15-players" }
    ]);
    const splitPlan = await treasurySolBudget(payoutReserveLamports);
    const splitBaseLamports = claimedLamports < splitPlan.usableLamports ? claimedLamports : splitPlan.usableLamports;
    const rewardBuyLamports = (splitBaseLamports * BigInt(config.swapBalanceBps)) / 10_000n;
    const sideWalletLamports = (splitBaseLamports * BigInt(config.sideWalletBps)) / 10_000n;
    console.log(
      `[${epochId}] reward plan: claimed=${lamportsToSol(claimedLamports)} SOL, usable=${lamportsToSol(splitPlan.usableLamports)} SOL, splitBase=${lamportsToSol(splitBaseLamports)} SOL, hoodBuy=${lamportsToSol(rewardBuyLamports)} SOL, sideWallet=${lamportsToSol(sideWalletLamports)} SOL`
    );
    const sideTransfer = await routeSideWalletShare(epochId, sideWalletLamports, splitPlan.reserveLamports);

    if (!holders.length) {
      await recordBuy(epochId, "0", "0", "0", null);
      await completeEpoch(epochId, {
        eligible_count: eligibleHolders.length,
        reward_bought: "0",
        reward_distributed: "0",
        status: "skipped"
      });
      console.log(`[${epochId}] no eligible top-15 leaderboard players, skipped reward distribution`);
      return;
    }
    if (sideTransfer.txSig) {
      console.log(`[${epochId}] side wallet routed ${lamportsToSol(sideTransfer.sentLamports)} SOL before reward buy`);
    }

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
      console.log(`[${epochId}] REWARD_MODE=sol, skipping token buys`);
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
    const allocations = rewardPoolRaw > config.minRewardRawToAirdrop ? await computeAllocations(holders, rewardPoolRaw) : [];

    if (!allocations.length) {
      await completeEpoch(epochId, {
        eligible_count: eligibleHolders.length,
        reward_bought: buy.rewardReceivedUi.toString(),
        reward_distributed: "0",
        status: "skipped"
      });
      console.log(`[${epochId}] no HoodX reward balance, skipped airdrop`);
      return;
    }

    const tokenAirdrop = allocations.length
      ? await airdropTokenRewards(epochId, allocations, "HoodX")
      : { settledUi: 0, settledCount: 0, stoppedForReserve: false };
    if (tokenAirdrop.stoppedForReserve && tokenAirdrop.settledCount === 0) {
      throw new Error("Sherwood leaderboard airdrop stopped before sending any payouts: treasury SOL below airdrop reserve");
    }
    const distributed = tokenAirdrop.settledUi;
    await completeEpoch(epochId, {
      eligible_count: eligibleHolders.length,
      reward_bought: buy.rewardReceivedUi.toString(),
      reward_distributed: distributed.toString()
    });
    console.log(
      `[${epochId}] summary: eligibleHolders=${eligibleHolders.length}, prizeRecipients=${tokenAirdrop.settledCount}/${allocations.length}, hoodBought=${buy.rewardReceivedUi}, hoodDistributed=${distributed}`
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
