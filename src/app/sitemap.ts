import type { MetadataRoute } from "next";
import { statSync } from "fs";
import path from "path";
import {
  getAllMovieSlugs,
  getLatestRecommendationBundleMtime,
  getRecommendationJsonMtime,
} from "@/lib/recommendations";
import { SEO_PRIORITY_SLUG_SET } from "@/lib/seo-priority-movies";
import { getAllBlogSlugs } from "@/lib/blog-utils";
import { getSiteUrl } from "@/lib/site-url";
import { getAllMovieCollectionSlugs } from "@/lib/movie-collections";

function appFileMtime(relativePath: string): Date {
  try {
    return statSync(path.join(process.cwd(), relativePath)).mtime;
  } catch {
    return new Date();
  }
}

function toUrl(baseUrl: string, pathname: string): string {
  if (pathname === "/") return baseUrl;
  return `${baseUrl}${pathname}`;
}

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const dataFresh = getLatestRecommendationBundleMtime();

  const staticPathEntries: Array<{
    path: string;
    lastModified: Date;
    changeFrequency: ChangeFrequency;
    priority: number;
  }> = [
    { path: "/", lastModified: dataFresh, changeFrequency: "daily", priority: 1 },
    {
      path: "/blog",
      lastModified: appFileMtime("src/app/blog/page.tsx"),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      path: "/popular",
      lastModified: appFileMtime("src/app/popular/page.tsx"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      path: "/best-revenge-movies-like-kill-bill",
      lastModified: appFileMtime("src/app/best-revenge-movies-like-kill-bill/page.tsx"),
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      path: "/best-brutal-gory-horror-movies",
      lastModified: appFileMtime("src/app/best-brutal-gory-horror-movies/page.tsx"),
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      path: "/quiz",
      lastModified: appFileMtime("src/app/quiz/page.tsx"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      path: "/about",
      lastModified: appFileMtime("src/app/about/page.tsx"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      path: "/privacy",
      lastModified: appFileMtime("src/app/privacy/page.tsx"),
      changeFrequency: "yearly",
      priority: 0.25,
    },
    {
      path: "/terms",
      lastModified: appFileMtime("src/app/terms/page.tsx"),
      changeFrequency: "yearly",
      priority: 0.25,
    },
  ];

  const staticRoutes: MetadataRoute.Sitemap = staticPathEntries.map((e) => ({
    url: toUrl(baseUrl, e.path),
    lastModified: e.lastModified,
    changeFrequency: e.changeFrequency,
    priority: e.priority,
  }));

  const moviePathEntries = getAllMovieSlugs().map((slug) => ({
    path: `/movies-like/${slug}` as const,
    lastModified: getRecommendationJsonMtime(slug),
    changeFrequency: "weekly" as const,
    // Tiered priority: hand-curated (1.0) > standard (0.8) > forge/programmatic (0.6)
    priority: SEO_PRIORITY_SLUG_SET.has(slug) ? 1 : 0.6,
  }));

  const movies: MetadataRoute.Sitemap = moviePathEntries.map((e) => ({
    url: toUrl(baseUrl, e.path),
    lastModified: e.lastModified,
    changeFrequency: e.changeFrequency,
    priority: e.priority,
  }));

  const essayPathEntries = getAllBlogSlugs().map((slug) => ({
    path: `/blog/${slug}` as const,
    lastModified: appFileMtime(`src/content/blog/${slug}.mdx`),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const essays: MetadataRoute.Sitemap = essayPathEntries.map((e) => ({
    url: toUrl(baseUrl, e.path),
    lastModified: e.lastModified,
    changeFrequency: e.changeFrequency,
    priority: e.priority,
  }));

  const collections: MetadataRoute.Sitemap = getAllMovieCollectionSlugs().map((slug) => ({
    url: toUrl(baseUrl, `/collections/${slug}`),
    lastModified: appFileMtime("src/lib/movie-collections.ts"),
    changeFrequency: "weekly" as const,
    priority: 0.82,
  }));

  return [...staticRoutes, ...movies, ...essays, ...collections];
}
