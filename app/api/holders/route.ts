import { NextResponse } from "next/server";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

type EpochRow = { epoch_id: string };
type SnapshotRow = {
  wallet: string;
  source_balance: string | number | null;
};
type HolderStateRow = {
  wallet: string;
  source_balance: string | number | null;
  current_streak_epochs: number | null;
  current_multiplier_bps: number | null;
  eligible_since: string | null;
  permanently_ineligible: boolean | null;
  ineligible_reason: string | null;
  ineligible_at: string | null;
  last_seen_at: string | null;
};
type PayoutRow = {
  wallet: string;
  reward_amount: string | number | null;
  updated_at: string | null;
  created_at: string | null;
};

function supabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function boostLabel(bps: number) {
  return `${(bps / 10000).toFixed(2)}x`;
}

function holderBoostBps(balance: number) {
  if (balance < 500_000) return 13500;
  if (balance < 1_000_000) return 12000;
  if (balance < 3_000_000) return 11000;
  return 10000;
}

function solBoostBps(solBalance: number) {
  if (solBalance < 1) return 13500;
  if (solBalance < 5) return 12000;
  if (solBalance < 20) return 11000;
  return 10000;
}

function solTierLabel(solBalance: number | null) {
  if (solBalance === null) return "Scored live";
  if (solBalance < 1) return "<1 SOL";
  if (solBalance < 5) return "1-5 SOL";
  if (solBalance < 20) return "5-20 SOL";
  return "20+ SOL";
}

async function solBalances(wallets: string[]) {
  const rpcUrl = process.env.HELIUS_RPC_URL ?? process.env.NEXT_PUBLIC_HELIUS_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const balances = new Map<string, number | null>();
  wallets.forEach((wallet) => balances.set(wallet, null));

  try {
    const connection = new Connection(rpcUrl, "confirmed");
    for (let index = 0; index < wallets.length; index += 100) {
      const batch = wallets.slice(index, index + 100);
      const accounts = await connection.getMultipleAccountsInfo(batch.map((wallet) => new PublicKey(wallet)), "confirmed");
      accounts.forEach((account, accountIndex) => {
        balances.set(batch[accountIndex], (account?.lamports ?? 0) / LAMPORTS_PER_SOL);
      });
    }
  } catch (error) {
    console.warn("optional SOL balance lookup failed", error);
  }

  return balances;
}

