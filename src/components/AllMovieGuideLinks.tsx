import Link from "next/link";
import { getRecommendationBundle } from "@/lib/recommendations";
import { getIndexableMovieGuideSlugs } from "@/lib/seo-priority-movies";

type Props = {
  /** Omit on listing pages; set on a movie page to skip self. */
  exceptSlug?: string;
  className?: string;
};

export function AllMovieGuideLinks({ exceptSlug, className = "" }: Props) {
  const slugs = getIndexableMovieGuideSlugs()
    .filter((s) => s !== exceptSlug)
    .sort((a, b) => {
      const ta = getRecommendationBundle(a)?.sourceMovie.title ?? a;
      const tb = getRecommendationBundle(b)?.sourceMovie.title ?? b;
      return ta.localeCompare(tb, "en", { sensitivity: "base" });
    });

  return (
    <ul
      className={`flex flex-wrap gap-2 sm:gap-3 ${className}`}
      aria-label="All movie recommendation guides"
    >
      {slugs.map((slug) => {
        const b = getRecommendationBundle(slug);
        const label = b?.sourceMovie.title ?? slug;
        return (
          <li key={slug}>
            <Link
              href={`/movies-like/${slug}`}
              className="inline-block rounded-lg border border-white/10 bg-[#141414] px-3 py-2 text-sm text-[#D1D5DB] hover:border-amber-500/40 hover:text-amber-500/90 transition-colors"
            >
              Movies like {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
