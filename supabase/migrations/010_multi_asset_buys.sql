alter table buys
  add column if not exists reward_asset text not null default 'TOKEN';

alter table buys
  drop constraint if exists buys_pkey;

alter table buys
  add primary key (epoch_id, reward_asset);

create index if not exists buys_epoch_asset_idx on buys(epoch_id, reward_asset);
