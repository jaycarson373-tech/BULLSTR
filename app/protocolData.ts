import { createClient } from "@supabase/supabase-js";
import { brand } from "./brand";

export type RewardProof = {
  epochId: string;
  wallet: string;
  rewardAsset: string;
  amount: number;
  txSig: string;
  updatedAt: string | null;
};

export type RewardRound = {
  epochId: string;
  startedAt: string | null;
  amount: number;
  recipients: number;
  proofs: string[];
};

export type HimothyHolder = {
  wallet: string;
  balance: number;
  multiplier: number;
  eligibleSince: string | null;
  streakEpochs: number;
  lastSeenAt: string | null;
};

export type FallenHimothy = {
  wallet: string;
  reason: string | null;
  lastSeenAt: string | null;
  balance: number;
};

export type ProtocolData = {
  rounds: RewardRound[];
  latestPayouts: RewardProof[];
  leaders: HimothyHolder[];
  fallen: FallenHimothy[];
  activeWallets: number;
  totalDistributed: number;
};

type ProtocolDataOptions = {
  epochLimit?: number;
  fallenLimit?: number;
  leaderLimit?: number;
  payoutLimit?: number;
  proofsPerRound?: number;
};

export const emptyData: ProtocolData = {
  rounds: [],
  latestPayouts: [],
  leaders: [],
  fallen: [],
  activeWallets: 0,
  totalDistributed: 0
};

export function formatAmount(value: number, maximumFractionDigits = 4) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

export function formatDate(value: string | null) {
  if (!value) return "Not indexed";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "Not indexed";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(parsed));
}

export function shortWallet(wallet: string) {
  return `${wallet.slice(0, 5)}...${wallet.slice(-5)}`;
}

export function shortSignature(signature: string) {
  return `${signature.slice(0, 6)}...${signature.slice(-6)}`;
}

export async function getProtocolData(options: ProtocolDataOptions = {}): Promise<ProtocolData> {
  if (!brand.tokenMint) return emptyData;
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
  if (!supabaseUrl || !serviceRole) return emptyData;

  const epochLimit = options.epochLimit ?? 10;
  const fallenLimit = options.fallenLimit ?? 10;
  const leaderLimit = options.leaderLimit ?? 10;
  const payoutLimit = options.payoutLimit ?? 2000;
  const proofsPerRound = options.proofsPerRound ?? 3;

  try {
    const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    const [epochsResult, leadersResult, fallenResult, activeResult, payoutResult] = await Promise.all([
      supabase.from("epochs").select("epoch_id,started_at").order("started_at", { ascending: false }).limit(epochLimit),
      supabase
        .from("holder_states")
        .select("wallet,source_balance,current_multiplier_bps,eligible_since,current_streak_epochs,last_seen_at")
        .eq("permanently_ineligible", false)
        .order("source_balance", { ascending: false })
        .limit(leaderLimit),
      supabase
        .from("holder_states")
        .select("wallet,source_balance,ineligible_reason,last_seen_at")
        .eq("permanently_ineligible", true)
        .order("last_seen_at", { ascending: false })
        .limit(fallenLimit),
      supabase.from("holder_states").select("wallet", { count: "exact", head: true }).eq("permanently_ineligible", false),
      supabase
        .from("payouts")
        .select("epoch_id,wallet,reward_asset,reward_amount,tx_sig,updated_at")
        .eq("status", "settled")
        .eq("reward_asset", brand.rewardSymbol)
        .order("updated_at", { ascending: false })
        .limit(payoutLimit)
    ]);

    if (epochsResult.error || leadersResult.error || fallenResult.error || activeResult.error || payoutResult.error) return emptyData;

    const epochIds = new Set((epochsResult.data ?? []).map((epoch) => String(epoch.epoch_id)));
    const totals = new Map<string, { amount: number; recipients: number; proofs: Set<string> }>();
    let totalDistributed = 0;
    const latestPayouts: RewardProof[] = [];

    for (const payout of payoutResult.data ?? []) {
      const amount = Number(payout.reward_amount ?? 0);
      const safeAmount = Number.isFinite(amount) ? amount : 0;
      totalDistributed += safeAmount;

      const txSig = payout.tx_sig ? String(payout.tx_sig) : "";
      if (txSig) {
        latestPayouts.push({
          epochId: String(payout.epoch_id),
          wallet: String(payout.wallet),
          rewardAsset: String(payout.reward_asset ?? brand.rewardSymbol),
          amount: safeAmount,
          txSig,
          updatedAt: payout.updated_at ? String(payout.updated_at) : null
        });
      }

      const epochId = String(payout.epoch_id);
      if (!epochIds.has(epochId)) continue;
      const current = totals.get(epochId) ?? { amount: 0, recipients: 0, proofs: new Set<string>() };
      current.amount += safeAmount;
      current.recipients += 1;
      if (txSig) current.proofs.add(txSig);
      totals.set(epochId, current);
    }

    const rounds = (epochsResult.data ?? [])
      .map((epoch) => {
        const epochId = String(epoch.epoch_id);
        const total = totals.get(epochId);
        return {
          epochId,
          startedAt: epoch.started_at ? String(epoch.started_at) : epochId,
          amount: total?.amount ?? 0,
          recipients: total?.recipients ?? 0,
          proofs: [...(total?.proofs ?? [])].slice(0, proofsPerRound)
        };
      })
      .filter((round) => round.amount > 0 && round.proofs.length > 0);

    return {
      rounds,
      latestPayouts,
      totalDistributed,
      activeWallets: activeResult.count ?? 0,
      leaders: (leadersResult.data ?? []).map((row) => ({
        wallet: String(row.wallet),
        balance: Number(row.source_balance ?? 0),
        multiplier: Number(row.current_multiplier_bps ?? 10_000) / 10_000,
        eligibleSince: row.eligible_since ? String(row.eligible_since) : null,
        streakEpochs: Number(row.current_streak_epochs ?? 0),
        lastSeenAt: row.last_seen_at ? String(row.last_seen_at) : null
      })),
      fallen: (fallenResult.data ?? []).map((row) => ({
        wallet: String(row.wallet),
        balance: Number(row.source_balance ?? 0),
        reason: row.ineligible_reason ? String(row.ineligible_reason) : null,
        lastSeenAt: row.last_seen_at ? String(row.last_seen_at) : null
      }))
    };
  } catch {
    return emptyData;
  }
}
