import { createHash } from "crypto";
import { PublicKey } from "@solana/web3.js";
import { NATIVE_MINT, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, getMint } from "@solana/spl-token";
import { config, treasuryKeypair } from "./config.js";
import { connection } from "./solana.js";

const PUMP_PROGRAM_ID = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
const PUMP_AMM_PROGRAM_ID = new PublicKey("pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA");

export type Holder = {
  wallet: string;
  rawBalance: bigint;
  uiBalance: number;
  holderPct: number;
  multiplierBps?: number;
  streakEpochs?: number;
  eligibleSince?: string | null;
};

async function tokenProgramForMint(mint: PublicKey) {
  const info = await connection.getAccountInfo(mint);
  if (!info) throw new Error(`Mint not found: ${mint.toBase58()}`);
  if (info.owner.equals(TOKEN_PROGRAM_ID)) return TOKEN_PROGRAM_ID;
  if (info.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  throw new Error(`Unsupported token program: ${info.owner.toBase58()}`);
}

function addExcluded(excluded: Set<string>, value: PublicKey | null | undefined) {
  if (value) excluded.add(value.toBase58());
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
  addExcluded(excluded, config.sourceTokenMint);
  addExcluded(excluded, config.rewardTokenMint);
  addExcluded(excluded, treasuryKeypair().publicKey);
  addExcluded(excluded, mintAuthority);
  addExcluded(excluded, bondingCurvePda(mint));
  addExcluded(excluded, bondingCurveV2Pda(mint));
  addExcluded(excluded, canonicalPoolPda(mint));
  for (const wallet of config.excludeWallets) addExcluded(excluded, wallet);
  return excluded;
}

function holderPct(rawBalance: bigint, rawSupply: bigint) {
  if (rawSupply <= 0n) return 0;
  return Number((rawBalance * 1_000_000n) / rawSupply) / 10_000;
}

function recipientScore(epochId: string, holder: Holder) {
  return createHash("sha256")
    .update(`${epochId}:${holder.wallet}:${holder.rawBalance.toString()}`)
    .digest("hex");
}

export function selectRewardRecipients(epochId: string, holders: Holder[], limit = config.maxWalletsPerEpoch) {
  const recipients = holders
    .map((holder) => ({ holder, score: recipientScore(epochId, holder) }))
    .sort((a, b) => {
      const score = a.score.localeCompare(b.score);
      return score || a.holder.wallet.localeCompare(b.holder.wallet);
    })
    .slice(0, limit)
    .map(({ holder }) => holder);

  if (holders.length > recipients.length) {
    console.log(`[SNAPSHOT] selected ${recipients.length} random recipients from ${holders.length} eligible holders`);
  }

  return recipients;
}

export async function snapshotTokenHolders(mint: PublicKey, label = "token"): Promise<Holder[]> {
  const tokenProgram = await tokenProgramForMint(mint);
  const supply = await connection.getTokenSupply(mint, "confirmed");
  const rawSupply = BigInt(supply.value.amount);
  if (rawSupply <= 0n) throw new Error(`${label} supply is zero: ${mint.toBase58()}`);

  const filters = tokenProgram.equals(TOKEN_PROGRAM_ID)
    ? [{ dataSize: 165 }, { memcmp: { offset: 0, bytes: mint.toBase58() } }]
    : [{ memcmp: { offset: 0, bytes: mint.toBase58() } }];
  const accounts = await connection.getParsedProgramAccounts(tokenProgram, { filters });
  console.log(`holder query returned ${accounts.length} token accounts for ${label} mint ${mint.toBase58()}`);
  console.log(`mint decimals: ${supply.value.decimals}`);

  const balances = new Map<string, bigint>();
  for (const account of accounts) {
    const parsed = (account.account.data as any).parsed?.info;
    if (!parsed?.owner || !parsed?.tokenAmount?.amount) continue;
    const owner = new PublicKey(parsed.owner);
    if (!PublicKey.isOnCurve(owner.toBytes())) continue;
    const amount = BigInt(parsed.tokenAmount.amount);
    balances.set(parsed.owner, (balances.get(parsed.owner) ?? 0n) + amount);
  }

  const decimals = supply.value.decimals;
  const aggregated = [...balances.entries()].map(([wallet, rawBalance]) => ({
    wallet,
    rawBalance,
    uiBalance: Number(rawBalance) / 10 ** decimals,
    holderPct: holderPct(rawBalance, rawSupply)
  }));

  const eligibleByBalance = aggregated.filter((holder) => holder.uiBalance >= config.eligibilityMin);
  console.log(`${eligibleByBalance.length} wallets >= ${config.eligibilityMin} source tokens`);

  if (accounts.length > 0 && eligibleByBalance.length === 0) {
    const topBalances = [...aggregated]
      .sort((a, b) => b.uiBalance - a.uiBalance)
      .slice(0, 3)
      .map((holder) => `${holder.wallet}=${holder.uiBalance}`);
    console.log(`top 3 balances seen: ${topBalances.join(", ")}`);
  }

  return aggregated.sort((a, b) => (a.rawBalance === b.rawBalance ? 0 : a.rawBalance > b.rawBalance ? -1 : 1));
}

export async function snapshotSourceHolders(): Promise<Holder[]> {
  return snapshotTokenHolders(config.sourceTokenMint, "source");
}

export async function eligibleHoldersFromSnapshot(holders: Holder[]): Promise<Holder[]> {
  const tokenProgram = await tokenProgramForMint(config.sourceTokenMint);
  const mintInfo = await getMint(connection, config.sourceTokenMint, "confirmed", tokenProgram);
  const excluded = excludedWallets(config.sourceTokenMint, mintInfo.mintAuthority);
  return holders
    .filter((holder) => holder.uiBalance >= config.eligibilityMin)
    .filter((holder) => !excluded.has(holder.wallet))
    .filter((holder) => {
      const isWhale = holder.holderPct >= config.maxHolderPct;
      if (isWhale) {
        console.log(`[SNAPSHOT] excluded max-holder ${holder.wallet}: ${holder.holderPct}%`);
      }
      return !isWhale;
    })
    .sort((a, b) => (a.rawBalance === b.rawBalance ? 0 : a.rawBalance > b.rawBalance ? -1 : 1));
}

export async function snapshotEligibleHolders(): Promise<Holder[]> {
  return eligibleHoldersFromSnapshot(await snapshotSourceHolders());
}

export async function topHoldersForMint(mint: PublicKey, limit: number, label = "token"): Promise<Holder[]> {
  const tokenProgram = await tokenProgramForMint(mint);
  const mintInfo = await getMint(connection, mint, "confirmed", tokenProgram);
  const excluded = excludedWallets(mint, mintInfo.mintAuthority);
  return (await snapshotTokenHolders(mint, label))
    .filter((holder) => holder.rawBalance > 0n)
    .filter((holder) => !excluded.has(holder.wallet))
    .slice(0, limit);
}
