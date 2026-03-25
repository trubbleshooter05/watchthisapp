import type { Metadata } from "next";
import Link from "next/link";
import { getAllMovieSlugs, getRecommendationBundle } from "@/lib/recommendations";

export const metadata: Metadata = {
  title: "Browse",
  description: "All movies-like recommendation pages on WatchThis.",
};

export default function BrowsePage() {
  const slugs = getAllMovieSlugs();

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl font-bold mb-2">Browse</h1>
      <p className="text-[#9CA3AF] mb-10 max-w-xl">
        Every page is a standalone guide: ten recommendations, FAQs, and streaming availability.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {slugs.map((slug) => {
          const b = getRecommendationBundle(slug);
          const title = b?.sourceMovie.title ?? slug;
          const genres = b?.sourceMovie.genres ?? [];
          return (
            <li key={slug}>
              <Link
                href={`/movies-like/${slug}`}
                className="flex flex-col rounded-xl border border-white/10 bg-[#141414] px-4 py-4 hover:border-amber-500/30 transition-colors h-full"
              >
                <span className="text-xs text-amber-500/90 font-medium">Movies like</span>
                <span className="font-display font-semibold text-lg text-[#FAFAFA]">{title}</span>
                {genres.length > 0 && (
                  <span className="text-xs text-[#6B7280] mt-2">{genres.join(" · ")}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
