import { claimFees } from "./claim.js";
import { buyToken, treasurySolBudget } from "./buy.js";
import { config, rewardTokenForEpoch } from "./config.js";
import {
  airdropSolRewards,
  airdropTokenRewards,
  computeAllocations,
  computeSolAllocations,
  estimatePayoutReserveLamports,
  estimateTokenPayoutReserveLamports,
  treasuryRewardBalanceRaw
} from "./airdrop.js";
import { completeEpoch, failEpoch, getEpoch, persistSnapshot, recordBuy, recordClaim, startEpoch } from "./db.js";
import { applyHolderState } from "./holder-state.js";
import { currentEpochId } from "./time.js";
import { eligibleHoldersFromSnapshot, selectRewardRecipients, snapshotSourceHolders } from "./snapshot.js";
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
    const rewardToken = rewardTokenForEpoch(epochId);
    const isSolEpoch = rewardToken.kind === "sol";
    console.log(`[${epochId}] selected reward asset: ${rewardToken.symbol}`);
    const treasury = treasuryKeypair();
    const treasuryBalanceBeforeClaim = BigInt(await connection.getBalance(treasury.publicKey, "confirmed"));
    const claim = await claimFees(epochId);
    const treasuryBalanceAfterClaim = BigInt(await connection.getBalance(treasury.publicKey, "confirmed"));
    const claimedLamports =
      claim.txSig && treasuryBalanceAfterClaim > treasuryBalanceBeforeClaim
        ? treasuryBalanceAfterClaim - treasuryBalanceBeforeClaim
        : 0n;
    console.log(`[${epochId}] claimed fee delta available for holder airdrops: ${lamportsToSol(claimedLamports)} SOL`);
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
      `[${epochId}] snapshot eligible POC holders: ${eligibleHolders.length}/${balanceEligibleHolders.length} after conviction rules`
    );
    const holders = selectRewardRecipients(epochId, eligibleHolders, config.maxWalletsPerEpoch);
    console.log(`[${epochId}] selected eligible holder reward recipients: ${holders.length}`);

    const payoutReserveLamports =
      isSolEpoch
        ? await estimatePayoutReserveLamports(holders.map((holder) => holder.wallet))
        : await estimateTokenPayoutReserveLamports([
            {
              wallets: holders.map((holder) => holder.wallet),
              mint: rewardToken.mint,
              label: `${rewardToken.symbol}-to-eligible-POC-holders`
            }
          ]);

    if (!holders.length) {
      await recordBuy(epochId, "0", "0", "0", null);
      await completeEpoch(epochId, {
        eligible_count: eligibleHolders.length,
        reward_bought: "0",
        reward_distributed: "0",
        status: "skipped"
      });
      console.log(`[${epochId}] no eligible holder recipients, skipped reward distribution`);
      return;
    }
    let buy = {
      baseSpentLamports: 0n,
      rewardReceivedRaw: 0n,
      rewardReceivedUi: 0,
      txSig: null as string | null
    };

    if (!isSolEpoch) {
      const splitPlan = await treasurySolBudget(payoutReserveLamports);
      const splitBaseLamports = claimedLamports < splitPlan.usableLamports ? claimedLamports : splitPlan.usableLamports;
      const rewardBuyLamports = (splitBaseLamports * BigInt(config.swapBalanceBps)) / 10_000n;
      const sideWalletLamports = (splitBaseLamports * BigInt(config.sideWalletBps)) / 10_000n;
      console.log(
        `[${epochId}] token reward plan: claimed=${lamportsToSol(claimedLamports)} SOL, usable=${lamportsToSol(splitPlan.usableLamports)} SOL, rewardBuy=${lamportsToSol(rewardBuyLamports)} SOL ${rewardToken.symbol}, sideWallet=${lamportsToSol(sideWalletLamports)} SOL`
      );
      const sideTransfer = await routeSideWalletShare(epochId, sideWalletLamports, splitPlan.reserveLamports);
      if (sideTransfer.txSig) {
        console.log(`[${epochId}] side wallet routed ${lamportsToSol(sideTransfer.sentLamports)} SOL before reward buy`);
      }
      buy = await buyToken(epochId, rewardToken.mint, rewardToken.symbol, payoutReserveLamports, rewardBuyLamports);
      await recordBuy(
        epochId,
        buy.baseSpentLamports.toString(),
        buy.rewardReceivedRaw.toString(),
        buy.rewardReceivedUi.toString(),
        buy.txSig
      );
    } else {
      console.log(`[${epochId}] SOL reward epoch; token buys and side-wallet routing are disabled`);
    }

    const treasuryAvailableRewardRaw = await treasuryRewardBalanceRaw(
      payoutReserveLamports,
      rewardToken.mint,
      rewardToken.kind
    );
    const epochRewardRaw = isSolEpoch ? claimedLamports : buy.rewardReceivedRaw;
    const availableRewardRaw =
      epochRewardRaw < treasuryAvailableRewardRaw ? epochRewardRaw : treasuryAvailableRewardRaw;
    const rewardBps = isSolEpoch ? config.solAirdropBalanceBps : config.airdropRewardBps;
    const rewardPoolRaw = (availableRewardRaw * BigInt(rewardBps)) / 10_000n;
    if (isSolEpoch) {
      buy = {
        baseSpentLamports: 0n,
        rewardReceivedRaw: rewardPoolRaw,
        rewardReceivedUi: lamportsToSol(rewardPoolRaw),
        txSig: null
      };
      await recordBuy(epochId, "0", rewardPoolRaw.toString(), buy.rewardReceivedUi.toString(), null);
    }
    console.log(
      `[${epochId}] reward pool: ${rewardPoolRaw.toString()} raw of ${availableRewardRaw.toString()} raw epoch-available balance (${rewardBps} bps)`
    );
    const allocations =
      isSolEpoch
        ? await computeSolAllocations(holders, rewardPoolRaw)
        : rewardPoolRaw > config.minRewardRawToAirdrop
          ? await computeAllocations(holders, rewardPoolRaw, rewardToken.mint)
          : [];

    if (!allocations.length) {
      await completeEpoch(epochId, {
        eligible_count: eligibleHolders.length,
        reward_bought: buy.rewardReceivedUi.toString(),
        reward_distributed: "0",
        status: "skipped"
      });
      console.log(`[${epochId}] no ${rewardToken.symbol} reward balance, skipped airdrop`);
      return;
    }

    const rewardAirdrop = allocations.length
        ? isSolEpoch
        ? await airdropSolRewards(epochId, allocations, "SOL")
        : await airdropTokenRewards(epochId, allocations, rewardToken.symbol, rewardToken.mint)
      : { settledUi: 0, settledCount: 0, stoppedForReserve: false };
    if (rewardAirdrop.stoppedForReserve && rewardAirdrop.settledCount === 0) {
      throw new Error("Holder airdrop stopped before sending any payouts: treasury SOL below airdrop reserve");
    }
    const distributed = rewardAirdrop.settledUi;
    await completeEpoch(epochId, {
      eligible_count: eligibleHolders.length,
      reward_bought: buy.rewardReceivedUi.toString(),
      reward_distributed: distributed.toString()
    });
    console.log(
      `[${epochId}] summary: eligibleHolders=${eligibleHolders.length}, rewardRecipients=${rewardAirdrop.settledCount}/${allocations.length}, rewardAsset=${rewardToken.symbol}, rewardPool=${buy.rewardReceivedUi}, rewardDistributed=${distributed}`
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
