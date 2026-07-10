import type { Metadata } from "next";
import { AppPolish } from "./app-polish";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hoodstrategy.xyz";
const SITE_DESCRIPTION = "Hood Pump uses creator fees to launch a token on Robin Hood every week, with 2.5M+ HPUMP holders getting presale access after the pre-launch snapshot.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Hood Pump",
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "Hood Pump",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "Hood Pump",
    images: [
      {
        url: `${SITE_URL}/brand/site-preview.png`,
        width: 1200,
        height: 630,
        alt: "Hood Pump"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Hood Pump",
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/brand/site-preview.png`]
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/logo.png", type: "image/png" }
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
