import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://inuvestor.fun";
const PROJECT_NAME = process.env.NEXT_PUBLIC_PROJECT_NAME ?? "Inuvestor";
const SOURCE_SYMBOL = process.env.NEXT_PUBLIC_SOURCE_SYMBOL ?? "INU";
const SITE_DESCRIPTION =
  "Inuvestor is a meme market intelligence desk routing five-minute reward rounds to 1M+ holders while tracking the strongest stock-style themes.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${PROJECT_NAME} | ${SOURCE_SYMBOL}`,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: `${PROJECT_NAME} | ${SOURCE_SYMBOL}`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: PROJECT_NAME,
    images: [
      {
        url: `${SITE_URL}/og.svg`,
        width: 1200,
        height: 630,
        alt: PROJECT_NAME
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: `${PROJECT_NAME} | ${SOURCE_SYMBOL}`,
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
