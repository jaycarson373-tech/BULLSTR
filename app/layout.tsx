import type { Metadata } from "next";
import { AppPolish } from "./app-polish";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bullstrategy.fun"),
  title: "Ansemification",
  description: "Get Ansemified. Creator fees buy $ANSEM and reward eligible holders.",
  openGraph: {
    title: "Ansemification",
    description: "The trenches asked for a sign. We built the machine.",
    url: "https://bullstrategy.fun",
    siteName: "Ansemification",
    images: [
      {
        url: "/brand/site-preview.png",
        width: 1175,
        height: 1174,
        alt: "Ansemification"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Ansemification",
    description: "Get Ansemified. A meme movement with a live reward dashboard attached.",
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
