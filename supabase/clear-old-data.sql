-- Clear old reward/index data while keeping schema, indexes, and RLS policies.
-- Run in the Supabase SQL editor when you are ready to reset the visible dashboard.
begin;

truncate table
  claims,
  buys,
  snapshots,
  payouts,
  epochs
restart identity cascade;

truncate table holder_states restart identity;

commit;
