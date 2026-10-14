import { PublicKey } from "@solana/web3.js";
import { config } from "./config.js";
import { supabase } from "./db.js";
import {getMint} from "@solana/spl-token";
import {connection} from "./solana.js";

export async function rewardFeed(wallet:string|null) {
  if (wallet) { try { new PublicKey(wallet); } catch { throw new Error("INVALID_WALLET"); } }
  let query=supabase.from("payouts").select("epoch_id,wallet,reward_asset,reward_amount_raw,tx_sig,updated_at")
    .like("epoch_id",`nstr:${config.sourceTokenMint.toBase58()}:%`).eq("status","settled")
    .not("tx_sig","is",null).order("updated_at",{ascending:false}).limit(20);
  if (wallet) query=query.eq("wallet",wallet);
  const result=await query;
  if(result.error) throw new Error("REWARD_FEED_UNAVAILABLE");
  const mint=config.creatorFeeAssetMint!;
  const info=await connection.getAccountInfo(mint,"confirmed");
  if(!info)throw new Error("REWARD_FEED_UNAVAILABLE");
  const reward=await getMint(connection,mint,"confirmed",info.owner);
  return {state:"active",mint:config.sourceTokenMint.toBase58(),rewardMint:mint.toBase58(),rewardDecimals:reward.decimals,epochMinutes:config.epochMinutes,payouts:result.data ?? [],updatedAt:new Date().toISOString()};
}
