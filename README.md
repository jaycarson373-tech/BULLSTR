# ANSEM INDEX 6900

Source token: `$AI6900`
Reward asset: `$ANSEM`

ANSEM INDEX 6900 is an institutional-style index wrapper around the existing airdrop engine:

- 50% of usable SOL is routed through Jupiter to buy `$ANSEM`.
- Bought `$ANSEM` is airdropped to eligible `$AI6900` holders on each epoch.
- 50% of usable SOL is routed through Jupiter to buy `$AI6900`.
- Bought `$AI6900` is airdropped to the top `$ANSEM` holders on each epoch.
- The dashboard reads settled epochs, payouts, holders, and recent drops from Supabase.

The site should feel like an institutional AI index first, with the dashboard attached as proof.

## Current Implementation

1. Claim creator fees into the treasury.
2. Snapshot source-token holders with at least `ELIGIBILITY_MIN`.
3. Weight selected source-token holders by raw `$AI6900` balance.
4. Use `SWAP_BALANCE_BPS=5000` to buy `$ANSEM` with 50% of usable SOL.
5. Airdrop bought `$ANSEM` to eligible `$AI6900` holders.
6. Use `INDEX_AIRDROP_BPS=5000` to buy `$AI6900` with 50% of usable SOL.
7. Snapshot the top `INDEX_HOLDER_LIMIT` `$ANSEM` holders.
8. Airdrop bought `$AI6900` to the top `$ANSEM` holders.
9. Store epochs, snapshots, reward pools, and payouts in Supabase.

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
NEXT_PUBLIC_PROJECT_NAME="ANSEM INDEX 6900"
NEXT_PUBLIC_SOURCE_SYMBOL=AI6900
NEXT_PUBLIC_REWARD_SYMBOL="ANSEM"
NEXT_PUBLIC_SOURCE_TOKEN_MINT=<AI6900_MINT>
NEXT_PUBLIC_X_URL=<X_URL>
NEXT_PUBLIC_BUY_URL=https://pump.fun
NEXT_PUBLIC_DEXSCREENER_URL=<DEXSCREENER_PAIR_OR_TOKEN_URL>
NEXT_PUBLIC_FIRST_AIRDROP_AT=<OPTIONAL_ISO_TIME>

NEXT_PUBLIC_SUPABASE_URL=<SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY>
SUPABASE_URL=<SUPABASE_URL>
SUPABASE_SERVICE_ROLE=<SUPABASE_SERVICE_ROLE_KEY>

REWARD_MODE=token
HELIUS_RPC_URL=<HELIUS_RPC_URL>
SOURCE_TOKEN_MINT=<AI6900_MINT>
REWARD_TOKEN_MINT=<ANSEM_MINT>
TREASURY_WALLET_SECRET=<BASE58_OR_JSON_SECRET>

CLAIM_ENABLED=false
BUY_ENABLED=false
AIRDROP_ENABLED=false

EPOCH_MINUTES=5
ELIGIBILITY_MIN=1000000
MAX_WALLETS_PER_EPOCH=200
MAX_HOLDER_PCT=5
EXCLUDE_WALLETS=

SWAP_BALANCE_BPS=5000
INDEX_AIRDROP_BPS=5000
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
