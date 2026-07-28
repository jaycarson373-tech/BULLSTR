import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cryptocat.fun";
const SITE_DESCRIPTION =
  "CryptoCat is an on-chain AI treasury persona for CC holders: terminal posts, bounty prompts, treasury actions, and loyal-holder experiments.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "CryptoCat | CC",
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "CryptoCat | CC",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "CryptoCat",
    images: [
      {
        url: `${SITE_URL}/og.svg`,
        width: 1200,
        height: 630,
        alt: "CryptoCat"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "CryptoCat | CC",
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
