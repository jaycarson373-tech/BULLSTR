# Cashbull

Cashbull is a Solana holder-rewards protocol that converts claimed creator fees into USDC and distributes the acquired USDC to eligible `$CASHBULL` holders on five-minute epochs.

- Reward asset: canonical Solana USDC
- Reward cadence: every 5 minutes
- Eligibility: configurable minimum `$CASHBULL` balance
- Weighting: token balance x holding-time multiplier x holder-rank multiplier
- Proofs: settled transaction signatures and wallet totals are published by the site
- Safety: live execution is parked by default with `EMERGENCY_STOP=true`

## Holder multipliers

Holding-time tiers range from `1x` to `15x`. Rank tiers add `2x` for Top 10, `1.5x` for Top 50, and `1.25x` for Top 100. Weight affects each wallet's share of available rewards; it does not guarantee a payout amount.

## Production safety

The previous treasury key must not be reused. Create a fresh treasury, rotate RPC and Supabase credentials, complete a dry-run epoch, and review the allocation output before setting `EMERGENCY_STOP=false`.

Mainnet gates must remain false during setup:

```env
CLAIM_ENABLED=false
BUY_ENABLED=false
AIRDROP_ENABLED=false
EMERGENCY_STOP=true
```

Only after the owner has reviewed a successful dry run should live execution be considered. Never commit or share treasury private keys, service-role keys, or RPC credentials.

## Owner-provided values

- `$CASHBULL` mint address
- Fresh treasury secret stored only in Railway
- Cashbull X/community URL
- Article URL
- Production site URL
- Minimum eligible balance approval
- Supabase credentials
- Helius RPC endpoint

## Local development

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Verification:

```bash
npm run check
```
