import { existsSync, readFileSync } from "fs";
import path from "path";

export type SitemapIndexedPathsFile = {
  enabled?: boolean;
  paths?: string[];
};

/** Normalize pathname for comparison: leading slash, no trailing slash except root. */
export function normalizeSitemapPath(p: string): string {
  let s = p.trim();
  if (!s.startsWith("/")) s = `/${s}`;
  s = s.replace(/\/+/g, "/");
  if (s.length > 1) s = s.replace(/\/$/, "");
  return s || "/";
}

/**
 * When `data/sitemap-indexed-paths.json` has `"enabled": true`, sitemap should only list
 * URLs whose pathnames appear in `paths` (populate from GSC → indexed URLs).
 * Set `"enabled": false` to restore listing all routes (movies-like, blog posts, etc.).
 */
export function getSitemapIndexedAllowlist(): {
  restrict: boolean;
  allowedPaths: Set<string>;
} {
  const filePath = path.join(process.cwd(), "data/sitemap-indexed-paths.json");
  if (!existsSync(filePath)) {
    return { restrict: false, allowedPaths: new Set() };
  }
  try {
    const raw = readFileSync(filePath, "utf8");
    const data = JSON.parse(raw) as SitemapIndexedPathsFile;
    if (data.enabled !== true) {
      return { restrict: false, allowedPaths: new Set() };
    }
    const allowedPaths = new Set(
      (data.paths ?? []).map((p) => normalizeSitemapPath(p)).filter((p) => p.length > 0),
    );
    return { restrict: true, allowedPaths };
  } catch {
    return { restrict: false, allowedPaths: new Set() };
  }
}

export function isPathAllowedForSitemap(
  pathname: string,
  restrict: boolean,
  allowedPaths: Set<string>,
): boolean {
  if (!restrict) return true;
  return allowedPaths.has(normalizeSitemapPath(pathname));
}
