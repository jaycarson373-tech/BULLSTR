import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://bullstr.vercel.app";
const PROJECT_NAME = "Near Strategy";
const SOURCE_SYMBOL = "NSTR";
const SITE_DESCRIPTION =
  "Near Strategy (NSTR): a NEAR ecosystem thesis with five-minute creator-fee reward design and consecutive-hold weights.";

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
        url: `${SITE_URL}/og-nstr.svg`,
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
    images: [`${SITE_URL}/og-nstr.svg`]
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
