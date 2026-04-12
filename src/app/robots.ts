import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/movies-like/", "/blog/", "/browse", "/popular"],
        disallow: ["/api", "/admin", "/login", "/signup", "/watchlist", "/.next"],
      },
      {
        userAgent: "AdsBot-Google",
        disallow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
