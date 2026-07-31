import { claimFees } from "./claim.js";
import { buyToken, treasurySolBudget } from "./buy.js";
import { config } from "./config.js";
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
      `[${epochId}] snapshot ${config.eligibilityMin.toLocaleString()}+ eligible holders: ${eligibleHolders.length}/${balanceEligibleHolders.length} after holder-state rules`
    );
    const holders = selectRewardRecipients(epochId, eligibleHolders, config.maxWalletsPerEpoch);
    console.log(`[${epochId}] selected eligible holder reward recipients: ${holders.length}`);

    const payoutReserveLamports =
      config.rewardMode === "sol"
        ? await estimatePayoutReserveLamports(holders.map((holder) => holder.wallet))
        : await estimateTokenPayoutReserveLamports(
            config.rewardAssets.map((asset) => ({
              wallets: holders.map((holder) => holder.wallet),
              mint: asset.mint,
              label: `${asset.symbol}-to-eligible-${config.sourceSymbol}-holders`
            }))
          );
    const splitPlan = await treasurySolBudget(payoutReserveLamports);
    const splitBaseLamports = claimedLamports < splitPlan.usableLamports ? claimedLamports : splitPlan.usableLamports;
    const rewardBuyLamports = (splitBaseLamports * BigInt(config.swapBalanceBps)) / 10_000n;
    const sideWalletLamports = (splitBaseLamports * BigInt(config.sideWalletBps)) / 10_000n;
    console.log(
      `[${epochId}] reward plan: claimed=${lamportsToSol(claimedLamports)} SOL, usable=${lamportsToSol(splitPlan.usableLamports)} SOL, splitBase=${lamportsToSol(splitBaseLamports)} SOL, ${config.rewardSymbol}Buy=${lamportsToSol(rewardBuyLamports)} SOL, sideWallet=${lamportsToSol(sideWalletLamports)} SOL`
    );
    const sideTransfer = await routeSideWalletShare(epochId, sideWalletLamports, splitPlan.reserveLamports);

    if (!holders.length) {
      const emptyAssets = config.rewardMode === "sol" ? ["SOL"] : config.rewardAssets.map((asset) => asset.symbol);
      for (const asset of emptyAssets) {
        await recordBuy(epochId, asset, "0", "0", "0", null);
      }
      await completeEpoch(epochId, {
        eligible_count: eligibleHolders.length,
        reward_bought: "0",
        reward_distributed: "0",
        status: "skipped"
      });
      console.log(`[${epochId}] no eligible holder recipients, skipped reward distribution`);
      return;
    }
    if (sideTransfer.txSig) {
      console.log(`[${epochId}] side wallet routed ${lamportsToSol(sideTransfer.sentLamports)} SOL before reward buy`);
    }

    let totalBoughtUi = 0;
    let totalDistributedUi = 0;
    let settledRecipientTransfers = 0;
    let plannedRecipientTransfers = 0;

    if (config.rewardMode === "token") {
      const assetCount = BigInt(config.rewardAssets.length);
      const basePerAsset = assetCount > 0n ? rewardBuyLamports / assetCount : 0n;
      let remainder = assetCount > 0n ? rewardBuyLamports % assetCount : 0n;

      for (const asset of config.rewardAssets) {
        const assetBudget = basePerAsset + (remainder > 0n ? 1n : 0n);
        if (remainder > 0n) remainder -= 1n;
        const buy = await buyToken(epochId, asset.mint, asset.symbol, payoutReserveLamports, assetBudget);
        await recordBuy(
          epochId,
          asset.symbol,
          buy.baseSpentLamports.toString(),
          buy.rewardReceivedRaw.toString(),
          buy.rewardReceivedUi.toString(),
          buy.txSig
        );
        totalBoughtUi += buy.rewardReceivedUi;

        const availableRewardRaw = await treasuryRewardBalanceRaw(payoutReserveLamports, asset.mint);
        const rewardPoolRaw = (availableRewardRaw * BigInt(config.airdropRewardBps)) / 10_000n;
        console.log(
          `[${epochId}] ${asset.symbol} reward pool: ${rewardPoolRaw.toString()} raw of ${availableRewardRaw.toString()} raw treasury balance (${config.airdropRewardBps} bps)`
        );
        const allocations =
          rewardPoolRaw > config.minRewardRawToAirdrop
            ? await computeAllocations(holders, rewardPoolRaw, asset.mint)
            : [];
        plannedRecipientTransfers += allocations.length;
        if (!allocations.length) {
          console.log(`[${epochId}] no ${asset.symbol} reward balance, skipped asset airdrop`);
          continue;
        }

        const tokenAirdrop = await airdropTokenRewards(epochId, allocations, asset.symbol, asset.mint);
        if (tokenAirdrop.stoppedForReserve && tokenAirdrop.settledCount === 0) {
          throw new Error(`${asset.symbol} airdrop stopped before sending payouts: treasury SOL below airdrop reserve`);
        }
        totalDistributedUi += tokenAirdrop.settledUi;
        settledRecipientTransfers += tokenAirdrop.settledCount;
      }
    } else {
      console.log(`[${epochId}] REWARD_MODE=sol, skipping token buys`);
      const availableRewardRaw = await treasuryRewardBalanceRaw(payoutReserveLamports);
      const rewardPoolRaw = (availableRewardRaw * BigInt(config.airdropRewardBps)) / 10_000n;
      totalBoughtUi = lamportsToSol(rewardPoolRaw);
      await recordBuy(epochId, "SOL", "0", rewardPoolRaw.toString(), totalBoughtUi.toString(), null);
      const allocations = await computeSolAllocations(holders, rewardPoolRaw);
      plannedRecipientTransfers = allocations.length;
      const tokenAirdrop = allocations.length
        ? await airdropSolRewards(epochId, allocations, "SOL")
        : { settledUi: 0, settledCount: 0, stoppedForReserve: false };
      totalDistributedUi = tokenAirdrop.settledUi;
      settledRecipientTransfers = tokenAirdrop.settledCount;
    }

    const status = plannedRecipientTransfers > 0 ? undefined : "skipped";
    await completeEpoch(epochId, {
      eligible_count: eligibleHolders.length,
      reward_bought: totalBoughtUi.toString(),
      reward_distributed: totalDistributedUi.toString(),
      status
    });
    console.log(
      `[${epochId}] summary: eligibleHolders=${eligibleHolders.length}, rewardTransfers=${settledRecipientTransfers}/${plannedRecipientTransfers}, assets=${config.rewardMode === "sol" ? "SOL" : config.rewardAssets.map((asset) => asset.symbol).join(",")}, bought=${totalBoughtUi}, distributed=${totalDistributedUi}`
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
