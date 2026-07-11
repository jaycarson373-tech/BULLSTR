alter table payouts
  alter column reward_asset set default 'Sherwood';

update payouts
set
  reward_asset = 'Sherwood',
  idempotency_key = epoch_id || ':' || wallet || ':Sherwood'
where reward_asset not in ('Sherwood', 'SOL');

update payouts
set idempotency_key = epoch_id || ':' || wallet || ':Sherwood'
where reward_asset = 'Sherwood'
  and idempotency_key <> epoch_id || ':' || wallet || ':Sherwood';
