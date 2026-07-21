const cashbullMint = process.env.NEXT_PUBLIC_CASHBULL_TOKEN_MINT?.trim() || "";

export const brand = {
  name: "Cashbull",
  displayName: "Cashbull",
  descriptor: "Five-minute USDC rewards",
  ticker: "$CASHBULL",
  tagline: "The bull that pays in cash.",
  secondaryTagline: "Hold $CASHBULL and stay eligible for recurring USDC distributions funded by protocol revenue. New payout cycles run every five minutes.",
  logoPath: "/brand/cashbull-logo.jpg",
  bannerPath: "/brand/cashbull-banner.jpg",
  faviconPath: "/brand/cashbull-logo.jpg",
  ogPath: "/brand/cashbull-banner.jpg",
  tokenMint: cashbullMint,
  buyUrl: process.env.NEXT_PUBLIC_BUY_URL?.trim() || (cashbullMint ? `https://pump.fun/coin/${cashbullMint}` : ""),
  communityUrl: process.env.NEXT_PUBLIC_CASHBULL_X_URL?.trim() || "",
  articleUrl: process.env.NEXT_PUBLIC_ARTICLE_URL?.trim() || "https://www.bloomberg.com/opinion/articles/2026-07-21/private-credit-and-data-center-wraps-are-2008-redux?taid=6a5f677b22b42c0001524ed2&utm_campaign=trueanthem&utm_content=business&utm_medium=social&utm_source=twitter",
  rewardInterval: process.env.NEXT_PUBLIC_REWARD_INTERVAL?.trim() || "5 minutes",
  minimumEligibleBalance: process.env.NEXT_PUBLIC_MINIMUM_ELIGIBLE_BALANCE?.trim() || "1000000",
  treasuryAddress: process.env.NEXT_PUBLIC_TREASURY_ADDRESS?.trim() || "",
  distributionAddress: process.env.NEXT_PUBLIC_DISTRIBUTION_WALLET?.trim() || "",
  rewardSymbol: "USDC",
  usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  holdTiers: [
    { window: "Start", multiplier: "1.00x" },
    { window: "1 hour", multiplier: "1.25x" },
    { window: "12 hours", multiplier: "1.50x" },
    { window: "1 day", multiplier: "2.00x" },
    { window: "3 days", multiplier: "3.00x" },
    { window: "1 week", multiplier: "5.00x" },
    { window: "1 month", multiplier: "15.00x" }
  ],
  rankTiers: [
    { rank: "Top 10", multiplier: "2.00x" },
    { rank: "Top 50", multiplier: "1.50x" },
    { rank: "Top 100", multiplier: "1.25x" },
    { rank: "All eligible", multiplier: "1.00x" }
  ],
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://cashbull.xyz"
};
