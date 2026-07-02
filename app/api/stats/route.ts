import { NextResponse } from "next/server";
import { NATIVE_MINT, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, getMint } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";

export const runtime = "nodejs";

type EpochRow = {
  epoch_id: string;
  status: string | null;
  eligible_count: number | null;
  reward_bought: string | number | null;
  reward_distributed: string | number | null;
  golden_winner_wallet: string | null;
  golden_base_reward: string | number | null;
  golden_bonus_reward: string | number | null;
  golden_multiplier: number | null;
  golden_capped: boolean | null;
  golden_tx_sig: string | null;
  started_at: string | null;
  completed_at: string | null;
};

type ClaimRow = {
  epoch_id: string;
  amount_claimed: string | number | null;
  tx_sig: string | null;
};

type BuyRow = {
  epoch_id: string;
  tx_sig: string | null;
};

type SupabaseConfig = {
  url: string;
  key: string;
};

type PayoutRow = {
  epoch_id: string;
  wallet: string;
  reward_amount: string | number | null;
  normal_reward_amount: string | number | null;
  golden_bonus_reward: string | number | null;
  is_golden: boolean | null;
  golden_multiplier: number | null;
  golden_capped: boolean | null;
  status: string | null;
  tx_sig: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type HolderStateRow = {
  current_multiplier_bps: number | null;
  source_balance: string | number | null;
  permanently_ineligible: boolean | null;
};

type EpochPayoutSummary = {
  rewardAmount: number;
  normalRewardAmount: number;
  goldenBonusReward: number;
  recipients: number;
  latestTime: string | null;
  latestTxSig: string | null;
  golden: PayoutRow | null;
};

type ParsedTokenAccountInfo = {
  owner?: string;
  tokenAmount?: {
    amount?: string;
  };
};

const PUMP_PROGRAM_ID = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
const PUMP_AMM_PROGRAM_ID = new PublicKey("pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA");
const LIVE_ELIGIBLE_CACHE_MS = 90_000;

let liveEligibleCache: { key: string; value: number; expiresAt: number } | null = null;

function supabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

function supabaseHeaders(key: string, extra?: HeadersInit) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra
  };
}

async function getSupabaseJson<T>(config: SupabaseConfig, path: string, extraHeaders?: HeadersInit) {
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    headers: supabaseHeaders(config.key, extraHeaders),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Supabase ${path} error ${response.status}`);
  return (await response.json()) as T;
}

async function getOptionalSupabaseJson<T>(config: SupabaseConfig, path: string) {
  try {
    return await getSupabaseJson<T>(config, path);
  } catch {
    return null;
  }
}

function countFromContentRange(contentRange: string | null) {
  const total = contentRange?.split("/").pop();
  const count = Number(total);
  return Number.isFinite(count) ? count : null;
}

async function getSupabaseCount(config: SupabaseConfig, path: string) {
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    headers: supabaseHeaders(config.key, {
      Prefer: "count=exact",
      Range: "0-0"
    }),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Supabase count ${path} error ${response.status}`);
  return countFromContentRange(response.headers.get("content-range"));
}

