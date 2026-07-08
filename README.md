# Begwork

Source token: `$BEG`
Reward asset: `$ANSEM`

Begwork is a 5-minute creator-fee loop:

- The worker claims creator fees every epoch.
- 50% of newly claimed SOL is routed through Jupiter to buy `$ANSEM`.
- Bought `$ANSEM` is airdropped to eligible `$BEG` holders on each epoch.
- 50% of newly claimed SOL is sent to `SIDE_WALLET_PUBLIC_KEY`, the reward wallet.
- The dashboard reads settled epochs, payouts, holders, and recent drops from Supabase.

The site should feel like a black-screen launch terminal for Begwork.

## Current Implementation

1. Claim creator fees into the treasury.
2. Snapshot source-token holders with at least `ELIGIBILITY_MIN`.
3. Weight selected source-token holders by raw `$BEG` balance.
4. Use `SWAP_BALANCE_BPS=5000` to buy `$ANSEM` with 50% of newly claimed SOL.
5. Airdrop bought `$ANSEM` to eligible `$BEG` holders.
6. Use `SIDE_WALLET_BPS=5000` to send the other 50% of newly claimed SOL to the reward wallet.
7. Keep `INDEX_AIRDROP_BPS=0` for launch so no secondary `$BEG` buyback leg runs.
8. Store epochs, snapshots, reward pools, and payouts in Supabase.

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
NEXT_PUBLIC_PROJECT_NAME="Begwork"
NEXT_PUBLIC_SOURCE_SYMBOL=BEG
NEXT_PUBLIC_REWARD_SYMBOL="ANSEM"
NEXT_PUBLIC_SOURCE_TOKEN_MINT=<BEG_MINT>
NEXT_PUBLIC_X_URL=https://x.com/Begwork_
NEXT_PUBLIC_BUY_URL=https://pump.fun
NEXT_PUBLIC_DEXSCREENER_URL=<DEXSCREENER_PAIR_OR_TOKEN_URL>
NEXT_PUBLIC_FIRST_AIRDROP_AT=<OPTIONAL_ISO_TIME>

NEXT_PUBLIC_SUPABASE_URL=<SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY>
SUPABASE_URL=<SUPABASE_URL>
SUPABASE_SERVICE_ROLE=<SUPABASE_SERVICE_ROLE_KEY>

REWARD_MODE=token
HELIUS_RPC_URL=<HELIUS_RPC_URL>
SOURCE_TOKEN_MINT=<BEG_MINT>
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
INDEX_AIRDROP_BPS=0
SWAP_SLIPPAGE_BPS=300
SIDE_WALLET_BPS=5000
SIDE_WALLET_PUBLIC_KEY=<REWARD_WALLET>
INDEX_HOLDER_LIMIT=200

MIN_SOL_RESERVE=0.4
AIRDROP_SOL_RESERVE=0.4
AIRDROP_BATCH_SIZE=4
AIRDROP_REWARD_BPS=10000
PRIORITY_FEE_SOL=0.000001
MIN_REWARD_RAW_TO_AIRDROP=1
```

Keep `CLAIM_ENABLED`, `BUY_ENABLED`, and `AIRDROP_ENABLED` false until the live treasury, mints, Supabase tables, and worker dry runs are verified.
