import type { MetadataRoute } from "next";
import { statSync } from "fs";
import path from "path";
import {
  getAllMovieSlugs,
  getLatestRecommendationBundleMtime,
  getRecommendationJsonMtime,
} from "@/lib/recommendations";
import { getSiteUrl } from "@/lib/site-url";

function appFileMtime(relativePath: string): Date {
  try {
    return statSync(path.join(process.cwd(), relativePath)).mtime;
  } catch {
    return new Date();
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const dataFresh = getLatestRecommendationBundleMtime();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: dataFresh, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/browse`, lastModified: dataFresh, changeFrequency: "weekly", priority: 0.9 },
    {
      url: `${baseUrl}/quiz`,
      lastModified: appFileMtime("src/app/quiz/page.tsx"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/watchlist`,
      lastModified: appFileMtime("src/app/watchlist/page.tsx"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: appFileMtime("src/app/about/page.tsx"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: appFileMtime("src/app/login/page.tsx"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: appFileMtime("src/app/signup/page.tsx"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const movies = getAllMovieSlugs().map((slug) => ({
    url: `${baseUrl}/movies-like/${slug}`,
    lastModified: getRecommendationJsonMtime(slug),
    changeFrequency: "weekly" as const,
    priority: 0.95,
  }));

  return [...staticRoutes, ...movies];
}
