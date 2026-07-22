import type { Metadata } from "next";
import { brand } from "./brand";
import "./globals.css";

const siteDescription = `${brand.tagline} ${brand.secondaryTagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(brand.siteUrl),
  title: `${brand.name} | ${brand.descriptor}`,
  description: siteDescription,
  alternates: {
    canonical: brand.siteUrl
  },
  openGraph: {
    title: `${brand.name} | ${brand.descriptor}`,
    description: siteDescription,
    url: brand.siteUrl,
    siteName: brand.name,
    images: [
      {
        url: `${brand.siteUrl}${brand.ogPath}`,
        width: 1280,
        height: 500,
        alt: `${brand.displayName} banner`
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.name} | ${brand.descriptor}`,
    description: siteDescription,
    images: [`${brand.siteUrl}${brand.ogPath}`]
  },
  icons: {
    icon: brand.faviconPath,
    shortcut: brand.faviconPath,
    apple: brand.faviconPath
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
