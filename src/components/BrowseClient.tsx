"use client";

import { useState } from "react";
import Link from "next/link";
import { MovieSearch, type MovieEntry } from "@/components/MovieSearch";

type BrowseMovie = MovieEntry & { genres: string[] };

type Props = {
  movies: BrowseMovie[];
};

export function BrowseClient({ movies }: Props) {
  const [filtered, setFiltered] = useState<MovieEntry[]>(movies);

  const displaySlugs = new Set(filtered.map((m) => m.slug));
  const display = movies.filter((m) => displaySlugs.has(m.slug));

  return (
    <>
      <MovieSearch
        movies={movies}
        placeholder="Filter movies... (e.g. Inception)"
        onFilter={setFiltered}
        className="mb-8 max-w-lg"
      />

      {display.length === 0 ? (
        <p className="text-[#6B7280] text-sm italic py-8">
          We don&apos;t have that movie yet — but we&apos;re adding new ones every week.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {display.map((movie) => (
            <li key={movie.slug}>
              <Link
                href={`/movies-like/${movie.slug}`}
                className="flex flex-col rounded-xl border border-white/10 bg-[#141414] px-4 py-4 hover:border-amber-500/30 transition-colors h-full"
              >
                <span className="text-xs text-amber-500/90 font-medium">Movies like</span>
                <span className="font-display font-semibold text-lg text-[#FAFAFA]">{movie.title}</span>
                {movie.genres.length > 0 && (
                  <span className="text-xs text-[#6B7280] mt-2">{movie.genres.join(" · ")}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
