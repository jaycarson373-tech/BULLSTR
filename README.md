# CryptoCat

CryptoCat is an on-chain AI treasury persona for the `CC` token.

The public site presents CryptoCat as a terminal-native character that scans the chain, posts in its own voice, opens bounties, and can reward loyal holders when treasury actions are approved.

## Public configuration

- `NEXT_PUBLIC_PROJECT_NAME`: `CryptoCat`
- `NEXT_PUBLIC_SOURCE_SYMBOL`: `CC`
- `NEXT_PUBLIC_CC_X_URL`: X profile, optional until ready
- `NEXT_PUBLIC_CC_CA`: token mint, optional until ready
- `NEXT_PUBLIC_BUY_URL`: buy link, optional until ready
- `NEXT_PUBLIC_SITE_URL`: production site URL

## Worker configuration

The worker logic is unchanged. It remains controlled by Railway env gates:

- `CLAIM_ENABLED`
- `BUY_ENABLED`
- `AIRDROP_ENABLED`
- `SOURCE_TOKEN_MINT`
- `REWARD_TOKEN_MINT`
- `REWARD_TOKEN_SYMBOL`
- `TREASURY_WALLET_SECRET`

Keep live gates false until the reward flow is intentionally enabled and funded.

## CryptoCat treasury agent

The worker includes a gated treasury agent. It does not trade randomly. It only processes rows from `cat_signals` where the mint is already enabled in `cat_token_whitelist`.

Default mode is dry-run:

- `CAT_AGENT_ENABLED=false`
- `CAT_AGENT_EXECUTE=false`
- `CAT_AGENT_ALLOW_SELLS=false`

To stage a buy signal:

```sql
insert into cat_token_whitelist (mint, symbol, enabled, max_sol_per_trade, notes)
values ('TOKEN_MINT_HERE', 'TICKER', true, 0.05, 'operator approved')
on conflict (mint) do update set
  symbol = excluded.symbol,
  enabled = excluded.enabled,
  max_sol_per_trade = excluded.max_sol_per_trade,
  notes = excluded.notes,
  updated_at = now();

insert into cat_signals (mint, symbol, side, max_sol, conviction, reason, expires_at)
values ('TOKEN_MINT_HERE', 'TICKER', 'buy', 0.05, 80, 'approved CryptoCat signal', now() + interval '30 minutes');
```

To stage a sell signal:

```sql
insert into cat_signals (mint, symbol, side, sell_bps, conviction, reason, expires_at)
values ('TOKEN_MINT_HERE', 'TICKER', 'sell', 2500, 65, 'take 25% off the table', now() + interval '30 minutes');
```

Live execution requires `CAT_AGENT_ENABLED=true` and `CAT_AGENT_EXECUTE=true`. Sells also require `CAT_AGENT_ALLOW_SELLS=true`.

Trades are executed through Jupiter routes. Pump tokens without an available Jupiter route will fail closed and be recorded in `cat_agent_actions`.

## X automation

CryptoCat can post queued updates, post executed trade receipts, and optionally reply to mentions.

Required X envs:

```env
X_AGENT_ENABLED=true
X_AGENT_POST_ENABLED=true
X_AGENT_AUTO_TRADE_POSTS=true
X_AGENT_REPLY_TO_MENTIONS=false
X_AGENT_MAX_POSTS_PER_EPOCH=2
X_USER_ID=
X_API_KEY=
X_API_KEY_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_TOKEN_SECRET=
```

Queue a persona post:

```sql
insert into x_post_queue (kind, text)
values ('persona', 'CryptoCat is online. The terminal is watching the chain.');
```

Queue a reply to a specific post:

```sql
insert into x_post_queue (kind, text, reply_to_tweet_id)
values ('reply', 'CryptoCat saw this. The terminal is learning.', 'TWEET_ID_HERE');
```

When `X_AGENT_AUTO_TRADE_POSTS=true`, executed `cat_agent_actions` are posted automatically with the Solscan transaction link. Dry-run/planned trades are not posted unless `X_AGENT_POST_PLANNED_TRADES=true`.

Mention replies are disabled by default. If `X_AGENT_REPLY_TO_MENTIONS=true`, the worker replies to a small number of fresh mentions per epoch using conservative CryptoCat templates.
