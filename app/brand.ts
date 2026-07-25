const ussrMint =
  process.env.NEXT_PUBLIC_USSR_TOKEN_MINT?.trim() ||
  process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT?.trim() ||
  process.env.NEXT_PUBLIC_CA?.trim() ||
  "";
const pumpUrl = process.env.NEXT_PUBLIC_PUMP_URL?.trim() || (ussrMint ? `https://pump.fun/coin/${ussrMint}` : "https://pump.fun");
const dexscreenerUrl = process.env.NEXT_PUBLIC_DEXSCREENER_URL?.trim() || (ussrMint ? `https://dexscreener.com/solana/${ussrMint}` : "https://dexscreener.com");
const buyUrl =
  process.env.NEXT_PUBLIC_BUY_URL?.trim() ||
  (ussrMint ? `https://jup.ag/?sell=So11111111111111111111111111111111111111112&buy=${ussrMint}` : pumpUrl);

export const brand = {
  name: "United Solana Socialist Reserve",
  displayName: "United Solana Socialist Reserve",
  descriptor: "The People's Treasury",
  ticker: "$USSR",
  rewardTicker: "SOL",
  tagline: "Equality. Enforced by Code.",
  secondaryTagline:
    "The People's Treasury redistributes protocol rewards to eligible citizens every five minutes.",
  logoPath: "/brand/ussr-logo.png",
  bannerPath: "/brand/ussr-banner.png",
  faviconPath: "/brand/ussr-favicon.png",
  ogPath: "/brand/ussr-banner.png",
  tokenMint: ussrMint,
  rewardTokenMint: "",
  xUrl: process.env.NEXT_PUBLIC_USSR_X_URL?.trim() || process.env.NEXT_PUBLIC_X_URL?.trim() || "",
  communityUrl:
    process.env.NEXT_PUBLIC_USSR_COMMUNITY_URL?.trim() ||
    process.env.NEXT_PUBLIC_COMMUNITY_URL?.trim() ||
    "",
  dexscreenerUrl,
  pumpUrl,
  buyUrl,
  rewardInterval: process.env.NEXT_PUBLIC_REWARD_INTERVAL?.trim() || "5 minutes",
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
    "UNITED SOLANA SOCIALIST RESERVE",
    "THE PEOPLE'S TREASURY",
    "EQUALITY ENFORCED BY CODE",
    "REDISTRIBUTING WEALTH",
    "POWER TO THE HOLDERS",
    "FIVE-MINUTE REDISTRIBUTION"
  ],
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://ussr.fun"
};
