import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('fresh NSTR ledger installs, preserves reservations and isolates the new token',async()=>{
 const db=new PGlite();
 try{
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  const setup=await readFile(new URL('../../supabase/NSTR_FRESH_SETUP.sql',import.meta.url),'utf8');
  await db.exec(setup);
  await db.exec('set role service_role');
  assert.equal((await db.query<{ready:boolean}>('select public.nstr_worker_ready() as ready')).rows[0].ready,true);
  const first='nstr:mint-a:2026-10-14T20:00:00.000Z',next='nstr:mint-a:2026-10-14T20:05:00.000Z';
  const start=async(id:string)=>(await db.query<{ok:boolean}>('select public.nstr_start_epoch($1) as ok',[id])).rows[0].ok;
  assert.equal(await start(first),true);
  assert.equal(await start(first),false);
  assert.equal(await start(next),false);
  await db.query("insert into payouts(epoch_id,wallet,reward_amount,reward_amount_raw,idempotency_key,status) values($1,'holder-a',1,'100','payout-a','planned'),($1,'holder-b',2,'200','payout-b','planned')",[first]);
  const reserve=async(keys:string[],sig:string)=>(await db.query<{ok:boolean}>('select public.nstr_reserve_payout_batch($1,$2) as ok',[keys,sig])).rows[0].ok;
  assert.equal(await reserve(['payout-a','missing'],'signature-one'),false);
  assert.deepEqual((await db.query('select status from payouts order by wallet')).rows,[{status:'planned'},{status:'planned'}]);
  assert.equal(await reserve(['payout-a','payout-b'],'signature-one'),true);
  assert.equal(await reserve(['payout-a','payout-b'],'signature-two'),false);
  assert.deepEqual((await db.query('select status,tx_sig from payouts order by wallet')).rows,[{status:'sending',tx_sig:'signature-one'},{status:'sending',tx_sig:'signature-one'}]);
  await db.query("update epochs set status='failed' where epoch_id=$1",[first]);
  assert.equal(await start(next),false,'a failed epoch cannot release uncertain payments');
  await db.exec("update payouts set status='settled';");
  assert.equal(await start(next),true);
  await db.exec("insert into nstr_holder_states(source_mint,wallet,current_streak_epochs) values('mint-a','same-wallet',4),('mint-b','same-wallet',0);");
  assert.equal((await db.query('select * from nstr_holder_states')).rows.length,2);
  await db.exec('set role anon');
  await assert.rejects(db.query('select public.nstr_start_epoch($1)',[next]),/permission denied/);
  await db.exec('reset role');
  await assert.rejects(db.exec(setup),/fresh dedicated NSTR project/);
  await db.exec('rollback');
  assert.equal((await db.query('select * from payouts')).rows.length,2,'fresh installer must never overwrite an existing ledger');
 }finally{await db.close()}
});
