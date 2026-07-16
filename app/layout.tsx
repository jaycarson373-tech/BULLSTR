import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bull.fyi";
const SITE_DESCRIPTION =
  "BULL is a simple emoji token dashboard: hold 1M+ BULL and every 5 minutes fees swap for ANSEM airdrops to eligible holders.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "🐂 BULL",
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "🐂 BULL",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "BULL",
    images: [
      {
        url: `${SITE_URL}/og.svg`,
        width: 1200,
        height: 630,
        alt: "BULL"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "🐂 BULL",
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/og.svg`]
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
