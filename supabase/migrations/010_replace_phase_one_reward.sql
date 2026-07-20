delete from public.diamond_tokens
where mint = '6ogzHhzdrQr9Pgv6hZ2MNze7UrzBMAFyBBWUYp1Fhitx';

insert into public.diamond_tokens (mint, symbol, enabled) values
  ('9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump', 'ANSEM', true)
on conflict (mint) do update
set symbol = excluded.symbol,
    enabled = true;
