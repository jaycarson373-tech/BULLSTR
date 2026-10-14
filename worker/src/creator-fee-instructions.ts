import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";

// pump-fun/pump-public-docs IDLs, pinned at 639b87fb45c3adeffa6f7c4a1bf0cb85e392bf22.
// Single-recipient creators only; fee-sharing configurations require their own flow.
export const PUMP = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
export const AMM = new PublicKey("pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA");
const pda = (program: PublicKey, label: string, creator?: PublicKey) => PublicKey.findProgramAddressSync([Buffer.from(label), ...(creator ? [creator.toBuffer()] : [])], program)[0];
const meta = (pubkey: PublicKey, isWritable = false) => ({pubkey, isWritable, isSigner:false});
export function feeAccounts(creator: PublicKey, mint: PublicKey, tokenProgram: PublicKey) {
  const pumpVault = pda(PUMP,"creator-vault",creator), ammVault = pda(AMM,"creator_vault",creator);
  const ata = (owner: PublicKey) => getAssociatedTokenAddressSync(mint,owner,true,tokenProgram);
  return {pumpVault,ammVault,pumpAta:ata(pumpVault),ammAta:ata(ammVault),creatorAta:ata(creator)};
}
export function collectPumpFee(creator: PublicKey, mint: PublicKey, tokenProgram: PublicKey) {
  const a=feeAccounts(creator,mint,tokenProgram);
  return new TransactionInstruction({programId:PUMP,data:Buffer.from([207,17,138,242,4,34,19,56]),keys:[meta(creator,true),meta(a.creatorAta,true),meta(a.pumpVault,true),meta(a.pumpAta,true),meta(mint),meta(tokenProgram),meta(ASSOCIATED_TOKEN_PROGRAM_ID),meta(SystemProgram.programId),meta(pda(PUMP,"__event_authority")),meta(PUMP)]});
}
export function collectAmmFee(creator: PublicKey, mint: PublicKey, tokenProgram: PublicKey) {
  const a=feeAccounts(creator,mint,tokenProgram);
  return new TransactionInstruction({programId:AMM,data:Buffer.from([160,57,89,42,181,139,43,66]),keys:[meta(mint),meta(tokenProgram),meta(creator),meta(a.ammVault),meta(a.ammAta,true),meta(a.creatorAta,true),meta(pda(AMM,"__event_authority")),meta(AMM)]});
}
export function sourceCurve(mint: PublicKey) {return pda(PUMP,"bonding-curve",mint);}
export function assertSourceCurve(info: {owner:PublicKey;data:Buffer}|null, creator:PublicKey, feeMint:PublicKey) {
  if (!info || !info.owner.equals(PUMP) || info.data.length<115 || !info.data.subarray(0,8).equals(Buffer.from([23,183,248,55,96,216,172,96]))) throw new Error("NSTR source is not a supported Pump bonding curve.");
  if (!new PublicKey(info.data.subarray(49,81)).equals(creator)) throw new Error("NSTR creator does not match the configured treasury.");
  if (!new PublicKey(info.data.subarray(83,115)).equals(feeMint)) throw new Error("NSTR quote mint does not match the configured fee asset.");
}
