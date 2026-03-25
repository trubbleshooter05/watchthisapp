import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Quiz",
  description: "What should I watch? — coming soon on WatchThis.",
};

export default function QuizPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 text-center">
      <h1 className="font-display text-3xl font-bold mb-4">What should I watch?</h1>
      <p className="text-[#9CA3AF] leading-relaxed mb-8">
        The interactive quiz is on the roadmap (Week 3 in our launch plan). For now, browse{" "}
        <Link href="/browse" className="text-amber-500 hover:underline">
          all recommendation pages
        </Link>{" "}
        or pick a popular title from the homepage.
      </p>
    </main>
  );
}
