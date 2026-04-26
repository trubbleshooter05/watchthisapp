import type { Metadata } from "next";
import Link from "next/link";
import { EditorialAttribution } from "@/components/EditorialAttribution";
import { getProjectFileMtimeIso } from "@/lib/editorial-meta";
import { getRecommendationBundle } from "@/lib/recommendations";
import { SEO_PRIORITY_MOVIE_SLUGS } from "@/lib/seo-priority-movies";
import { getSiteUrl } from "@/lib/site-url";

const baseUrl = getSiteUrl();
const popularModifiedIso = getProjectFileMtimeIso("src/app/popular/page.tsx");

const FRESH_POPULAR_GUIDES = [
  { slug: "deadpool-and-wolverine", anchor: "R-rated superhero chaos after Deadpool & Wolverine" },
  { slug: "lilo-and-stitch", anchor: "warm family adventures like Lilo & Stitch" },
  { slug: "snow-white", anchor: "storybook fantasy picks like Snow White" },
  { slug: "the-accountant-2", anchor: "tactical action thrillers like The Accountant 2" },
  { slug: "spider-man-brand-new-day", anchor: "new Spider-Man follow-up searches" },
  { slug: "avengers-doomsday", anchor: "big ensemble superhero movies like Avengers: Doomsday" },
  { slug: "mortal-kombat-ii", anchor: "martial-arts action like Mortal Kombat II" },
  { slug: "dungeons-and-dragons-honor-among-thieves", anchor: "fantasy quests like Dungeons & Dragons" },
  { slug: "the-mortuary-assistant", anchor: "occult horror like The Mortuary Assistant" },
  { slug: "the-strangers-chapter-3", anchor: "home-invasion horror like The Strangers: Chapter 3" },
] as const;

export const metadata: Metadata = {
  title: "Popular Movie Guides",
  description: "Top movie recommendation pages for quick crawl discovery.",
  alternates: { canonical: `${baseUrl}/popular` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Popular Movie Guides",
    url: `${baseUrl}/popular`,
    type: "website",
  },
};

export default function PopularPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-bold mb-3">Popular Movie Guides</h1>
      <p className="text-[#9CA3AF] mb-8">
        Browse top movie recommendation pages. These links help visitors and search engines discover
        our most important guides. For a high-octane blockbuster line, try{" "}
        <Link href="/movies-like/top-gun-maverick" className="text-amber-500 hover:text-amber-400">
          Top Gun: Maverick–style recommendations
        </Link>
        .
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

      <section className="mt-10 border-t border-white/10 pt-8" aria-labelledby="fresh-popular-heading">
        <h2 id="fresh-popular-heading" className="font-display text-xl font-semibold mb-4">
          Fresh searches gaining traction
        </h2>
        <ul className="space-y-2">
          {FRESH_POPULAR_GUIDES.map(({ slug, anchor }) => (
            <li key={slug}>
              <Link href={`/movies-like/${slug}`} className="text-amber-500 hover:underline">
                {anchor}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-sm text-[#6B7280]">
        Looking for long-form context?{" "}
        <Link href="/blog" className="text-amber-500 hover:text-amber-400 transition-colors">
          Read cinematic essays →
        </Link>
      </p>

      <EditorialAttribution updatedIso={popularModifiedIso} />
    </main>
  );
}
