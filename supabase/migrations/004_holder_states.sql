create table if not exists holder_states (
  wallet text primary key,
  source_balance numeric not null default 0,
  source_balance_raw text not null default '0',
  highest_source_balance_raw text not null default '0',
  eligible_since timestamptz,
  last_seen_at timestamptz not null default now(),
  last_epoch_id text,
  current_streak_epochs integer not null default 0,
  current_multiplier_bps integer not null default 10000,
  permanently_ineligible boolean not null default false,
  ineligible_reason text,
  ineligible_at timestamptz,
  total_reward_received numeric not null default 0,
  total_reward_received_raw text not null default '0',
  last_reward_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists holder_states_active_idx
  on holder_states(permanently_ineligible, current_multiplier_bps desc, current_streak_epochs desc);

create index if not exists holder_states_last_seen_idx
  on holder_states(last_seen_at desc);

alter table holder_states enable row level security;

drop policy if exists "public read holder states" on holder_states;

create policy "public read holder states" on holder_states
  for select using (true);
