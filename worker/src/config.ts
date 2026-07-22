import "dotenv/config";
import bs58 from "bs58";
import { Keypair, PublicKey } from "@solana/web3.js";
import { rewardKindForEpoch, type RewardMode } from "./reward-cycle.js";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env ${name}`);
  return value;
}

function boolEnv(name: string, defaultValue: boolean) {
  const value = process.env[name];
  if (value === undefined || value === "") return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function numberEnv(name: string, defaultValue: number) {
  const value = process.env[name];
  if (value === undefined || value === "") return defaultValue;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid number env ${name}=${value}`);
  return parsed;
}

function intEnv(name: string, defaultValue: number) {
  return Math.floor(numberEnv(name, defaultValue));
}

function publicKeyEnv(name: string) {
  return new PublicKey(required(name));
}

function optionalPublicKeyEnv(name: string) {
  const value = process.env[name];
  return value ? new PublicKey(value) : null;
}

function listEnv(name: string) {
  const value = process.env[name];
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function rewardModeEnv() {
  const value = (process.env.REWARD_MODE ?? "token").toLowerCase();
  if (value === "sol" || value === "token" || value === "alternating") return value as RewardMode;
  throw new Error(`Invalid REWARD_MODE=${value}; expected sol, token, or alternating`);
}

function optionalWallets(name: string) {
  const value = process.env[name];
  if (!value) return [];
  return value
    .split(",")
    .map((wallet) => wallet.trim())
    .filter(Boolean)
    .map((wallet) => new PublicKey(wallet));
}

function parseSecret(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    return Uint8Array.from(JSON.parse(trimmed) as number[]);
  }
  return bs58.decode(trimmed);
}

let cachedTreasury: Keypair | null = null;
const rewardMode = rewardModeEnv();
const configuredRewardTokenMint = optionalPublicKeyEnv("REWARD_TOKEN_MINT");
const configuredPumpTokenMint = optionalPublicKeyEnv("PUMP_TOKEN_MINT");
const rewardTokenMints = listEnv("REWARD_TOKEN_MINTS").map((mint) => new PublicKey(mint));
const rewardTokenSymbols = listEnv("REWARD_TOKEN_SYMBOLS");
const fallbackRewardSymbol =
  process.env.REWARD_TOKEN_SYMBOL?.trim() || process.env.NEXT_PUBLIC_REWARD_SYMBOL?.trim() || "REWARD";
const configuredRewardTokens = rewardMode === "alternating"
  ? configuredPumpTokenMint
    ? [{ mint: configuredPumpTokenMint, symbol: "PUMP" }]
    : []
  : rewardTokenMints.length
  ? rewardTokenMints.map((mint, index) => ({
      mint,
      symbol: rewardTokenSymbols[index] || `REWARD-${index + 1}`
    }))
  : configuredRewardTokenMint
    ? [{ mint: configuredRewardTokenMint, symbol: fallbackRewardSymbol }]
    : [];

if ((rewardMode === "token" || rewardMode === "alternating") && configuredRewardTokens.length === 0) {
  throw new Error(
    rewardMode === "alternating"
      ? "Missing required env PUMP_TOKEN_MINT when REWARD_MODE=alternating"
      : "Missing required env REWARD_TOKEN_MINT or REWARD_TOKEN_MINTS when REWARD_MODE=token"
  );
}
if (rewardMode !== "alternating" && rewardTokenSymbols.length > 0 && rewardTokenSymbols.length !== configuredRewardTokens.length) {
  throw new Error(
    `REWARD_TOKEN_SYMBOLS count must match configured reward token count; got ${rewardTokenSymbols.length} symbols for ${configuredRewardTokens.length} mints`
  );
}
const swapBalanceBps = Math.min(10_000, Math.max(1, intEnv("SWAP_BALANCE_BPS", 10000)));
if (swapBalanceBps > 10_000) {
  throw new Error(`SWAP_BALANCE_BPS cannot exceed 10000; got ${swapBalanceBps}`);
}
const sideWalletBps = Math.min(10_000, Math.max(0, intEnv("SIDE_WALLET_BPS", 0)));
const sideWalletPublicKey = optionalPublicKeyEnv("SIDE_WALLET_PUBLIC_KEY");
if (swapBalanceBps + sideWalletBps > 10_000) {
  throw new Error(`SWAP_BALANCE_BPS + SIDE_WALLET_BPS cannot exceed 10000; got ${swapBalanceBps + sideWalletBps}`);
}
if (sideWalletBps > 0 && !sideWalletPublicKey) {
  throw new Error("Missing required env SIDE_WALLET_PUBLIC_KEY when SIDE_WALLET_BPS is greater than 0");
}

