const defaultUssrMint = "5Ei1t81hLfrV7qvezM1GE9ti5t7gh8xD8mHCcaAXpump";
const defaultUssrXUrl = "https://x.com/USSR_solana_";

const ussrMint =
  process.env.NEXT_PUBLIC_USSR_TOKEN_MINT?.trim() ||
  defaultUssrMint;
const pumpUrl = process.env.NEXT_PUBLIC_USSR_PUMP_URL?.trim() || (ussrMint ? `https://pump.fun/coin/${ussrMint}` : "");
const dexscreenerUrl = process.env.NEXT_PUBLIC_USSR_DEXSCREENER_URL?.trim() || (ussrMint ? `https://dexscreener.com/solana/${ussrMint}` : "");
const buyUrl =
  process.env.NEXT_PUBLIC_USSR_BUY_URL?.trim() ||
  (ussrMint ? `https://jup.ag/?sell=So11111111111111111111111111111111111111112&buy=${ussrMint}` : "");
const minimumEligibleBalance =
  process.env.NEXT_PUBLIC_USSR_MINIMUM_ELIGIBLE_BALANCE?.trim() ||
  "1000000";

export const brand = {
  name: "United Solana Socialist Reserve",
  displayName: "United Solana Socialist Reserve",
  descriptor: "The People's Treasury",
  ticker: "$USSR",
  rewardTicker: "SOL",
  tagline: "Equality. Enforced by Code.",
  secondaryTagline:
    "Creator fees are collectivized into the People's Treasury and redistributed on-chain every five minutes.",
  logoPath: "/brand/ussr-logo.png",
  bannerPath: "/brand/ussr-banner.png",
  faviconPath: "/brand/ussr-favicon.png",
  ogPath: "/brand/ussr-banner.png",
  tokenMint: ussrMint,
  rewardTokenMint: "",
  xUrl: process.env.NEXT_PUBLIC_USSR_X_URL?.trim() || defaultUssrXUrl,
  communityUrl:
    process.env.NEXT_PUBLIC_USSR_COMMUNITY_URL?.trim() ||
    "",
  dexscreenerUrl,
  pumpUrl,
  buyUrl,
  rewardInterval: process.env.NEXT_PUBLIC_REWARD_INTERVAL?.trim() || "5 minutes",
  minimumEligibleBalance,
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
    "ON-CHAIN COMMUNISM",
    "THE PEOPLE'S TREASURY",
    "FEES TO THE COLLECTIVE",
    "EQUALITY ENFORCED BY CODE",
    "PUBLIC LEDGER REDISTRIBUTION",
    "POWER TO THE HOLDERS",
    "FIVE-MINUTE REDISTRIBUTION"
  ],
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://ussr.fun"
};
