import type { Metadata } from "next";
import Link from "next/link";
import { getRecommendationBundle } from "@/lib/recommendations";
import { SEO_PRIORITY_MOVIE_SLUGS } from "@/lib/seo-priority-movies";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Popular Movie Guides",
  description: "Top movie recommendation pages for quick crawl discovery.",
  alternates: { canonical: `${getSiteUrl()}/popular` },
};

export default function PopularPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-bold mb-3">Popular Movie Guides</h1>
      <p className="text-[#9CA3AF] mb-8">
        Browse top movie recommendation pages. These links help visitors and search engines discover
        our most important guides.
      </p>
      <ul className="space-y-2">
        {SEO_PRIORITY_MOVIE_SLUGS.map((slug) => {
          const bundle = getRecommendationBundle(slug);
          const label = bundle?.sourceMovie.title ?? slug.replace(/-/g, " ");
          const href = `/movies-like/${slug}`;
          return (
            <li key={slug}>
              <Link href={href} className="text-amber-500 hover:underline">
                Movies like {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
