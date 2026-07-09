import { claimFees } from "./claim.js";
import { buyIndexToken, buyReward, treasurySolBudget } from "./buy.js";
import { config } from "./config.js";
import {
  airdropTokenRewards,
  computeAllocations,
  estimateTokenPayoutReserveLamports,
  treasuryRewardBalanceRaw
} from "./airdrop.js";
import { completeEpoch, failEpoch, getEpoch, persistSnapshot, recordBuy, recordClaim, startEpoch } from "./db.js";
import { applyHolderState } from "./holder-state.js";
import { currentEpochId } from "./time.js";
import { eligibleHoldersFromSnapshot, selectRewardRecipients, snapshotSourceHolders, topHoldersForMint } from "./snapshot.js";
import { LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";
import { connection } from "./solana.js";
import { treasuryKeypair } from "./config.js";

let running = false;

function lamportsToSol(lamports: bigint) {
  return Number(lamports) / LAMPORTS_PER_SOL;
}

async function sendSideWalletShare(epochId: string, lamports: bigint) {
  if (config.sideWalletBps <= 0 || lamports <= 0n) return null;

  const sideWallet = config.sideWalletPublicKey;
  const rewardWalletLabel = sideWallet?.toBase58() ?? "SIDE_WALLET_PUBLIC_KEY";
  console.log(
    `[${epochId}] ${config.airdropEnabled ? "" : "[DRY-RUN] "}would send ${lamportsToSol(lamports)} SOL (${config.sideWalletBps / 100}%) to reward wallet ${rewardWalletLabel}`
  );

  if (!config.airdropEnabled) return null;
  if (!sideWallet) {
    throw new Error("Missing required env SIDE_WALLET_PUBLIC_KEY for live side-wallet transfer");
  }

  const treasury = treasuryKeypair();
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: treasury.publicKey,
      toPubkey: sideWallet,
      lamports
    })
  );
  tx.feePayer = treasury.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
  tx.sign(treasury);

  const simulation = await connection.simulateTransaction(tx);
  if (simulation.value.err) {
    throw new Error(`Side-wallet transfer simulation failed: ${JSON.stringify(simulation.value.err)}`);
  }

  const txSig = await connection.sendRawTransaction(tx.serialize(), { maxRetries: 3, skipPreflight: false });
  await connection.confirmTransaction(txSig, "confirmed");
  console.log(`[${epochId}] side-wallet transfer settled: ${txSig}`);
  return txSig;
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
      `[${epochId}] snapshot eligible holders: ${eligibleHolders.length}/${balanceEligibleHolders.length} after holder-state rules`
    );
    const selectedHolders = selectRewardRecipients(epochId, eligibleHolders);
    const holders = selectedHolders;
    console.log(`[${epochId}] selected automatic HOOD reward recipients from 100K+ holders: ${holders.length}`);

    const indexRewardEnabled = config.indexAirdropBps > 0;
    const ansemCandidateHolders = indexRewardEnabled
      ? await topHoldersForMint(config.rewardTokenMint, config.indexHolderLimit, "HOOD")
      : [];
    const ansemHolders = indexRewardEnabled
      ? selectRewardRecipients(`${epochId}:index`, ansemCandidateHolders, config.indexWalletsPerEpoch)
      : [];
    if (indexRewardEnabled) {
      console.log(
        `[${epochId}] selected secondary reward recipients: ${ansemHolders.length}/${ansemCandidateHolders.length}`
      );
    }

    if (!holders.length && !ansemHolders.length && config.sideWalletBps <= 0) {
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

    const payoutReserveLamports = await estimateTokenPayoutReserveLamports([
      { wallets: holders.map((holder) => holder.wallet), mint: config.rewardTokenMint, label: "HOOD-to-100K-holders" },
      { wallets: ansemHolders.map((holder) => holder.wallet), mint: config.sourceTokenMint, label: "secondary-rewards" }
    ]);
    const splitPlan = await treasurySolBudget(payoutReserveLamports);
    const splitBaseLamports = claimedLamports < splitPlan.usableLamports ? claimedLamports : splitPlan.usableLamports;
    const rewardBuyLamports = (splitBaseLamports * BigInt(config.swapBalanceBps)) / 10_000n;
    const indexBuyLamports = (splitBaseLamports * BigInt(config.indexAirdropBps)) / 10_000n;
    const sideWalletLamports = (splitBaseLamports * BigInt(config.sideWalletBps)) / 10_000n;
    console.log(
      `[${epochId}] reward plan: claimed=${lamportsToSol(claimedLamports)} SOL, usable=${lamportsToSol(splitPlan.usableLamports)} SOL, splitBase=${lamportsToSol(splitBaseLamports)} SOL, hoodBuy=${lamportsToSol(rewardBuyLamports)} SOL, secondaryBuy=${lamportsToSol(indexBuyLamports)} SOL, sideWallet=${lamportsToSol(sideWalletLamports)} SOL`
    );
    await sendSideWalletShare(epochId, sideWalletLamports);

    let buy = {
      baseSpentLamports: 0n,
      rewardReceivedRaw: 0n,
      rewardReceivedUi: 0,
      txSig: null as string | null
    };
    let indexBuy = {
      baseSpentLamports: 0n,
      rewardReceivedRaw: 0n,
      rewardReceivedUi: 0,
      txSig: null as string | null
    };

    if (config.rewardMode === "token") {
      buy = await buyReward(epochId, payoutReserveLamports, rewardBuyLamports);
      if (indexRewardEnabled) {
        indexBuy = await buyIndexToken(epochId, payoutReserveLamports, indexBuyLamports);
      }
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
    const availableIndexRaw = indexRewardEnabled
      ? await treasuryRewardBalanceRaw(payoutReserveLamports, config.sourceTokenMint)
      : 0n;
    const rewardPoolRaw = (availableRewardRaw * BigInt(config.airdropRewardBps)) / 10_000n;
    const indexPoolRaw = indexRewardEnabled
      ? (availableIndexRaw * BigInt(config.airdropRewardBps)) / 10_000n
      : 0n;
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
    console.log(
      `[${epochId}] secondary reward pool: ${indexPoolRaw.toString()} raw of ${availableIndexRaw.toString()} raw treasury balance (${config.airdropRewardBps} bps)`
    );
    const allocations = rewardPoolRaw > config.minRewardRawToAirdrop ? await computeAllocations(holders, rewardPoolRaw) : [];
    const indexAllocations =
      indexPoolRaw > config.minRewardRawToAirdrop
        ? await computeAllocations(ansemHolders, indexPoolRaw, config.sourceTokenMint)
        : [];

    if (!allocations.length && !indexAllocations.length) {
      await completeEpoch(epochId, {
        eligible_count: eligibleHolders.length,
        reward_bought: buy.rewardReceivedUi.toString(),
        reward_distributed: "0",
        status: "skipped"
      });
      console.log(`[${epochId}] no HOOD reward balance, skipped airdrop`);
      return;
    }

    const tokenAirdrop = allocations.length
      ? await airdropTokenRewards(epochId, allocations, "HOOD")
      : { settledUi: 0, settledCount: 0, stoppedForReserve: false };
    if (tokenAirdrop.stoppedForReserve && tokenAirdrop.settledCount === 0) {
      throw new Error("HOOD holder airdrop stopped before sending any payouts: treasury SOL below airdrop reserve");
    }
    const indexAirdrop = indexAllocations.length
      ? await airdropTokenRewards(epochId, indexAllocations, "HOOD6900", config.sourceTokenMint)
      : { settledUi: 0, settledCount: 0, stoppedForReserve: false };
    if (indexAirdrop.stoppedForReserve && indexAirdrop.settledCount === 0) {
      throw new Error("Secondary airdrop stopped before sending any payouts: treasury SOL below airdrop reserve");
    }
    const distributed = tokenAirdrop.settledUi;
    await completeEpoch(epochId, {
      eligible_count: eligibleHolders.length,
      reward_bought: buy.rewardReceivedUi.toString(),
      reward_distributed: distributed.toString()
    });
    console.log(
      `[${epochId}] summary: eligible=${eligibleHolders.length}, holderRecipients=${tokenAirdrop.settledCount}/${allocations.length}, secondaryRecipients=${indexAirdrop.settledCount}/${indexAllocations.length}, hoodBought=${buy.rewardReceivedUi}, secondaryBought=${indexBuy.rewardReceivedUi}, hoodDistributed=${distributed}, secondaryDistributed=${indexAirdrop.settledUi}`
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
