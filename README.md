# Hood Pump

Contract address: `3kB163vCjwSFxUPj2zTyTaRPqmCRoQ4wLwa7kc7fpump`
X: `https://x.com/HoodStrategySol`

Hood Pump is the HPUMP holder access site:

- Creator fees fund a new Robin Hood token launch every week.
- Holders with 1M+ HPUMP get presale access.
- Live sections track the launch countdown, access records, holders, wallet holdings, and on-chain receipts.
- The dashboard reads settled windows, payouts, holders, wallet holdings, and recent records from Supabase.

The site should feel fast, neon, and unmistakably Hood Pump.

## Current Implementation

1. Claim creator fees into the treasury.
2. Snapshot source-token holders with at least `ELIGIBILITY_MIN`.
3. Use `ELIGIBILITY_MIN=1000000` for 1M+ HPUMP presale access.
4. Route creator fees into the weekly Robin Hood launch pool.
5. Store windows, snapshots, launch pools, wallet holdings, and records in Supabase.

## Local Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm run worker:build
npm run build
```

## Environment

Copy `.env.example` and fill in the live mints and keys.

```bash
NEXT_PUBLIC_PROJECT_NAME="Hood Pump"
NEXT_PUBLIC_SOURCE_SYMBOL=HPUMP
NEXT_PUBLIC_REWARD_SYMBOL=HPUMP
NEXT_PUBLIC_SOURCE_TOKEN_MINT=3kB163vCjwSFxUPj2zTyTaRPqmCRoQ4wLwa7kc7fpump
NEXT_PUBLIC_CA=3kB163vCjwSFxUPj2zTyTaRPqmCRoQ4wLwa7kc7fpump
NEXT_PUBLIC_X_URL=https://x.com/HoodStrategySol
NEXT_PUBLIC_BUY_URL=https://pump.fun/coin/3kB163vCjwSFxUPj2zTyTaRPqmCRoQ4wLwa7kc7fpump
NEXT_PUBLIC_DEXSCREENER_URL=https://dexscreener.com/solana/3kB163vCjwSFxUPj2zTyTaRPqmCRoQ4wLwa7kc7fpump
NEXT_PUBLIC_HOOD_CHART_URL=https://dexscreener.com/solana/3kB163vCjwSFxUPj2zTyTaRPqmCRoQ4wLwa7kc7fpump
NEXT_PUBLIC_HOOD_CHART_EMBED_URL=<OPTIONAL_DEXSCREENER_EMBED_URL>
NEXT_PUBLIC_FIRST_AIRDROP_AT=<OPTIONAL_ISO_TIME>

NEXT_PUBLIC_SUPABASE_URL=<SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY>
SUPABASE_URL=<SUPABASE_URL>
SUPABASE_SERVICE_ROLE=<SUPABASE_SERVICE_ROLE_KEY>

REWARD_MODE=token
HELIUS_RPC_URL=<HELIUS_RPC_URL>
SOURCE_TOKEN_MINT=3kB163vCjwSFxUPj2zTyTaRPqmCRoQ4wLwa7kc7fpump
REWARD_TOKEN_MINT=<REWARD_TOKEN_MINT>
TREASURY_WALLET_SECRET=<BASE58_OR_JSON_SECRET>

CLAIM_ENABLED=false
BUY_ENABLED=false
AIRDROP_ENABLED=false

EPOCH_MINUTES=5
ELIGIBILITY_MIN=1000000
MAX_WALLETS_PER_EPOCH=200
MAX_HOLDER_PCT=5
EXCLUDE_WALLETS=

SWAP_BALANCE_BPS=10000
INDEX_AIRDROP_BPS=0
SWAP_SLIPPAGE_BPS=300
SIDE_WALLET_BPS=0
INDEX_HOLDER_LIMIT=200

MIN_SOL_RESERVE=0.4
AIRDROP_SOL_RESERVE=0.4
AIRDROP_BATCH_SIZE=4
AIRDROP_REWARD_BPS=10000
PRIORITY_FEE_SOL=0.000001
MIN_REWARD_RAW_TO_AIRDROP=1
```

Keep `CLAIM_ENABLED`, `BUY_ENABLED`, and `AIRDROP_ENABLED` false until the live treasury, mints, Supabase tables, and worker dry runs are verified.
