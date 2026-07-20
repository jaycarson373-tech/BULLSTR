# Proof of Conviction

Proof of Conviction is an on-chain holding reputation protocol with alternating SOL and PUMP rewards on Solana.

- Project: `Proof of Conviction`
- Ticker: `$POC`
- Reward cadence: alternating SOL and PUMP every 5 minutes
- SOL reward pool: 75% of spendable treasury SOL after configured reserves
- PUMP epochs: claimed SOL is swapped to the configured PUMP mint before distribution
- Weighting: token balance × holding-time multiplier × holder-rank multiplier
- Permanent rule: any indexed balance decrease permanently ends reward eligibility
- Proofs: settled SOL transaction signatures and per-wallet totals are published on the site

## Conviction multipliers

Holding tiers range from `1x` at baseline to `15x` after one month. Rank tiers add `2x` for Top 10, `1.5x` for Top 50, and `1.25x` for Top 100. The two multipliers stack.

## Production safety

Mainnet gates default to false. Review at least one complete dry-run epoch before enabling distributions. The worker requires `holder_states`; it fails closed when permanent eligibility tracking is unavailable.

Never commit or share treasury private keys, Supabase service-role keys, or RPC credentials.

## Owner-provided values

- `$POC` mint address
- Official PUMP mint address
- Treasury wallet and creator-fee authority
- Solana RPC endpoint
- Supabase project credentials
- Minimum eligible balance
- Excluded system wallets
- Public website and social links
- Approved legal and risk disclosure
