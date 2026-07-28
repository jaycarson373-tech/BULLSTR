import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  ACCOUNT_SIZE,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  getMint
} from "@solana/spl-token";
import { config, treasuryKeypair } from "./config.js";
import { connection } from "./solana.js";
import { dryRunPayout, failPayout, planPayout, settlePayout } from "./db.js";
import type { Holder } from "./snapshot.js";

const AIRDROP_TRANSFER_FEE_CUSHION_LAMPORTS = 25_000n;

export type Allocation = {
  wallet: string;
  amount: bigint;
  uiAmount: number;
  normalAmount: bigint;
  normalUiAmount: number;
};

export type AirdropResult = {
  signatures: string[];
  settledCount: number;
  settledRaw: bigint;
  settledUi: number;
  stoppedForReserve: boolean;
};

type PreparedAllocation = Allocation & {
  owner: PublicKey;
  destinationAta: PublicKey;
};

type WeightedHolder = {
  holder: Holder;
  baseWeight: bigint;
  weight: bigint;
};

type PayoutReserve = {
  totalLamports: bigint;
  reserveLamports: bigint;
  estimatedRentLamports: bigint;
  estimatedFeeLamports: bigint;
  missingAtas: Set<string>;
};

async function tokenProgramForMint(mint = config.rewardTokenMint) {
  if (config.rewardMode === "sol") throw new Error("Token mint lookup is not used when REWARD_MODE=sol");
  const info = await connection.getAccountInfo(mint);
  if (!info) throw new Error(`Reward mint not found: ${mint.toBase58()}`);
  if (info.owner.equals(TOKEN_PROGRAM_ID)) return TOKEN_PROGRAM_ID;
  if (info.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  throw new Error(`Unsupported reward token program: ${info.owner.toBase58()}`);
}

function rawToUi(raw: bigint, decimals: number) {
  return Number(raw) / 10 ** decimals;
}

async function rewardDecimals(mint = config.rewardTokenMint) {
  if (config.rewardMode === "sol") return 9;
  const tokenProgram = await tokenProgramForMint(mint);
  const mintInfo = await getMint(connection, mint, "confirmed", tokenProgram);
  return mintInfo.decimals;
}

function rewardAtaForOwner(owner: PublicKey, tokenProgram: PublicKey, mint = config.rewardTokenMint) {
  return getAssociatedTokenAddressSync(
    mint,
    owner,
    true,
    tokenProgram,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
}

function computeStrategyWeights(holders: Holder[]): WeightedHolder[] {
  return holders
    .map((holder) => {
      const holderBps = BigInt(holder.multiplierBps ?? 10_000);
      const baseWeight = holder.rawBalance;
      const weight = (baseWeight * holderBps) / 10_000n;

      console.log(
        `[WEIGHT] wallet=${holder.wallet} source=${holder.uiBalance} baseWeight=${baseWeight.toString()} holdBps=${holderBps.toString()} weight=${weight.toString()}`
      );

      return {
        holder,
        baseWeight,
        weight
      };
    })
    .filter((holder) => holder.baseWeight > 0n && holder.weight > 0n);
}

export async function treasuryRewardBalanceRaw(reserveLamports = 0n, mint = config.rewardTokenMint) {
  const treasury = treasuryKeypair();
  if (config.rewardMode === "sol") {
    const balance = BigInt(await connection.getBalance(treasury.publicKey, "confirmed"));
    return balance > reserveLamports ? balance - reserveLamports : 0n;
  }

  const tokenProgram = await tokenProgramForMint(mint);
  const ata = getAssociatedTokenAddressSync(mint, treasury.publicKey, false, tokenProgram);
  try {
    const balance = await connection.getTokenAccountBalance(ata, "confirmed");
    return BigInt(balance.value.amount);
  } catch {
    return 0n;
  }
}

export async function computeAllocations(holders: Holder[], rewardRaw: bigint, mint = config.rewardTokenMint): Promise<Allocation[]> {
  if (!holders.length || rewardRaw <= config.minRewardRawToAirdrop) return [];
  const decimals = await rewardDecimals(mint);
  return computeAllocationsWithDecimals(holders, rewardRaw, decimals);
}

async function computeAllocationsWithDecimals(holders: Holder[], rewardRaw: bigint, decimals: number): Promise<Allocation[]> {
  const weightedHolders = computeStrategyWeights(holders);
  const totalBaseWeight = weightedHolders.reduce((sum, holder) => sum + holder.baseWeight, 0n);
  const totalWeight = weightedHolders.reduce((sum, holder) => sum + holder.weight, 0n);
  if (totalBaseWeight <= 0n || totalWeight <= 0n) return [];

  return weightedHolders
    .map(({ holder, baseWeight, weight }) => {
      const amount = (rewardRaw * weight) / totalWeight;
      const normalAmount = (rewardRaw * baseWeight) / totalBaseWeight;
      return {
        wallet: holder.wallet,
        amount,
        uiAmount: rawToUi(amount, decimals),
        normalAmount,
        normalUiAmount: rawToUi(normalAmount, decimals)
      };
    })
    .filter((allocation) => allocation.amount > 0n);
}

export async function computeSolAllocations(holders: Holder[], solLamports: bigint): Promise<Allocation[]> {
  if (!holders.length || solLamports <= config.minSolRewardLamportsToAirdrop) return [];
  return computeAllocationsWithDecimals(holders, solLamports, 9);
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function payoutReserveForAtas(atas: PublicKey[]): Promise<PayoutReserve> {
  const reserveLamports = BigInt(Math.floor(config.airdropSolReserve * LAMPORTS_PER_SOL));
  const batchCount = BigInt(Math.max(1, Math.ceil(atas.length / config.airdropBatchSize)));
  const estimatedFeeLamports = batchCount * AIRDROP_TRANSFER_FEE_CUSHION_LAMPORTS;
  const accounts = atas.length ? await connection.getMultipleAccountsInfo(atas, "confirmed") : [];
  const missingAtas = new Set<string>();

  accounts.forEach((account, index) => {
    if (!account) missingAtas.add(atas[index].toBase58());
  });

  const rentLamports = BigInt(await connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE));
  const estimatedRentLamports = BigInt(missingAtas.size) * rentLamports;

  return {
    totalLamports: reserveLamports + estimatedFeeLamports + estimatedRentLamports,
    reserveLamports,
    estimatedRentLamports,
    estimatedFeeLamports,
    missingAtas
  };
}

export async function estimatePayoutReserveLamports(wallets: string[]) {
  const permanentReserveLamports = BigInt(Math.floor(config.minSolReserve * LAMPORTS_PER_SOL));
  const airdropReserveLamports = BigInt(Math.floor(config.airdropSolReserve * LAMPORTS_PER_SOL));
  if (!wallets.length) return permanentReserveLamports + airdropReserveLamports;

  if (config.rewardMode === "sol") {
    const batchCount = BigInt(Math.max(1, Math.ceil(wallets.length / config.airdropBatchSize)));
    const estimatedFeeLamports = batchCount * AIRDROP_TRANSFER_FEE_CUSHION_LAMPORTS;
    const totalLamports = permanentReserveLamports + airdropReserveLamports + estimatedFeeLamports;
    console.log(
      `[RESERVE] SOL payout reserve for ${wallets.length} wallets: total=${totalLamports}, permanent=${permanentReserveLamports}, buffer=${airdropReserveLamports}, fees=${estimatedFeeLamports}`
    );
    return totalLamports;
  }

  const tokenProgram = await tokenProgramForMint();
  const atas = wallets.map((wallet) => rewardAtaForOwner(new PublicKey(wallet), tokenProgram));
  const reserve = await payoutReserveForAtas(atas);
  const totalLamports = permanentReserveLamports + reserve.totalLamports;
  console.log(
    `[RESERVE] token payout reserve for ${wallets.length} wallets: total=${totalLamports}, permanent=${permanentReserveLamports}, buffer=${reserve.reserveLamports}, ataRent=${reserve.estimatedRentLamports}, missingAtas=${reserve.missingAtas.size}, fees=${reserve.estimatedFeeLamports}`
  );
  return totalLamports;
}

export async function estimateTokenPayoutReserveLamports(
  legs: { wallets: string[]; mint: PublicKey; label: string }[]
) {
  const permanentReserveLamports = BigInt(Math.floor(config.minSolReserve * LAMPORTS_PER_SOL));
  let tokenReserveLamports = 0n;

  for (const leg of legs) {
    if (!leg.wallets.length) continue;
    const tokenProgram = await tokenProgramForMint(leg.mint);
    const atas = leg.wallets.map((wallet) => rewardAtaForOwner(new PublicKey(wallet), tokenProgram, leg.mint));
    const reserve = await payoutReserveForAtas(atas);
    tokenReserveLamports += reserve.totalLamports;
    console.log(
      `[RESERVE] ${leg.label} payout reserve for ${leg.wallets.length} wallets: leg=${reserve.totalLamports}, buffer=${reserve.reserveLamports}, ataRent=${reserve.estimatedRentLamports}, missingAtas=${reserve.missingAtas.size}, fees=${reserve.estimatedFeeLamports}`
    );
  }

  const fallbackReserveLamports = BigInt(Math.floor(config.airdropSolReserve * LAMPORTS_PER_SOL));
  const totalLamports = permanentReserveLamports + (tokenReserveLamports > 0n ? tokenReserveLamports : fallbackReserveLamports);
  console.log(`[RESERVE] combined token payout reserve: total=${totalLamports}, permanent=${permanentReserveLamports}`);
  return totalLamports;
}

export async function airdropRewards(epochId: string, allocations: Allocation[]): Promise<AirdropResult> {
  if (config.rewardMode === "sol") return airdropSolRewards(epochId, allocations);
  return airdropTokenRewards(epochId, allocations);
}

export async function airdropTokenRewards(
  epochId: string,
  allocations: Allocation[],
  rewardAsset = config.rewardSymbol,
  mint = config.rewardTokenMint
): Promise<AirdropResult> {
  const treasury = treasuryKeypair();
  const tokenProgram = await tokenProgramForMint(mint);
  const mintInfo = await getMint(connection, mint, "confirmed", tokenProgram);
  const sourceAta = getAssociatedTokenAddressSync(mint, treasury.publicKey, false, tokenProgram);
  let settledRaw = 0n;
  let settledUi = 0;
  let settledCount = 0;
  let stoppedForReserve = false;

  console.log(`[${epochId}] proof before send: ${allocations.length} payouts`);
  for (const allocation of allocations) {
    const sendMode = config.airdropEnabled ? "queued live send" : "[DRY-RUN] would send";
    console.log(`[${epochId}] ${sendMode} ${allocation.amount.toString()} raw reward tokens to ${allocation.wallet}`);
  }

  if (!config.airdropEnabled) {
    for (const allocation of allocations) {
      await dryRunPayout(epochId, allocation.wallet, allocation.amount.toString(), allocation.uiAmount.toString(), {
        normalRewardAmountRaw: allocation.normalAmount.toString(),
        normalRewardAmount: allocation.normalUiAmount.toString(),
        rewardAsset
      });
    }
    return {
      signatures: [],
      settledCount: 0,
      settledRaw: 0n,
      settledUi: 0,
      stoppedForReserve: false
    };
  }

  const prepared: PreparedAllocation[] = allocations.map((allocation) => {
    const owner = new PublicKey(allocation.wallet);
    return {
      ...allocation,
      owner,
      destinationAta: rewardAtaForOwner(owner, tokenProgram, mint)
    };
  });

  const signatures: string[] = [];
  for (const allocation of prepared) {
    await planPayout(epochId, allocation.wallet, allocation.amount.toString(), allocation.uiAmount.toString(), {
      normalRewardAmountRaw: allocation.normalAmount.toString(),
      normalRewardAmount: allocation.normalUiAmount.toString(),
      rewardAsset
    });
  }

  const batches = chunk(prepared, config.airdropBatchSize);
  const permanentReserveLamports = BigInt(Math.floor(config.minSolReserve * LAMPORTS_PER_SOL));
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    const reserve = await payoutReserveForAtas(batch.map((allocation) => allocation.destinationAta));
    const requiredLamports = permanentReserveLamports + reserve.totalLamports;
    const balanceLamports = BigInt(await connection.getBalance(treasury.publicKey, "confirmed"));

    if (balanceLamports < requiredLamports) {
      stoppedForReserve = true;
      const error = new Error(
        `Treasury SOL below token airdrop reserve: balance=${balanceLamports}, required=${requiredLamports}, permanent=${permanentReserveLamports}, buffer=${reserve.reserveLamports}, ataRent=${reserve.estimatedRentLamports}, missingAtas=${reserve.missingAtas.size}`
      );
      console.error(`[${epochId}] stopping airdrop batch: ${error.message}`);
      const remaining = batches.slice(batchIndex).flat();
      for (const allocation of remaining) {
        await failPayout(epochId, allocation.wallet, error, rewardAsset);
      }
      break;
    }

    try {
      const tx = new Transaction();
      for (const allocation of batch) {
        if (reserve.missingAtas.has(allocation.destinationAta.toBase58())) {
          tx.add(
            createAssociatedTokenAccountIdempotentInstruction(
              treasury.publicKey,
              allocation.destinationAta,
              allocation.owner,
              mint,
              tokenProgram,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }

        tx.add(
          createTransferCheckedInstruction(
            sourceAta,
            mint,
            allocation.destinationAta,
            treasury.publicKey,
            allocation.amount,
            mintInfo.decimals,
            [],
            tokenProgram
          )
        );
      }

      tx.feePayer = treasury.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
      tx.sign(treasury);

      const simulation = await connection.simulateTransaction(tx);
      if (simulation.value.err) {
        throw new Error(`Transfer simulation failed: ${JSON.stringify(simulation.value.err)}`);
      }

      const txSig = await connection.sendRawTransaction(tx.serialize(), { maxRetries: 3, skipPreflight: false });
      await connection.confirmTransaction(txSig, "confirmed");
      for (const allocation of batch) {
        await settlePayout(epochId, allocation.wallet, txSig, rewardAsset);
        settledRaw += allocation.amount;
        settledUi += allocation.uiAmount;
        settledCount += 1;
        console.log(`[${epochId}] settled ${allocation.wallet}: ${txSig}`);
      }
      signatures.push(txSig);
    } catch (error) {
      for (const allocation of batch) {
        await failPayout(epochId, allocation.wallet, error, rewardAsset);
        console.error(`[${epochId}] payout failed for ${allocation.wallet}:`, error);
      }
    }
  }

  return {
    signatures,
    settledCount,
    settledRaw,
    settledUi,
    stoppedForReserve
  };
}

export async function airdropSolRewards(
  epochId: string,
  allocations: Allocation[],
  rewardAsset = "SOL"
): Promise<AirdropResult> {
  const treasury = treasuryKeypair();
  let settledRaw = 0n;
  let settledUi = 0;
  let settledCount = 0;
  let stoppedForReserve = false;

  console.log(`[${epochId}] proof before SOL send: ${allocations.length} payouts`);
  for (const allocation of allocations) {
    const sendMode = config.airdropEnabled ? "queued live SOL send" : "[DRY-RUN] would send";
    console.log(`[${epochId}] ${sendMode} ${allocation.amount.toString()} lamports to ${allocation.wallet}`);
  }

  if (!config.airdropEnabled) {
    for (const allocation of allocations) {
      await dryRunPayout(epochId, allocation.wallet, allocation.amount.toString(), allocation.uiAmount.toString(), {
        normalRewardAmountRaw: allocation.normalAmount.toString(),
        normalRewardAmount: allocation.normalUiAmount.toString(),
        rewardAsset
      });
    }
    return {
      signatures: [],
      settledCount: 0,
      settledRaw: 0n,
      settledUi: 0,
      stoppedForReserve: false
    };
  }

  const prepared = allocations.map((allocation) => ({
    ...allocation,
    owner: new PublicKey(allocation.wallet)
  }));

  const signatures: string[] = [];
  for (const allocation of prepared) {
    await planPayout(epochId, allocation.wallet, allocation.amount.toString(), allocation.uiAmount.toString(), {
      normalRewardAmountRaw: allocation.normalAmount.toString(),
      normalRewardAmount: allocation.normalUiAmount.toString(),
      rewardAsset
    });
  }

  const batches = chunk(prepared, config.airdropBatchSize);
  const permanentReserveLamports = BigInt(Math.floor(config.minSolReserve * LAMPORTS_PER_SOL));
  const reserveLamports = BigInt(Math.floor(config.airdropSolReserve * LAMPORTS_PER_SOL));
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    const batchAmountLamports = batch.reduce((sum, allocation) => sum + allocation.amount, 0n);
    const requiredLamports = permanentReserveLamports + reserveLamports + AIRDROP_TRANSFER_FEE_CUSHION_LAMPORTS + batchAmountLamports;
    const balanceLamports = BigInt(await connection.getBalance(treasury.publicKey, "confirmed"));

    if (balanceLamports < requiredLamports) {
      stoppedForReserve = true;
      const error = new Error(
        `Treasury SOL below SOL airdrop reserve: balance=${balanceLamports}, required=${requiredLamports}, permanent=${permanentReserveLamports}, buffer=${reserveLamports}, batch=${batchAmountLamports}`
      );
      console.error(`[${epochId}] stopping SOL airdrop batch: ${error.message}`);
      const remaining = batches.slice(batchIndex).flat();
      for (const allocation of remaining) {
        await failPayout(epochId, allocation.wallet, error, rewardAsset);
      }
      break;
    }

    try {
      const tx = new Transaction();
      for (const allocation of batch) {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: treasury.publicKey,
            toPubkey: allocation.owner,
            lamports: allocation.amount
          })
        );
      }

      tx.feePayer = treasury.publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
      tx.sign(treasury);

      const simulation = await connection.simulateTransaction(tx);
      if (simulation.value.err) {
        throw new Error(`SOL transfer simulation failed: ${JSON.stringify(simulation.value.err)}`);
      }

      const txSig = await connection.sendRawTransaction(tx.serialize(), { maxRetries: 3, skipPreflight: false });
      await connection.confirmTransaction(txSig, "confirmed");
      for (const allocation of batch) {
        await settlePayout(epochId, allocation.wallet, txSig, rewardAsset);
        settledRaw += allocation.amount;
        settledUi += allocation.uiAmount;
        settledCount += 1;
        console.log(`[${epochId}] settled SOL ${allocation.wallet}: ${txSig}`);
      }
      signatures.push(txSig);
    } catch (error) {
      for (const allocation of batch) {
        await failPayout(epochId, allocation.wallet, error, rewardAsset);
        console.error(`[${epochId}] SOL payout failed for ${allocation.wallet}:`, error);
      }
    }
  }

  return {
    signatures,
    settledCount,
    settledRaw,
    settledUi,
    stoppedForReserve
  };
}
