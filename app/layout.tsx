import type { Metadata } from "next";
import { AppPolish } from "./app-polish";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ansemstrategy.com"),
  title: "ANSEM STRATEGY",
  description: "$ANSTR is an automated strategy built around growing the Black Bull economy.",
  openGraph: {
    title: "ANSEM STRATEGY",
    description: "$ANSTR is an automated strategy built around growing the Black Bull economy.",
    url: "https://ansemstrategy.com",
    siteName: "ANSEM STRATEGY",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "ANSEM STRATEGY",
    description: "$ANSTR is an automated strategy built around growing the Black Bull economy."
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
