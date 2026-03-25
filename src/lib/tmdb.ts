const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE = "https://image.tmdb.org/t/p";

export type TmdbMovieDetails = {
  id: number;
  title: string;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  poster_path: string | null;
  genres: { id: number; name: string }[];
};

export type TmdbProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
};

export type TmdbWatchProvidersResult = {
  results?: {
    US?: {
      flatrate?: TmdbProvider[];
      rent?: TmdbProvider[];
      buy?: TmdbProvider[];
    };
  };
};

function getKey(): string | undefined {
  return process.env.TMDB_API_KEY;
}

/** Shown when poster_url is null (missing env vs bad TMDB response). */
export function posterPlaceholderHint(): string {
  if (!getKey()?.trim()) {
    return process.env.VERCEL
      ? "Add TMDB_API_KEY in Vercel → Settings → Environment Variables (Production), then Redeploy."
      : "Set TMDB_API_KEY in .env.local and restart the dev server.";
  }
  return "No poster from TMDB for this title (invalid ID or API error).";
}

export function posterUrl(posterPath: string | null, size: "w342" | "w500" = "w500"): string | null {
  if (!posterPath) return null;
  return `${TMDB_IMAGE}/${size}${posterPath}`;
}

export async function fetchMovieDetails(tmdbId: number): Promise<TmdbMovieDetails | null> {
  const key = getKey();
  if (!key) return null;
  const res = await fetch(`${TMDB_BASE}/movie/${tmdbId}?api_key=${key}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  return res.json() as Promise<TmdbMovieDetails>;
}

export async function fetchWatchProviders(tmdbId: number): Promise<TmdbWatchProvidersResult | null> {
  const key = getKey();
  if (!key) return null;
  const res = await fetch(`${TMDB_BASE}/movie/${tmdbId}/watch/providers?api_key=${key}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  return res.json() as Promise<TmdbWatchProvidersResult>;
}

export function formatRuntime(minutes: number | null): string | null {
  if (minutes == null || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}
