import { LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";
import { config, treasuryKeypair } from "./config.js";
import { connection } from "./solana.js";

const SIDE_TRANSFER_FEE_CUSHION_LAMPORTS = 25_000n;

function lamportsToSol(lamports: bigint) {
  return Number(lamports) / LAMPORTS_PER_SOL;
}

function minBigInt(a: bigint, b: bigint) {
  return a < b ? a : b;
}

export type SideWalletTransferResult = {
  plannedLamports: bigint;
  sentLamports: bigint;
  txSig: string | null;
};

export async function routeSideWalletShare(
  epochId: string,
  plannedLamports: bigint,
  reserveLamports: bigint
): Promise<SideWalletTransferResult> {
  if (config.sideWalletBps <= 0 || !config.sideWalletPublicKey) {
    return { plannedLamports: 0n, sentLamports: 0n, txSig: null };
  }

  if (plannedLamports <= 0n) {
    console.log(`[${epochId}] side wallet split configured, but no claimed SOL available to route`);
    return { plannedLamports: 0n, sentLamports: 0n, txSig: null };
  }

  const treasury = treasuryKeypair();
  const balanceLamports = BigInt(await connection.getBalance(treasury.publicKey, "confirmed"));
  const requiredReserveLamports = reserveLamports + SIDE_TRANSFER_FEE_CUSHION_LAMPORTS;
  const availableLamports = balanceLamports > requiredReserveLamports ? balanceLamports - requiredReserveLamports : 0n;
  const sendLamports = minBigInt(plannedLamports, availableLamports);

  if (sendLamports <= 0n) {
    console.log(
      `[${epochId}] side wallet transfer skipped: balance=${balanceLamports}, reserve=${reserveLamports}, planned=${plannedLamports}`
    );
    return { plannedLamports, sentLamports: 0n, txSig: null };
  }

  if (sendLamports < plannedLamports) {
    console.log(
      `[${epochId}] side wallet transfer reduced for reserve: planned=${lamportsToSol(plannedLamports)} SOL, sendable=${lamportsToSol(sendLamports)} SOL`
    );
  }

  const destination = config.sideWalletPublicKey.toBase58();
  const mode = config.buyEnabled ? "queued live transfer" : "[DRY-RUN] would transfer";
  console.log(`[${epochId}] ${mode} ${lamportsToSol(sendLamports)} SOL to side wallet ${destination}`);

  if (!config.buyEnabled) {
    return { plannedLamports, sentLamports: 0n, txSig: null };
  }

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: treasury.publicKey,
      toPubkey: config.sideWalletPublicKey,
      lamports: sendLamports
    })
  );
  tx.feePayer = treasury.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
  tx.sign(treasury);

  const simulation = await connection.simulateTransaction(tx);
  if (simulation.value.err) {
    throw new Error(`Side wallet transfer simulation failed: ${JSON.stringify(simulation.value.err)}`);
  }

  const txSig = await connection.sendRawTransaction(tx.serialize(), { maxRetries: 3, skipPreflight: false });
  await connection.confirmTransaction(txSig, "confirmed");
  console.log(`[${epochId}] side wallet transfer settled: ${txSig}`);

  return { plannedLamports, sentLamports: sendLamports, txSig };
}
