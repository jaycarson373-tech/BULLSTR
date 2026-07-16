alter table payouts
  alter column reward_asset set default 'ANSEM';

update payouts
set
  reward_asset = 'ANSEM',
  idempotency_key = epoch_id || ':' || wallet || ':ANSEM'
where reward_asset not in ('ANSEM', 'SOL');

update payouts
set idempotency_key = epoch_id || ':' || wallet || ':ANSEM'
where reward_asset = 'ANSEM'
  and idempotency_key <> epoch_id || ':' || wallet || ':ANSEM';
