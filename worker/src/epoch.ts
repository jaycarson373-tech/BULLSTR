import { claimFees } from "./claim.js";
import { buyIndexToken, buyReward, treasurySolBudget } from "./buy.js";
import { config } from "./config.js";
import {
  airdropTokenRewards,
  computeAllocations,
  estimateTokenPayoutReserveLamports,
  treasuryRewardBalanceRaw
} from "./airdrop.js";
import { completeEpoch, failEpoch, getEpoch, persistSnapshot, recordBuy, startEpoch } from "./db.js";
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
  const sideWalletLabel = sideWallet?.toBase58() ?? "SIDE_WALLET_PUBLIC_KEY";
  console.log(
    `[${epochId}] ${config.airdropEnabled ? "" : "[DRY-RUN] "}would send ${lamportsToSol(lamports)} SOL (${config.sideWalletBps / 100}%) to side wallet ${sideWalletLabel}`
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
    console.log(`[${epochId}] selected ANSEM reward recipients from AI6900 holders: ${holders.length}`);

    const indexRewardEnabled = config.indexAirdropBps > 0;
    const ansemCandidateHolders = indexRewardEnabled
      ? await topHoldersForMint(config.rewardTokenMint, config.indexHolderLimit, "ANSEM")
      : [];
    const ansemHolders = indexRewardEnabled
      ? selectRewardRecipients(`${epochId}:index`, ansemCandidateHolders, config.indexWalletsPerEpoch)
      : [];
    console.log(
      `[${epochId}] selected AI6900 reward recipients from top ANSEM holders: ${ansemHolders.length}/${ansemCandidateHolders.length}`
    );

    if (!holders.length && !ansemHolders.length) {
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
      { wallets: holders.map((holder) => holder.wallet), mint: config.rewardTokenMint, label: "ANSEM-to-AI6900-holders" },
      { wallets: ansemHolders.map((holder) => holder.wallet), mint: config.sourceTokenMint, label: "AI6900-to-ANSEM-holders" }
    ]);
    const splitPlan = await treasurySolBudget(payoutReserveLamports);
    const rewardBuyLamports = (splitPlan.usableLamports * BigInt(config.swapBalanceBps)) / 10_000n;
    const indexBuyLamports = (splitPlan.usableLamports * BigInt(config.indexAirdropBps)) / 10_000n;
    const sideWalletLamports = (splitPlan.usableLamports * BigInt(config.sideWalletBps)) / 10_000n;
    console.log(
      `[${epochId}] split plan: usable=${lamportsToSol(splitPlan.usableLamports)} SOL, ansemBuy=${lamportsToSol(rewardBuyLamports)} SOL, anstrBuy=${lamportsToSol(indexBuyLamports)} SOL, sideWallet=${lamportsToSol(sideWalletLamports)} SOL`
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
      `[${epochId}] AI6900 pool: ${indexPoolRaw.toString()} raw of ${availableIndexRaw.toString()} raw treasury balance (${config.airdropRewardBps} bps)`
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
      console.log(`[${epochId}] no ANSEM or AI6900 reward balance, skipped airdrop`);
      return;
    }

    const tokenAirdrop = allocations.length
      ? await airdropTokenRewards(epochId, allocations, "ANSEM")
      : { settledUi: 0, settledCount: 0, stoppedForReserve: false };
    if (tokenAirdrop.stoppedForReserve && tokenAirdrop.settledCount === 0) {
      throw new Error("ANSEM airdrop stopped before sending any payouts: treasury SOL below airdrop reserve");
    }
    const indexAirdrop = indexAllocations.length
      ? await airdropTokenRewards(epochId, indexAllocations, "AI6900", config.sourceTokenMint)
      : { settledUi: 0, settledCount: 0, stoppedForReserve: false };
    if (indexAirdrop.stoppedForReserve && indexAirdrop.settledCount === 0) {
      throw new Error("AI6900 airdrop stopped before sending any payouts: treasury SOL below airdrop reserve");
    }
    const distributed = tokenAirdrop.settledUi;
    await completeEpoch(epochId, {
      eligible_count: eligibleHolders.length,
      reward_bought: buy.rewardReceivedUi.toString(),
      reward_distributed: distributed.toString()
    });
    console.log(
      `[${epochId}] summary: eligible=${eligibleHolders.length}, ansemRecipients=${tokenAirdrop.settledCount}/${allocations.length}, anstrRecipients=${indexAirdrop.settledCount}/${indexAllocations.length}, ansemBought=${buy.rewardReceivedUi}, anstrBought=${indexBuy.rewardReceivedUi}, ansemDistributed=${distributed}, anstrDistributed=${indexAirdrop.settledUi}`
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
