import {
  getAllMovieSlugs,
  getRecommendationBundle,
  MOVIE_SLUG_ALIASES,
} from "@/lib/recommendations";
import { SITE_URL_FALLBACK } from "@/lib/site-url";

type RecommendationApiItem = {
  title: string;
  slug: string;
  match_score: number | null;
  why_youll_love_it: string | null;
  url: string;
};

export type RecommendationApiResponse = {
  source_movie: {
    title: string;
    slug: string;
    year: number;
  };
  source_url: string;
  recommendations: RecommendationApiItem[];
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''’ʼ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function canonicalMovieUrl(slug: string): string {
  return `${SITE_URL_FALLBACK}/movies-like/${slug}`;
}

function resolveMovieSlug(input: string): string | null {
  const clean = input.trim();
  if (!clean) return null;

  const allSlugs = new Set(getAllMovieSlugs());
  if (allSlugs.has(clean)) return clean;

  const normalized = slugify(clean);
  if (allSlugs.has(normalized)) return normalized;

  const aliasKey = clean.toLowerCase();
  const aliasFromRaw = MOVIE_SLUG_ALIASES[aliasKey];
  if (aliasFromRaw && allSlugs.has(aliasFromRaw)) return aliasFromRaw;

  const aliasFromNorm = MOVIE_SLUG_ALIASES[normalized];
  if (aliasFromNorm && allSlugs.has(aliasFromNorm)) return aliasFromNorm;

  return null;
}

export function getRecommendationApiPayload(movieInput: string): RecommendationApiResponse | null {
  const slug = resolveMovieSlug(movieInput);
  if (!slug) return null;

  const bundle = getRecommendationBundle(slug);
  if (!bundle) return null;

  return {
    source_movie: {
      title: bundle.sourceMovie.title,
      slug: bundle.sourceMovie.slug,
      year: bundle.sourceMovie.year,
    },
    source_url: canonicalMovieUrl(bundle.sourceMovie.slug),
    recommendations: bundle.recommendations.map((r) => {
      const recSlug = slugify(r.title);
      return {
        title: r.title,
        slug: recSlug,
        match_score: r.matchPercentage ?? null,
        why_youll_love_it: r.whyYoullLoveIt ?? null,
        url: canonicalMovieUrl(recSlug),
      };
    }),
  };
}
