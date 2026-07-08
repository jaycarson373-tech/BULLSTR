import type { Metadata } from "next";
import { AppPolish } from "./app-polish";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://begwork.xyz"),
  title: "Begwork",
  description: "Begwork routes creator fees through a 50/50 reward system for $BEG.",
  openGraph: {
    title: "Begwork",
    description: "Begwork routes creator fees through a 50/50 reward system for $BEG.",
    url: "https://begwork.xyz",
    siteName: "Begwork",
    images: [
      {
        url: "https://begwork.xyz/logo.png",
        width: 1200,
        height: 630,
        alt: "Begwork"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Begwork",
    description: "Begwork routes creator fees through a 50/50 reward system for $BEG.",
    images: ["https://begwork.xyz/logo.png"]
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
