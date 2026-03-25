import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:px-6 text-center">
      <h1 className="font-display text-2xl font-bold mb-3">Create a free account</h1>
      <p className="text-[#9CA3AF] text-sm mb-6">
        Watchlists and personalized picks are coming with NextAuth + PostgreSQL. For now, bookmark
        your favorite &quot;movies like&quot; pages in your browser.
      </p>
      <Link href="/browse" className="text-amber-500 hover:underline text-sm">
        Browse recommendations →
      </Link>
    </main>
  );
}
