import { claimFees } from "./claim.js";
import { buyBullstr, buyReward, treasurySolBudget } from "./buy.js";
import { config } from "./config.js";
import {
  airdropTokenRewards,
  computeAllocations,
  estimateDualPayoutReserveLamports,
  estimatePayoutReserveLamports,
  treasuryRewardBalanceRaw
} from "./airdrop.js";
import { completeEpoch, failEpoch, getEpoch, persistSnapshot, recordBuy, startEpoch } from "./db.js";
import { applyHolderState } from "./holder-state.js";
import { currentEpochId } from "./time.js";
import { eligibleHoldersFromSnapshot, selectRewardRecipients, snapshotSourceHolders } from "./snapshot.js";
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

    const rewardSourceTokenLegEnabled = config.bullstrAirdropBps > 0;
    const payoutReserveLamports = rewardSourceTokenLegEnabled
      ? await estimateDualPayoutReserveLamports(holders.map((holder) => holder.wallet))
      : await estimatePayoutReserveLamports(holders.map((holder) => holder.wallet));
    const splitPlan = await treasurySolBudget(payoutReserveLamports);
    const rewardBuyLamports = (splitPlan.usableLamports * BigInt(config.swapBalanceBps)) / 10_000n;
    const bullstrBuyLamports = (splitPlan.usableLamports * BigInt(config.bullstrAirdropBps)) / 10_000n;
    const sideWalletLamports = (splitPlan.usableLamports * BigInt(config.sideWalletBps)) / 10_000n;
    console.log(
      `[${epochId}] split plan: usable=${lamportsToSol(splitPlan.usableLamports)} SOL, ansemBuy=${lamportsToSol(rewardBuyLamports)} SOL, bullstrBuy=${lamportsToSol(bullstrBuyLamports)} SOL, sideWallet=${lamportsToSol(sideWalletLamports)} SOL`
    );
    await sendSideWalletShare(epochId, sideWalletLamports);

    let buy = {
      baseSpentLamports: 0n,
      rewardReceivedRaw: 0n,
      rewardReceivedUi: 0,
      txSig: null as string | null
    };
    let bullstrBuy = {
      baseSpentLamports: 0n,
      rewardReceivedRaw: 0n,
      rewardReceivedUi: 0,
      txSig: null as string | null
    };

    if (config.rewardMode === "token") {
      buy = await buyReward(epochId, payoutReserveLamports, rewardBuyLamports);
      if (rewardSourceTokenLegEnabled) {
        bullstrBuy = await buyBullstr(epochId, payoutReserveLamports, bullstrBuyLamports);
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
    const availableBullstrRaw = rewardSourceTokenLegEnabled
      ? await treasuryRewardBalanceRaw(payoutReserveLamports, config.sourceTokenMint)
      : 0n;
    const rewardPoolRaw = (availableRewardRaw * BigInt(config.airdropRewardBps)) / 10_000n;
    const bullstrPoolRaw = rewardSourceTokenLegEnabled
      ? (availableBullstrRaw * BigInt(config.airdropRewardBps)) / 10_000n
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
      `[${epochId}] BULLSTR pool: ${bullstrPoolRaw.toString()} raw of ${availableBullstrRaw.toString()} raw treasury balance (${config.airdropRewardBps} bps)`
    );
    const allocations = rewardPoolRaw > config.minRewardRawToAirdrop ? await computeAllocations(holders, rewardPoolRaw) : [];
    const bullstrAllocations =
      bullstrPoolRaw > config.minRewardRawToAirdrop
        ? await computeAllocations(holders, bullstrPoolRaw, config.sourceTokenMint)
        : [];

    if (!allocations.length && !bullstrAllocations.length) {
      await completeEpoch(epochId, {
        eligible_count: eligibleHolders.length,
        reward_bought: buy.rewardReceivedUi.toString(),
        reward_distributed: "0",
        status: "skipped"
      });
      console.log(`[${epochId}] no ANSEM or BULLSTR reward balance, skipped airdrop`);
      return;
    }

    const tokenAirdrop = allocations.length
      ? await airdropTokenRewards(epochId, allocations, "ANSEM")
      : { settledUi: 0, settledCount: 0, stoppedForReserve: false };
    if (tokenAirdrop.stoppedForReserve && tokenAirdrop.settledCount === 0) {
      throw new Error("ANSEM airdrop stopped before sending any payouts: treasury SOL below airdrop reserve");
    }
    const bullstrAirdrop = bullstrAllocations.length
      ? await airdropTokenRewards(epochId, bullstrAllocations, "BULLSTR", config.sourceTokenMint)
      : { settledUi: 0, settledCount: 0, stoppedForReserve: false };
    if (bullstrAirdrop.stoppedForReserve && bullstrAirdrop.settledCount === 0) {
      throw new Error("BULLSTR airdrop stopped before sending any payouts: treasury SOL below airdrop reserve");
    }
    const distributed = tokenAirdrop.settledUi;
    await completeEpoch(epochId, {
      eligible_count: eligibleHolders.length,
      reward_bought: buy.rewardReceivedUi.toString(),
      reward_distributed: distributed.toString()
    });
    console.log(
      `[${epochId}] summary: eligible=${eligibleHolders.length}, ansemRecipients=${tokenAirdrop.settledCount}/${allocations.length}, bullstrRecipients=${bullstrAirdrop.settledCount}/${bullstrAllocations.length}, ansemBought=${buy.rewardReceivedUi}, bullstrBought=${bullstrBuy.rewardReceivedUi}, ansemDistributed=${distributed}, bullstrDistributed=${bullstrAirdrop.settledUi}`
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
