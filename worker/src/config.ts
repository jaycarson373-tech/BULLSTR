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

function stringEnv(name: string, defaultValue: string) {
  const value = process.env[name]?.trim();
  return value || defaultValue;
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
  projectName: stringEnv("PROJECT_NAME", process.env.NEXT_PUBLIC_PROJECT_NAME ?? "CryptoCat"),
  sourceSymbol: stringEnv("SOURCE_SYMBOL", process.env.NEXT_PUBLIC_SOURCE_SYMBOL ?? "CC"),
  rewardSymbol: stringEnv("REWARD_TOKEN_SYMBOL", process.env.NEXT_PUBLIC_REWARD_SYMBOL ?? "TOKEN"),

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
  catAgentEnabled: boolEnv("CAT_AGENT_ENABLED", false),
  catAgentExecute: boolEnv("CAT_AGENT_EXECUTE", false),
  catAgentAllowSells: boolEnv("CAT_AGENT_ALLOW_SELLS", false),

  epochMinutes: Math.max(1, intEnv("EPOCH_MINUTES", 15)),
  eligibilityMin: numberEnv("ELIGIBILITY_MIN", 1_000_000),
  maxWalletsPerEpoch: Math.max(1, intEnv("MAX_WALLETS_PER_EPOCH", 75)),
  maxHolderPct: numberEnv("MAX_HOLDER_PCT", 5),
  excludeWallets: optionalWallets("EXCLUDE_WALLETS"),
  catAgentMaxSignalsPerEpoch: Math.max(1, intEnv("CAT_AGENT_MAX_SIGNALS_PER_EPOCH", 2)),
  catAgentMaxSolPerAction: Math.max(0, numberEnv("CAT_AGENT_MAX_SOL_PER_ACTION", 0.05)),
  catAgentMaxSolPerEpoch: Math.max(0, numberEnv("CAT_AGENT_MAX_SOL_PER_EPOCH", 0.1)),
  catAgentMinSolReserve: Math.max(0, numberEnv("CAT_AGENT_MIN_SOL_RESERVE", numberEnv("MIN_SOL_RESERVE", 0.3))),

  xAgentEnabled: boolEnv("X_AGENT_ENABLED", false),
  xAgentPostEnabled: boolEnv("X_AGENT_POST_ENABLED", false),
  xAgentAutoTradePosts: boolEnv("X_AGENT_AUTO_TRADE_POSTS", true),
  xAgentPostPlannedTrades: boolEnv("X_AGENT_POST_PLANNED_TRADES", false),
  xAgentReplyToMentions: boolEnv("X_AGENT_REPLY_TO_MENTIONS", false),
  xAgentMaxPostsPerEpoch: Math.max(1, intEnv("X_AGENT_MAX_POSTS_PER_EPOCH", 2)),
  xAgentApiBase: stringEnv("X_AGENT_API_BASE", "https://api.x.com/2").replace(/\/$/, ""),
  xUserId: stringEnv("X_USER_ID", ""),
  xBearerToken: stringEnv("X_BEARER_TOKEN", ""),
  xApiKey: stringEnv("X_API_KEY", process.env.X_CONSUMER_KEY ?? ""),
  xApiKeySecret: stringEnv("X_API_KEY_SECRET", process.env.X_CONSUMER_SECRET ?? ""),
  xAccessToken: stringEnv("X_ACCESS_TOKEN", ""),
  xAccessTokenSecret: stringEnv("X_ACCESS_TOKEN_SECRET", ""),

  swapBalanceBps,
  sideWalletBps,
  sideWalletPublicKey,
  minSolReserve: Math.max(0, numberEnv("MIN_SOL_RESERVE", 0.3)),
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
