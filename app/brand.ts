export const brand = {
  name: "Proof of Conviction",
  displayName: "Proof of Conviction",
  descriptor: "On-chain holding reputation",
  ticker: "$POC",
  tagline: "Conviction is earned on-chain.",
  secondaryTagline: "Hold longer. Rank higher. Earn a larger share of every five-minute SOL epoch.",
  logoPath: "/brand/proof-of-conviction-green.jpg",
  faviconPath: "/favicon-green.jpg",
  ogPath: "/og-green.jpg",
  tokenMint:
    process.env.NEXT_PUBLIC_POC_TOKEN_MINT?.trim() ||
    process.env.NEXT_PUBLIC_CA?.trim() ||
    process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT?.trim() ||
    "",
  xUrl: process.env.NEXT_PUBLIC_X_URL?.trim() || "",
  rewardInterval: process.env.NEXT_PUBLIC_REWARD_INTERVAL?.trim() || "5 minutes",
  minimumEligibleBalance: process.env.NEXT_PUBLIC_MINIMUM_ELIGIBLE_BALANCE?.trim() || "1,000,000",
  holdTiers: [
    { window: "Baseline", multiplier: "1.00x" },
    { window: "1 hour", multiplier: "1.25x" },
    { window: "12 hours", multiplier: "1.50x" },
    { window: "1 day", multiplier: "2.00x" },
    { window: "3 days", multiplier: "3.00x" },
    { window: "1 week", multiplier: "5.00x" },
    { window: "1 month", multiplier: "15.00x" }
  ],
  rankTiers: [
    { rank: "Top 10", multiplier: "2.00x", note: "Highest conviction" },
    { rank: "Top 50", multiplier: "1.50x", note: "Deep conviction" },
    { rank: "Top 100", multiplier: "1.25x", note: "Established conviction" },
    { rank: "All eligible", multiplier: "1.00x", note: "Base rank weight" }
  ],
  roadmap: [
    { phase: "Beta 01", title: "Conviction profiles", copy: "A portable, public reputation layer for wallets that hold through time." },
    { phase: "Beta 02", title: "Conviction campaigns", copy: "Projects create transparent holding challenges with published rules and proofs." },
    { phase: "Future", title: "Conviction marketplace", copy: "Wallet reputation becomes a signal across an open conviction ecosystem." }
  ],
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://proofofconviction.xyz"
};
