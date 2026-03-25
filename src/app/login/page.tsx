import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:px-6 text-center">
      <h1 className="font-display text-2xl font-bold mb-3">Log in</h1>
      <p className="text-[#9CA3AF] text-sm mb-6">
        NextAuth (Google + email) ships in a later milestone. No accounts are required to read
        recommendations.
      </p>
      <Link href="/signup" className="text-amber-500 hover:underline text-sm">
        Sign up placeholder →
      </Link>
    </main>
  );
}
