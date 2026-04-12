import type { RecommendationBundle, RecommendationEntry } from "@/lib/types/recommendation";
import {
  extractDirectorNames,
  extractTopActorNames,
  fetchMovieDetails,
  fetchWatchProviders,
  formatRuntime,
  posterUrl,
  type TmdbProvider,
} from "@/lib/tmdb";

export type ProviderChip = {
  kind: "flatrate" | "rent" | "buy";
  name: string;
  logo: string | null;
};

export type EnrichedRecommendation = RecommendationEntry & {
  posterUrl: string | null;
  runtimeLabel: string | null;
  voteAverage: number | null;
  genreNames: string[];
  providers: ProviderChip[];
  overview: string | null;
};

export type EnrichedSource = RecommendationBundle["sourceMovie"] & {
  posterUrl: string | null;
  runtimeLabel: string | null;
  voteAverage: number | null;
  overview: string | null;
  /** ISO date YYYY-MM-DD from TMDB when available */
  releaseDateIso: string | null;
  voteCount: number | null;
  directorNames: string[];
  actorNames: string[];
};

/** TMDB occasionally reuses IDs; pin known-good IDs for pages that broke in production. */
const SOURCE_PAGE_TMDB_ID: Partial<Record<string, number>> = {
  "mean-girls": 10625,
  "white-chicks": 12153,
};

function resolvedSourceTmdbId(bundle: RecommendationBundle): number {
  return SOURCE_PAGE_TMDB_ID[bundle.sourceMovie.slug] ?? bundle.sourceMovie.tmdbId;
}

/** Fix legacy/wrong IDs still present in JSON (same slugs as SOURCE_PAGE_TMDB_ID). */
function resolvedRecommendationTmdbId(rec: RecommendationEntry): number {
  if (rec.title === "Mean Girls" && rec.tmdbId === 10664) return 10625;
  if (rec.title === "White Chicks" && rec.tmdbId === 12507) return 12153;
  if (rec.title === "Clueless" && rec.tmdbId === 10625) return 9603;
  return rec.tmdbId;
}

function collectProviders(us: {
  flatrate?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
}): ProviderChip[] {
  const out: ProviderChip[] = [];
  const push = (kind: ProviderChip["kind"], list?: TmdbProvider[]) => {
    list?.forEach((p) => {
      out.push({ kind, name: p.provider_name, logo: p.logo_path });
    });
  };
  push("flatrate", us.flatrate);
  push("rent", us.rent);
  push("buy", us.buy);
  return out;
}

export async function enrichMovieLikePage(bundle: RecommendationBundle): Promise<{
  source: EnrichedSource;
  recommendations: EnrichedRecommendation[];
}> {
  const sourceId = resolvedSourceTmdbId(bundle);
  const recIds = bundle.recommendations.map(resolvedRecommendationTmdbId);
  const ids = [sourceId, ...recIds];
  const unique = Array.from(new Set(ids));

  const detailsMap = new Map<number, Awaited<ReturnType<typeof fetchMovieDetails>>>();
  const providersMap = new Map<number, Awaited<ReturnType<typeof fetchWatchProviders>>>();

  await Promise.all(
    unique.map(async (id) => {
      const [d, w] = await Promise.all([fetchMovieDetails(id), fetchWatchProviders(id)]);
      detailsMap.set(id, d);
      providersMap.set(id, w);
    }),
  );

  const srcDetails = detailsMap.get(sourceId);
  const rd = srcDetails?.release_date?.trim();
  const releaseDateIso =
    rd && /^\d{4}-\d{2}-\d{2}$/.test(rd)
      ? rd
      : rd && /^\d{4}-\d{2}-\d{2}/.test(rd)
        ? rd.slice(0, 10)
        : null;

  const source: EnrichedSource = {
    ...bundle.sourceMovie,
    tmdbId: sourceId,
    posterUrl: posterUrl(srcDetails?.poster_path ?? null),
    runtimeLabel: formatRuntime(srcDetails?.runtime ?? null),
    voteAverage: srcDetails?.vote_average ?? null,
    overview: srcDetails?.overview?.trim() ? srcDetails.overview.trim() : null,
    releaseDateIso,
    voteCount: srcDetails?.vote_count ?? null,
    directorNames: extractDirectorNames(srcDetails?.credits?.crew),
    actorNames: extractTopActorNames(srcDetails?.credits?.cast),
  };

  const recommendations: EnrichedRecommendation[] = bundle.recommendations.map((rec) => {
    const id = resolvedRecommendationTmdbId(rec);
    const d = detailsMap.get(id);
    const w = providersMap.get(id);
    const us = w?.results?.US;
    const providers = us ? collectProviders(us) : [];

    return {
      ...rec,
      tmdbId: id,
      posterUrl: posterUrl(d?.poster_path ?? null),
      runtimeLabel: formatRuntime(d?.runtime ?? null),
      voteAverage: d?.vote_average ?? null,
      genreNames: d?.genres?.map((g) => g.name) ?? [],
      overview: d?.overview?.trim() ? d.overview.trim() : null,
      providers,
    };
  });

  return { source, recommendations };
}
