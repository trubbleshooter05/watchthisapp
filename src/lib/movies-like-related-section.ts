import { filterExistingRelatedSlugs } from "@/lib/recommendations";

/** Up to `max` slugs from bundle `relatedPages` that exist and aren’t the current page. */
export function pickRelatedSlugsForFooter(
  relatedPages: string[] | undefined,
  currentSlug: string,
  max = 6,
): string[] {
  return filterExistingRelatedSlugs(relatedPages ?? [])
    .filter((s) => s !== currentSlug)
    .slice(0, max);
}

/**
 * SEO-friendly anchor patterns (not every link “Movies like {title}”).
 * Deterministic from index so the page is stable across builds.
 */
export function relatedMovieFooterAnchor(
  index: number,
  sourceTitle: string,
  targetTitle: string,
  targetYear: number,
): string {
  const y = targetYear > 0 ? ` (${targetYear})` : "";
  const patterns = [
    `${targetTitle}${y} — full guide`,
    `More picks in the spirit of ${targetTitle}`,
    `Curated list: movies like ${targetTitle}`,
    `${targetTitle}: similar films, ranked`,
    `Loved ${sourceTitle}? Try ${targetTitle}`,
    `Keep exploring — ${targetTitle}${y}`,
  ];
  return patterns[index % patterns.length]!;
}
