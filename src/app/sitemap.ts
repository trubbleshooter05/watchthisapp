import type { MetadataRoute } from "next";
import { getAllMovieSlugs } from "@/lib/recommendations";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/browse`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/quiz`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/watchlist`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const movies = getAllMovieSlugs().map((slug) => ({
    url: `${base}/movies-like/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.95,
  }));

  return [...staticRoutes, ...movies];
}
