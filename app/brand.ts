export const brand = {
  name: "Proof of Conviction",
  displayName: "Proof of Conviction",
  descriptor: "On-chain holding reputation",
  ticker: "$POC",
  tagline: "Conviction is earned on-chain.",
  secondaryTagline: "Hold longer. Rank higher. Earn a larger share of alternating SOL and $PUMP epochs.",
  logoPath: "/brand/proof-of-conviction-live.png",
  faviconPath: "/favicon-live.png",
  ogPath: "/og-live.png",
  tokenMint:
    process.env.NEXT_PUBLIC_POC_TOKEN_MINT?.trim() ||
    process.env.NEXT_PUBLIC_CA?.trim() ||
    process.env.NEXT_PUBLIC_SOURCE_TOKEN_MINT?.trim() ||
    "FF6PEm5XKPsFjeFZGupHS5K417ryw48C4U3DncKnpump",
  xUrl: process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/i/communities/2029250283063394361",
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
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://proofofconviction.fun"
};
