import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

export const previousMint = "92DwRWtorPC1UxugproBwmdvGJss99LWB4QeRX7Qpump";
export const enabled = (value?: string) => /^(true|1|yes|on)$/i.test(value ?? "");

// Return field names, never environment values or signing material.
export function workerReadiness(env: Record<string,string|undefined>) {
  const blockers: string[] = [];
  const required = ["SOURCE_TOKEN_MINT", "CREATOR_FEE_ASSET_MINT", "HELIUS_RPC_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE", "TREASURY_WALLET_SECRET", "ELIGIBILITY_MIN"];
  for (const name of required) if (!env[name]?.trim()) blockers.push(`missing:${name}`);
  for (const name of ["SOURCE_TOKEN_MINT", "CREATOR_FEE_ASSET_MINT"]) {
    if (env[name]) { try { new PublicKey(env[name]!); } catch { blockers.push(`invalid:${name}`); } }
  }
  if (env.SOURCE_TOKEN_MINT === previousMint) blockers.push("previous-project-mint");
  const rewards = (env.REWARD_TOKEN_MINTS || env.REWARD_TOKEN_MINT || "").split(",").map(s => s.trim()).filter(Boolean);
  if (rewards.length !== 1 || rewards[0] !== env.CREATOR_FEE_ASSET_MINT) blockers.push("reward-mint-must-match-fee-asset");
  if ((env.REWARD_MODE || "token").toLowerCase() !== "token") blockers.push("direct-token-rewards-required");
  if (env.ELIGIBILITY_MIN && !(Number.isFinite(Number(env.ELIGIBILITY_MIN)) && Number(env.ELIGIBILITY_MIN) > 0)) blockers.push("invalid:ELIGIBILITY_MIN");
  for (const name of ["HELIUS_RPC_URL", "SUPABASE_URL"]) {
    if (env[name]) { try { if (new URL(env[name]!).protocol !== "https:") throw new Error(); } catch { blockers.push(`invalid:${name}`); } }
  }
  if (enabled(env.BUY_ENABLED) || Number(env.SIDE_WALLET_BPS || 0) !== 0) blockers.push("direct-fee-flow-required");
  if (enabled(env.CAT_AGENT_ENABLED) || enabled(env.CAT_AGENT_EXECUTE) || enabled(env.X_AGENT_ENABLED)) blockers.push("unrelated-agents-must-remain-disabled");
  if (env.TREASURY_WALLET_SECRET) {
    try {
      const raw = env.TREASURY_WALLET_SECRET.trim();
      const key = Keypair.fromSecretKey(raw.startsWith("[") ? Uint8Array.from(JSON.parse(raw)) : bs58.decode(raw));
      if (env.TREASURY_PUBLIC_KEY && key.publicKey.toBase58() !== env.TREASURY_PUBLIC_KEY) blockers.push("treasury-public-key-mismatch");
    } catch { blockers.push("invalid:TREASURY_WALLET_SECRET"); }
  }
  const activated = enabled(env.NSTR_ACTIVATED);
  if (!activated) blockers.push("awaiting-token-activation");
  if (activated && (!enabled(env.CLAIM_ENABLED) || !enabled(env.AIRDROP_ENABLED))) blockers.push("reward-gates-disabled");
  return { project: "NSTR", state: blockers.length ? "waiting" : "configured", activated, epochMinutes: 5, blockers, transactionsEnabled: blockers.length === 0 };
}
