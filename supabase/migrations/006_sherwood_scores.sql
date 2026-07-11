create table if not exists sherwood_scores (
  wallet text primary key,
  best_score integer not null default 0,
  best_distance integer not null default 0,
  runs integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sherwood_runs (
  id bigserial primary key,
  wallet text not null references sherwood_scores(wallet) on delete cascade,
  score integer not null,
  distance integer not null,
  created_at timestamptz not null default now()
);

create index if not exists sherwood_scores_rank_idx
  on sherwood_scores(best_score desc, best_distance desc, updated_at asc);

create index if not exists sherwood_runs_wallet_created_idx
  on sherwood_runs(wallet, created_at desc);

alter table sherwood_scores enable row level security;
alter table sherwood_runs enable row level security;

drop policy if exists "public read sherwood scores" on sherwood_scores;
drop policy if exists "public read sherwood runs" on sherwood_runs;

create policy "public read sherwood scores" on sherwood_scores
  for select using (true);

create policy "public read sherwood runs" on sherwood_runs
  for select using (true);
