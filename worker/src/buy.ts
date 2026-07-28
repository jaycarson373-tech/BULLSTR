import { LAMPORTS_PER_SOL, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { NATIVE_MINT, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, getMint } from "@solana/spl-token";
import { config, treasuryKeypair } from "./config.js";
import { connection } from "./solana.js";

const SWAP_EXECUTION_CUSHION_LAMPORTS = 3_000_000n;
const AIRDROP_TRANSFER_FEE_CUSHION_LAMPORTS = 25_000n;

export type BuyResult = {
  baseSpentLamports: bigint;
  rewardReceivedRaw: bigint;
  rewardReceivedUi: number;
  txSig: string | null;
};

export type SwapResult = {
  inputSpentRaw: bigint;
  outputReceivedRaw: bigint;
  outputReceivedUi: number;
  txSig: string | null;
};

async function tokenProgramForMint(mint: PublicKey) {
  const info = await connection.getAccountInfo(mint);
  if (!info) throw new Error(`Reward mint not found: ${mint.toBase58()}`);
  if (info.owner.equals(TOKEN_PROGRAM_ID)) return TOKEN_PROGRAM_ID;
  if (info.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  throw new Error(`Unsupported reward token program: ${info.owner.toBase58()}`);
}

async function tokenDecimals(mint: PublicKey) {
  if (mint.equals(NATIVE_MINT)) return 9;
  const tokenProgram = await tokenProgramForMint(mint);
  const mintInfo = await getMint(connection, mint, "confirmed", tokenProgram);
  return mintInfo.decimals;
}

function rawToUi(raw: bigint, decimals: number) {
  return Number(raw) / 10 ** decimals;
}

function maxBigInt(a: bigint, b: bigint) {
  return a > b ? a : b;
}

async function postBuyReserveLamports() {
  const minReserveLamports = BigInt(Math.floor(config.minSolReserve * LAMPORTS_PER_SOL));
  if (!config.airdropEnabled) return minReserveLamports;

  const airdropReserveLamports = BigInt(Math.floor(config.airdropSolReserve * LAMPORTS_PER_SOL));
  const maxBatchCount = BigInt(Math.ceil(config.maxWalletsPerEpoch / config.airdropBatchSize));
  const transferFeeCushionLamports = maxBatchCount * AIRDROP_TRANSFER_FEE_CUSHION_LAMPORTS;
  const payoutReserveLamports = airdropReserveLamports + transferFeeCushionLamports + SWAP_EXECUTION_CUSHION_LAMPORTS;

  return minReserveLamports + payoutReserveLamports;
}

export async function treasurySolBudget(explicitReserveLamports?: bigint) {
  const treasury = treasuryKeypair();
  const balance = BigInt(await connection.getBalance(treasury.publicKey, "confirmed"));
  const defaultReserveLamports = await postBuyReserveLamports();
  const reserveLamports =
    explicitReserveLamports === undefined ? defaultReserveLamports : maxBigInt(explicitReserveLamports, defaultReserveLamports);
  const usableLamports = balance > reserveLamports ? balance - reserveLamports : 0n;

  return {
    balance,
    reserveLamports,
    usableLamports
  };
}

export async function treasurySwapAmount(explicitReserveLamports?: bigint, maxSwapLamports?: bigint) {
  const budget = await treasurySolBudget(explicitReserveLamports);
  const bpsAmount = (budget.usableLamports * BigInt(config.swapBalanceBps)) / 10_000n;
  const plannedAmount = maxSwapLamports === undefined ? bpsAmount : maxSwapLamports;
  const amount = plannedAmount < budget.usableLamports ? plannedAmount : budget.usableLamports;

  return {
    ...budget,
    amount: amount > 0n ? amount : 0n
  };
}

async function jupiterSwap(inputMint: PublicKey, outputMint: PublicKey, amount: bigint, treasuryPublicKey: string) {
  const query = new URLSearchParams({
    inputMint: inputMint.toBase58(),
    outputMint: outputMint.toBase58(),
    amount: amount.toString(),
    slippageBps: String(config.swapSlippageBps),
    restrictIntermediateTokens: "true"
  });

  const quoteResponse = await fetch(`https://lite-api.jup.ag/swap/v1/quote?${query}`);
  if (!quoteResponse.ok) throw new Error(`Jupiter quote failed: ${await quoteResponse.text()}`);
  const quote = (await quoteResponse.json()) as { outAmount: string };

  const swapResponse = await fetch("https://lite-api.jup.ag/swap/v1/swap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: treasuryPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      dynamicSlippage: false
    })
  });
  if (!swapResponse.ok) throw new Error(`Jupiter swap build failed: ${await swapResponse.text()}`);
  return { quote, swap: (await swapResponse.json()) as { swapTransaction: string } };
}

