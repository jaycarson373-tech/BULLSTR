import type { Metadata } from "next";
import { AppPolish } from "./app-polish";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hood6900.xyz"),
  title: "HOOD6900",
  description: "The memecoin of the Hood. Robinhood built the chain. The trenches built the meme.",
  openGraph: {
    title: "HOOD6900",
    description: "Every 5 minutes creator fees buy back HOOD. 100% airdrops to 100K+ holders. 0% side fund.",
    url: "https://hood6900.xyz",
    siteName: "HOOD6900",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "HOOD6900",
    description: "The memecoin of the Hood."
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
