alter table payouts
  alter column reward_asset set default 'SHER';

update payouts
set
  reward_asset = 'SHER',
  idempotency_key = epoch_id || ':' || wallet || ':SHER'
where reward_asset not in ('SHER', 'SOL');

update payouts
set idempotency_key = epoch_id || ':' || wallet || ':SHER'
where reward_asset = 'SHER'
  and idempotency_key <> epoch_id || ':' || wallet || ':SHER';
