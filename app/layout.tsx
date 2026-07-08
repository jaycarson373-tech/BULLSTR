import type { Metadata } from "next";
import { AppPolish } from "./app-polish";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hoodstrategy.fun"),
  title: "Hood Strategy",
  description: "Hood Strategy routes rewards into automatic HOOD holder airdrops and verified holder live draws.",
  openGraph: {
    title: "Hood Strategy",
    description: "50% automatic HOOD Stock drops for 1M+ holders and 50% verified holder live draws.",
    url: "https://hoodstrategy.fun",
    siteName: "Hood Strategy",
    images: [
      {
        url: "/brand/hood-strategy-logo.png",
        width: 1200,
        height: 630,
        alt: "Hood Strategy"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Hood Strategy",
    description: "Automatic HOOD Stock airdrops and verified holder live draws.",
    images: ["/brand/hood-strategy-logo.png"]
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
