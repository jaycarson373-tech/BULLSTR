const defaultHimothyMint = "62q2Sp3o2LFQB843hVagbbAhpgiyVxZRPCdT2fMzpump";
const himothyMint = process.env.NEXT_PUBLIC_HIMOTHY_TOKEN_MINT?.trim() || defaultHimothyMint;
const jimothyMint = process.env.NEXT_PUBLIC_JIMOTHY_TOKEN_MINT?.trim() || "";
const pumpUrl = process.env.NEXT_PUBLIC_PUMP_URL?.trim() || (himothyMint ? `https://pump.fun/coin/${himothyMint}` : "https://pump.fun");
const dexscreenerUrl = process.env.NEXT_PUBLIC_DEXSCREENER_URL?.trim() || (himothyMint ? `https://dexscreener.com/solana/${himothyMint}` : "https://dexscreener.com");
const buyUrl =
  process.env.NEXT_PUBLIC_BUY_URL?.trim() ||
  `https://jup.ag/?sell=So11111111111111111111111111111111111111112&buy=${himothyMint}`;

export const brand = {
  name: "Himothy",
  displayName: "Himothy",
  descriptor: "Five-minute Jimothy rewards",
  ticker: "$HIMOTHY",
  rewardTicker: "$JIMOTHY",
  tagline: "We are all Himothy.",
  secondaryTagline:
    "Hold $HIMOTHY, stay Himothy, and receive $JIMOTHY airdrops every five minutes when protocol rewards settle.",
  logoPath: "/brand/himothy-logo.jpg",
  bannerPath: "/brand/himothy-banner.jpg",
  faviconPath: "/brand/himothy-logo.jpg",
  ogPath: "/brand/himothy-banner.jpg",
  tokenMint: himothyMint,
  rewardTokenMint: jimothyMint,
  xUrl: process.env.NEXT_PUBLIC_HIMOTHY_X_URL?.trim() || process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com",
  communityUrl: process.env.NEXT_PUBLIC_HIMOTHY_COMMUNITY_URL?.trim() || process.env.NEXT_PUBLIC_COMMUNITY_URL?.trim() || "https://x.com/i/communities",
  dexscreenerUrl,
  pumpUrl,
  buyUrl,
  rewardInterval: process.env.NEXT_PUBLIC_REWARD_INTERVAL?.trim() || "5 minutes",
  minimumEligibleBalance: process.env.NEXT_PUBLIC_MINIMUM_ELIGIBLE_BALANCE?.trim() || "500000",
  rewardSymbol: "JIMOTHY",
  maxHolderPercent: process.env.NEXT_PUBLIC_MAX_HOLDER_PCT?.trim() || "4",
  holdTiers: [
    { window: "Start", multiplier: "1.00x" },
    { window: "1 hour", multiplier: "1.10x" },
    { window: "6 hours", multiplier: "1.35x" },
    { window: "12 hours", multiplier: "1.60x" },
    { window: "1 day", multiplier: "2.00x" },
    { window: "3 days", multiplier: "3.00x" },
    { window: "1 week", multiplier: "5.00x" }
  ],
  memeStrips: [
    "WE ARE ALL HIMOTHY",
    "WE ARE HIM",
    "JIMOTHY RAN.",
    "SELL ONCE, NOT HIMOTHY.",
    "FIVE-MINUTE JIMOTHY DROPS",
    "STAY HIMOTHY"
  ],
  siteUrl: "https://www.himothy.tech"
};
