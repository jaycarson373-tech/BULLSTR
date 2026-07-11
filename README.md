# Sherwood Run

Contract address: `E2U8ot8N9i6jF7f41PAQR7ofN4nStkEkjMaeA4izpump`
X: `https://x.com/SherwoodRun`

Sherwood Run is the Sherwood arcade and HoodX airdrop site:

- The game is a pixel Sherwood flapper where players clear tree gates for leaderboard score.
- Every 30 minutes the worker claims, snapshots eligible 1M+ Sherwood holders, checks the active 6-hour leaderboard, and sends HoodX.
- Leaderboard wallets can boost matching eligible holder wallets with rank multipliers.
- The dashboard reads settled HoodX windows, payouts, holders, wallet holdings, and recent records from Supabase.

The site should feel fast, neon, and unmistakably Sherwood Run.

## Current Implementation

1. Claim creator fees into the treasury.
2. Snapshot source-token holders with at least `ELIGIBILITY_MIN`.
3. Use `ELIGIBILITY_MIN=1000000` for 1M+ Sherwood airdrop eligibility.
4. Check the active 6-hour Sherwood Run leaderboard for matching wallet multipliers.
5. Store windows, snapshots, HoodX payouts, wallet holdings, and records in Supabase.

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
NEXT_PUBLIC_PROJECT_NAME="Sherwood Run"
NEXT_PUBLIC_SOURCE_SYMBOL=Sherwood
NEXT_PUBLIC_REWARD_SYMBOL=HoodX
NEXT_PUBLIC_SOURCE_TOKEN_MINT=E2U8ot8N9i6jF7f41PAQR7ofN4nStkEkjMaeA4izpump
NEXT_PUBLIC_CA=E2U8ot8N9i6jF7f41PAQR7ofN4nStkEkjMaeA4izpump
NEXT_PUBLIC_X_URL=https://x.com/SherwoodRun
NEXT_PUBLIC_DEXSCREENER_URL=<SHERWOOD_DEXSCREENER_URL>
NEXT_PUBLIC_SHERWOOD_CHART_URL=<SHERWOOD_DEXSCREENER_URL>
NEXT_PUBLIC_SHERWOOD_CHART_EMBED_URL=<OPTIONAL_DEXSCREENER_EMBED_URL>
NEXT_PUBLIC_SUPABASE_URL=<SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY>
SUPABASE_URL=<SUPABASE_URL>
SUPABASE_SERVICE_ROLE=<SUPABASE_SERVICE_ROLE_KEY>

REWARD_MODE=token
HELIUS_RPC_URL=<HELIUS_RPC_URL>
SOURCE_TOKEN_MINT=E2U8ot8N9i6jF7f41PAQR7ofN4nStkEkjMaeA4izpump
REWARD_TOKEN_MINT=<REWARD_TOKEN_MINT>
TREASURY_WALLET_SECRET=<BASE58_OR_JSON_SECRET>

CLAIM_ENABLED=false
BUY_ENABLED=false
AIRDROP_ENABLED=false

EPOCH_MINUTES=30
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
