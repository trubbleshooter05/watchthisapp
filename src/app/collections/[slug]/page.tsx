import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllMovieCollectionSlugs,
  getCollectionMovieLinks,
  getMovieCollection,
} from "@/lib/movie-collections";
import { getSiteUrl } from "@/lib/site-url";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return getAllMovieCollectionSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const collection = getMovieCollection(params.slug);
  if (!collection) return {};
  const url = `${getSiteUrl()}/collections/${collection.slug}`;
  return {
    title: `${collection.title} | MoviesLike`,
    description: collection.description,
    alternates: { canonical: url },
    openGraph: {
      title: collection.title,
      description: collection.description,
      url,
      type: "article",
    },
  };
}

export default function MovieCollectionPage({ params }: Props) {
  const collection = getMovieCollection(params.slug);
  if (!collection) notFound();

  const movies = getCollectionMovieLinks(collection);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-500/90">
        Curated movie path
      </p>
      <h1 className="font-display text-3xl font-bold tracking-tight text-[#FAFAFA] sm:text-4xl">
        {collection.h1}
      </h1>
      <p className="mt-4 max-w-3xl text-[#9CA3AF]">{collection.intro}</p>
      <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-100/90">
        {collection.redditSignal}
      </p>

      <section className="mt-10 grid gap-4">
        {movies.map((movie, index) => (
          <article key={movie.slug} className="rounded-2xl border border-white/10 bg-[#141414] p-5">
            <div className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-[#0F0F0F]">
                {index + 1}
              </span>
              <div>
                <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">
                  <Link href={`/movies-like/${movie.slug}`} className="hover:text-amber-400">
                    Movies like {movie.title}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-[#6B7280]">
                  {movie.year} {movie.genres.length ? `• ${movie.genres.slice(0, 3).join(", ")}` : ""}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#D1D5DB]">{movie.description}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-12 border-t border-white/10 pt-8">
        <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">Keep browsing by mood</h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {collection.related.map((slug) => {
            const related = getMovieCollection(slug);
            if (!related) return null;
            return (
              <li key={slug}>
                <Link
                  href={`/collections/${slug}`}
                  className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-amber-500 hover:border-amber-500/50 hover:bg-amber-500/10"
                >
                  {related.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
