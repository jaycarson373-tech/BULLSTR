import test from "node:test";
import assert from "node:assert/strict";
import { Keypair } from "@solana/web3.js";
import { previousMint, workerReadiness } from "./readiness.js";

const treasury = Keypair.generate();
const fee = Keypair.generate().publicKey.toBase58();
const valid = () => ({ SOURCE_TOKEN_MINT: Keypair.generate().publicKey.toBase58(), CREATOR_FEE_ASSET_MINT: fee, REWARD_TOKEN_MINT: fee, HELIUS_RPC_URL: "https://example.com/rpc", SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE: "private-test-service-role", TREASURY_WALLET_SECRET: JSON.stringify([...treasury.secretKey]), TREASURY_PUBLIC_KEY: treasury.publicKey.toBase58(), ELIGIBILITY_MIN: "1000000", NSTR_ACTIVATED: "true", CLAIM_ENABLED: "true", AIRDROP_ENABLED: "true" });
test("missing launch configuration waits without loading the payout scheduler", () => { const r = workerReadiness({}); assert.equal(r.state,"waiting"); assert.equal(r.transactionsEnabled,false); assert.ok(r.blockers.includes("awaiting-token-activation")); });
test("previous mint cannot activate even with signing gates enabled", () => { const r = workerReadiness({...valid(),SOURCE_TOKEN_MINT:previousMint}); assert.equal(r.transactionsEnabled,false); assert.ok(r.blockers.includes("previous-project-mint")); });
test("matching direct rewards configure only after explicit activation", () => { assert.equal(workerReadiness(valid()).transactionsEnabled,true); assert.equal(workerReadiness({...valid(),NSTR_ACTIVATED:"false"}).transactionsEnabled,false); });
test("mismatched rewards, invalid minimum, or a different treasury block activation", () => { for (const patch of [{REWARD_TOKEN_MINT:Keypair.generate().publicKey.toBase58()},{ELIGIBILITY_MIN:"0"},{TREASURY_PUBLIC_KEY:Keypair.generate().publicKey.toBase58()},{BUY_ENABLED:"true"}]) assert.equal(workerReadiness({...valid(),...patch}).transactionsEnabled,false); });
test("public status never includes secret values, even malformed ones", () => { const secret="secret-invalid-wallet-material"; const r=JSON.stringify(workerReadiness({...valid(),TREASURY_WALLET_SECRET:secret})); assert.ok(!r.includes(secret)); assert.ok(!r.includes("private-test-service-role")); assert.ok(r.includes("invalid:TREASURY_WALLET_SECRET")); });
