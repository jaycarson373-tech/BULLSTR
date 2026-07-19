const fallbackRewardRotation = ["SPX6900", "MOG", "GIGA", "FARTCOIN", "PEPE"];
const configuredRewardRotation =
  process.env.NEXT_PUBLIC_REWARD_ROTATION?.split(",")
    .map((token) => token.trim())
    .filter(Boolean) ?? [];

export const brand = {
  name: "Diamond Index 6900",
  displayName: "Diamond Index 6900",
  ticker: "$DIAMOND",
  tagline: "Paper hands trade. Diamond hands collect.",
  secondaryTagline: "The index of Solana's strongest meme communities.",
  shortCopy: "Hold the index. Track the strongest communities.",
  logoPath: "/brand/di6900-logo.png",
  faviconPath: "/favicon.png",
  bannerPath: "/brand/di6900-banner.png",
  ogPath: "/og.png",
  rewardSymbol: process.env.NEXT_PUBLIC_REWARD_SYMBOL?.trim() || "CAS",
  rewardRotation: configuredRewardRotation.length ? configuredRewardRotation : fallbackRewardRotation,
  scanner: {
    projectsScanned: process.env.NEXT_PUBLIC_SCANNED_PROJECTS?.trim() || "Not published",
    refreshCycle: process.env.NEXT_PUBLIC_SCANNER_REFRESH_CYCLE?.trim() || "24h",
    status: "Experimental"
  },
  scoreDescription:
    "Diamond Score is our proprietary conviction metric that analyzes holder quality, retention, distribution, and long-term wallet behavior to identify the strongest meme communities on Solana.",
  multiplierDescription:
    "Diamond Hand Score tracks continuous holder time. Every full day adds 0.10x to a wallet's proportional airdrop weight; selling resets the streak.",
  multiplierTiers: [
    { diamonds: "💎", window: "Eligible", multiplier: "1.00x" },
    { diamonds: "💎💎", window: "1 day held", multiplier: "1.10x" },
    { diamonds: "💎💎💎", window: "2 days held", multiplier: "1.20x" },
    { diamonds: "💎💎💎💎", window: "3 days held", multiplier: "1.30x" },
    { diamonds: "💎💎💎💎💎", window: "4+ days held", multiplier: "1.40x+" }
  ],
  basket: [
    { name: "SPX6900", symbol: "SPX", score: "97.4", status: "Stable" },
    { name: "MOG", symbol: "MOG", score: "95.8", status: "Rising" },
    { name: "GIGA", symbol: "GIGA", score: "94.9", status: "Stable" },
    { name: "FARTCOIN", symbol: "FART", score: "93.7", status: "Rising" },
    { name: "PEPE", symbol: "PEPE", score: "92.4", status: "Under Review" }
  ],
  roadmap: [
    "Diamond Terminal",
    "Full rankings",
    "Top 100 leaderboard",
    "Historical Diamond Scores",
    "Community comparison"
  ],
  tokenMint: process.env.NEXT_PUBLIC_DIAMOND_TOKEN_MINT?.trim() || "",
  xUrl: process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/DiamondIndex_",
  telegramUrl: process.env.NEXT_PUBLIC_TELEGRAM_URL?.trim() || "",
  discordUrl: process.env.NEXT_PUBLIC_DISCORD_URL?.trim() || "",
  minimumEligibleBalance: process.env.NEXT_PUBLIC_MINIMUM_ELIGIBLE_BALANCE?.trim() || "1,000,000",
  rewardInterval: process.env.NEXT_PUBLIC_REWARD_INTERVAL?.trim() || "5 minutes",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://diamondindex6900.xyz"
};
