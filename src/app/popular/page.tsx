import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

const popularMovieLinks = [
  "/movies-like/interstellar",
  "/movies-like/midsommar",
  "/movies-like/mean-girls",
  "/movies-like/shutter-island",
  "/movies-like/the-notebook",
  "/movies-like/white-chicks",
  "/movies-like/after",
  "/movies-like/saltburn",
  "/movies-like/get-out",
  "/movies-like/parasite",
  "/movies-like/gone-girl",
  "/movies-like/the-dark-knight",
  "/movies-like/pulp-fiction",
  "/movies-like/fight-club",
  "/movies-like/inception",
  "/movies-like/hereditary",
  "/movies-like/the-conjuring",
  "/movies-like/john-wick",
  "/movies-like/barbie",
  "/movies-like/oppenheimer",
] as const;

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
        {popularMovieLinks.map((href) => (
          <li key={href}>
            <a href={href} className="text-amber-500 hover:underline">
              {href.replace("/movies-like/", "Movies like ").replace(/-/g, " ")}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
