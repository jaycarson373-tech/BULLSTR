# HyperHood

Contract address: `24GqHZ7r7oLYsuKQCtuwYqkMwepEFvZSZvdoni21pump`
X: `https://x.com/HyperHood_`

HyperHood is the Hood liquidity flywheel:

- Fees strengthen a HyperHood pool with HyperHood and HoodXStock.
- 50% of fees buy HOOD for pool-bonus airdrops when possible, or HH holders when pool routing is unavailable.
- 50% of fees strengthen liquidity as 50% HH and 50% HOOD, making the LP thicker over time.
- LP fees compound back into the pool so liquidity depth can keep reinforcing itself.
- At bond, the HH/HOOD LP is created and the liquidity flywheel goes live.
- Every 15 minutes the worker claims, snapshots the 1M+ HHOOD holder gate, checks the active 24-hour holder board, and records settled distributions.
- Holding 1M+ HHOOD is the eligibility gate; the holder board decides who receives each distribution slot.
- Eligible recipients get a +10% weight bonus for each full day they hold without selling.
- The dashboard reads settled revenue windows, payouts, holders, wallet holdings, and recent records from Supabase.

The site should feel fast, neon, and unmistakably HyperHood: real receipts, real flywheel, no custodial wallet-drainer signals.

## Current Implementation

1. Claim creator fees into the treasury.
2. Route 50% toward HOOD buys for airdrops to the pool when possible, otherwise HH holders.
3. Route 50% into LP reinforcement, split as 50% HH and 50% HOOD.
4. Recycle LP fees back into the pool to compound liquidity depth.
5. Store windows, snapshots, payouts, wallet holdings, and records in Supabase.

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
NEXT_PUBLIC_PROJECT_NAME="HyperHood"
NEXT_PUBLIC_SOURCE_SYMBOL=HHOOD
NEXT_PUBLIC_REWARD_SYMBOL=HHOOD
NEXT_PUBLIC_SOURCE_TOKEN_MINT=24GqHZ7r7oLYsuKQCtuwYqkMwepEFvZSZvdoni21pump
NEXT_PUBLIC_CA=24GqHZ7r7oLYsuKQCtuwYqkMwepEFvZSZvdoni21pump
NEXT_PUBLIC_X_URL=https://x.com/HyperHood_
NEXT_PUBLIC_BUY_URL=https://pump.fun/coin/24GqHZ7r7oLYsuKQCtuwYqkMwepEFvZSZvdoni21pump
NEXT_PUBLIC_DEXSCREENER_URL=<HYPERHOOD_DEXSCREENER_URL>
NEXT_PUBLIC_SUPABASE_URL=<SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY>
SUPABASE_URL=<SUPABASE_URL>
SUPABASE_SERVICE_ROLE=<SUPABASE_SERVICE_ROLE_KEY>

REWARD_MODE=token
HELIUS_RPC_URL=<HELIUS_RPC_URL>
SOURCE_TOKEN_MINT=24GqHZ7r7oLYsuKQCtuwYqkMwepEFvZSZvdoni21pump
REWARD_TOKEN_MINT=<REWARD_TOKEN_MINT>
TREASURY_WALLET_SECRET=<BASE58_OR_JSON_SECRET>

CLAIM_ENABLED=false
BUY_ENABLED=false
AIRDROP_ENABLED=false

EPOCH_MINUTES=15
ELIGIBILITY_MIN=1000000
MAX_WALLETS_PER_EPOCH=200
MAX_HOLDER_PCT=5
EXCLUDE_WALLETS=

SWAP_BALANCE_BPS=5000
INDEX_AIRDROP_BPS=0
SWAP_SLIPPAGE_BPS=300
SIDE_WALLET_BPS=5000
SIDE_WALLET_PUBLIC_KEY=<SIDE_WALLET_PUBLIC_KEY>
INDEX_HOLDER_LIMIT=200

MIN_SOL_RESERVE=0.4
AIRDROP_SOL_RESERVE=0.4
AIRDROP_BATCH_SIZE=4
AIRDROP_REWARD_BPS=10000
PRIORITY_FEE_SOL=0.000001
MIN_REWARD_RAW_TO_AIRDROP=1
```

Keep `CLAIM_ENABLED`, `BUY_ENABLED`, and `AIRDROP_ENABLED` false until the live treasury, mints, Supabase tables, and worker dry runs are verified.
