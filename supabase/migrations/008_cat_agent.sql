create extension if not exists pgcrypto;

create table if not exists cat_token_whitelist (
  mint text primary key,
  symbol text,
  enabled boolean not null default true,
  max_sol_per_trade numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cat_signals (
  id uuid primary key default gen_random_uuid(),
  mint text not null references cat_token_whitelist(mint),
  symbol text,
  side text not null check (side in ('buy', 'sell', 'hold')),
  max_sol numeric,
  sell_bps integer check (sell_bps is null or (sell_bps > 0 and sell_bps <= 10000)),
  conviction integer check (conviction is null or (conviction >= 0 and conviction <= 100)),
  reason text,
  status text not null default 'pending' check (
    status in ('pending', 'planned', 'executed', 'rejected', 'failed', 'expired', 'cancelled')
  ),
  tx_sig text,
  output_amount_raw text,
  error text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cat_agent_actions (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid references cat_signals(id),
  epoch_id text not null,
  mint text not null,
  symbol text,
  side text not null,
  status text not null,
  input_mint text not null,
  output_mint text not null,
  input_amount_raw text not null,
  output_amount_raw text not null,
  tx_sig text,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cat_signals_status_created_idx on cat_signals(status, created_at);
create index if not exists cat_agent_actions_epoch_idx on cat_agent_actions(epoch_id, created_at);
