import { PublicKey } from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PayoutRow = {
  epoch_id: string;
  reward_asset: string | null;
  reward_amount: string | number | null;
  tx_sig: string | null;
  updated_at: string | null;
};

function addDecimalStrings(left: string, right: string) {
  const leftParts = left.split(".");
  const rightParts = right.split(".");
  const precision = Math.max(leftParts[1]?.length ?? 0, rightParts[1]?.length ?? 0);
  const leftRaw = BigInt(`${leftParts[0] || "0"}${(leftParts[1] ?? "").padEnd(precision, "0")}`);
  const rightRaw = BigInt(`${rightParts[0] || "0"}${(rightParts[1] ?? "").padEnd(precision, "0")}`);
  const total = (leftRaw + rightRaw).toString().padStart(precision + 1, "0");
  if (precision === 0) return total;
  const whole = total.slice(0, -precision);
  const fraction = total.slice(-precision).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet")?.trim() ?? "";
  if (!wallet) return NextResponse.json({ error: "Enter a Solana wallet address." }, { status: 400 });

  try {
    const publicKey = new PublicKey(wallet);
    if (!PublicKey.isOnCurve(publicKey.toBytes())) throw new Error("Wallet must be on curve");
  } catch {
    return NextResponse.json({ error: "Enter a valid Solana wallet address." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Proof lookup is not configured yet." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const [payoutResult, holderResult] = await Promise.all([
    supabase
      .from("payouts")
      .select("epoch_id,reward_asset,reward_amount,tx_sig,updated_at")
      .eq("wallet", wallet)
      .eq("status", "settled")
      .eq("reward_asset", "USDC")
      .order("updated_at", { ascending: false })
      .limit(1000),
    supabase
      .from("holder_states")
      .select(
        "source_balance,eligible_since,last_seen_at,current_streak_epochs,current_multiplier_bps,permanently_ineligible,ineligible_reason"
      )
      .eq("wallet", wallet)
      .maybeSingle()
  ]);

  if (payoutResult.error || holderResult.error) {
    return NextResponse.json({ error: "Proof data is temporarily unavailable." }, { status: 503 });
  }

  const payouts = (payoutResult.data ?? []) as PayoutRow[];
  const totals = new Map<string, string>();
  for (const payout of payouts) {
    const asset = String(payout.reward_asset || "REWARD");
    totals.set(asset, addDecimalStrings(totals.get(asset) ?? "0", String(payout.reward_amount ?? "0")));
  }

  const holder = holderResult.data;
  const multiplierBps = Number(holder?.current_multiplier_bps ?? 10_000);
  const uniqueProofs = new Map<string, PayoutRow>();
  for (const payout of payouts) {
    if (payout.tx_sig && !uniqueProofs.has(payout.tx_sig)) uniqueProofs.set(payout.tx_sig, payout);
  }

  return NextResponse.json(
    {
      wallet,
      distributionCount: payouts.length,
      roundCount: new Set(payouts.map((payout) => payout.epoch_id)).size,
      totals: [...totals.entries()].map(([asset, amount]) => ({ asset, amount })),
      proofs: [...uniqueProofs.entries()].slice(0, 12).map(([signature, payout]) => ({
        signature,
        epochId: payout.epoch_id,
        rewardAsset: payout.reward_asset || "REWARD",
        rewardAmount: String(payout.reward_amount ?? "0"),
        settledAt: payout.updated_at
      })),
      holder: holder
        ? {
            sourceBalance: String(holder.source_balance ?? "0"),
            eligibleSince: holder.eligible_since,
            lastSeenAt: holder.last_seen_at,
            streakEpochs: Number(holder.current_streak_epochs ?? 0),
            multiplierBps,
            multiplier: `${(multiplierBps / 10_000).toFixed(2)}x`,
            permanentlyIneligible: Boolean(holder.permanently_ineligible),
            ineligibilityReason: holder.ineligible_reason
          }
        : null
    },
    { headers: { "cache-control": "no-store" } }
  );
}
