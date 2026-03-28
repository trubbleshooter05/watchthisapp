import type { Metadata } from "next";
import { getAllMovieSlugs, getRecommendationBundle } from "@/lib/recommendations";
import { BrowseClient } from "@/components/BrowseClient";

export const metadata: Metadata = {
  title: "Browse",
  description: "All movies-like recommendation pages on WatchThis.",
};

type Props = {
  searchParams?: {
    genre?: string;
  };
};

export default function BrowsePage({ searchParams }: Props) {
  const initialGenre = searchParams?.genre?.trim() ?? "";
  const movies = getAllMovieSlugs()
    .map((slug) => ({
      slug,
      title: getRecommendationBundle(slug)?.sourceMovie.title ?? slug,
      genres: getRecommendationBundle(slug)?.sourceMovie.genres ?? [],
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base" }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl font-bold mb-2">Browse by movie or genre</h1>
      <p className="text-[#9CA3AF] mb-8 max-w-xl">
        Pick a genre first, then open any movie page for tailored recommendations.
      </p>
      <BrowseClient movies={movies} initialGenre={initialGenre} />
    </main>
  );
}
