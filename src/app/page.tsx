import Link from "next/link";
import { getAllMovieSlugs, getRecommendationBundle } from "@/lib/recommendations";

export default function HomePage() {
  const slugs = getAllMovieSlugs();

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
        <h2 className="font-display text-xl font-semibold mb-6">Popular picks</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {slugs.slice(0, 9).map((slug) => {
            const b = getRecommendationBundle(slug);
            const title = b?.sourceMovie.title ?? slug;
            return (
              <li key={slug}>
                <Link
                  href={`/movies-like/${slug}`}
                  className="block rounded-xl border border-white/10 bg-[#141414] px-4 py-4 hover:border-amber-500/30 transition-colors"
                >
                  <span className="text-amber-500/90 text-xs font-medium">Movies like</span>
                  <span className="block font-display font-semibold text-[#FAFAFA] mt-0.5">{title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
