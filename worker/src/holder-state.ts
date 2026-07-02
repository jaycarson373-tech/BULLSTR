import { config } from "./config.js";
import { supabase } from "./db.js";
import type { Holder } from "./snapshot.js";

type HolderStateRow = {
  wallet: string;
  source_balance: string | number | null;
  source_balance_raw: string | null;
  highest_source_balance_raw: string | null;
  eligible_since: string | null;
  current_streak_epochs: number | null;
  current_multiplier_bps: number | null;
  permanently_ineligible: boolean | null;
  ineligible_reason: string | null;
};

function parseRaw(value: unknown) {
  try {
    return BigInt(String(value ?? "0"));
  } catch {
    return 0n;
  }
}

function isMissingHolderStateTable(error: unknown) {
  const message = JSON.stringify(error);
  return message.includes("holder_states") || message.includes("42P01") || message.includes("PGRST205");
}

async function getHolderStates() {
  const result = await supabase
    .from("holder_states")
    .select(
      "wallet,source_balance,source_balance_raw,highest_source_balance_raw,eligible_since,current_streak_epochs,current_multiplier_bps,permanently_ineligible,ineligible_reason"
    )
    .limit(10000);

  if (result.error) throw result.error;
  return (result.data ?? []) as HolderStateRow[];
}

async function upsertHolderStates(rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const result = await supabase.from("holder_states").upsert(rows, { onConflict: "wallet" });
  if (result.error) throw result.error;
}

export async function applyHolderState(epochId: string, eligibleHolders: Holder[], currentHolders = eligibleHolders): Promise<Holder[]> {
  try {
    const now = new Date().toISOString();
    const states = await getHolderStates();
    const stateByWallet = new Map(states.map((state) => [state.wallet, state]));
    const eligibleByWallet = new Map(eligibleHolders.map((holder) => [holder.wallet, holder]));
    const currentByWallet = new Map(currentHolders.map((holder) => [holder.wallet, holder]));
    const updates: Record<string, unknown>[] = [];
    const eligible: Holder[] = [];
    const permanentlyRemoved = new Set<string>();

    for (const state of states) {
      if (state.permanently_ineligible) continue;
      const current = currentByWallet.get(state.wallet);
      const previousRaw = parseRaw(state.source_balance_raw);

      const droppedBelowThreshold = !current || current.uiBalance < config.eligibilityMin;
      const soldAnyAmount = current ? current.rawBalance < previousRaw : true;

      if (droppedBelowThreshold || soldAnyAmount) {
        updates.push({
          wallet: state.wallet,
          source_balance: current?.uiBalance.toString() ?? state.source_balance ?? "0",
          source_balance_raw: current?.rawBalance.toString() ?? state.source_balance_raw ?? "0",
          highest_source_balance_raw: state.highest_source_balance_raw ?? state.source_balance_raw ?? "0",
          permanently_ineligible: true,
          ineligible_reason: soldAnyAmount ? "balance_decreased" : "dropped_below_threshold",
          ineligible_at: now,
          last_seen_at: now,
          last_epoch_id: epochId,
          updated_at: now,
          current_streak_epochs: 0,
          current_multiplier_bps: 10_000
        });
        permanentlyRemoved.add(state.wallet);
      } else if (!eligibleByWallet.has(state.wallet)) {
        updates.push({
          wallet: state.wallet,
          source_balance: current.uiBalance.toString(),
          source_balance_raw: current.rawBalance.toString(),
          highest_source_balance_raw:
            parseRaw(state.highest_source_balance_raw) > current.rawBalance
              ? state.highest_source_balance_raw ?? current.rawBalance.toString()
              : current.rawBalance.toString(),
          last_seen_at: now,
          last_epoch_id: epochId,
          updated_at: now,
          current_streak_epochs: 0,
          current_multiplier_bps: 10_000
        });
      }
    }

    for (const holder of eligibleHolders) {
      const existing = stateByWallet.get(holder.wallet);
      if (existing?.permanently_ineligible || permanentlyRemoved.has(holder.wallet)) continue;

      const previousRaw = parseRaw(existing?.source_balance_raw);
      const highestRaw = parseRaw(existing?.highest_source_balance_raw);
      const soldAnyAmount = existing && holder.rawBalance < previousRaw;

      if (soldAnyAmount) {
        updates.push({
          wallet: holder.wallet,
          source_balance: holder.uiBalance.toString(),
          source_balance_raw: holder.rawBalance.toString(),
          highest_source_balance_raw: highestRaw > holder.rawBalance ? highestRaw.toString() : holder.rawBalance.toString(),
          permanently_ineligible: true,
          ineligible_reason: "balance_decreased",
          ineligible_at: now,
          last_seen_at: now,
          last_epoch_id: epochId,
          updated_at: now,
          current_streak_epochs: 0,
          current_multiplier_bps: 10_000
        });
        permanentlyRemoved.add(holder.wallet);
        continue;
      }

      const nextStreak = existing ? (existing.current_streak_epochs ?? 0) + 1 : 1;
      const multiplierBps = 10_000;
      const eligibleSince = existing?.eligible_since ?? now;
      const nextHighest = highestRaw > holder.rawBalance ? highestRaw : holder.rawBalance;

      updates.push({
        wallet: holder.wallet,
        source_balance: holder.uiBalance.toString(),
        source_balance_raw: holder.rawBalance.toString(),
        highest_source_balance_raw: nextHighest.toString(),
        eligible_since: eligibleSince,
        last_seen_at: now,
        last_epoch_id: epochId,
        updated_at: now,
        current_streak_epochs: nextStreak,
        current_multiplier_bps: multiplierBps,
        permanently_ineligible: false,
        ineligible_reason: null,
        ineligible_at: null
      });

      eligible.push({
        ...holder,
        multiplierBps,
        streakEpochs: nextStreak,
        eligibleSince
      });
    }

    await upsertHolderStates(updates);

    const removed = eligibleHolders.length - eligible.length;
    if (removed > 0) {
      console.log(`[${epochId}] holder-state removed ${removed} permanently ineligible holders`);
    }
    return eligible;
  } catch (error) {
    if (isMissingHolderStateTable(error)) {
      console.warn(`[${epochId}] holder_states table missing; multiplier/permanent-ineligibility tracking is disabled`);
      return eligibleHolders.map((holder) => ({ ...holder, multiplierBps: 10_000, streakEpochs: 1, eligibleSince: null }));
    }
    throw error;
  }
}
