# Himothy

Himothy is a Solana holder-rewards site and worker that buys and distributes `$JIMOTHY` to eligible `$HIMOTHY` holders on five-minute epochs.

Core rules:

- Minimum eligible balance: configurable, default `500,000 $HIMOTHY`
- Reward asset: `$JIMOTHY`
- Cadence: every five minutes
- Holder-state rule: wallets that sell after eligibility are marked ineligible by the worker
- Whale filter: configurable, default excludes wallets above `4%`

## Local Setup

```bash
npm install
npm run dev
```

## Worker

```bash
npm run worker:build
npm run worker:start
```

The worker is fail-closed by default. Production execution requires the Railway environment to set:

- `EMERGENCY_STOP=false`
- `CLAIM_ENABLED=true`
- `BUY_ENABLED=true`
- `AIRDROP_ENABLED=true`
- `SOURCE_TOKEN_MINT=<HIMOTHY mint>`
- `REWARD_TOKEN_MINT=<JIMOTHY mint>`
- `TREASURY_WALLET_SECRET=<fresh treasury secret>`
- `HELIUS_RPC_URL=<mainnet RPC>`
- `SUPABASE_URL=<project URL>`
- `SUPABASE_SERVICE_ROLE=<service role key>`

## Required Owner Values

- `$HIMOTHY` mint address
- `$JIMOTHY` mint address
- X/community URL
- Treasury wallet secret for the live worker
- Supabase project URL, anon key, and service role key
- Helius RPC endpoint
- Final eligibility threshold and wallet exclusion rules

## Safety

Do not commit private keys, service role keys, or RPC credentials. Keep `EMERGENCY_STOP=true` until a dry run and first live epoch are reviewed.
