import type { Metadata } from "next";
import { AppPolish } from "./app-polish";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hyperhood.xyz";
const SITE_DESCRIPTION = "HyperHood uses creator fees to buy HOOD, airdrop eligible holders, add HH/HOOD liquidity, and compound LP fees back into the pool.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "HyperHood",
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "HyperHood",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "HyperHood",
    images: [
      {
        url: `${SITE_URL}/brand/hyperhood-landing-bg.png`,
        width: 1280,
        height: 720,
        alt: "HyperHood"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "HyperHood",
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/brand/hyperhood-landing-bg.png`]
  },
  icons: {
    icon: [
      { url: "/brand/hyperhood-logo.png", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: "/apple-touch-icon.png"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppPolish />
        {children}
      </body>
    </html>
  );
}
