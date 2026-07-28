alter table payouts
  alter column reward_asset set default 'TOKEN';

update payouts
set
  reward_asset = 'TOKEN',
  idempotency_key = epoch_id || ':' || wallet || ':TOKEN'
where reward_asset not in ('TOKEN', 'SOL');

update payouts
set idempotency_key = epoch_id || ':' || wallet || ':TOKEN'
where reward_asset = 'TOKEN'
  and idempotency_key <> epoch_id || ':' || wallet || ':TOKEN';
