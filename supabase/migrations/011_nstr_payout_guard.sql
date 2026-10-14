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
