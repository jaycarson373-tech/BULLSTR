# Near Strategy (NSTR)

Near Strategy is a NEAR-paired community-token concept centered on NEAR ecosystem activity, Pump.fun fee visibility, and recurring holder epochs.

## Reward mechanics

There are two separate fee mechanisms:

1. **Pump-native Holder Rewards:** Pump.fun currently documents a custom-pair holder-rewards setting of up to 3%. This is selected at token launch and Pump.fun determines when those rewards are distributed; the project cannot promise that Pump's native payouts happen every five minutes.
2. **NSTR epoch pool:** the worker can claim creator fees every five minutes, snapshot eligible NSTR holders, apply a consecutive-epoch multiplier, and distribute the configured fee asset. The `CREATOR_FEE_ASSET_MINT` path is for direct distribution of a verified SPL fee asset such as the NEAR quote mint. It must match the only `REWARD_TOKEN_MINTS` entry. Confirm the actual settlement mint on a real claim before enabling it.

The default multiplier is 1.00x for a new eligible wallet, then adds 0.01x for each additional consecutive eligible epoch, capped at 2.00x. Any decrease in balance resets that wallet's consecutive streak. Falling below the eligibility threshold or missing a snapshot resets it as well. A worker restart within the same epoch does not add a second streak step. The Supabase `holder_states` table must be installed for the bonus tracking to persist.

No rate of return is guaranteed. Actual rewards depend on fees collected, eligible balances, transaction costs, the configured schedule, and successful settlement. In direct fee-asset mode, the full balance of the configured reward mint in the treasury is treated as the distribution pool; use a dedicated treasury that does not hold unrelated funds in that mint. Unclaimed balance remains there and can roll into a later epoch.

## Current status

- The site is a pre-launch preview. The NSTR contract address is intentionally blank.
- The worker's claim, buy, and airdrop transaction gates default to `false`.
- No token mint, Pump launch settings, treasury key, RPC, or Supabase credentials are committed.
- A direct fee-asset claim and payout path is implemented, but it needs a post-launch test against the actual Pump fee transaction and quote mint before anyone turns on the live gates.

## Deploying the site

Deploy the Next.js app to Vercel. Set `NEXT_PUBLIC_NSTR_CA` to the launched NSTR mint, `NEXT_PUBLIC_NSTR_BUY_URL` to its Pump page, and `NEXT_PUBLIC_NSTR_X_URL` only after those public links exist. Do not reuse the old generic Inuvestors environment variables or publish an unlaunched address.

## Preparing the Railway worker

Deploy this repository as a separate Railway service using `npm run worker:start` after building. Configure:

- `HELIUS_RPC_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE`
- `SOURCE_TOKEN_MINT` to the real NSTR mint
- `REWARD_TOKEN_MINTS` and `CREATOR_FEE_ASSET_MINT` to the verified fee quote asset; for a NEAR pair, verify the on-chain mint and actual collected asset first
- `TREASURY_WALLET_SECRET` in Railway's secret variable store only
- `EPOCH_MINUTES=5`, eligibility and multiplier values, and funded SOL for transaction fees and missing token accounts
- Apply the existing Supabase migrations, including `004_holder_states.sql`

Keep `CLAIM_ENABLED`, `BUY_ENABLED`, and `AIRDROP_ENABLED` false while validating configuration. Direct fee-asset mode skips swaps and distributes the collected token balance; it requires exactly one matching reward mint. After the pair and fee route exist, verify one claim transaction, inspect its destination and mint, perform a controlled distribution test, and reconcile the epoch and payout receipts before enabling live operation. If Pump's fee collection transaction does not credit the configured mint to the treasury, leave distribution disabled and update the integration to match the actual settlement path.

## Checks

```sh
npm run typecheck
npm run worker:build
npm run worker:test
npm run build
```
