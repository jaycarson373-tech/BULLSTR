create extension if not exists pgcrypto;

alter table cat_agent_actions
  add column if not exists x_post_id text,
  add column if not exists x_post_status text,
  add column if not exists x_post_error text,
  add column if not exists x_posted_at timestamptz;

create table if not exists x_post_queue (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'persona',
  text text not null,
  reply_to_tweet_id text,
  status text not null default 'pending' check (status in ('pending', 'posted', 'failed', 'cancelled')),
  x_post_id text,
  error text,
  scheduled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists x_agent_state (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create index if not exists x_post_queue_status_schedule_idx on x_post_queue(status, scheduled_at, created_at);
create index if not exists cat_agent_actions_x_post_idx on cat_agent_actions(x_post_id, created_at);