async function getSettledPayouts(config: SupabaseConfig) {
  const pageSize = 1000;
  const rows: PayoutRow[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const page = await getSupabaseJson<PayoutRow[]>(
      config,
      "payouts?select=epoch_id,wallet,reward_amount,normal_reward_amount,golden_bonus_reward,is_golden,golden_multiplier,golden_capped,status,tx_sig,updated_at,created_at&status=eq.settled&order=updated_at.desc",
      {
        Range: `${offset}-${offset + pageSize - 1}`
      }
    );

    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

function rpcUrl() {
  return (
    process.env.HELIUS_RPC_URL ??
    process.env.NEXT_PUBLIC_HELIUS_RPC_URL ??
    process.env.SOLANA_RPC_URL ??
    "https://api.mainnet-beta.solana.com"
  );
}

function numberEnv(name: string, fallback: number) {
  const value = process.env[name] ?? process.env[`NEXT_PUBLIC_${name}`];
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function holderBoostBps(balance: number) {
  if (balance < 500_000) return 13500;
  if (balance < 1_000_000) return 12000;
  if (balance < 3_000_000) return 11000;
  return 10000;
}

function averageBoost(holderStates: HolderStateRow[] | null) {
  const active = (holderStates ?? []).filter((row) => !row.permanently_ineligible);
  if (!active.length) return null;
  const totalBps = active.reduce((sum, row) => sum + holderBoostBps(toNumber(row.source_balance)), 0);
  return totalBps / active.length / 10000;
}

function sourceTokenMint() {
  const value = process.env.SOURCE_TOKEN_MINT ?? process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT;
  if (!value) return null;
  try {
    return new PublicKey(value);
  } catch {
    console.warn("stats route could not parse SOURCE_TOKEN_MINT");
    return null;
  }
}

function epochNumber(epochId: string, fallback: number) {
  const timestamp = Date.parse(epochId);
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 300000) : fallback;
}

function rowTime(row: Pick<EpochRow, "epoch_id" | "started_at">) {
  return Date.parse(row.started_at ?? row.epoch_id) || 0;
}

function payoutTime(row: Pick<PayoutRow, "updated_at" | "created_at" | "epoch_id">) {
  return Date.parse(row.updated_at ?? row.created_at ?? row.epoch_id) || 0;
}

function nextDropTime() {
  const fiveMinutes = 300000;
  return new Date(Math.ceil(Date.now() / fiveMinutes) * fiveMinutes).toISOString();
}

async function tokenProgramForMint(connection: Connection, mint: PublicKey) {
  const info = await connection.getAccountInfo(mint, "confirmed");
  if (!info) throw new Error(`Mint not found: ${mint.toBase58()}`);
  if (info.owner.equals(TOKEN_PROGRAM_ID)) return TOKEN_PROGRAM_ID;
  if (info.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  throw new Error(`Unsupported token program: ${info.owner.toBase58()}`);
}

function addExcluded(excluded: Set<string>, value: PublicKey | null | undefined) {
  if (value) excluded.add(value.toBase58());
}

function addExcludedString(excluded: Set<string>, value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return;
  try {
    excluded.add(new PublicKey(trimmed).toBase58());
  } catch {
    console.warn("stats route skipped invalid excluded wallet");
  }
}

function pumpPda(seeds: Buffer[]) {
  return PublicKey.findProgramAddressSync(seeds, PUMP_PROGRAM_ID)[0];
}

function pumpAmmPda(seeds: Buffer[]) {
  return PublicKey.findProgramAddressSync(seeds, PUMP_AMM_PROGRAM_ID)[0];
}

function bondingCurvePda(mint: PublicKey) {
  return pumpPda([Buffer.from("bonding-curve"), mint.toBuffer()]);
}

function bondingCurveV2Pda(mint: PublicKey) {
  return pumpPda([Buffer.from("bonding-curve-v2"), mint.toBuffer()]);
}

function canonicalPoolPda(mint: PublicKey) {
  const index = Buffer.alloc(2);
  index.writeUInt16LE(0);
  const poolAuthority = pumpPda([Buffer.from("pool-authority"), mint.toBuffer()]);
  return pumpAmmPda([Buffer.from("pool"), index, poolAuthority.toBuffer(), mint.toBuffer(), NATIVE_MINT.toBuffer()]);
}

function excludedWallets(mint: PublicKey, mintAuthority: PublicKey | null) {
  const excluded = new Set<string>();
  addExcluded(excluded, mint);
  addExcluded(excluded, mintAuthority);
  addExcluded(excluded, bondingCurvePda(mint));
  addExcluded(excluded, bondingCurveV2Pda(mint));
  addExcluded(excluded, canonicalPoolPda(mint));
  addExcludedString(excluded, process.env.TREASURY_WALLET_PUBLIC_KEY);
  addExcludedString(excluded, process.env.REWARD_TOKEN_MINT ?? process.env.NEXT_PUBLIC_REWARD_TOKEN_MINT);

  for (const wallet of (process.env.EXCLUDE_WALLETS ?? "").split(",")) {
    addExcludedString(excluded, wallet);
  }

  return excluded;
}

function holderPct(rawBalance: bigint, rawSupply: bigint) {
  if (rawSupply <= 0n) return 0;
  return Number((rawBalance * 1_000_000n) / rawSupply) / 10_000;
}

function parsedTokenInfo(data: unknown) {
  return (data as { parsed?: { info?: ParsedTokenAccountInfo } })?.parsed?.info ?? null;
}

async function liveEligibleHolderCount() {
  const mint = sourceTokenMint();
  if (!mint) return null;

  const eligibilityMin = Math.max(0, numberEnv("ELIGIBILITY_MIN", 250_000));
  const maxHolderPct = numberEnv("MAX_HOLDER_PCT", 5);
  const endpoint = rpcUrl();
  const cacheKey = `${endpoint}:${mint.toBase58()}:${eligibilityMin}:${maxHolderPct}`;
  const now = Date.now();

  if (liveEligibleCache?.key === cacheKey && liveEligibleCache.expiresAt > now) {
    return liveEligibleCache.value;
  }

  const connection = new Connection(endpoint, "confirmed");
  const tokenProgram = await tokenProgramForMint(connection, mint);
  const mintInfo = await getMint(connection, mint, "confirmed", tokenProgram);
  const rawSupply = mintInfo.supply;
  if (rawSupply <= 0n) return 0;

  const filters = tokenProgram.equals(TOKEN_PROGRAM_ID)
    ? [{ dataSize: 165 }, { memcmp: { offset: 0, bytes: mint.toBase58() } }]
    : [{ memcmp: { offset: 0, bytes: mint.toBase58() } }];
  const accounts = await connection.getParsedProgramAccounts(tokenProgram, { filters });
  const balances = new Map<string, bigint>();

  for (const account of accounts) {
    const parsed = parsedTokenInfo(account.account.data);
    if (!parsed?.owner || !parsed.tokenAmount?.amount) continue;
    const owner = new PublicKey(parsed.owner);
    if (!PublicKey.isOnCurve(owner.toBytes())) continue;
    const amount = BigInt(parsed.tokenAmount.amount);
    balances.set(parsed.owner, (balances.get(parsed.owner) ?? 0n) + amount);
  }

  const excluded = excludedWallets(mint, mintInfo.mintAuthority);
  const minRawBalance = BigInt(Math.ceil(eligibilityMin * 10 ** mintInfo.decimals));
  let count = 0;

  for (const [wallet, rawBalance] of balances) {
    if (excluded.has(wallet)) continue;
    if (rawBalance < minRawBalance) continue;
    if (holderPct(rawBalance, rawSupply) > maxHolderPct) continue;
    count += 1;
  }

  liveEligibleCache = {
    key: cacheKey,
    value: count,
    expiresAt: now + LIVE_ELIGIBLE_CACHE_MS
  };

  return count;
}

async function liveEligibleHolderCountOrNull() {
  try {
    return await liveEligibleHolderCount();
  } catch (error) {
    console.warn("stats route could not count live eligible holders", error);
    return null;
  }
}

function durationLabel(startedAt: string | null, completedAt: string | null) {
  if (!startedAt || !completedAt) return "0s";
  const ms = Math.max(0, Date.parse(completedAt) - Date.parse(startedAt));
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export async function GET() {
  const config = supabaseConfig();

  if (!config) {
    const latestEligibleHolders = await liveEligibleHolderCountOrNull();
    return NextResponse.json({
      currentEpoch: 0,
      totalEpochs: 0,
      lastRewardAirdropped: 0,
      totalRewardAirdropped: 0,
      latestEligibleHolders: latestEligibleHolders ?? 0,
      nextDropTime: nextDropTime(),
      epochHistory: [],
      roundHistory: [],
      recentRewards: [],
      latestGolden: null
    });
  }

  try {
    const rows = await getSupabaseJson<EpochRow[]>(
      config,
      "epochs?select=epoch_id,status,eligible_count,reward_bought,reward_distributed,golden_winner_wallet,golden_base_reward,golden_bonus_reward,golden_multiplier,golden_capped,golden_tx_sig,started_at,completed_at&order=started_at.desc&limit=50"
    );
    const epochIds = rows.map((row) => row.epoch_id);
    const claims = epochIds.length
      ? await fetch(
          `${config.url}/rest/v1/claims?select=epoch_id,amount_claimed,tx_sig&epoch_id=in.(${epochIds.map(encodeURIComponent).join(",")})`,
          {
            headers: supabaseHeaders(config.key),
            cache: "no-store"
          }
        )
      : null;
    const claimRows = claims?.ok ? ((await claims.json()) as ClaimRow[]) : [];
    const claimsByEpoch = new Map(claimRows.map((claim) => [claim.epoch_id, claim]));
    const buys = epochIds.length
      ? await fetch(`${config.url}/rest/v1/buys?select=epoch_id,tx_sig&epoch_id=in.(${epochIds.map(encodeURIComponent).join(",")})`, {
          headers: supabaseHeaders(config.key),
          cache: "no-store"
        })
      : null;
    const buyRows = buys?.ok ? ((await buys.json()) as BuyRow[]) : [];
    const buysByEpoch = new Map(buyRows.map((buy) => [buy.epoch_id, buy]));
    const payoutRows = await getSettledPayouts(config);
    const holderStates = await getOptionalSupabaseJson<HolderStateRow[]>(
      config,
      "holder_states?select=current_multiplier_bps,source_balance,permanently_ineligible&permanently_ineligible=eq.false&limit=10000"
    );
    const avgMultiplier = averageBoost(holderStates);
    const payoutsByEpoch = new Map<string, EpochPayoutSummary>();

    for (const payout of payoutRows) {
      const summary =
        payoutsByEpoch.get(payout.epoch_id) ??
        ({
          rewardAmount: 0,
          normalRewardAmount: 0,
          goldenBonusReward: 0,
          recipients: 0,
          latestTime: null,
          latestTxSig: null,
          golden: null
        } satisfies EpochPayoutSummary);
      const currentTime = payoutTime(payout);
      const latestTime = Date.parse(summary.latestTime ?? "") || 0;

      summary.rewardAmount += toNumber(payout.reward_amount);
      summary.normalRewardAmount += toNumber(payout.normal_reward_amount);
      summary.goldenBonusReward += toNumber(payout.golden_bonus_reward);
      summary.recipients += 1;
      if (currentTime >= latestTime) {
        summary.latestTime = payout.updated_at ?? payout.created_at ?? payout.epoch_id;
        summary.latestTxSig = payout.tx_sig;
      }
      if (payout.is_golden && (!summary.golden || currentTime >= payoutTime(summary.golden))) {
        summary.golden = payout;
      }
      payoutsByEpoch.set(payout.epoch_id, summary);
    }

    const latest = rows[0];
    const rowsByEpoch = new Map(rows.map((row) => [row.epoch_id, row]));
    const realEpochIds = [...payoutsByEpoch.entries()]
      .filter(([, summary]) => summary.rewardAmount > 0)
      .sort(([epochA, summaryA], [epochB, summaryB]) => {
        const timeA = Date.parse(summaryA.latestTime ?? epochA) || 0;
        const timeB = Date.parse(summaryB.latestTime ?? epochB) || 0;
        return timeA - timeB || epochA.localeCompare(epochB);
      })
      .map(([epochId]) => epochId);
    const realEpochCount = realEpochIds.length;
    const displayEpochById = new Map(realEpochIds.map((epochId, index) => [epochId, index + 1]));
    const recentRealEpochIds = [...realEpochIds].reverse().slice(0, 10);
    const latestRealRow = rowsByEpoch.get(recentRealEpochIds[0]) ?? latest;

    const epochHistory = recentRealEpochIds.map((epochId, index) => {
        const row = rowsByEpoch.get(epochId);
        const payoutSummary = payoutsByEpoch.get(epochId);
        return {
          epoch: displayEpochById.get(epochId) ?? realEpochCount - index,
          rewardAmount: payoutSummary?.rewardAmount ?? 0,
          recipients: payoutSummary?.recipients ?? 0,
          timestamp: payoutSummary?.latestTime ?? row?.completed_at ?? row?.started_at ?? epochId,
          status: row?.status === "completed" ? "completed" : "settled"
        };
      });

    const roundHistory = recentRealEpochIds.map((epochId, index) => {
      const row = rowsByEpoch.get(epochId);
      const claim = claimsByEpoch.get(epochId);
      const buy = buysByEpoch.get(epochId);
      const payoutSummary = payoutsByEpoch.get(epochId);
      const goldenPayout = payoutSummary?.golden;
      return {
        epoch: displayEpochById.get(epochId) ?? realEpochCount - index,
        status: row?.status === "completed" ? "completed" : "settled",
        startedAt: row?.started_at ?? epochId,
        duration: durationLabel(row?.started_at ?? null, row?.completed_at ?? payoutSummary?.latestTime ?? null),
        claimedSol: toNumber(claim?.amount_claimed),
        rewardBought: toNumber(row?.reward_bought),
        normalRewardsSent: payoutSummary?.normalRewardAmount ?? 0,
        distributedPump: payoutSummary?.rewardAmount ?? 0,
        goldenWinnerWallet: goldenPayout?.wallet ?? null,
        goldenBaseReward: toNumber(goldenPayout?.normal_reward_amount),
        goldenBonusReward: toNumber(goldenPayout?.golden_bonus_reward),
        goldenTotalReward: toNumber(goldenPayout?.reward_amount),
        goldenMultiplier: goldenPayout?.golden_multiplier ?? row?.golden_multiplier ?? 5,
        goldenCapped: goldenPayout?.golden_capped ?? false,
        goldenTxSig: goldenPayout?.tx_sig ?? null,
        txSig: payoutSummary?.latestTxSig ?? claim?.tx_sig ?? buy?.tx_sig ?? null
      };
    });

    const recentRewards = payoutRows.slice(0, 50).map((row) => ({
      epoch: displayEpochById.get(row.epoch_id) ?? epochNumber(row.epoch_id, 0),
      wallet: row.wallet,
      rewardAmount: toNumber(row.reward_amount),
      normalRewardAmount: toNumber(row.normal_reward_amount),
      goldenBonusReward: toNumber(row.golden_bonus_reward),
      isGolden: row.is_golden ?? false,
      goldenMultiplier: row.golden_multiplier ?? 1,
      goldenCapped: row.golden_capped ?? false,
      time: row.updated_at ?? row.created_at ?? row.epoch_id,
      status: row.status ?? "unknown",
      txSig: row.tx_sig
    }));
    const latestGoldenRow = payoutRows.find((row) => row.is_golden);
    const latestGolden = latestGoldenRow
      ? {
          wallet: latestGoldenRow.wallet,
          baseReward: toNumber(latestGoldenRow.normal_reward_amount),
          bonusReward: toNumber(latestGoldenRow.golden_bonus_reward),
          totalReward: toNumber(latestGoldenRow.reward_amount),
          multiplier: latestGoldenRow.golden_multiplier ?? 5,
          capped: latestGoldenRow.golden_capped ?? false,
          txSig: latestGoldenRow.tx_sig
        }
      : null;
    const totalRewardAirdropped = Array.from(payoutsByEpoch.values()).reduce(
      (sum, summary) => sum + summary.rewardAmount,
      0
    );
    const storedEligibleHolders = toNumber(latestRealRow?.eligible_count);
    const latestEligibleHolders =
      storedEligibleHolders > 0 ? storedEligibleHolders : (await liveEligibleHolderCountOrNull()) ?? storedEligibleHolders;

    return NextResponse.json({
      currentEpoch: realEpochCount,
      totalEpochs: realEpochCount,
      lastRewardAirdropped: epochHistory[0]?.rewardAmount ?? 0,
      totalRewardAirdropped,
      latestEligibleHolders,
      averageMultiplier: avgMultiplier,
      nextDropTime: nextDropTime(),
      epochHistory,
      roundHistory,
      recentRewards,
      latestGolden
    });
  } catch (error) {
    console.error("stats route failed", error);
    const latestEligibleHolders = await liveEligibleHolderCountOrNull();
    return NextResponse.json({
      currentEpoch: 0,
      totalEpochs: 0,
      lastRewardAirdropped: 0,
      totalRewardAirdropped: 0,
      latestEligibleHolders: latestEligibleHolders ?? 0,
      nextDropTime: nextDropTime(),
      epochHistory: [],
      roundHistory: [],
      recentRewards: [],
      latestGolden: null
    });
  }
}
