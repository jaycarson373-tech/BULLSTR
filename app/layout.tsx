import type { Metadata } from "next";
import { AppPolish } from "./app-polish";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bullstrategy.fun"),
  title: "Ansemifying",
  description: "Upload any profile picture and instantly Ansemify it.",
  openGraph: {
    title: "Ansemifying",
    description: "Upload a PFP. Become Ansem.",
    url: "https://bullstrategy.fun",
    siteName: "Ansemification",
    images: [
      {
        url: "/brand/site-preview.png",
        width: 1254,
        height: 1254,
        alt: "Ansemifying"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Ansemifying",
    description: "Upload any profile picture and instantly Ansemify it.",
    images: ["/brand/site-preview.png"]
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
