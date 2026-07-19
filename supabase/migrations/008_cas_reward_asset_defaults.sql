alter table payouts
  alter column reward_asset set default 'CAS';

update payouts
set
  reward_asset = 'CAS',
  idempotency_key = epoch_id || ':' || wallet || ':CAS'
where reward_asset not in ('CAS', 'SOL');

update payouts
set idempotency_key = epoch_id || ':' || wallet || ':CAS'
where reward_asset = 'CAS'
  and idempotency_key <> epoch_id || ':' || wallet || ':CAS';
