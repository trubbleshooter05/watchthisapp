import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Watchlist",
  description: "Your saved movies — coming soon.",
  alternates: { canonical: `${getSiteUrl()}/watchlist` },
  robots: { index: true, follow: true },
};

export default function WatchlistPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:px-6 text-center">
      <h1 className="font-display text-2xl font-bold mb-3">Your watchlist</h1>
      <p className="text-[#9CA3AF] text-sm mb-6">
        Saved titles will live here once accounts and a database are wired up.
      </p>
      <Link href="/browse" className="text-amber-500 hover:underline text-sm">
        Browse recommendations →
      </Link>
    </main>
  );
}
