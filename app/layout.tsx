import type { Metadata } from "next";
import { AppPolish } from "./app-polish";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bullstrategy.fun"),
  title: "Bull Strategy",
  description: "$ANSEM and SOL rewards for $BULLSTR holders every 5 minutes.",
  openGraph: {
    title: "Bull Strategy",
    description: "$ANSEM and SOL rewards for $BULLSTR holders every 5 minutes.",
    url: "https://bullstrategy.fun",
    siteName: "Bull Strategy",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Bull Strategy",
    description: "$ANSEM and SOL rewards for $BULLSTR holders every 5 minutes."
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
