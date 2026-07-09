import type { Metadata } from "next";
import { AppPolish } from "./app-polish";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hood6900.xyz"),
  title: "Hood 6900",
  description: "Hood 6900 routes creator fees into HoodX buys and automatic airdrops for 1M+ holders with AI6900 energy.",
  openGraph: {
    title: "Hood 6900",
    description: "100% HoodX buys and automatic airdrops for wallets holding 1M+ $HOOD6900.",
    url: "https://hood6900.xyz",
    siteName: "Hood 6900",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Hood 6900",
    description: "HoodX stock airdrops for 1M+ $HOOD6900 holders."
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