export async function buyToken(
  epochId: string,
  outputMint: PublicKey,
  label: string,
  explicitReserveLamports?: bigint,
  maxSwapLamports?: bigint
): Promise<BuyResult> {
  if (config.rewardMode === "sol") {
    console.log(`[${epochId}] REWARD_MODE=sol, buy path disabled`);
    return { baseSpentLamports: 0n, rewardReceivedRaw: 0n, rewardReceivedUi: 0, txSig: null };
  }

  const { amount, balance, reserveLamports } = await treasurySwapAmount(explicitReserveLamports, maxSwapLamports);

  if (amount <= 0n) {
    console.log(
      `[${epochId}] insufficient treasury after reserve, skipping buy: balance=${balance}, reserve=${reserveLamports}`
    );
    return { baseSpentLamports: 0n, rewardReceivedRaw: 0n, rewardReceivedUi: 0, txSig: null };
  }

  const result = await swapExactInput({
    epochId,
    inputMint: NATIVE_MINT,
    outputMint,
    inputAmountRaw: amount,
    label,
    execute: config.buyEnabled
  });

  return {
    baseSpentLamports: result.inputSpentRaw,
    rewardReceivedRaw: result.outputReceivedRaw,
    rewardReceivedUi: result.outputReceivedUi,
    txSig: result.txSig
  };
}

export async function buyReward(epochId: string, explicitReserveLamports?: bigint, maxSwapLamports?: bigint) {
  return buyToken(epochId, config.rewardTokenMint, config.rewardSymbol, explicitReserveLamports, maxSwapLamports);
}

export async function swapExactInput({
  epochId,
  inputMint,
  outputMint,
  inputAmountRaw,
  label,
  execute
}: {
  epochId: string;
  inputMint: PublicKey;
  outputMint: PublicKey;
  inputAmountRaw: bigint;
  label: string;
  execute: boolean;
}): Promise<SwapResult> {
  if (inputAmountRaw <= 0n) {
    return { inputSpentRaw: 0n, outputReceivedRaw: 0n, outputReceivedUi: 0, txSig: null };
  }

  const treasury = treasuryKeypair();
  const decimals = await tokenDecimals(outputMint);
  const { quote, swap } = await jupiterSwap(inputMint, outputMint, inputAmountRaw, treasury.publicKey.toBase58());
  const outputReceivedRaw = BigInt(quote.outAmount);
  const outputReceivedUi = rawToUi(outputReceivedRaw, decimals);
  console.log(
    `[${epochId}] ${execute ? "quoted live swap" : "[DRY-RUN] would swap"} ${inputAmountRaw.toString()} raw ${inputMint.toBase58()} into ${outputReceivedRaw.toString()} raw ${label}`
  );

  if (!execute) {
    return { inputSpentRaw: inputAmountRaw, outputReceivedRaw, outputReceivedUi, txSig: null };
  }

  const tx = VersionedTransaction.deserialize(Buffer.from(swap.swapTransaction, "base64"));
  tx.sign([treasury]);
  const simulation = await connection.simulateTransaction(tx, { replaceRecentBlockhash: true, sigVerify: false });
  if (simulation.value.err) {
    console.error(simulation.value.logs?.join("\n"));
    throw new Error(`Swap simulation failed: ${JSON.stringify(simulation.value.err)}`);
  }

  const txSig = await connection.sendRawTransaction(tx.serialize(), { maxRetries: 3, skipPreflight: false });
  await connection.confirmTransaction(txSig, "confirmed");
  console.log(`[${epochId}] ${label} swap settled: ${txSig}`);
  return { inputSpentRaw: inputAmountRaw, outputReceivedRaw, outputReceivedUi, txSig };
}
