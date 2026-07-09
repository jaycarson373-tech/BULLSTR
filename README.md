# HOOD6900

Source token: `$HOOD6900`
Reward asset: `HOOD`

HOOD6900 is the memecoin of the Hood.

- Robinhood built the chain.
- The trenches built the meme.
- Every 5 minutes creator fees buy back HOOD.
- 100% airdrops to eligible 100K+ holders.
- 0% goes to side wallets.
- Sell once and lose future eligibility.

## Current Implementation

1. Claim creator fees into the treasury.
2. Snapshot source-token holders with at least `ELIGIBILITY_MIN`.
3. Weight selected holders by raw token balance.
4. Use `SWAP_BALANCE_BPS=10000` for automatic holder airdrops.
5. Use `SIDE_WALLET_BPS=0` so no reward share leaves the holder rail.
6. Store epochs, snapshots, reward pools, and payouts in Supabase.

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

```bash
NEXT_PUBLIC_PROJECT_NAME="HOOD6900"
NEXT_PUBLIC_SOURCE_SYMBOL=HOOD6900
NEXT_PUBLIC_REWARD_SYMBOL=HOOD
NEXT_PUBLIC_SOURCE_TOKEN_MINT=<HOOD6900_MINT>
NEXT_PUBLIC_X_URL=https://x.com/Hood6900_
NEXT_PUBLIC_BUY_URL=https://pump.fun
NEXT_PUBLIC_DEXSCREENER_URL=<DEXSCREENER_PAIR_OR_TOKEN_URL>
NEXT_PUBLIC_FIRST_AIRDROP_AT=<OPTIONAL_ISO_TIME>

NEXT_PUBLIC_SUPABASE_URL=<SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY>
SUPABASE_URL=<SUPABASE_URL>
SUPABASE_SERVICE_ROLE=<SUPABASE_SERVICE_ROLE_KEY>

REWARD_MODE=token
HELIUS_RPC_URL=<HELIUS_RPC_URL>
SOURCE_TOKEN_MINT=<HOOD6900_MINT>
REWARD_TOKEN_MINT=<HOOD_REWARD_MINT>
TREASURY_WALLET_SECRET=<BASE58_OR_JSON_SECRET>

CLAIM_ENABLED=false
BUY_ENABLED=false
AIRDROP_ENABLED=false

EPOCH_MINUTES=5
ELIGIBILITY_MIN=100000
MAX_WALLETS_PER_EPOCH=200
MAX_HOLDER_PCT=5
EXCLUDE_WALLETS=

SWAP_BALANCE_BPS=10000
INDEX_AIRDROP_BPS=0
SWAP_SLIPPAGE_BPS=300
SIDE_WALLET_BPS=0
SIDE_WALLET_PUBLIC_KEY=
INDEX_HOLDER_LIMIT=200

MIN_SOL_RESERVE=0.4
AIRDROP_SOL_RESERVE=0.4
AIRDROP_BATCH_SIZE=4
AIRDROP_REWARD_BPS=10000
PRIORITY_FEE_SOL=0.000001
MIN_REWARD_RAW_TO_AIRDROP=1
```

Keep `CLAIM_ENABLED`, `BUY_ENABLED`, and `AIRDROP_ENABLED` false until the live treasury, mints, Supabase tables, and worker dry runs are verified.
