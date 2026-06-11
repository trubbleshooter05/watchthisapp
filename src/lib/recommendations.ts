import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import type { RecommendationBundle } from "@/lib/types/recommendation";
import { generateTitle, generateDescription } from "@/lib/seo/ctr";

const DATA_DIR = path.join(process.cwd(), "data", "recommendations");

/** Alternate slugs / search strings → canonical JSON filename. Safe: only maps to existing bundles. */
export const MOVIE_SLUG_ALIASES: Record<string, string> = {
  "dune-2": "dune-part-two",
  "dune-part-2": "dune-part-two",
  "dune-2-part-two": "dune-part-two",
  "batman-2022": "the-batman",
  "the-batman-2022": "the-batman",
  "avengers-4": "avengers-endgame",
  "spider-verse": "spider-man-into-the-spider-verse",
  "into-the-spider-verse": "spider-man-into-the-spider-verse",
};

export function getAllMovieSlugs(): string[] {
  try {
    return readdirSync(DATA_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}

export function getRecommendationBundle(slug: string): RecommendationBundle | null {
  try {
    const raw = readFileSync(path.join(DATA_DIR, `${slug}.json`), "utf-8");
    return JSON.parse(raw) as RecommendationBundle;
  } catch {
    return null;
  }
}

export function getSeoTitle(sourceTitle: string, recommendationCount?: number): string {
  return generateTitle(sourceTitle, recommendationCount);
}

export function getSeoDescription(sourceTitle: string, recommendationCount?: number): string {
  return generateDescription(sourceTitle, recommendationCount);
}

export function filterExistingRelatedSlugs(related: string[]): string[] {
  const valid = new Set(getAllMovieSlugs());
  return related.filter((s) => valid.has(s));
}

/** TMDB id of each bundle’s source film → canonical movies-like slug (lazy-built). */
let sourceTmdbToSlugCache: Map<number, string> | null = null;

export function getGuideSlugForSourceTmdbId(tmdbId: number): string | null {
  if (!sourceTmdbToSlugCache) {
    sourceTmdbToSlugCache = new Map();
    for (const s of getAllMovieSlugs()) {
      const b = getRecommendationBundle(s);
      if (b) sourceTmdbToSlugCache.set(b.sourceMovie.tmdbId, s);
    }
  }
  return sourceTmdbToSlugCache.get(tmdbId) ?? null;
}

/**
 * Internal “continue watching” targets for a recommendation row: sibling picks that have their own
 * guide pages first, then related guides, then sitewide also-like filler.
 */
export function buildContinueWatchingLinks(
  currentPageSlug: string,
  recommendations: Array<{ tmdbId: number }>,
  currentTmdbId: number,
  relatedSlugs: string[],
  fillerSlugs: string[],
  max = 3,
): { slug: string; title: string }[] {
  const out: { slug: string; title: string }[] = [];
  const seen = new Set<string>();

  for (const o of recommendations) {
    if (o.tmdbId === currentTmdbId) continue;
    const slug = getGuideSlugForSourceTmdbId(o.tmdbId);
    if (slug && slug !== currentPageSlug && !seen.has(slug)) {
      const b = getRecommendationBundle(slug);
      if (b) {
        out.push({ slug, title: b.sourceMovie.title });
        seen.add(slug);
      }
    }
    if (out.length >= max) return out;
  }

  for (const s of [...relatedSlugs, ...fillerSlugs]) {
    if (!s || s === currentPageSlug || seen.has(s)) continue;
    const b = getRecommendationBundle(s);
    if (b) {
      out.push({ slug: s, title: b.sourceMovie.title });
      seen.add(s);
    }
    if (out.length >= max) return out;
  }

  return out;
}

/** For sitemap lastmod — updates when that page’s recommendation JSON changes. */
export function getRecommendationJsonMtime(slug: string): Date {
  try {
    return statSync(path.join(DATA_DIR, `${slug}.json`)).mtime;
  } catch {
    return new Date();
  }
}

/** Newest mtime among all recommendation JSON files (home / browse “content” freshness). */
export function getLatestRecommendationBundleMtime(): Date {
  try {
    const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
    let maxMs = 0;
    for (const f of files) {
      const ms = statSync(path.join(DATA_DIR, f)).mtimeMs;
      if (ms > maxMs) maxMs = ms;
    }
    return maxMs > 0 ? new Date(maxMs) : new Date();
  } catch {
    return new Date();
  }
}
