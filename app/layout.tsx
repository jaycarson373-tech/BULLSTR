import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://blackcashbull.xyz";
const SITE_DESCRIPTION =
  "The Black Cash Bull is a simple meme coin utility site: hold BCB and receive ANSEM airdrops every 5 minutes.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "The Black Cash Bull | BCB",
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "The Black Cash Bull | BCB",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "The Black Cash Bull",
    images: [
      {
        url: `${SITE_URL}/og.png`,
        width: 1200,
        height: 1200,
        alt: "The Black Cash Bull"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "The Black Cash Bull | BCB",
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/og.png`]
  },
  icons: {
    icon: [
      { url: "/brand/bcb-logo.png", type: "image/png" },
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
      <body>{children}</body>
    </html>
  );
}
