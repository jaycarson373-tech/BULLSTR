import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { swapExactInput } from "./buy.js";
import { config, treasuryKeypair } from "./config.js";
import { supabase } from "./db.js";
import { connection } from "./solana.js";
import { currentEpochId } from "./time.js";

type CatSignal = {
  id: string;
  mint: string;
  symbol: string | null;
  side: string;
  max_sol: string | number | null;
  sell_bps: number | null;
  conviction: number | null;
  reason: string | null;
  status: string;
  expires_at: string | null;
};

type CatWhitelistRow = {
  mint: string;
  symbol: string | null;
  enabled: boolean | null;
  max_sol_per_trade: string | number | null;
};

function solToLamports(sol: number) {
  return BigInt(Math.floor(sol * LAMPORTS_PER_SOL));
}

function numberValue(value: string | number | null | undefined, fallback: number) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampBps(value: number | null | undefined, fallback: number) {
  const parsed = Math.floor(numberValue(value, fallback));
  return Math.min(10_000, Math.max(1, parsed));
}

function minBigInt(...values: bigint[]) {
  return values.reduce((min, value) => (value < min ? value : min));
}

function parseMint(mint: string) {
  try {
    return new PublicKey(mint);
  } catch {
    return null;
  }
}

async function updateSignal(id: string, status: string, fields: Record<string, unknown> = {}) {
  const { error } = await supabase
    .from("cat_signals")
    .update({ status, updated_at: new Date().toISOString(), ...fields })
    .eq("id", id);
  if (error) throw new Error(`update cat signal: ${JSON.stringify(error)}`);
}

