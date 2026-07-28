import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

export const supabase = createClient(config.supabaseUrl, config.supabaseServiceRole, {
  auth: { persistSession: false }
});

export type EpochStatus = "running" | "completed" | "failed" | "skipped";

export type PayoutMetadata = {
  rewardAsset?: string;
  normalRewardAmountRaw?: string;
  normalRewardAmount?: string;
};

function assertNoError<T>(result: { data: T; error: unknown }, label: string): T {
  if (result.error) throw new Error(`${label}: ${JSON.stringify(result.error)}`);
  return result.data;
}

export async function getEpoch(epochId: string) {
  const result = await supabase.from("epochs").select("*").eq("epoch_id", epochId).maybeSingle();
  return assertNoError(result, "get epoch");
}

export async function startEpoch(epochId: string) {
  const result = await supabase
    .from("epochs")
    .upsert({ epoch_id: epochId, status: "running", started_at: new Date().toISOString() })
    .select()
    .single();
  return assertNoError(result, "start epoch");
}

export async function completeEpoch(
  epochId: string,
  fields: {
    eligible_count: number;
    reward_bought: string;
    reward_distributed: string;
    status?: EpochStatus;
  }
) {
  const result = await supabase
    .from("epochs")
    .update({
      ...fields,
      status: fields.status ?? "completed",
      completed_at: new Date().toISOString()
    })
    .eq("epoch_id", epochId);
  assertNoError(result, "complete epoch");
}

export async function failEpoch(epochId: string, error: unknown) {
  const result = await supabase
    .from("epochs")
    .update({
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      completed_at: new Date().toISOString()
    })
    .eq("epoch_id", epochId);
  assertNoError(result, "fail epoch");
}

export async function persistSnapshot(
  epochId: string,
  rows: { wallet: string; source_balance: string; source_balance_raw: string; holder_pct: string }[]
) {
  if (!rows.length) return;
  const result = await supabase.from("snapshots").upsert(
    rows.map((row) => ({ epoch_id: epochId, ...row })),
    { onConflict: "epoch_id,wallet" }
  );
  assertNoError(result, "persist snapshot");
}

export async function getClaim(epochId: string) {
  const result = await supabase.from("claims").select("*").eq("epoch_id", epochId).maybeSingle();
  return assertNoError(result, "get claim");
}

export async function recordClaim(epochId: string, amountClaimed: string, txSig: string | null) {
  const result = await supabase
    .from("claims")
    .upsert({ epoch_id: epochId, amount_claimed: amountClaimed, tx_sig: txSig });
  assertNoError(result, "record claim");
}

export async function recordBuy(
  epochId: string,
  baseSpentLamports: string,
  rewardReceivedRaw: string,
  rewardReceived: string,
  txSig: string | null
) {
  const result = await supabase.from("buys").upsert({
    epoch_id: epochId,
    base_spent_lamports: baseSpentLamports,
    reward_received_raw: rewardReceivedRaw,
    reward_received: rewardReceived,
    tx_sig: txSig
  });
  assertNoError(result, "record buy");
}

function payoutMetadataFields(metadata: PayoutMetadata | undefined, rewardAmountRaw: string, rewardAmount: string) {
  return {
    normal_reward_amount_raw: metadata?.normalRewardAmountRaw ?? rewardAmountRaw,
    normal_reward_amount: metadata?.normalRewardAmount ?? rewardAmount
  };
}

export async function planPayout(
  epochId: string,
  wallet: string,
  rewardAmountRaw: string,
  rewardAmount: string,
  metadata?: PayoutMetadata
) {
  const rewardAsset = metadata?.rewardAsset ?? config.rewardSymbol;
  const idempotencyKey = `${epochId}:${wallet}:${rewardAsset}`;
  const result = await supabase
    .from("payouts")
    .upsert(
      {
        epoch_id: epochId,
        wallet,
        reward_asset: rewardAsset,
        reward_amount_raw: rewardAmountRaw,
        reward_amount: rewardAmount,
        ...payoutMetadataFields(metadata, rewardAmountRaw, rewardAmount),
        idempotency_key: idempotencyKey,
        status: "planned",
        updated_at: new Date().toISOString()
      },
      { onConflict: "idempotency_key", ignoreDuplicates: true }
    )
    .select()
    .maybeSingle();
  return assertNoError(result, "plan payout");
}

export async function dryRunPayout(
  epochId: string,
  wallet: string,
  rewardAmountRaw: string,
  rewardAmount: string,
  metadata?: PayoutMetadata
) {
  const rewardAsset = metadata?.rewardAsset ?? config.rewardSymbol;
  const result = await supabase.from("payouts").upsert({
    epoch_id: epochId,
    wallet,
    reward_asset: rewardAsset,
    reward_amount_raw: rewardAmountRaw,
    reward_amount: rewardAmount,
    ...payoutMetadataFields(metadata, rewardAmountRaw, rewardAmount),
    idempotency_key: `${epochId}:${wallet}:${rewardAsset}`,
    status: "dry_run",
    updated_at: new Date().toISOString()
  });
  assertNoError(result, "dry-run payout");
}

export async function settlePayout(epochId: string, wallet: string, txSig: string, rewardAsset = config.rewardSymbol) {
  const result = await supabase
    .from("payouts")
    .update({ status: "settled", tx_sig: txSig, updated_at: new Date().toISOString() })
    .eq("epoch_id", epochId)
    .eq("wallet", wallet)
    .eq("reward_asset", rewardAsset);
  assertNoError(result, "settle payout");
}

export async function failPayout(epochId: string, wallet: string, error: unknown, rewardAsset = config.rewardSymbol) {
  const result = await supabase
    .from("payouts")
    .update({
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      updated_at: new Date().toISOString()
    })
    .eq("epoch_id", epochId)
    .eq("wallet", wallet)
    .eq("reward_asset", rewardAsset);
  assertNoError(result, "fail payout");
}
