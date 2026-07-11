alter table sherwood_scores
  add column if not exists player_name text not null default 'Outlaw';

alter table sherwood_runs
  add column if not exists player_name text not null default 'Outlaw';

