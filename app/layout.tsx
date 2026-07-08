import type { Metadata } from "next";
import { AppPolish } from "./app-polish";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hood6900.xyz"),
  title: "Hood 6900",
  description: "Hood 6900 routes creator fees into HoodX stock-token rewards and verified HoodWorker payouts.",
  openGraph: {
    title: "Hood 6900",
    description: "Hood 6900 routes creator fees into HoodX stock-token rewards and verified HoodWorker payouts.",
    url: "https://hood6900.xyz",
    siteName: "Hood 6900",
    images: [
      {
        url: "https://hood6900.xyz/logo.png",
        width: 1200,
        height: 630,
        alt: "Hood 6900"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Hood 6900",
    description: "Hood 6900 routes creator fees into HoodX stock-token rewards and verified HoodWorker payouts.",
    images: ["https://hood6900.xyz/logo.png"]
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
