import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import type { RecommendationBundle } from "@/lib/types/recommendation";

const DATA_DIR = path.join(process.cwd(), "data", "recommendations");

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
  return `Loved ${sourceTitle}? Here are 10 movies with a similar vibe, match scores, and where to stream them in the US.`;
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
