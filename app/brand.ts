const convictionMint =
  process.env.NEXT_PUBLIC_CONVICTION_TOKEN_MINT?.trim() ||
  process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT?.trim() ||
  process.env.NEXT_PUBLIC_CA?.trim() ||
  "";
const pumpUrl = process.env.NEXT_PUBLIC_PUMP_URL?.trim() || (convictionMint ? `https://pump.fun/coin/${convictionMint}` : "https://pump.fun");
const dexscreenerUrl = process.env.NEXT_PUBLIC_DEXSCREENER_URL?.trim() || (convictionMint ? `https://dexscreener.com/solana/${convictionMint}` : "https://dexscreener.com");
const buyUrl =
  process.env.NEXT_PUBLIC_BUY_URL?.trim() ||
  (convictionMint ? `https://jup.ag/?sell=So11111111111111111111111111111111111111112&buy=${convictionMint}` : pumpUrl);

export const brand = {
  name: "Proof of Conviction",
  displayName: "Proof of Conviction",
  descriptor: "Five-minute SOL conviction rewards",
  ticker: "$CONVICTION",
  rewardTicker: "SOL",
  tagline: "Hold conviction. Earn SOL.",
  secondaryTagline:
    "Diamond hands stay eligible for SOL reward epochs. Sell once and the wallet is out forever.",
  logoPath: "/brand/conviction-logo.jpg",
  bannerPath: "/brand/conviction-banner.jpg",
  faviconPath: "/brand/conviction-favicon.png",
  ogPath: "/brand/conviction-banner.jpg",
  tokenMint: convictionMint,
  rewardTokenMint: "",
  xUrl: process.env.NEXT_PUBLIC_CONVICTION_X_URL?.trim() || process.env.NEXT_PUBLIC_X_URL?.trim() || "",
  communityUrl: process.env.NEXT_PUBLIC_CONVICTION_COMMUNITY_URL?.trim() || process.env.NEXT_PUBLIC_COMMUNITY_URL?.trim() || "",
  dexscreenerUrl,
  pumpUrl,
  buyUrl,
  rewardInterval: process.env.NEXT_PUBLIC_REWARD_INTERVAL?.trim() || "5 minutes",
  firstEpochStart: process.env.NEXT_PUBLIC_FIRST_EPOCH_START?.trim() || "3:45 PM EDT",
  firstAirdropAt: process.env.NEXT_PUBLIC_FIRST_AIRDROP_AT?.trim() || "3:50 PM EDT",
  minimumEligibleBalance: process.env.NEXT_PUBLIC_MINIMUM_ELIGIBLE_BALANCE?.trim() || "500000",
  rewardSymbol: "SOL",
  maxHolderPercent: process.env.NEXT_PUBLIC_MAX_HOLDER_PCT?.trim() || "4",
  holdTiers: [
    { window: "Start", multiplier: "1.00x" },
    { window: "1 hour", multiplier: "1.25x" },
    { window: "4 hours", multiplier: "1.50x" },
    { window: "12 hours", multiplier: "1.75x" },
    { window: "1 day", multiplier: "2.00x" },
    { window: "3 days", multiplier: "3.00x" },
    { window: "1 week", multiplier: "5.00x" },
    { window: "1 month", multiplier: "15.00x" }
  ],
  memeStrips: [
    "PROOF OF CONVICTION",
    "HOLD CONVICTION",
    "DIAMOND HANDS EARN SOL",
    "SELL ONCE, INELIGIBLE FOREVER",
    "FIVE-MINUTE SOL EPOCHS",
    "CONVICTION ONLY"
  ],
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.proofofconviction.xyz"
};
