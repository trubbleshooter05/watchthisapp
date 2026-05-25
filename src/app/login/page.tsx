import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Log in",
  description: "MoviesLike account login placeholder.",
  alternates: { canonical: `${getSiteUrl()}/login` },
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:px-6 text-center">
      <h1 className="font-display text-2xl font-bold mb-3">Log in</h1>
      <p className="text-[#9CA3AF] text-sm mb-6">Account login is coming soon.</p>
      <div className="flex items-center justify-center gap-4 text-sm">
        <Link href="/browse" className="text-amber-500 hover:underline">
          Browse by genre
        </Link>
        <span className="text-[#4B5563]">•</span>
        <Link href="/signup" className="text-amber-500 hover:underline">
          Join waitlist
        </Link>
      </div>
    </main>
  );
}
