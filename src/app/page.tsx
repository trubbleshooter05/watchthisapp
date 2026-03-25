import Link from "next/link";
import { AllMovieGuideLinks } from "@/components/AllMovieGuideLinks";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="max-w-2xl">
        <p className="text-amber-500 font-medium text-sm mb-3">AI + streaming data</p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-balance mb-6">
          Find your next favorite movie
        </h1>
        <p className="text-lg text-[#9CA3AF] text-pretty leading-relaxed mb-10">
          Curated &quot;movies like [title]&quot; pages with match scores, why you&apos;ll love each
          pick, and where to watch in the US—built for discovery, not endless scrolling.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/browse"
            className="inline-flex rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-[#0F0F0F] hover:bg-amber-400 transition-colors"
          >
            Browse all pages
          </Link>
          <Link
            href="/quiz"
            className="inline-flex rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-[#FAFAFA] hover:border-amber-500/50 hover:text-amber-500 transition-colors"
          >
            Take the quiz
          </Link>
        </div>
      </div>

      <section className="mt-20">
        <h2 className="font-display text-xl font-semibold mb-2">All movie guides</h2>
        <p className="text-sm text-[#6B7280] mb-6 max-w-2xl">
          Every link below is a real page—helps people and search engines discover all &quot;movies
          like&quot; guides.
        </p>
        <AllMovieGuideLinks />
      </section>
    </main>
  );
}
