import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Quiz",
  description: "What should I watch? — coming soon on WatchThis.",
  alternates: { canonical: `${getSiteUrl()}/quiz` },
  robots: { index: true, follow: true },
};

export default function QuizPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 text-center">
      <h1 className="font-display text-3xl font-bold mb-4">What should I watch?</h1>
      <p className="text-[#9CA3AF] leading-relaxed mb-8">
        The interactive quiz is on the roadmap. For now, browse{" "}
        <Link href="/browse" className="text-amber-500 hover:underline">
          all recommendation pages
        </Link>
        , see{" "}
        <Link href="/popular" className="text-amber-500 hover:underline">
          popular movie guides
        </Link>
        . Action fans can start with{" "}
        <Link href="/movies-like/top-gun-maverick" className="text-amber-500 hover:underline">
          blockbuster follow-ups to Top Gun: Maverick
        </Link>
        , or pick a title from the homepage.
      </p>
    </main>
  );
}
