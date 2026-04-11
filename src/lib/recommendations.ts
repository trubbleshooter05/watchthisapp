import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import type { RecommendationBundle } from "@/lib/types/recommendation";

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

export function getSeoTitle(sourceTitle: string): string {
  return `10 Movies Like ${sourceTitle} (If You Loved It)`;
}

export function getSeoDescription(sourceTitle: string): string {
  return `Looking for movies like ${sourceTitle}? Here are 10 similar films with the same vibe, themes, and style.`;
}

export function filterExistingRelatedSlugs(related: string[]): string[] {
  const valid = new Set(getAllMovieSlugs());
  return related.filter((s) => valid.has(s));
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
