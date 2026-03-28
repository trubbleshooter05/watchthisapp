"use client";

import { useState } from "react";
import Link from "next/link";
import { MovieSearch, type MovieEntry } from "@/components/MovieSearch";

type BrowseMovie = MovieEntry & { genres: string[] };

type Props = {
  movies: BrowseMovie[];
  initialGenre?: string;
};

const GENRE_CHIPS = [
  { label: "All", value: "" },
  { label: "Romcom", value: "romcom" },
  { label: "Action", value: "action" },
  { label: "Drama", value: "drama" },
  { label: "Thriller", value: "thriller" },
  { label: "Comedy", value: "comedy" },
  { label: "Sci-Fi", value: "scifi" },
  { label: "Crime", value: "crime" },
  { label: "Family", value: "family" },
  { label: "Horror", value: "horror" },
  { label: "Animation", value: "animation" },
] as const;

function normalizeGenreValue(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function matchesGenre(movie: BrowseMovie, term: string): boolean {
  const normalizedTerm = normalizeGenreValue(term);
  if (!normalizedTerm) return true;

  const normalizedGenres = movie.genres.map(normalizeGenreValue);
  if (normalizedTerm === "romcom") {
    return normalizedGenres.includes("romance") && normalizedGenres.includes("comedy");
  }
  if (normalizedTerm === "scifi") {
    return (
      normalizedGenres.includes("sciencefiction") ||
      normalizedGenres.includes("scifi")
    );
  }
  return normalizedGenres.some((genre) => genre.includes(normalizedTerm));
}

export function BrowseClient({ movies, initialGenre = "" }: Props) {
  const [filtered, setFiltered] = useState<MovieEntry[]>(movies);
  const [genre, setGenre] = useState(initialGenre);

  const displaySlugs = new Set(filtered.map((m) => m.slug));
  const display = movies.filter((m) => displaySlugs.has(m.slug) && matchesGenre(m, genre));

  return (
    <>
      <MovieSearch
        movies={movies}
        placeholder="Filter movies... (e.g. Inception)"
        onFilter={setFiltered}
        className="mb-8 max-w-lg"
      />

      <section className="mb-8">
        <p className="text-xs uppercase tracking-wide text-[#6B7280] mb-2">Genre</p>
        <input
          type="text"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          placeholder="Type a genre (e.g. romcom, drama, action)"
          className="mb-3 w-full max-w-md rounded-full border border-white/15 bg-[#1a1a1a] px-4 py-2.5 text-sm text-[#FAFAFA] placeholder-[#6B7280] focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors"
        />
        <div className="flex flex-wrap gap-2">
          {GENRE_CHIPS.map((chip) => {
            const active = normalizeGenreValue(genre) === normalizeGenreValue(chip.value);
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => setGenre(chip.value)}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-amber-500 text-[#0F0F0F] font-medium"
                    : "bg-white/5 text-[#9CA3AF] hover:bg-white/10 hover:text-[#FAFAFA]"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </section>

      {display.length === 0 ? (
        <p className="text-[#6B7280] text-sm italic py-8">
          No matches yet for that movie/genre combo. Try another genre or clear filters.
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
