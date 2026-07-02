import { LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";
import { treasurySolBudget } from "./buy.js";
import { config, treasuryKeypair } from "./config.js";
import { connection } from "./solana.js";

const SOL_TRANSFER_FEE_CUSHION_LAMPORTS = 25_000n;

function lamportsToSol(lamports: bigint) {
  return Number(lamports) / LAMPORTS_PER_SOL;
}

function minBigInt(a: bigint, b: bigint) {
  return a < b ? a : b;
}

export async function planTreasurySplit(explicitReserveLamports?: bigint) {
  const budget = await treasurySolBudget(explicitReserveLamports);
  return {
    ...budget,
    rewardBuyLamports: (budget.usableLamports * BigInt(config.swapBalanceBps)) / 10_000n,
    longSolLamports: (budget.usableLamports * BigInt(config.longSolBps)) / 10_000n
  };
}

export async function sendLongSolLeg(epochId: string, plannedLamports: bigint, reserveLamports: bigint) {
  if (plannedLamports <= config.minLongSolLamports) {
    console.log(`[${epochId}] long SOL leg below minimum, skipping: planned=${plannedLamports}`);
    return { lamports: 0n, txSig: null as string | null };
  }

  if (!config.longSolWallet) {
    console.log(`[${epochId}] LONG_SOL_WALLET not set, skipping long SOL transfer`);
    return { lamports: 0n, txSig: null as string | null };
  }

  const treasury = treasuryKeypair();
  const currentBalance = BigInt(await connection.getBalance(treasury.publicKey, "confirmed"));
  const sendableAfterReserve =
    currentBalance > reserveLamports + SOL_TRANSFER_FEE_CUSHION_LAMPORTS
      ? currentBalance - reserveLamports - SOL_TRANSFER_FEE_CUSHION_LAMPORTS
      : 0n;
  const lamports = minBigInt(plannedLamports, sendableAfterReserve);

  if (lamports <= config.minLongSolLamports) {
    console.log(
      `[${epochId}] long SOL transfer not sendable after reserve: planned=${plannedLamports}, balance=${currentBalance}, reserve=${reserveLamports}`
    );
    return { lamports: 0n, txSig: null as string | null };
  }

  console.log(
    `[${epochId}] ${config.longSolEnabled ? "" : "[DRY-RUN] "}would send ${lamportsToSol(lamports)} SOL to long wallet ${config.longSolWallet.toBase58()}`
  );

  if (!config.longSolEnabled) {
    return { lamports, txSig: null };
  }

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: treasury.publicKey,
      toPubkey: config.longSolWallet,
      lamports: Number(lamports)
    })
  );
  tx.feePayer = treasury.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
  tx.sign(treasury);

  const simulation = await connection.simulateTransaction(tx);
  if (simulation.value.err) {
    console.error(simulation.value.logs?.join("\n"));
    throw new Error(`Long SOL transfer simulation failed: ${JSON.stringify(simulation.value.err)}`);
  }

  const txSig = await connection.sendRawTransaction(tx.serialize(), { maxRetries: 3, skipPreflight: false });
  await connection.confirmTransaction(txSig, "confirmed");
  console.log(`[${epochId}] sent ${lamportsToSol(lamports)} SOL to long wallet: ${txSig}`);
  return { lamports, txSig };
}
