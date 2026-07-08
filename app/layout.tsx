import type { Metadata } from "next";
import { AppPolish } from "./app-polish";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bullstr.xyz"),
  title: "BULLSTR",
  description: "BULLSTR is a black-screen launch site with 50/50 fee rails and begging coded into the loop.",
  openGraph: {
    title: "BULLSTR",
    description: "BULLSTR is a black-screen launch site with 50/50 fee rails and begging coded into the loop.",
    url: "https://bullstr.xyz",
    siteName: "BULLSTR",
    images: [
      {
        url: "https://bullstr.xyz/logo.png",
        width: 1200,
        height: 630,
        alt: "BULLSTR"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "BULLSTR",
    description: "BULLSTR is a black-screen launch site with 50/50 fee rails and begging coded into the loop.",
    images: ["https://bullstr.xyz/logo.png"]
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
