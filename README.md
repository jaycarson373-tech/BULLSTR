# United Solana Socialist Reserve

United Solana Socialist Reserve is a satirical on-chain communism experiment: creator fees enter the People's Treasury, and SOL is redistributed to eligible `$USSR` holders on five-minute cycles.

Core rules:

- Minimum eligible balance: configurable, default `1,000,000 $USSR`
- Reward asset: `SOL`
- Cadence: every five minutes
- Eligibility rule: wallets qualify per cycle when they meet the minimum balance; balance changes only affect current-cycle eligibility
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
- `BUY_ENABLED=false` for SOL-only rewards
- `AIRDROP_ENABLED=true`
- `REWARD_MODE=sol`
- `SOURCE_TOKEN_MINT=<USSR mint>`
- `TREASURY_WALLET_SECRET=<fresh treasury secret>`
- `HELIUS_RPC_URL=<mainnet RPC>`
- `SUPABASE_URL=<project URL>`
- `SUPABASE_SERVICE_ROLE=<service role key>`

## Required Owner Values

- `$USSR` mint address
- X/community URL
- Treasury wallet secret for the live worker
- Supabase project URL, anon key, and service role key
- Helius RPC endpoint
- Final eligibility threshold and wallet exclusion rules

## Safety

Do not commit private keys, service role keys, or RPC credentials. Keep `EMERGENCY_STOP=true` until a dry run and first live epoch are reviewed.
