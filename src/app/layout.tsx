import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SignalProvider } from "@/components/providers/SignalProvider";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://amgtrading-signals.vercel.app'),
  title: {
    default: "AMG Trading - Advanced Crypto & Forex Trading Signals",
    template: "%s | AMG Trading"
  },
  description: "Professional trading signals for Forex and Cryptocurrency markets with 75%+ accuracy. Get spot and future trading signals with advanced technical analysis.",
  keywords: ["forex signals", "crypto signals", "trading signals", "technical analysis", "spot trading", "futures trading", "AMG Trading", "trading analysis", "forex charts", "crypto charts"],
  authors: [{ name: "AMG Trading Team" }],
  creator: "AMG Trading",
  publisher: "AMG Trading",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: "AMG Trading - Advanced Crypto & Forex Trading Signals",
    description: "Professional trading signals for Forex and Cryptocurrency markets with 75%+ accuracy. Get spot and future trading signals with advanced technical analysis.",
    url: "/",
    siteName: "AMG Trading",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AMG Trading - Advanced Crypto & Forex Trading Signals",
    description: "Professional trading signals for Forex and Cryptocurrency markets with 75%+ accuracy.",
  },
  verification: {
    google: "eSspdILQMJbPNtOUDrnAcK2sZj17ZmoTXlAJP-ccFus",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icon-192.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <SignalProvider>
          {children}
          <Analytics />
        </SignalProvider>
      </body>
    </html>
  );
}

