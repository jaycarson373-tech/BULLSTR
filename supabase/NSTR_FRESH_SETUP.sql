-- NSTR dedicated fresh Supabase project setup. Existing NSTR databases use migration 011 only.
BEGIN;
DO $$ BEGIN
 IF to_regclass('public.epochs') IS NOT NULL OR to_regclass('public.payouts') IS NOT NULL OR to_regclass('public.holder_states') IS NOT NULL THEN
  RAISE EXCEPTION 'This installer is for a fresh dedicated NSTR project. Use numbered migrations for an existing project.';
 END IF;
END $$;
create table if not exists epochs (
  epoch_id text primary key,
  status text not null check (status in ('running', 'completed', 'failed', 'skipped')),
  eligible_count integer not null default 0,
  reward_bought numeric not null default 0,
  reward_distributed numeric not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error text
);

create table if not exists claims (
  epoch_id text primary key references epochs(epoch_id) on delete cascade,
  amount_claimed numeric not null default 0,
  tx_sig text,
  created_at timestamptz not null default now()
);

create table if not exists buys (
  epoch_id text primary key references epochs(epoch_id) on delete cascade,
  base_spent_lamports text not null,
  reward_received_raw text not null,
  reward_received numeric not null default 0,
  tx_sig text,
  created_at timestamptz not null default now()
);

create table if not exists snapshots (
  epoch_id text not null references epochs(epoch_id) on delete cascade,
  wallet text not null,
  source_balance numeric not null,
  source_balance_raw text not null,
  holder_pct numeric not null default 0,
  created_at timestamptz not null default now(),
  primary key (epoch_id, wallet)
);

create table if not exists payouts (
  epoch_id text not null references epochs(epoch_id) on delete cascade,
  wallet text not null,
  reward_amount numeric not null,
  reward_amount_raw text not null,
  normal_reward_amount numeric not null default 0,
  normal_reward_amount_raw text not null default '0',
  idempotency_key text not null unique,
  status text not null check (status in ('planned', 'settled', 'failed', 'dry_run')),
  tx_sig text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (epoch_id, wallet)
);

create index if not exists epochs_started_at_idx on epochs(started_at desc);
create index if not exists snapshots_epoch_balance_idx on snapshots(epoch_id, source_balance desc);
create index if not exists payouts_epoch_status_idx on payouts(epoch_id, status);

alter table epochs enable row level security;
alter table claims enable row level security;
alter table buys enable row level security;
alter table snapshots enable row level security;
alter table payouts enable row level security;

drop policy if exists "public read epochs" on epochs;
drop policy if exists "public read buys" on buys;
drop policy if exists "public read snapshots" on snapshots;
drop policy if exists "public read settled payouts" on payouts;

create policy "public read epochs" on epochs
  for select using (true);

create policy "public read buys" on buys
  for select using (true);

create policy "public read snapshots" on snapshots
  for select using (true);

create policy "public read settled payouts" on payouts
  for select using (status = 'settled');

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

alter table buys
  add column if not exists reward_asset text not null default 'TOKEN';

alter table buys
  drop constraint if exists buys_pkey;

alter table buys
  add primary key (epoch_id, reward_asset);

create index if not exists buys_epoch_asset_idx on buys(epoch_id, reward_asset);

-- Preserve old project data. NSTR epochs have an explicit mint namespace.
alter table public.payouts drop constraint if exists payouts_status_check;
alter table public.payouts add constraint payouts_status_check
  check (status in ('planned','sending','settled','failed','dry_run'));

create or replace function public.nstr_start_epoch(p_epoch text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  perform pg_advisory_xact_lock(73124981);
  if p_epoch not like 'nstr:%' then raise exception 'Invalid NSTR epoch'; end if;
  -- Crash or incomplete payout requires reconciliation, never a fresh allocation.
  if exists(select 1 from epochs where epoch_id like 'nstr:%' and status='running')
    or exists(select 1 from payouts where epoch_id like 'nstr:%' and status in ('planned','sending')) then return false; end if;
  insert into epochs(epoch_id,status) values(p_epoch,'running') on conflict do nothing;
  return found;
end $$;
create or replace function public.nstr_reserve_payout_batch(p_keys text[],p_signature text)
returns boolean language plpgsql security definer set search_path=public as $$
declare affected integer;
begin
  if cardinality(p_keys)=0 or p_signature is null or p_signature='' then raise exception 'Invalid payout batch'; end if;
  perform 1 from payouts where idempotency_key=any(p_keys) order by idempotency_key for update;
  if (select count(*) from payouts where idempotency_key=any(p_keys) and status='planned' and epoch_id like 'nstr:%') <> cardinality(p_keys) then return false; end if;
  update payouts set status='sending',tx_sig=p_signature,updated_at=now() where idempotency_key=any(p_keys);
  get diagnostics affected=row_count;
  return affected=cardinality(p_keys);
end $$;
revoke all on function public.nstr_start_epoch(text) from public,anon,authenticated;
revoke all on function public.nstr_reserve_payout_batch(text[],text) from public,anon,authenticated;
grant execute on function public.nstr_start_epoch(text) to service_role;
grant execute on function public.nstr_reserve_payout_batch(text[],text) to service_role;

create table if not exists public.nstr_holder_states (like public.holder_states including all);
alter table public.nstr_holder_states add column if not exists source_mint text not null default '';
alter table public.nstr_holder_states drop constraint if exists nstr_holder_states_pkey;
alter table public.nstr_holder_states add primary key (source_mint,wallet);
alter table public.nstr_holder_states enable row level security;
grant all on public.nstr_holder_states to service_role;
revoke all on public.nstr_holder_states from anon,authenticated;

create or replace function public.nstr_worker_ready() returns boolean
language sql security definer set search_path=public as $$
  select to_regclass('public.nstr_holder_states') is not null
    and to_regprocedure('public.nstr_start_epoch(text)') is not null
    and to_regprocedure('public.nstr_reserve_payout_batch(text[],text)') is not null;
$$;
revoke all on function public.nstr_worker_ready() from public,anon,authenticated;
grant execute on function public.nstr_worker_ready() to service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.epochs, public.claims, public.buys, public.snapshots, public.payouts, public.holder_states TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
