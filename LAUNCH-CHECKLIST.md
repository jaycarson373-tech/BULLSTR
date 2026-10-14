# NSTR activation handoff — 2026-10-14

The token is intentionally not live. Do not invent its mint or enable claims early.

## Prepared

- Railway worker starts through a safe HTTP bootstrap and stays healthy while waiting.
- Live transaction gates default off; NSTR_ACTIVATED must be explicitly true.
- Creator claims are built locally from Pump v2 / Pump AMM's pinned public IDLs. No opaque third-party transaction is signed.
- Source program, creator and actual quote mint are verified on chain before the scheduler starts.
- The signed payout signature is persisted before broadcast; uncertain outcomes stop further allocation.
- NSTR's epoch and holder state are separated from the old project's data.
- Worker typecheck, build and 18 tests passed. No funded mainnet transaction has been performed.

## Database preparation

For a new dedicated Supabase project, run supabase/NSTR_FRESH_SETUP.sql once. It rejects an existing project’s ledger instead of overwriting it. For an existing NSTR database, apply migration 011_nstr_payout_guard.sql after the existing migrations. Run `select public.nstr_worker_ready();` and require true. The configured Railway database hostname did not resolve during this review; the dashboard redirected that project to the organization list. This must be repaired before activation.

If a payout confirmation is unknown, query its persisted tx_sig on chain. A confirmed successful transaction should have its corresponding sending rows settled, a confirmed failed transaction should be marked failed. A missing transaction is not proof of failure. Do not reset or recreate an uncertain payment. A crashed running epoch needs reconciliation before its status is resolved. The guard deliberately blocks the next allocation meanwhile.

## Final token activation

1. Set NEXT_PUBLIC_NSTR_CA on the website and SOURCE_TOKEN_MINT on Railway to the new mint.
2. Verify the creator is the dedicated configured treasury and that its quote token is a non-native fee asset supported by the direct reward flow. Set CREATOR_FEE_ASSET_MINT and the same REWARD_TOKEN_MINT(S).
3. Set the agreed ELIGIBILITY_MIN explicitly; the example no longer guesses 1 token. Keep the key server-side in TREASURY_WALLET_SECRET; TREASURY_PUBLIC_KEY can bind it to the expected public address.
4. Preserve enough SOL for network fees and ATA rent. Confirm the source/token metadata, fee-claim simulation, snapshot and a small funded payout with the owner before public activation.
5. After those checks, set CLAIM_ENABLED=true, AIRDROP_ENABLED=true and NSTR_ACTIVATED=true. Keep BUY_ENABLED, unrelated trading/social agents and side-wallet routing off. Redeploy once.
6. /health reports liveness; /ready only becomes 200 once configuration and on-chain/database preflight have passed. /status never exposes keys.

Supported claim scope: single-recipient creator vaults. Shared-fee configurations, native SOL fees and other creation programs require their matching collector; they are blocked rather than silently misprocessed.

The website now includes a /api/rewards proxy and wallet-searchable receipt list. It displays only NSTR mint-scoped settled payouts, with exact raw token units and public transaction links. Before activation it returns an empty awaiting-activation state rather than simulated rewards.
