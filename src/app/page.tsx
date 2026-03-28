import Link from "next/link";
import Image from "next/image";
import { getAllMovieSlugs, getRecommendationBundle } from "@/lib/recommendations";
import { MovieSearch } from "@/components/MovieSearch";
import { fetchMovieDetails, posterUrl } from "@/lib/tmdb";

type GenreSpotlight = {
  genre: string;
  query: string;
  movieTitle: string;
  slug: string;
  posterUrl: string | null;
};

const GENRE_QUICK_LINKS = [
  { label: "Romcom", query: "romcom" },
  { label: "Action", query: "action" },
  { label: "Drama", query: "drama" },
  { label: "Thriller", query: "thriller" },
  { label: "Comedy", query: "comedy" },
  { label: "Sci-Fi", query: "scifi" },
  { label: "Crime", query: "crime" },
  { label: "Family", query: "family" },
  { label: "Horror", query: "horror" },
  { label: "Animation", query: "animation" },
] as const;

async function getGenreSpotlights(): Promise<GenreSpotlight[]> {
  const slugs = getAllMovieSlugs();
  const bundles = slugs
    .map((slug) => getRecommendationBundle(slug))
    .filter((bundle): bundle is NonNullable<ReturnType<typeof getRecommendationBundle>> => Boolean(bundle));

  const targets = [
    { genre: "Romcom", query: "romcom", matcher: ["Romance", "Comedy"] },
    { genre: "Action", query: "action", matcher: ["Action"] },
    { genre: "Drama", query: "drama", matcher: ["Drama"] },
    { genre: "Thriller", query: "thriller", matcher: ["Thriller"] },
    { genre: "Comedy", query: "comedy", matcher: ["Comedy"] },
    { genre: "Sci-Fi", query: "scifi", matcher: ["Science Fiction", "Sci-Fi"] },
    { genre: "Crime", query: "crime", matcher: ["Crime"] },
    { genre: "Family", query: "family", matcher: ["Family"] },
    { genre: "Horror", query: "horror", matcher: ["Horror"] },
    { genre: "Animation", query: "animation", matcher: ["Animation"] },
  ] as const;

  const usedSlugs = new Set<string>();
  const picks = targets
    .map((target) => {
      const matches = bundles.filter((bundle) => {
        const genres = bundle.sourceMovie.genres;
        if (target.query === "romcom") {
          return genres.includes("Romance") && genres.includes("Comedy");
        }
        return target.matcher.some((candidate) => genres.includes(candidate));
      });

      const uniquePick =
        matches.find((bundle) => !usedSlugs.has(bundle.sourceMovie.slug)) ?? matches[0] ?? null;
      if (!uniquePick) return null;
      usedSlugs.add(uniquePick.sourceMovie.slug);

      return {
        genre: target.genre,
        query: target.query,
        movieTitle: uniquePick.sourceMovie.title,
        slug: uniquePick.sourceMovie.slug,
        tmdbId: uniquePick.sourceMovie.tmdbId,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const posters = await Promise.all(
    picks.map(async (pick) => {
      const details = await fetchMovieDetails(pick.tmdbId);
      return posterUrl(details?.poster_path ?? null, "w342");
    }),
  );

  return picks.map((pick, index) => ({
    genre: pick.genre,
    query: pick.query,
    movieTitle: pick.movieTitle,
    slug: pick.slug,
    posterUrl: posters[index],
  }));
}

export default async function HomePage() {
  const movies = getAllMovieSlugs()
    .map((slug) => ({
      slug,
      title: getRecommendationBundle(slug)?.sourceMovie.title ?? slug,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base" }));
  const spotlights = await getGenreSpotlights();

  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="max-w-3xl">
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-balance mb-6">
          Find what to watch by genre
        </h1>
        <p className="text-lg text-[#9CA3AF] text-pretty leading-relaxed mb-8">
          Type a movie title or start with genres like romcom, drama, or action.
        </p>

        <MovieSearch movies={movies} className="mb-4" />

        <form action="/browse" className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            name="genre"
            placeholder="Type a genre... (e.g. romcom)"
            className="w-full rounded-full border border-white/15 bg-[#1a1a1a] px-4 py-3 text-sm text-[#FAFAFA] placeholder-[#6B7280] focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors sm:max-w-sm"
          />
          <button
            type="submit"
            className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-5 py-3 text-sm font-medium text-amber-500 hover:bg-amber-500/20 transition-colors"
          >
            Browse genre
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {GENRE_QUICK_LINKS.map((genre) => (
            <Link
              key={genre.query}
              href={`/browse?genre=${encodeURIComponent(genre.query)}`}
              className="rounded-full bg-white/5 px-3 py-1.5 text-sm text-[#D1D5DB] hover:bg-white/10 hover:text-[#FAFAFA] transition-colors"
            >
              {genre.label}
            </Link>
          ))}
        </div>
      </div>

      <section className="mt-20">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">Browse by vibe</h2>
          <Link href="/browse" className="text-sm text-amber-500 hover:text-amber-400 transition-colors">
            View full catalog →
          </Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spotlights.map((spotlight) => (
            <li key={`${spotlight.genre}-${spotlight.slug}`}>
              <Link
                href={`/browse?genre=${encodeURIComponent(spotlight.query)}`}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-[#141414] transition-colors hover:border-amber-500/40"
              >
                <div className="relative aspect-[4/5] w-full bg-black/30">
                  {spotlight.posterUrl ? (
                    <Image
                      src={spotlight.posterUrl}
                      alt={`${spotlight.movieTitle} poster`}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#6B7280]">
                      {spotlight.genre}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-500/90">
                    {spotlight.genre}
                  </p>
                  <p className="mt-1 text-sm text-[#D1D5DB]">Try starting with {spotlight.movieTitle}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