export const config = {
  heliusRpcUrl: required("HELIUS_RPC_URL"),
  sourceTokenMint: publicKeyEnv("SOURCE_TOKEN_MINT"),
  rewardMode,
  rewardTokens: configuredRewardTokens,
  rewardTokenMint: configuredRewardTokens[0]?.mint ?? new PublicKey("So11111111111111111111111111111111111111112"),
  treasuryWalletSecret: required("TREASURY_WALLET_SECRET"),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRole: required("SUPABASE_SERVICE_ROLE"),

  claimEnabled: boolEnv("CLAIM_ENABLED", false),
  buyEnabled: boolEnv("BUY_ENABLED", false),
  airdropEnabled: boolEnv("AIRDROP_ENABLED", false),
  emergencyStop: boolEnv("EMERGENCY_STOP", true),

  epochMinutes: Math.max(1, intEnv("EPOCH_MINUTES", 15)),
  eligibilityMin: numberEnv("ELIGIBILITY_MIN", 500_000),
  maxWalletsPerEpoch: Math.max(1, intEnv("MAX_WALLETS_PER_EPOCH", 100)),
  maxHolderPct: numberEnv("MAX_HOLDER_PCT", 5),
  enforceMaxHolderPct: boolEnv("ENFORCE_MAX_HOLDER_PCT", false),
  excludeWallets: optionalWallets("EXCLUDE_WALLETS"),

  swapBalanceBps,
  sideWalletBps,
  sideWalletPublicKey,
  minSolReserve: Math.max(0, numberEnv("MIN_SOL_RESERVE", 0.3)),
  airdropSolReserve: Math.max(0.05, numberEnv("AIRDROP_SOL_RESERVE", 0.05)),
  airdropBatchSize: Math.max(1, intEnv("AIRDROP_BATCH_SIZE", 4)),
  airdropRewardBps: Math.min(10_000, Math.max(1, intEnv("AIRDROP_REWARD_BPS", 10000))),
  solAirdropBalanceBps: Math.min(10_000, Math.max(1, intEnv("SOL_AIRDROP_BALANCE_BPS", 5000))),
  swapSlippageBps: Math.max(1, intEnv("SWAP_SLIPPAGE_BPS", 300)),
  priorityFeeSol: numberEnv("PRIORITY_FEE_SOL", 0.000001),
  minRewardRawToAirdrop: BigInt(Math.max(0, intEnv("MIN_REWARD_RAW_TO_AIRDROP", 1))),
  minSolRewardLamportsToAirdrop: BigInt(Math.max(0, intEnv("MIN_SOL_REWARD_LAMPORTS_TO_AIRDROP", 5000)))
};

export function treasuryKeypair() {
  cachedTreasury ??= Keypair.fromSecretKey(parseSecret(config.treasuryWalletSecret));
  return cachedTreasury;
}

export function rewardTokenForEpoch(epochId: string) {
  const timestamp = Date.parse(epochId);
  const epochSizeMs = config.epochMinutes * 60_000;
  const epochIndex = Number.isFinite(timestamp) ? Math.floor(timestamp / epochSizeMs) : 0;
  const kind = rewardKindForEpoch(epochId, config.epochMinutes, config.rewardMode);
  if (kind === "sol") {
    return { mint: config.rewardTokenMint, symbol: "SOL", index: 0, count: 2, kind } as const;
  }

  const rotationIndex = ((epochIndex % config.rewardTokens.length) + config.rewardTokens.length) % config.rewardTokens.length;
  const rewardToken = config.rewardTokens[rotationIndex];
  return {
    ...rewardToken,
    index: rotationIndex,
    count: config.rewardMode === "alternating" ? 2 : config.rewardTokens.length,
    kind
  };
}
