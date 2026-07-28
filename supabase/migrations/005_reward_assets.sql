alter table payouts
  add column if not exists reward_asset text not null default 'TOKEN';

alter table payouts
  drop constraint if exists payouts_pkey;

alter table payouts
  add primary key (epoch_id, wallet, reward_asset);

update payouts
set
  reward_asset = 'TOKEN',
  idempotency_key = epoch_id || ':' || wallet || ':TOKEN'
where reward_asset not in ('TOKEN', 'SOL')
   or (reward_asset = 'TOKEN' and idempotency_key = epoch_id || ':' || wallet);

create index if not exists payouts_epoch_asset_status_idx on payouts(epoch_id, reward_asset, status);
