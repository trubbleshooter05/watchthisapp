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
] as const;

export type SeoPriorityMovieSlug = (typeof SEO_PRIORITY_MOVIE_SLUGS)[number];

export const SEO_PRIORITY_SLUG_SET = new Set<string>(SEO_PRIORITY_MOVIE_SLUGS);

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
