import { Transaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, NATIVE_MINT, getAccount, createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import { config, treasuryKeypair } from "./config.js";
import { connection } from "./solana.js";
import { getClaim, recordClaim } from "./db.js";
import { assertSourceCurve, sourceCurve, feeAccounts, collectPumpFee, collectAmmFee } from "./creator-fee-instructions.js";

export type ClaimResult = {txSig:string|null;amountClaimed:string};
export async function claimFees(epochId:string):Promise<ClaimResult> {
  const none={txSig:null,amountClaimed:"0"};
  if (!config.claimEnabled) return none;
  const previous=await getClaim(epochId);
  if (previous?.tx_sig) return {txSig:previous.tx_sig,amountClaimed:String(previous.amount_claimed)};
  const mint=config.creatorFeeAssetMint;
  if (!mint || mint.equals(NATIVE_MINT)) throw new Error("NSTR requires a verified non-native fee asset for direct token rewards.");
  const treasury=treasuryKeypair();
  assertSourceCurve(await connection.getAccountInfo(sourceCurve(config.sourceTokenMint),"confirmed"),treasury.publicKey,mint);
  const mintInfo=await connection.getAccountInfo(mint,"confirmed");
  if (!mintInfo || (!mintInfo.owner.equals(TOKEN_PROGRAM_ID) && !mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID))) throw new Error("Unsupported creator-fee mint.");
  const program=mintInfo.owner,a=feeAccounts(treasury.publicKey,mint,program);
  const tx=new Transaction();
  for (const [vault,build] of [[a.pumpAta,collectPumpFee],[a.ammAta,collectAmmFee]] as const) {
    const info=await connection.getAccountInfo(vault,"confirmed");
    if (!info) continue;
    const account=await getAccount(connection,vault,"confirmed",program);
    if (account.amount>0n) tx.add(build(treasury.publicKey,mint,program));
  }
  if (!tx.instructions.length) return none;
  tx.instructions.unshift(createAssociatedTokenAccountIdempotentInstruction(treasury.publicKey,a.creatorAta,treasury.publicKey,mint,program));
  const balance=await connection.getBalance(treasury.publicKey,"confirmed");
  if (balance<=Math.floor(config.minSolReserve*1e9)) throw new Error("Treasury SOL is below the configured claim reserve.");
  const block=await connection.getLatestBlockhash("confirmed");
  tx.feePayer=treasury.publicKey;tx.recentBlockhash=block.blockhash;tx.sign(treasury);
  const simulation=await connection.simulateTransaction(tx);
  if (simulation.value.err) throw new Error("Creator-fee simulation failed; no transaction was broadcast.");
  const txSig=await connection.sendRawTransaction(tx.serialize(),{maxRetries:3,skipPreflight:false});
  const confirmed=await connection.confirmTransaction({...block,signature:txSig},"confirmed");
  if (confirmed.value.err) throw new Error("Creator-fee transaction failed on chain.");
  await recordClaim(epochId,"0",txSig);
  return {txSig,amountClaimed:"0"};
}
