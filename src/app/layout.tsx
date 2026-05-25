import type { Metadata } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { GoogleAnalyticsInit } from "@/components/google-analytics-init";
import { GoogleAnalytics } from "@/components/google-analytics";
import { AttributionCapture } from "@/components/AttributionCapture";
import { getSiteUrl } from "@/lib/site-url";

const display = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "MoviesLike — Find your next favorite movie",
    template: "%s | MoviesLike",
  },
  description:
    "Curated movie recommendations with streaming links at movieslike.app. Discover what to watch next—movies-like guides for fans searching for their next favorite film.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "MoviesLike",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <GoogleAnalyticsInit />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2012100367550025"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${display.variable} ${body.variable} min-h-screen bg-[#0F0F0F] font-body text-[#FAFAFA] antialiased`}
      >
        <GoogleAnalytics />
        <AttributionCapture />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
