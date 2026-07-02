drop policy if exists "public read settled payouts" on payouts;

create policy "public read settled payouts" on payouts
  for select using (status = 'settled');
