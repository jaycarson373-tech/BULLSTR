create table if not exists public.diamond_tokens (
  mint text primary key,
  symbol text not null,
  enabled boolean not null default true
);

-- Phase 1 token context (documentation only; these values do not affect scanner logic):
-- SPX6900: Wormhole bridge, canonical Solana SPX, ~$1.6M liquidity on Raydium.
-- MOG: official NTT bridge (April 2025), ~$35K liquidity; expect fewer sampled holders.
-- GIGA: native, ~$1.5M liquidity.
-- FARTCOIN: native, ~$5.7M liquidity.
-- ANSEM: verified Solana reward asset supplied by the project owner.

delete from public.diamond_tokens
where mint not in (
  'J3NKxxXZcnNiMjKw9hYb2K4LUxgwB6t1FtPtQVsv3KFr',
  '26VfKb7jjtdEdvfovoBijScoZmJbWWasFZkgfUD5w7cy',
  '63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5tiJxcqj9',
  '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump',
  '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump'
);

insert into public.diamond_tokens (mint, symbol, enabled) values
  ('J3NKxxXZcnNiMjKw9hYb2K4LUxgwB6t1FtPtQVsv3KFr', 'SPX6900', true),
  ('26VfKb7jjtdEdvfovoBijScoZmJbWWasFZkgfUD5w7cy', 'MOG', true),
  ('63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5tiJxcqj9', 'GIGA', true),
  ('9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump', 'FARTCOIN', true),
  ('9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump', 'ANSEM', true)
on conflict (mint) do update
set symbol = excluded.symbol,
    enabled = true;
