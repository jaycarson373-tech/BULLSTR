export class UncertainTransferError extends Error {}
export type TransferJournal = {
  reserve(signature:string):Promise<boolean>;
  broadcast():Promise<string>;
  confirm(signature:string):Promise<{err:unknown}>;
  settle(signature:string):Promise<void>;
  fail(error:unknown):Promise<void>;
};
// Persist the signed signature before any network send. Unknown outcomes remain
// reserved until a chain read reconciles them; they must never be rebuilt/resend.
export async function sendRecordedTransfer(signature:string,journal:TransferJournal) {
  let reserved=false;
  try { reserved=await journal.reserve(signature); }
  catch { throw new UncertainTransferError("Payout reservation response is unknown; reconcile before continuing."); }
  if (!reserved) throw new UncertainTransferError("Payout batch already reserved; reconcile its recorded signature.");
  let confirmedFailure=false;
  try {
    if (await journal.broadcast() !== signature) throw new Error("RPC returned an unexpected signature.");
    const result=await journal.confirm(signature);
    if (result.err) { confirmedFailure=true; await journal.fail(result.err); throw new Error("Payout failed on chain."); }
    await journal.settle(signature);
    return signature;
  } catch (error) {
    if (confirmedFailure) throw error;
    throw new UncertainTransferError("Payout confirmation or recording is incomplete; reconcile the recorded signature before continuing.");
  }
}
