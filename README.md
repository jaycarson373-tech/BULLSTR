# Bull Strategy

Source token: `$BULLSTR`  
Reward assets: `$ANSEM` and `SOL`

Bull Strategy is a fork of the airdrop engine rebranded around a 50/50 strategic flywheel:

- 50% of usable SOL is routed through Jupiter to buy `$ANSEM`.
- `$ANSEM` is airdropped to eligible `$BULLSTR` holders every 5 minutes.
- 50% of usable SOL is airdropped directly as native SOL to eligible `$BULLSTR` holders.

The site is a Next.js dashboard with a Railway-compatible worker and Supabase proof tables.

## Current Implementation

The token reward leg is implemented:

1. Claim creator fees into the treasury.
2. Snapshot `$BULLSTR` holders with at least `ELIGIBILITY_MIN`.
3. Apply permanent holder-state rules.
4. Score selected holders by `$BULLSTR` balance with capped holder and SOL-balance boosts.
5. Use `SWAP_BALANCE_BPS=5000` to buy `$ANSEM` with 50% of usable SOL.
6. Use `SOL_AIRDROP_BPS=5000` to reserve 50% of usable SOL for native SOL holder airdrops.
7. Airdrop the bought `$ANSEM` and native SOL to eligible holders.
8. Store epochs, snapshots, bonus fields, reward pools, and payouts in Supabase.

The two reward legs share the same 5-minute epoch and holder weighting model.

## Weighting

Reward weight starts from `$BULLSTR` held:

- 250K-500K `$BULLSTR`: 1.35x holder boost.
- 500K-1M `$BULLSTR`: 1.20x holder boost.
- 1M-3M `$BULLSTR`: 1.10x holder boost.
- 3M+ `$BULLSTR`: 1.00x holder boost.
- Wallets with less than 1 SOL: 1.35x SOL boost.
- Wallets with 1-5 SOL: 1.20x SOL boost.
- Wallets with 5-20 SOL: 1.10x SOL boost.
- Wallets with 20+ SOL: 1.00x SOL boost.

Every epoch is 5 minutes by default. Default eligibility is 250,000 `$BULLSTR`. Selling any amount of `$BULLSTR`, or falling below `ELIGIBILITY_MIN`, permanently removes that wallet from future tracked distributions.

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
NEXT_PUBLIC_PROJECT_NAME="Bull Strategy"
NEXT_PUBLIC_SOURCE_SYMBOL=BULLSTR
NEXT_PUBLIC_REWARD_SYMBOL="ANSEM + SOL"
NEXT_PUBLIC_CA=<BULLSTR_MINT>
NEXT_PUBLIC_SOURCE_TOKEN_MINT=<BULLSTR_MINT>
NEXT_PUBLIC_X_URL=https://x.com
NEXT_PUBLIC_BUY_URL=https://pump.fun
NEXT_PUBLIC_FIRST_AIRDROP_AT=<OPTIONAL_ISO_TIME>

NEXT_PUBLIC_SUPABASE_URL=<SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY>
SUPABASE_URL=<SUPABASE_URL>
SUPABASE_SERVICE_ROLE=<SUPABASE_SERVICE_ROLE_KEY>

REWARD_MODE=token
HELIUS_RPC_URL=<HELIUS_RPC_URL>
SOURCE_TOKEN_MINT=<BULLSTR_MINT>
REWARD_TOKEN_MINT=<ANSEM_MINT>
TREASURY_WALLET_SECRET=<BASE58_OR_JSON_SECRET>

CLAIM_ENABLED=false
BUY_ENABLED=false
AIRDROP_ENABLED=false

EPOCH_MINUTES=5
ELIGIBILITY_MIN=250000
MAX_WALLETS_PER_EPOCH=150
MAX_HOLDER_PCT=5
EXCLUDE_WALLETS=

SWAP_BALANCE_BPS=5000
SWAP_SLIPPAGE_BPS=300
SOL_AIRDROP_BPS=5000
MIN_SOL_REWARD_LAMPORTS_TO_AIRDROP=5000

MIN_SOL_RESERVE=0.3
AIRDROP_SOL_RESERVE=0.05
AIRDROP_BATCH_SIZE=4
AIRDROP_REWARD_BPS=10000
PRIORITY_FEE_SOL=0.000001
MIN_REWARD_RAW_TO_AIRDROP=1
```

Keep `CLAIM_ENABLED`, `BUY_ENABLED`, and `AIRDROP_ENABLED` false until the live treasury, mints, Supabase tables, and worker dry runs are verified.

## Logo

The old placeholder logo has been removed. Add the final logo asset when ready.
