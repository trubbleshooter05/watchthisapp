const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE = "https://image.tmdb.org/t/p";

export type TmdbCredits = {
  cast?: Array<{ id: number; name: string; order: number }>;
  crew?: Array<{ id: number; name: string; job: string }>;
};

export type TmdbMovieDetails = {
  id: number;
  title: string;
  overview?: string;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  vote_count?: number;
  poster_path: string | null;
  genres: { id: number; name: string }[];
  credits?: TmdbCredits;
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

function getTmdbCredential(): string | undefined {
  return process.env.TMDB_API_KEY || process.env.TMDB_READ_ACCESS_TOKEN;
}

function isBearerToken(value: string): boolean {
  return value.startsWith("eyJ") || value.startsWith("Bearer ");
}

function tmdbRequest(pathname: string): RequestInfo {
  const credential = getTmdbCredential()?.trim();
  if (!credential) return `${TMDB_BASE}${pathname}`;

  if (isBearerToken(credential)) {
    return `${TMDB_BASE}${pathname}`;
  }

  const separator = pathname.includes("?") ? "&" : "?";
  return `${TMDB_BASE}${pathname}${separator}api_key=${encodeURIComponent(credential)}`;
}

function tmdbFetchInit(credential: string): RequestInit {
  const init: RequestInit = {
    cache: "no-store",
  };

  if (isBearerToken(credential)) {
    const token = credential.replace(/^Bearer\s+/i, "");
    init.headers = { Authorization: `Bearer ${token}` };
  }

  return init;
}

/** Shown when poster_url is null (missing env vs bad TMDB response). */
export function posterPlaceholderHint(): string {
  if (!getTmdbCredential()?.trim()) {
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
  const credential = getTmdbCredential()?.trim();
  if (!credential) return null;
  const res = await fetch(tmdbRequest(`/movie/${tmdbId}?append_to_response=credits`), tmdbFetchInit(credential));
  if (!res.ok) return null;
  return res.json() as Promise<TmdbMovieDetails>;
}

export function extractDirectorNames(crew: TmdbCredits["crew"]): string[] {
  if (!crew?.length) return [];
  const names = crew.filter((c) => c.job === "Director").map((c) => c.name.trim()).filter(Boolean);
  return Array.from(new Set(names));
}

/** Top-billed cast by `order` (lower = higher billing). */
export function extractTopActorNames(
  cast: TmdbCredits["cast"],
  max = 5,
): string[] {
  if (!cast?.length) return [];
  const sorted = [...cast].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  const names: string[] = [];
  for (const row of sorted) {
    if (names.length >= max) break;
    const n = row.name?.trim();
    if (n && !names.includes(n)) names.push(n);
  }
  return names;
}

export async function fetchWatchProviders(tmdbId: number): Promise<TmdbWatchProvidersResult | null> {
  const credential = getTmdbCredential()?.trim();
  if (!credential) return null;
  const res = await fetch(tmdbRequest(`/movie/${tmdbId}/watch/providers`), tmdbFetchInit(credential));
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
