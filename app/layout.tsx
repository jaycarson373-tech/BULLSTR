import type { Metadata } from "next";
import { AppPolish } from "./app-polish";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ai6900.xyz"),
  title: "ANSEM INDEX 6900",
  description: "$AI6900 is the ANSEM INDEX: ANSEM rewards for AI6900 holders and AI6900 rewards for top ANSEM holders.",
  openGraph: {
    title: "ANSEM INDEX 6900",
    description: "$AI6900 is the ANSEM INDEX: ANSEM rewards for AI6900 holders and AI6900 rewards for top ANSEM holders.",
    url: "https://ai6900.xyz",
    siteName: "ANSEM INDEX 6900",
    images: [
      {
        url: "https://ai6900.xyz/brand/index-preview.png",
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
    description: "$AI6900 is the ANSEM INDEX: ANSEM rewards for AI6900 holders and AI6900 rewards for top ANSEM holders.",
    images: ["https://ai6900.xyz/brand/index-preview.png"]
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
