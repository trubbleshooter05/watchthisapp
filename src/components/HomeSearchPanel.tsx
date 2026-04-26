"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MovieSearch, type MovieEntry } from "@/components/MovieSearch";

type Props = {
  movies: MovieEntry[];
};

export function HomeSearchPanel({ movies }: Props) {
  const router = useRouter();
  const [genre, setGenre] = useState("");
  const [genreError, setGenreError] = useState("");
  const [genrePending, startGenreTransition] = useTransition();

  function submitGenre(e: React.FormEvent) {
    e.preventDefault();
    const g = genre.trim();
    if (!g) {
      setGenreError("Enter a genre (e.g. sci-fi, horror) or use a quick link below.");
      return;
    }
    setGenreError("");
    startGenreTransition(() => {
      router.push(`/browse?genre=${encodeURIComponent(g)}`);
    });
  }

  return (
    <div className="space-y-10">
      <div className="rounded-2xl border border-amber-500/35 bg-gradient-to-b from-amber-500/[0.07] to-transparent p-5 sm:p-6 ring-1 ring-amber-500/15">
        <label
          htmlFor="home-movie-search"
          className="block text-sm font-semibold text-[#FAFAFA] mb-2"
        >
          Search for a movie you like
        </label>
        <p className="text-xs text-[#9CA3AF] mb-3 max-w-xl">
          Jump straight to a curated &quot;movies like&quot; guide—same list you&apos;ll see on the next
          page.
        </p>
        <MovieSearch
          id="home-movie-search"
          movies={movies}
          placeholder='Try "Interstellar", "Parasite", or "Top Gun Maverick"'
          className="max-w-xl"
        />
      </div>

      <div>
        <label htmlFor="home-genre-browse" className="block text-sm font-semibold text-[#FAFAFA] mb-2">
          Browse by genre
        </label>
        <p className="text-xs text-[#9CA3AF] mb-3 max-w-xl">
          Secondary path—filter the full catalog on the browse page.
        </p>
        <form onSubmit={submitGenre} className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1 max-w-md space-y-1">
            <input
              id="home-genre-browse"
              type="text"
              name="genre"
              value={genre}
              onChange={(e) => {
                setGenre(e.target.value);
                if (genreError) setGenreError("");
              }}
              placeholder="Browse by genre (e.g. sci-fi, horror)"
              disabled={genrePending}
              className="w-full rounded-full border border-white/15 bg-[#1a1a1a] px-4 py-3 text-sm text-[#FAFAFA] placeholder-[#6B7280] focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors disabled:opacity-60"
              aria-invalid={Boolean(genreError)}
              aria-describedby={genreError ? "home-genre-error" : undefined}
            />
            {genreError ? (
              <p id="home-genre-error" className="text-sm text-amber-400/95 pl-1">
                {genreError}
              </p>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={!genre.trim() || genrePending}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-[#D1D5DB] hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-500 transition-colors disabled:pointer-events-none disabled:opacity-45"
          >
            {genrePending ? (
              <>
                <span
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-500"
                  aria-hidden
                />
                Opening browse…
              </>
            ) : (
              "Browse genre"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
