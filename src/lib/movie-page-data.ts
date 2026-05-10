import {
  MOVIE_PAGE_INDEX_WORD_THRESHOLD,
  countMoviePageIndexingWords,
  type MoviePageIndexingWordsInput,
} from "@/lib/movie-indexing-word-count";
import { MOVIE_SLUG_ALIASES, getRecommendationBundle } from "@/lib/recommendations";
import type { RecommendationBundle } from "@/lib/types/recommendation";
import { generateH1 } from "@/lib/seo/ctr";
import { isIndexableMovieGuideSlug } from "@/lib/seo-priority-movies";

/**
 * Same shape loaded on each movies-like route: JSON bundle under data/recommendations/{slug}.json
 * (+ optional slug canonicalization via MOVIE_SLUG_ALIASES).
 */
export type MoviePageRecord = RecommendationBundle;

/**
 * Resolves aliases (e.g. dune-2 → dune-part-two) then loads the recommendation bundle synchronously from disk,
 * mirroring {@link getRecommendationBundle}.
 */
export async function loadMoviePageBySlug(slug: string): Promise<MoviePageRecord | null> {
  const canonical = MOVIE_SLUG_ALIASES[slug] ?? slug;
  return getRecommendationBundle(canonical);
}

/** Single source of truth for movies-like `robots` and on-page SEO signals. */
export function computeMovieGuideShouldIndex(
  slug: string,
  bundle: MoviePageRecord,
): { shouldIndex: boolean; wordCount: number; slugIndexable: boolean } {
  const slugIndexable = isIndexableMovieGuideSlug(slug);
  const wordInput = buildIndexingWordInputFromMovie(bundle);
  const wordCount = countMoviePageIndexingWords(wordInput);
  const meetsWordThreshold = wordCount >= MOVIE_PAGE_INDEX_WORD_THRESHOLD;
  const shouldIndex = slugIndexable && meetsWordThreshold;
  return { shouldIndex, wordCount, slugIndexable };
}

/**
 * Editorial text only — matches what authors control in bundle JSON / metadata overrides.
 * Excludes programmatic SEO paragraphs derived from TMDB overviews {@link enrichMovieLikePage},
 * suggestion card titles, provider names, layout chrome, footer, nav, etc.
 */
export function buildIndexingWordInputFromMovie(
  bundle: MoviePageRecord,
): MoviePageIndexingWordsInput {
  const recommendationCount = bundle.recommendations.length;
  const pageTitle = bundle.seoH1 ?? generateH1(bundle.sourceMovie.title, recommendationCount);

  const introParts: string[] = [];
  const w = bundle.sourceMovie.whyPeopleLoveIt?.trim();
  if (w) introParts.push(w);
  for (const p of bundle.customIntroParagraphs ?? []) {
    const t = p.trim();
    if (t) introParts.push(t);
  }

  const editorialIntro = introParts.length > 0 ? introParts.join("\n\n") : undefined;

  const customDescriptions: string[] = [];

  for (const sec of bundle.editorialSections ?? []) {
    const h = sec.heading.trim();
    const b = sec.body.trim();
    if (h) customDescriptions.push(h);
    if (b) customDescriptions.push(b);
  }

  if (bundle.shortComparison) {
    const h = bundle.shortComparison.heading.trim();
    const b = bundle.shortComparison.body.trim();
    if (h) customDescriptions.push(h);
    if (b) customDescriptions.push(b);
  }

  for (const item of bundle.faq) {
    const q = item.question.trim();
    const a = item.answer.trim();
    if (q) customDescriptions.push(q);
    if (a) customDescriptions.push(a);
  }

  for (const rec of bundle.recommendations) {
    const note = rec.whyYoullLoveIt?.trim();
    if (note) customDescriptions.push(note);
  }

  return {
    pageTitle,
    editorialIntro,
    customDescriptions: customDescriptions.length ? customDescriptions : undefined,
  };
}
