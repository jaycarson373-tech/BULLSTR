const himothyMint = process.env.NEXT_PUBLIC_HIMOTHY_TOKEN_MINT?.trim() || "";
const jimothyMint = process.env.NEXT_PUBLIC_JIMOTHY_TOKEN_MINT?.trim() || "";

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
  communityUrl: process.env.NEXT_PUBLIC_HIMOTHY_X_URL?.trim() || "",
  buyUrl: process.env.NEXT_PUBLIC_BUY_URL?.trim() || (himothyMint ? `https://pump.fun/coin/${himothyMint}` : ""),
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
    "JIMOTHY RAN",
    "SELL ONCE, NOT HIMOTHY",
    "FIVE-MINUTE JIMOTHY DROPS",
    "STAY HIMOTHY"
  ],
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://himothy.fun"
};
