import type { Metadata } from "next";
import { AppPolish } from "./app-polish";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sherwoodrun.xyz";
const SITE_DESCRIPTION = "Sherwood Run is a Robin Hood arcade runner where 1M+ holders receive HoodX every 30 minutes and the active 6-hour leaderboard can add a multiplier.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Sherwood Run",
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "Sherwood Run",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "Sherwood Run",
    images: [
      {
        url: `${SITE_URL}/brand/sherwood-fire-banner.png`,
        width: 1200,
        height: 630,
        alt: "Sherwood Run"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Sherwood Run",
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/brand/sherwood-fire-banner.png`]
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/brand/sherwood-fire-logo.png", type: "image/png" }
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
