import type { Metadata } from "next";
import { AppPolish } from "./app-polish";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ansemindex6900.com"),
  title: "ANSEM INDEX 6900",
  description: "$AI6900 is an AI-powered attention index tracking the strongest narratives across Crypto Twitter.",
  openGraph: {
    title: "ANSEM INDEX 6900",
    description: "$AI6900 is an AI-powered attention index tracking the strongest narratives across Crypto Twitter.",
    url: "https://ansemindex6900.com",
    siteName: "ANSEM INDEX 6900",
    images: [
      {
        url: "/brand/index-preview.svg",
        width: 1200,
        height: 630,
        alt: "ANSEM INDEX 6900"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "ANSEM INDEX 6900",
    description: "$AI6900 is an AI-powered attention index tracking the strongest narratives across Crypto Twitter.",
    images: ["/brand/index-preview.svg"]
  },
  icons: {
    icon: [
      { url: "/brand/index-icon.svg", type: "image/svg+xml" },
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
