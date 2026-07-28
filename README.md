# CryptoCat

CryptoCat is an on-chain AI treasury persona for the `CC` token.

The public site presents CryptoCat as a terminal-native character that scans the chain, posts in its own voice, opens bounties, and can reward loyal holders when treasury actions are approved.

## Public configuration

- `NEXT_PUBLIC_PROJECT_NAME`: `CryptoCat`
- `NEXT_PUBLIC_SOURCE_SYMBOL`: `CC`
- `NEXT_PUBLIC_CC_X_URL`: X profile, optional until ready
- `NEXT_PUBLIC_CC_CA`: token mint, optional until ready
- `NEXT_PUBLIC_BUY_URL`: buy link, optional until ready
- `NEXT_PUBLIC_SITE_URL`: production site URL

## Worker configuration

The worker logic is unchanged. It remains controlled by Railway env gates:

- `CLAIM_ENABLED`
- `BUY_ENABLED`
- `AIRDROP_ENABLED`
- `SOURCE_TOKEN_MINT`
- `REWARD_TOKEN_MINT`
- `REWARD_TOKEN_SYMBOL`
- `TREASURY_WALLET_SECRET`

Keep live gates false until the reward flow is intentionally enabled and funded.
