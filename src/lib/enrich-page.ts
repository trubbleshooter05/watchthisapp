import type { RecommendationBundle, RecommendationEntry } from "@/lib/types/recommendation";
import {
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
};

export type EnrichedSource = RecommendationBundle["sourceMovie"] & {
  posterUrl: string | null;
  runtimeLabel: string | null;
  voteAverage: number | null;
};

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
  const ids = [
    bundle.sourceMovie.tmdbId,
    ...bundle.recommendations.map((r) => r.tmdbId),
  ];
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

  const srcDetails = detailsMap.get(bundle.sourceMovie.tmdbId);
  const source: EnrichedSource = {
    ...bundle.sourceMovie,
    posterUrl: posterUrl(srcDetails?.poster_path ?? null),
    runtimeLabel: formatRuntime(srcDetails?.runtime ?? null),
    voteAverage: srcDetails?.vote_average ?? null,
  };

  const recommendations: EnrichedRecommendation[] = bundle.recommendations.map((rec) => {
    const d = detailsMap.get(rec.tmdbId);
    const w = providersMap.get(rec.tmdbId);
    const us = w?.results?.US;
    const providers = us ? collectProviders(us) : [];

    return {
      ...rec,
      posterUrl: posterUrl(d?.poster_path ?? null),
      runtimeLabel: formatRuntime(d?.runtime ?? null),
      voteAverage: d?.vote_average ?? null,
      genreNames: d?.genres?.map((g) => g.name) ?? [],
      providers,
    };
  });

  return { source, recommendations };
}
