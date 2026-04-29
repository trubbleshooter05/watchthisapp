import { getRecommendationBundle } from "@/lib/recommendations";

/**
 * High-value programmatic SEO pages: canonical slugs that must stay crawlable,
 * cross-linked, and boosted in the sitemap.
 */
export const SEO_PRIORITY_MOVIE_SLUGS = [
  "top-gun-maverick",
  "interstellar",
  "inception",
  "fight-club",
  "shutter-island",
  "the-dark-knight",
  "pulp-fiction",
  "parasite",
  "get-out",
  "sinners-2025",
  "john-wick",
  "oppenheimer",
  "barbie",
  "saltburn",
  "dune",
  "dune-part-two",
  "spider-man-into-the-spider-verse",
  "avengers-endgame",
  "joker",
  "the-batman",
  "white-chicks",
  "mean-girls",
  "the-notebook",
  "after",
  "twilight",
  "the-conjuring",
  "hereditary",
  "deadpool-and-wolverine",
  "lilo-and-stitch",
  "dungeons-and-dragons-honor-among-thieves",
  "the-mortuary-assistant",
  "snow-white",
  "the-accountant-2",
  "spider-man-brand-new-day",
  "avengers-doomsday",
  "mortal-kombat-ii",
  "the-strangers-chapter-3",
  "a-quiet-place",
  "midsommar",
  "talk-to-me",
  "insidious",
  "the-babadook",
  "us",
  "blade-runner-2049",
  "la-land",
  "whiplash",
  "dunkirk",
  "fury",
  "top-gun",
  "28-days-later",
] as const;

export type SeoPriorityMovieSlug = (typeof SEO_PRIORITY_MOVIE_SLUGS)[number];

export const SEO_PRIORITY_SLUG_SET = new Set<string>(SEO_PRIORITY_MOVIE_SLUGS);

/** Existing recommendation bundles are crawlable; this list only marks boosted/featured pages. */
export function isIndexableMovieGuideSlug(slug: string): boolean {
  return Boolean(getRecommendationBundle(slug));
}

/** Curated priority guides used for featured links and boosted sitemap priority. */
export function getIndexableMovieGuideSlugs(): string[] {
  return SEO_PRIORITY_MOVIE_SLUGS.filter((slug) => Boolean(getRecommendationBundle(slug)));
}

function slugEntropy(slug: string): number {
  return slug.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

/** 3–5 internal links for movies-like pages, rotated so nearby pages aren’t identical sitewide. */
export function pickAlsoLikeSlugs(currentSlug: string, max = 5): string[] {
  const pool = SEO_PRIORITY_MOVIE_SLUGS.filter(
    (s) => s !== currentSlug && getRecommendationBundle(s),
  );
  if (pool.length === 0) return [];

  const cap = Math.min(max, pool.length);
  const want = cap >= 3 ? Math.min(5, cap) : cap;
  const start = slugEntropy(currentSlug) % pool.length;
  const out: string[] = [];
  for (let i = 0; i < want; i++) {
    out.push(pool[(start + i) % pool.length]!);
  }
  return out;
}
