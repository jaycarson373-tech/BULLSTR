import "dotenv/config";
import bs58 from "bs58";
import { Keypair, PublicKey } from "@solana/web3.js";

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

function rewardModeEnv() {
  const value = (process.env.REWARD_MODE ?? "token").toLowerCase();
  if (value === "sol" || value === "token") return value;
  throw new Error(`Invalid REWARD_MODE=${value}; expected sol or token`);
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
if (rewardMode === "token" && !configuredRewardTokenMint) {
  throw new Error("Missing required env REWARD_TOKEN_MINT when REWARD_MODE=token");
}
const swapBalanceBps = Math.min(10_000, Math.max(1, intEnv("SWAP_BALANCE_BPS", 7500)));
const bullstrAirdropBps = Math.min(10_000, Math.max(0, intEnv("BULLSTR_AIRDROP_BPS", 0)));
const sideWalletBps = Math.min(10_000, Math.max(0, intEnv("SIDE_WALLET_BPS", 2500)));
if (swapBalanceBps + bullstrAirdropBps + sideWalletBps > 10_000) {
  throw new Error(
    `SWAP_BALANCE_BPS + BULLSTR_AIRDROP_BPS + SIDE_WALLET_BPS cannot exceed 10000; got ${
      swapBalanceBps + bullstrAirdropBps + sideWalletBps
    }`
  );
}

export const config = {
  heliusRpcUrl: required("HELIUS_RPC_URL"),
  sourceTokenMint: publicKeyEnv("SOURCE_TOKEN_MINT"),
  rewardMode,
  rewardTokenMint: configuredRewardTokenMint ?? new PublicKey("So11111111111111111111111111111111111111112"),
  treasuryWalletSecret: required("TREASURY_WALLET_SECRET"),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRole: required("SUPABASE_SERVICE_ROLE"),

  claimEnabled: boolEnv("CLAIM_ENABLED", false),
  buyEnabled: boolEnv("BUY_ENABLED", false),
  airdropEnabled: boolEnv("AIRDROP_ENABLED", false),

  epochMinutes: Math.max(1, intEnv("EPOCH_MINUTES", 5)),
  eligibilityMin: numberEnv("ELIGIBILITY_MIN", 250_000),
  maxWalletsPerEpoch: Math.max(1, intEnv("MAX_WALLETS_PER_EPOCH", 75)),
  maxHolderPct: numberEnv("MAX_HOLDER_PCT", 5),
  excludeWallets: optionalWallets("EXCLUDE_WALLETS"),

  swapBalanceBps,
  bullstrAirdropBps,
  sideWalletBps,
  sideWalletPublicKey: optionalPublicKeyEnv("SIDE_WALLET_PUBLIC_KEY"),
  minSolReserve: Math.max(0.3, numberEnv("MIN_SOL_RESERVE", 0.3)),
  airdropSolReserve: Math.max(0.05, numberEnv("AIRDROP_SOL_RESERVE", 0.05)),
  airdropBatchSize: Math.max(1, intEnv("AIRDROP_BATCH_SIZE", 4)),
  airdropRewardBps: Math.min(10_000, Math.max(1, intEnv("AIRDROP_REWARD_BPS", 10000))),
  swapSlippageBps: Math.max(1, intEnv("SWAP_SLIPPAGE_BPS", 300)),
  priorityFeeSol: numberEnv("PRIORITY_FEE_SOL", 0.000001),
  minRewardRawToAirdrop: BigInt(Math.max(0, intEnv("MIN_REWARD_RAW_TO_AIRDROP", 1))),
  minSolRewardLamportsToAirdrop: BigInt(Math.max(0, intEnv("MIN_SOL_REWARD_LAMPORTS_TO_AIRDROP", 5000)))
};

export function treasuryKeypair() {
  cachedTreasury ??= Keypair.fromSecretKey(parseSecret(config.treasuryWalletSecret));
  return cachedTreasury;
}
