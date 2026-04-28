"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!res.ok) {
        setError("We couldn't save that email. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("We couldn't save that email. Please try again.");
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-20 sm:px-6 text-center">
      {submitted ? (
        <div className="space-y-4">
          <div className="text-4xl mb-4">🎬</div>
          <h1 className="font-display text-2xl font-bold text-[#FAFAFA]">
            You&apos;re on the list!
          </h1>
          <p className="text-[#9CA3AF] leading-relaxed">
            We&apos;ll send a weekly shortlist of movies worth watching and where to stream them.
          </p>
          <div className="pt-4">
            <Link
              href="/browse"
              className="inline-flex rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-[#0F0F0F] hover:bg-amber-400 transition-colors"
            >
              Browse 2,000+ movie guides →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#FAFAFA] mb-3">
              Get notified when watchlists launch
            </h1>
            <p className="text-[#9CA3AF] leading-relaxed text-sm">
              We&apos;re building personalized watchlists and movie tracking. Drop your email and
              we&apos;ll let you know when it&apos;s ready.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="your@email.com"
              className="w-full rounded-full border border-white/15 bg-[#1a1a1a] px-5 py-3 text-sm text-[#FAFAFA] placeholder-[#6B7280] focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors"
              aria-label="Email address"
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-[#0F0F0F] hover:bg-amber-400 transition-colors"
            >
              Notify me
            </button>
          </form>

          <p className="text-[#6B7280] text-xs">No spam. Unsubscribe any time.</p>

          <div className="border-t border-white/10 pt-6">
            <p className="text-sm text-[#9CA3AF]">
              In the meantime, browse 2,000+ movie recommendation pages{" "}
              <Link href="/browse" className="text-amber-500 hover:underline">
                →
              </Link>
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
