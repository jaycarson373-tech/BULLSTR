import { NATIVE_MINT, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getMint } from "@solana/spl-token";
import { config, treasuryKeypair } from "./config.js";
import { connection } from "./solana.js";
import { supabase } from "./db.js";
import { assertSourceCurve, sourceCurve } from "./creator-fee-instructions.js";

export async function preflight() {
  if(await connection.getGenesisHash()!=="5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d") throw new Error("NSTR activation requires the Solana mainnet cluster.");
  const treasury=treasuryKeypair(),mint=config.creatorFeeAssetMint;
  if (!mint || mint.equals(NATIVE_MINT)) throw new Error("Verified non-native fee asset required.");
  assertSourceCurve(await connection.getAccountInfo(sourceCurve(config.sourceTokenMint),"confirmed"),treasury.publicKey,mint);
  for (const asset of [config.sourceTokenMint,mint]) {
    const info=await connection.getAccountInfo(asset,"confirmed");
    if (!info || (!info.owner.equals(TOKEN_PROGRAM_ID) && !info.owner.equals(TOKEN_2022_PROGRAM_ID))) throw new Error("Token account validation failed.");
    await getMint(connection,asset,"confirmed",info.owner);
  }
  const schema=await supabase.rpc("nstr_worker_ready");
  if (schema.error || schema.data!==true) throw new Error("NSTR payout migration has not been verified.");
  const balance=await connection.getBalance(treasury.publicKey,"confirmed");
  if (balance<=Math.floor(config.minSolReserve*1e9)) throw new Error("Treasury requires SOL fee headroom.");
}
