import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://inuvestors.fun";
const PROJECT_NAME = process.env.NEXT_PUBLIC_PROJECT_NAME ?? "Inuvestor";
const SOURCE_SYMBOL = process.env.NEXT_PUBLIC_SOURCE_SYMBOL ?? "Inuvestor";
const SITE_DESCRIPTION =
  "Every five minutes, Inuvestor buys one of the market's top-performing supported stocks and airdrops it to an eligible holder.";

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
        url: `${SITE_URL}/inuvestors-logo.png`,
        width: 1254,
        height: 1254,
        alt: PROJECT_NAME
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: `${PROJECT_NAME} | ${SOURCE_SYMBOL}`,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/inuvestors-logo.png`]
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
