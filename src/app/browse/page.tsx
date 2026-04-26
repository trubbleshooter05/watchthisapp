import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EditorialAttribution } from "@/components/EditorialAttribution";
import { BrowseClient } from "@/components/BrowseClient";
import { getProjectFileMtimeIso } from "@/lib/editorial-meta";
import { getAllMovieSlugs, getRecommendationBundle } from "@/lib/recommendations";
import { getSiteUrl } from "@/lib/site-url";

const browseUpdatedIso = getProjectFileMtimeIso("src/app/browse/page.tsx");

export const metadata: Metadata = {
  title: "Browse",
  description: "All movies-like recommendation pages on MoviesLike (movieslike.app).",
  alternates: { canonical: `${getSiteUrl()}/browse` },
  robots: { index: false, follow: true },
};

type BrowsePageProps = {
  searchParams?: { genre?: string };
};

export default function BrowsePage({ searchParams }: BrowsePageProps) {
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
      <Suspense
        fallback={
          <div className="rounded-xl border border-white/10 bg-[#141414]/50 p-8 animate-pulse text-sm text-[#6B7280]">
            Loading browse filters…
          </div>
        }
      >
        <BrowseClient movies={movies} initialGenre={initialGenre} />
      </Suspense>

      <p className="mt-12 text-sm text-[#6B7280] max-w-xl">
        Shortlist:{" "}
        <Link href="/movies-like/top-gun-maverick" className="text-amber-500 hover:text-amber-400 transition-colors">
          What to watch after Top Gun: Maverick
        </Link>
        {" · "}
        <Link href="/popular" className="text-amber-500 hover:text-amber-400 transition-colors">
          Popular movie guides
        </Link>
        {" · "}
        <Link href="/blog" className="text-amber-500 hover:text-amber-400 transition-colors">
          Cinematic essays
        </Link>
      </p>

      <EditorialAttribution updatedIso={browseUpdatedIso} />
    </main>
  );
}
