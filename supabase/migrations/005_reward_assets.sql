alter table payouts
  add column if not exists reward_asset text not null default 'Sherwood';

alter table payouts
  drop constraint if exists payouts_pkey;

alter table payouts
  add primary key (epoch_id, wallet, reward_asset);

update payouts
set
  reward_asset = 'Sherwood',
  idempotency_key = epoch_id || ':' || wallet || ':Sherwood'
where reward_asset not in ('Sherwood', 'SOL')
   or (reward_asset = 'Sherwood' and idempotency_key = epoch_id || ':' || wallet);

create index if not exists payouts_epoch_asset_status_idx on payouts(epoch_id, reward_asset, status);