async function getJson<T>(url: string, key: string, extraHeaders?: HeadersInit) {
  const response = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...extraHeaders
    },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Supabase error ${response.status}`);
  return (await response.json()) as T;
}

async function getJsonOrNull<T>(url: string, key: string) {
  try {
    return await getJson<T>(url, key);
  } catch (error) {
    console.warn("optional holders query failed", error);
    return null;
  }
}

async function getSettledPayouts(config: { url: string; key: string }) {
  const pageSize = 1000;
  const rows: PayoutRow[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const page = await getJson<PayoutRow[]>(
      `${config.url}/rest/v1/payouts?select=wallet,reward_amount,updated_at,created_at&status=eq.settled&order=updated_at.desc`,
      config.key,
      { Range: `${offset}-${offset + pageSize - 1}` }
    );
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

function multiplierLabel(bps: number | null | undefined) {
  return `${((bps ?? 10000) / 10000).toFixed(2)}x`;
}

function holdTimeLabel(streakEpochs: number | null | undefined) {
  const minutes = Math.max(0, Number(streakEpochs ?? 0) * 5);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

function reasonLabel(reason: string | null | undefined) {
  if (reason === "balance_decreased") return "Sold BULLSTR";
  if (reason === "dropped_below_threshold") return "Dropped below 250K";
  if (reason === "dropped_below_threshold_or_sold") return "Sold or dropped below 250K";
  return "Permanently ineligible";
}

export async function GET() {
  const config = supabaseConfig();
  if (!config) return NextResponse.json({ topHolders: [], fallenBulls: [], totalSupply: 0, uniqueHolders: 0 });

  try {
    const holderStates = await getJsonOrNull<HolderStateRow[]>(
      `${config.url}/rest/v1/holder_states?select=wallet,source_balance,current_streak_epochs,current_multiplier_bps,eligible_since,permanently_ineligible,ineligible_reason,ineligible_at,last_seen_at&limit=10000`,
      config.key
    );
    const activeStates = (holderStates ?? []).filter((row) => !row.permanently_ineligible);
    const fallenStates = (holderStates ?? []).filter((row) => row.permanently_ineligible);
    const payoutRows = await getSettledPayouts(config).catch((error) => {
      console.warn("optional payout totals query failed", error);
      return [] as PayoutRow[];
    });
    const payoutsByWallet = new Map<string, { total: number; lastRewardAt: string | null }>();
    for (const payout of payoutRows ?? []) {
      const current = payoutsByWallet.get(payout.wallet) ?? { total: 0, lastRewardAt: null };
      current.total += toNumber(payout.reward_amount);
      current.lastRewardAt ??= payout.updated_at ?? payout.created_at;
      payoutsByWallet.set(payout.wallet, current);
    }

    if (activeStates.length) {
      const totalSupply = activeStates.reduce((sum, row) => sum + toNumber(row.source_balance), 0);
      const mappedHolders = activeStates.map((row) => {
        const balance = toNumber(row.source_balance);
        const payout = payoutsByWallet.get(row.wallet);
        const holderBoost = holderBoostBps(balance);
        return {
          rank: 0,
          address: row.wallet,
          balance,
          percentage: totalSupply > 0 ? ((balance / totalSupply) * 100).toFixed(2) : "0.00",
          currentMultiplier: multiplierLabel(row.current_multiplier_bps),
          currentMultiplierBps: row.current_multiplier_bps ?? 10000,
          currentHoldTime: holdTimeLabel(row.current_streak_epochs),
          currentStreak: row.current_streak_epochs ?? 0,
          holderBoost: boostLabel(holderBoost),
          holderBoostBps: holderBoost,
          solBalance: null as number | null,
          solBalanceTier: "Scored live",
          solBoost: "Scored live",
          solBoostBps: null as number | null,
          finalWeight: null as number | null,
          totalRewardEarned: payout?.total ?? 0,
          lastAirdropAt: payout?.lastRewardAt ?? null,
          permanentlyIneligible: false,
          ineligibleReason: null
        };
      })
        .sort((a, b) => {
          const earned = b.totalRewardEarned - a.totalRewardEarned;
          if (earned) return earned;
          return b.balance - a.balance;
        })
        .slice(0, 50);
      const solBalanceByWallet = await solBalances(mappedHolders.map((row) => row.address));
      const topHolders = mappedHolders.map((row, index) => {
        const solBalance = solBalanceByWallet.get(row.address) ?? null;
        const solBoost = solBalance === null ? null : solBoostBps(solBalance);
        const finalBoostBps = solBoost === null ? null : Math.round((row.holderBoostBps * solBoost) / 10000);
        return {
          ...row,
          rank: index + 1,
          solBalance,
          solBalanceTier: solTierLabel(solBalance),
          solBoost: solBoost === null ? "Scored live" : boostLabel(solBoost),
          solBoostBps: solBoost,
          finalWeight: finalBoostBps === null ? null : row.balance * (finalBoostBps / 10000)
        };
      });

      const fallenBulls = fallenStates
        .map((row) => {
          const payout = payoutsByWallet.get(row.wallet);
          return {
            address: row.wallet,
            balance: toNumber(row.source_balance),
            currentMultiplier: multiplierLabel(row.current_multiplier_bps),
            currentMultiplierBps: row.current_multiplier_bps ?? 10000,
            currentStreak: row.current_streak_epochs ?? 0,
            totalRewardEarned: payout?.total ?? 0,
            lastAirdropAt: payout?.lastRewardAt ?? null,
            ineligibleReason: reasonLabel(row.ineligible_reason),
            ineligibleAt: row.ineligible_at,
            lastSeenAt: row.last_seen_at
          };
        })
        .sort((a, b) => Date.parse(b.ineligibleAt ?? b.lastSeenAt ?? "") - Date.parse(a.ineligibleAt ?? a.lastSeenAt ?? ""))
        .slice(0, 250);

      return NextResponse.json({ topHolders, fallenBulls, totalSupply, uniqueHolders: activeStates.length });
    }

    const epochs = await getJson<EpochRow[]>(
      `${config.url}/rest/v1/epochs?select=epoch_id&order=started_at.desc&limit=1`,
      config.key
    );
    const epochId = epochs[0]?.epoch_id;
    if (!epochId) return NextResponse.json({ topHolders: [], fallenBulls: [], totalSupply: 0, uniqueHolders: 0 });

    const snapshots = await getJson<SnapshotRow[]>(
      `${config.url}/rest/v1/snapshots?select=wallet,source_balance&epoch_id=eq.${encodeURIComponent(epochId)}&order=source_balance.desc&limit=50`,
      config.key
    );

    const totalSupply = snapshots.reduce((sum, row) => sum + toNumber(row.source_balance), 0);
      const topHolders = snapshots.map((row) => {
        const balance = toNumber(row.source_balance);
        const holderBoost = holderBoostBps(balance);
        return {
          rank: 0,
          address: row.wallet,
          balance,
          percentage: totalSupply > 0 ? ((balance / totalSupply) * 100).toFixed(2) : "0.00",
        currentMultiplier: null,
        currentMultiplierBps: null,
          currentHoldTime: null,
          currentStreak: null,
          holderBoost: boostLabel(holderBoost),
          holderBoostBps: holderBoost,
          solBalance: null,
          solBalanceTier: "Scored live",
          solBoost: "Scored live",
          solBoostBps: null,
          finalWeight: null,
          totalRewardEarned: payoutsByWallet.get(row.wallet)?.total ?? 0,
          lastAirdropAt: payoutsByWallet.get(row.wallet)?.lastRewardAt ?? null,
        permanentlyIneligible: false,
        ineligibleReason: null
      };
    })
      .sort((a, b) => b.totalRewardEarned - a.totalRewardEarned || b.balance - a.balance)
      .map((row, index) => ({ ...row, rank: index + 1 }));

    return NextResponse.json({ topHolders, fallenBulls: [], totalSupply, uniqueHolders: snapshots.length });
  } catch (error) {
    console.error("holders route failed", error);
    return NextResponse.json({ topHolders: [], fallenBulls: [], totalSupply: 0, uniqueHolders: 0 });
  }
}