async function recordAction(fields: {
  signalId: string;
  epochId: string;
  mint: string;
  symbol: string;
  side: string;
  status: string;
  inputMint: string;
  outputMint: string;
  inputAmountRaw: string;
  outputAmountRaw: string;
  txSig: string | null;
  error?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabase.from("cat_agent_actions").insert({
    signal_id: fields.signalId,
    epoch_id: fields.epochId,
    mint: fields.mint,
    symbol: fields.symbol,
    side: fields.side,
    status: fields.status,
    input_mint: fields.inputMint,
    output_mint: fields.outputMint,
    input_amount_raw: fields.inputAmountRaw,
    output_amount_raw: fields.outputAmountRaw,
    tx_sig: fields.txSig,
    error: fields.error ?? null,
    metadata: fields.metadata ?? {}
  });
  if (error) throw new Error(`record cat agent action: ${JSON.stringify(error)}`);
}

async function getWhitelist(mint: string): Promise<CatWhitelistRow | null> {
  const { data, error } = await supabase
    .from("cat_token_whitelist")
    .select("mint,symbol,enabled,max_sol_per_trade")
    .eq("mint", mint)
    .maybeSingle();
  if (error) throw new Error(`cat whitelist lookup: ${JSON.stringify(error)}`);
  return data as CatWhitelistRow | null;
}

async function getPendingSignals(): Promise<CatSignal[]> {
  const { data, error } = await supabase
    .from("cat_signals")
    .select("id,mint,symbol,side,max_sol,sell_bps,conviction,reason,status,expires_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(config.catAgentMaxSignalsPerEpoch);
  if (error) throw new Error(`cat signal lookup: ${JSON.stringify(error)}`);
  return (data ?? []) as CatSignal[];
}

async function treasuryUsableLamports() {
  const treasury = treasuryKeypair();
  const balance = BigInt(await connection.getBalance(treasury.publicKey, "confirmed"));
  const reserve = solToLamports(config.catAgentMinSolReserve);
  return balance > reserve ? balance - reserve : 0n;
}

async function treasuryTokenBalanceRaw(mint: PublicKey) {
  const treasury = treasuryKeypair();
  const accounts = await connection.getParsedTokenAccountsByOwner(treasury.publicKey, { mint }, "confirmed");
  return accounts.value.reduce((sum, account) => {
    const amount = account.account.data.parsed?.info?.tokenAmount?.amount;
    return sum + BigInt(typeof amount === "string" ? amount : "0");
  }, 0n);
}

async function executeBuy(signal: CatSignal, whitelist: CatWhitelistRow, mint: PublicKey, epochId: string, remainingEpochBudget: bigint) {
  const signalMaxSol = numberValue(signal.max_sol, config.catAgentMaxSolPerAction);
  const whitelistMaxSol = numberValue(whitelist.max_sol_per_trade, config.catAgentMaxSolPerAction);
  const actionCapLamports = solToLamports(Math.min(signalMaxSol, whitelistMaxSol, config.catAgentMaxSolPerAction));
  const usableLamports = await treasuryUsableLamports();
  const inputLamports = minBigInt(actionCapLamports, usableLamports, remainingEpochBudget);
  const symbol = signal.symbol ?? whitelist.symbol ?? "INUVESTOR_SIGNAL";

  if (inputLamports <= 0n) {
    await updateSignal(signal.id, "failed", { error: "No treasury budget available after reserve/caps." });
    await recordAction({
      signalId: signal.id,
      epochId,
      mint: signal.mint,
      symbol,
      side: "buy",
      status: "failed",
      inputMint: NATIVE_MINT.toBase58(),
      outputMint: mint.toBase58(),
      inputAmountRaw: "0",
      outputAmountRaw: "0",
      txSig: null,
      error: "No treasury budget available after reserve/caps."
    });
    return 0n;
  }

  const result = await swapExactInput({
    epochId,
    inputMint: NATIVE_MINT,
    outputMint: mint,
    inputAmountRaw: inputLamports,
    label: `${symbol} agent buy`,
    execute: config.catAgentExecute
  });
  const status = config.catAgentExecute ? "executed" : "planned";
  await updateSignal(signal.id, status, { tx_sig: result.txSig, output_amount_raw: result.outputReceivedRaw.toString() });
  await recordAction({
    signalId: signal.id,
    epochId,
    mint: signal.mint,
    symbol,
    side: "buy",
    status,
    inputMint: NATIVE_MINT.toBase58(),
    outputMint: mint.toBase58(),
    inputAmountRaw: result.inputSpentRaw.toString(),
    outputAmountRaw: result.outputReceivedRaw.toString(),
    txSig: result.txSig,
    metadata: { conviction: signal.conviction, reason: signal.reason }
  });
  return result.inputSpentRaw;
}

async function executeSell(signal: CatSignal, whitelist: CatWhitelistRow, mint: PublicKey, epochId: string) {
  if (!config.catAgentAllowSells) {
    await updateSignal(signal.id, "rejected", { error: "Sells disabled by CAT_AGENT_ALLOW_SELLS." });
    return;
  }

  const balanceRaw = await treasuryTokenBalanceRaw(mint);
  const sellBps = clampBps(signal.sell_bps, 2500);
  const inputRaw = (balanceRaw * BigInt(sellBps)) / 10_000n;
  const symbol = signal.symbol ?? whitelist.symbol ?? "INUVESTOR_SIGNAL";

  if (inputRaw <= 0n) {
    await updateSignal(signal.id, "failed", { error: "No treasury token balance available to sell." });
    await recordAction({
      signalId: signal.id,
      epochId,
      mint: signal.mint,
      symbol,
      side: "sell",
      status: "failed",
      inputMint: mint.toBase58(),
      outputMint: NATIVE_MINT.toBase58(),
      inputAmountRaw: "0",
      outputAmountRaw: "0",
      txSig: null,
      error: "No treasury token balance available to sell."
    });
    return;
  }

  const result = await swapExactInput({
    epochId,
    inputMint: mint,
    outputMint: NATIVE_MINT,
    inputAmountRaw: inputRaw,
    label: `${symbol} agent sell`,
    execute: config.catAgentExecute
  });
  const status = config.catAgentExecute ? "executed" : "planned";
  await updateSignal(signal.id, status, { tx_sig: result.txSig, output_amount_raw: result.outputReceivedRaw.toString() });
  await recordAction({
    signalId: signal.id,
    epochId,
    mint: signal.mint,
    symbol,
    side: "sell",
    status,
    inputMint: mint.toBase58(),
    outputMint: NATIVE_MINT.toBase58(),
    inputAmountRaw: result.inputSpentRaw.toString(),
    outputAmountRaw: result.outputReceivedRaw.toString(),
    txSig: result.txSig,
    metadata: { conviction: signal.conviction, reason: signal.reason, sellBps }
  });
}

export async function runCatAgent(date = new Date()) {
  if (!config.catAgentEnabled) return;

  const epochId = currentEpochId(date);
  const epochBudget = solToLamports(config.catAgentMaxSolPerEpoch);
  let spentThisEpoch = 0n;
  const signals = await getPendingSignals();
  if (!signals.length) {
    console.log(`[${epochId}] ${config.projectName} signal agent: no pending signals`);
    return;
  }

  for (const signal of signals) {
    try {
      if (signal.expires_at && Date.parse(signal.expires_at) <= date.getTime()) {
        await updateSignal(signal.id, "expired");
        continue;
      }

      const mint = parseMint(signal.mint);
      if (!mint) {
        await updateSignal(signal.id, "rejected", { error: "Invalid Solana mint." });
        continue;
      }

      const whitelist = await getWhitelist(signal.mint);
      if (!whitelist?.enabled) {
        await updateSignal(signal.id, "rejected", { error: "Mint is not enabled in cat_token_whitelist." });
        continue;
      }

      const side = signal.side.toLowerCase();
      if (side === "buy") {
        const remaining = epochBudget > spentThisEpoch ? epochBudget - spentThisEpoch : 0n;
        spentThisEpoch += await executeBuy(signal, whitelist, mint, epochId, remaining);
        continue;
      }

      if (side === "sell") {
        await executeSell(signal, whitelist, mint, epochId);
        continue;
      }

      await updateSignal(signal.id, "rejected", { error: `Unsupported side: ${signal.side}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateSignal(signal.id, "failed", { error: message }).catch((dbError) => {
        console.error(`[${epochId}] failed to mark cat signal failed`, dbError);
      });
      console.error(`[${epochId}] ${config.projectName} signal agent signal failed`, error);
    }
  }
}
