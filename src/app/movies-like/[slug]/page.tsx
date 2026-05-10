import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AllMovieGuideLinks } from "@/components/AllMovieGuideLinks";
import { RecommendationList } from "@/components/RecommendationList";
import { enrichMovieLikePage } from "@/lib/enrich-page";
import { moviePageIndexingRobots } from "@/lib/movie-indexing-word-count";
import { computeMovieGuideShouldIndex } from "@/lib/movie-page-data";
import {
  buildContinueWatchingLinks,
  filterExistingRelatedSlugs,
  getRecommendationBundle,
  getRecommendationJsonMtime,
  getSeoDescription,
  getSeoTitle,
} from "@/lib/recommendations";
import {
  buildMoviesLikeIntro,
  buildPriorityMoviesLikeIntro,
  buildRecommendationSeoParagraphsForPage,
  buildSchemaFaqItems,
  buildWhyYoullLoveTheseMovies,
  mergeFaqForPage,
} from "@/lib/movies-like-seo";
import { pickAlsoLikeSlugs } from "@/lib/seo-priority-movies";
import { getSiteUrl } from "@/lib/site-url";
import { buildMovieLikePageJsonLd } from "@/lib/schema-org";
import { EditorialAttribution } from "@/components/EditorialAttribution";
import { generateH1 } from "@/lib/seo/ctr";
import { validateMovieLikePage, logValidationIssues } from "@/lib/seo/validator";
import { MOVIES_LIKE_ENGAGEMENT_SLUGS } from "@/lib/movies-like-engagement";
import {
  pickRelatedSlugsForFooter,
  relatedMovieFooterAnchor,
} from "@/lib/movies-like-related-section";
import { UNHEALER_TOP_THREE_BLURBS } from "@/lib/the-unhealer-page";
import { WhereToWatch } from "@/components/WhereToWatch";

/** Fetch TMDB at request time so `TMDB_API_KEY` works with `next start` without rebuilding. */
export const revalidate = 86400;

type Props = { params: { slug: string } };

function SourcePosterFallback({
  title,
  year,
  genres,
}: {
  title: string;
  year: number;
  genres: string[];
}) {
  const genreLabel = genres.slice(0, 2).join(" / ");

  return (
    <div className="relative flex h-full min-h-[280px] flex-col justify-between overflow-hidden bg-[#15110A] px-5 py-6 text-left">
      <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(245,158,11,0.18),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_24%,rgba(0,0,0,0.5))]" />
      <div className="relative">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">
          MoviesLike pick
        </p>
        <h3 className="mt-5 font-display text-2xl font-bold leading-tight text-[#FAFAFA] text-balance">
          {title}
        </h3>
      </div>
      <div className="relative space-y-3">
        <div className="h-px w-16 bg-amber-400/50" />
        <p className="text-xs uppercase tracking-[0.12em] text-[#D1D5DB]">
          {year}
          {genreLabel ? ` · ${genreLabel}` : ""}
        </p>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = params;
  const bundle = getRecommendationBundle(slug);
  if (!bundle) return {};
  const t = bundle.sourceMovie.title;
  const recommendationCount = bundle.recommendations.length;
  const title = bundle.seoTitle ?? getSeoTitle(t, recommendationCount);
  const description = bundle.seoDescription ?? getSeoDescription(t);
  const baseUrl = getSiteUrl();
  const modified = getRecommendationJsonMtime(slug);
  const { shouldIndex, wordCount } = computeMovieGuideShouldIndex(slug, bundle);
  const wordRobots = moviePageIndexingRobots(wordCount);
  return {
    title,
    description,
    robots: {
      index: shouldIndex,
      follow: wordRobots.follow,
      googleBot: {
        index: shouldIndex,
        follow: wordRobots.googleBot.follow,
      },
    },
    alternates: { canonical: `/movies-like/${slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${baseUrl}/movies-like/${slug}`,
      modifiedTime: modified.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function MovieLikePage({ params }: Props) {
  const { slug } = params;
  const bundle = getRecommendationBundle(slug);
  if (!bundle) notFound();

  const { source, recommendations } = await enrichMovieLikePage(bundle);
  const recommendationCount = recommendations.length;
  const baseUrl = getSiteUrl();

  const { shouldIndex, wordCount, slugIndexable } = computeMovieGuideShouldIndex(slug, bundle);

  const title = bundle.seoTitle ?? getSeoTitle(bundle.sourceMovie.title, recommendationCount);
  const description = bundle.seoDescription ?? getSeoDescription(bundle.sourceMovie.title);
  const h1 = bundle.seoH1 ?? generateH1(bundle.sourceMovie.title, recommendationCount);

  const introHtml = bundle.customIntroParagraphs?.length
    ? ""
    : slugIndexable
      ? buildPriorityMoviesLikeIntro(bundle.sourceMovie, source.overview, slug, recommendationCount)
      : buildMoviesLikeIntro(bundle.sourceMovie, source.overview, slug, recommendationCount);
  const introForValidation =
    bundle.customIntroParagraphs?.join("\n\n") || introHtml || "";
  const whyLoveThese = buildWhyYoullLoveTheseMovies(bundle.sourceMovie, recommendations);
  const schemaFaq = buildSchemaFaqItems(
    bundle.sourceMovie.title,
    recommendations.map((r) => r.title),
  );
  const mergedFaq = mergeFaqForPage(bundle.faq, schemaFaq);

  const seoParagraphs = buildRecommendationSeoParagraphsForPage(recommendations, source, slug);
  const recommendationsWithSeo = recommendations.map((r, i) => ({
    ...r,
    seoParagraph: seoParagraphs[i]!,
  }));

  const alsoLikeLinks = pickAlsoLikeSlugs(slug);
  const relatedGuideLinks = filterExistingRelatedSlugs(bundle.relatedPages).filter((s) => s !== slug);
  const relatedFooterSlugs = pickRelatedSlugsForFooter(bundle.relatedPages, slug, 6);

  const midPageGuideLinks =
    bundle.midPageYouMightAlsoLike?.flatMap((entry) => {
      if (entry.slug === slug) return [];
      const b = getRecommendationBundle(entry.slug);
      return b ? [{ slug: entry.slug, anchorText: entry.anchorText, title: b.sourceMovie.title }] : [];
    }) ?? [];

  const showEngagement = MOVIES_LIKE_ENGAGEMENT_SLUGS.has(slug);
  const isUnhealer = slug === "the-unhealer";
  const showUnhealerTopThree = isUnhealer && recommendationsWithSeo.length >= 3;
  const showEngagementAfterH1 =
    showEngagement && !isUnhealer && recommendationsWithSeo.length >= 3;

  const continueWatchingByTmdb = showEngagement
      ? Object.fromEntries(
          recommendationsWithSeo.map((r) => [
            r.tmdbId,
            buildContinueWatchingLinks(
              slug,
              recommendationsWithSeo,
              r.tmdbId,
              relatedGuideLinks,
              alsoLikeLinks,
            ),
          ]),
        )
      : undefined;

  // ✅ VALIDATION: Fail build if SEO rules are broken
  const validation = validateMovieLikePage({
    title,
    description,
    h1,
    introHtml: introForValidation,
    recommendationsWithSeo,
    hasInternalLinks: alsoLikeLinks.length > 0 || relatedGuideLinks.length > 0,
    movieName: bundle.sourceMovie.title,
    shouldIndex,
    wordCount,
    slugIndexable,
  });

  // Log validation results for monitoring (non-blocking - page always renders)
  logValidationIssues(validation, slug);

  const structured = buildMovieLikePageJsonLd({
    baseUrl,
    slug,
    bundle,
    source,
    faqItems: mergedFaq,
    shouldIndex,
  });
  const guideUpdatedIso = getRecommendationJsonMtime(slug).toISOString();

  return (
    <>
      {structured && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }}
        />
      )}
      <div className="min-h-screen">
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          {showUnhealerTopThree && (
            <section
              className="mb-10 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-[#141414] px-4 py-5 sm:px-6 sm:py-6 ring-1 ring-amber-500/20"
              aria-labelledby="unhealer-top-three-heading"
            >
              <h2
                id="unhealer-top-three-heading"
                className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#FAFAFA] mb-2"
              >
                Top 3 Picks If You Only Watch One
              </h2>
              <p className="text-sm text-[#9CA3AF] mb-5 max-w-2xl leading-relaxed">
                Zero patience? These three hit Unhealer’s curse-thriller frequency fastest—tap a card, then
                jump to the full breakdown below.
              </p>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recommendationsWithSeo.slice(0, 3).map((rec, idx) => (
                  <li key={rec.tmdbId}>
                    <Link
                      href={`#movie-like-rec-${rec.tmdbId}`}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141414] transition-colors hover:border-amber-500/35"
                    >
                      <div className="relative aspect-[2/3] w-full bg-black/40">
                        {rec.posterUrl ? (
                          <Image
                            src={rec.posterUrl}
                            alt=""
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="flex h-full min-h-[200px] items-center justify-center text-xs text-[#6B7280] px-3 text-center">
                            Poster unavailable
                          </div>
                        )}
                        <span className="absolute left-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-[#0F0F0F]">
                          {idx + 1}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-4">
                        <p className="font-display text-lg font-semibold text-[#FAFAFA] group-hover:text-amber-400 transition-colors">
                          {rec.title}{" "}
                          <span className="text-[#6B7280] font-normal">({rec.year})</span>
                        </p>
                        <p className="text-sm text-[#D1D5DB] leading-snug">
                          {UNHEALER_TOP_THREE_BLURBS[rec.tmdbId] ?? "Tight match on curse-thriller dread—full notes below."}
                        </p>
                        <p className="text-xs text-amber-500/90">Full write-up ↓</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-amber-500/90 text-sm font-medium mb-2">Movies like</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance mb-6">
            {h1}
          </h1>

          <WhereToWatch
            movieTitle={source.title}
            includeNetflix={bundle.whereToWatch?.netflix === true}
          />

          {showEngagementAfterH1 && (
            <section
              className="mb-10 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-5 sm:px-6 sm:py-6"
              aria-labelledby="top-picks-if-liked-heading"
            >
              <h2
                id="top-picks-if-liked-heading"
                className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#FAFAFA] mb-2"
              >
                Top picks if you liked {source.title}
              </h2>
              <p className="text-sm text-[#9CA3AF] mb-5 max-w-2xl leading-relaxed">
                {slug === "top-gun-maverick" ? (
                  <>
                    Short on time? Start here—these three nail Maverick’s stunt craft, rivalry heat, or pilot
                    myth—then scroll for the full ranked list and filters.
                  </>
                ) : (
                  <>
                    Short on time? Start with these three closest matches for{" "}
                    <span className="text-[#D1D5DB]">{source.title}</span> fans—then jump into the full
                    ranked list and filters below.
                  </>
                )}
              </p>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recommendationsWithSeo.slice(0, 3).map((rec, idx) => (
                  <li key={rec.tmdbId}>
                    <Link
                      href={`#movie-like-rec-${rec.tmdbId}`}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141414] transition-colors hover:border-amber-500/35"
                    >
                      <div className="relative aspect-[2/3] w-full bg-black/40">
                        {rec.posterUrl ? (
                          <Image
                            src={rec.posterUrl}
                            alt=""
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="flex h-full min-h-[200px] items-center justify-center text-xs text-[#6B7280] px-3 text-center">
                            Poster unavailable
                          </div>
                        )}
                        <span className="absolute left-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-[#0F0F0F]">
                          {idx + 1}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col gap-1 p-4">
                        <p className="font-display text-lg font-semibold text-[#FAFAFA] group-hover:text-amber-400 transition-colors">
                          {rec.title}{" "}
                          <span className="text-[#6B7280] font-normal">({rec.year})</span>
                        </p>
                        <p className="text-xs text-amber-500/90">Jump to full write-up ↓</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {bundle.customIntroParagraphs && bundle.customIntroParagraphs.length > 0 ? (
            <div className="space-y-4 max-w-3xl text-base sm:text-lg text-[#D1D5DB] text-pretty leading-relaxed mb-10">
              {bundle.customIntroParagraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          ) : (
            <p className="text-base sm:text-lg text-[#D1D5DB] max-w-3xl text-pretty leading-relaxed mb-12">
              {introHtml ||
                `Discover films similar to ${source.title}. Explore our curated collection of recommendations that capture the same themes, tone, and emotional resonance.`}
            </p>
          )}

          {bundle.editorialSections && bundle.editorialSections.length > 0 && (
            <div className="space-y-10 mb-14 max-w-3xl">
              {bundle.editorialSections.map((block) => (
                <section key={block.heading} className="border-l-2 border-amber-500/40 pl-5">
                  <h2 className="font-display text-xl font-semibold text-[#FAFAFA] mb-3">{block.heading}</h2>
                  <p className="text-[#D1D5DB] leading-relaxed text-pretty">{block.body}</p>
                </section>
              ))}
            </div>
          )}

          <section className="mb-14 grid gap-8 lg:grid-cols-[220px_1fr] items-start">
            <div className="relative aspect-[2/3] w-full max-w-[220px] mx-auto lg:mx-0 rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-xl">
              {source.posterUrl ? (
                <Image
                  src={source.posterUrl}
                  alt={`${source.title} poster`}
                  fill
                  className="object-cover"
                  sizes="220px"
                  priority
                />
              ) : (
                <SourcePosterFallback
                  title={source.title}
                  year={source.year}
                  genres={source.genres}
                />
              )}
            </div>
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">At a glance</h2>
              <p className="text-sm text-[#9CA3AF] leading-relaxed">
                {source.genres.join(" · ")}
                {source.runtimeLabel && (
                  <>
                    {" "}
                    · {source.runtimeLabel}
                    {source.voteAverage != null && <> · ★ {source.voteAverage.toFixed(1)}</>}
                  </>
                )}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {source.vibes.map((v) => (
                  <span
                    key={v}
                    className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-[#9CA3AF]"
                  >
                    {v.replace(/-/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <h2 className="font-display text-2xl font-bold mb-8">
            Your {recommendationCount} recommendations
          </h2>
          {recommendationCount === 0 ? (
            <p className="text-sm text-amber-500/90 border border-amber-500/20 rounded-xl bg-amber-500/5 px-4 py-3 max-w-xl">
              This guide is being filled out—recommendations will appear here after the list is added
              to the site data.
            </p>
          ) : (
            <RecommendationList
              items={recommendationsWithSeo}
              continueWatchingByTmdb={continueWatchingByTmdb}
            />
          )}

          {recommendationCount > 0 && (
            <section className="mt-16 border-t border-white/10 pt-12">
              <h2 className="font-display text-xl font-semibold text-[#FAFAFA] mb-4">
                Why You&apos;ll Love These Movies
              </h2>
              <p className="text-[#D1D5DB] leading-relaxed max-w-3xl text-pretty">{whyLoveThese}</p>
            </section>
          )}

          {bundle.shortComparison && (
            <section className="mt-14 border-t border-white/10 pt-12 max-w-3xl">
              <h2 className="font-display text-xl font-semibold text-[#FAFAFA] mb-3">
                {bundle.shortComparison.heading}
              </h2>
              <p className="text-[#D1D5DB] leading-relaxed text-pretty">{bundle.shortComparison.body}</p>
            </section>
          )}

          {midPageGuideLinks.length > 0 && (
            <section className="mt-14 border-t border-white/10 pt-12" aria-labelledby="mid-page-also-like-heading">
              <h2
                id="mid-page-also-like-heading"
                className="font-display text-xl font-semibold text-[#FAFAFA] mb-4"
              >
                You might also like
              </h2>
              <p className="text-sm text-[#9CA3AF] mb-5 max-w-2xl leading-relaxed">
                Deeper trails—hand-picked guides beyond the default “movies like” chips above.
              </p>
              <ul className="flex flex-wrap gap-3">
                {midPageGuideLinks.map((link) => (
                  <li key={link.slug}>
                    <Link
                      href={`/movies-like/${link.slug}`}
                      className="inline-block rounded-xl border border-white/10 bg-[#141414] px-4 py-3 text-sm text-amber-500/90 hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors max-w-xs text-balance"
                    >
                      {link.anchorText}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {alsoLikeLinks.length > 0 && (
            <section className="mt-16 border-t border-white/10 pt-12 space-y-10">
              <div>
                <h2 className="font-display text-xl font-semibold mb-6 text-[#FAFAFA]">
                  You Might Also Like
                </h2>
                <ul className="flex flex-wrap gap-3">
                  {alsoLikeLinks.map((s) => {
                    const b = getRecommendationBundle(s);
                    const label = b?.sourceMovie.title ?? s;
                    return (
                      <li key={s}>
                        <Link
                          href={`/movies-like/${s}`}
                          className="inline-block rounded-xl border border-white/10 bg-[#141414] px-4 py-3 text-sm text-amber-500/90 hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors"
                        >
                          Movies like {label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          )}

          <section className="mt-16 border-t border-white/10 pt-12">
            <h2 className="font-display text-xl font-semibold mb-6 flex items-center gap-2">
              <span aria-hidden>❓</span> FAQ
            </h2>
            <dl className="space-y-6">
              {mergedFaq.map((f) => (
                <div key={f.question}>
                  <dt className="font-medium text-[#FAFAFA] mb-1">{f.question}</dt>
                  <dd className="text-[#9CA3AF] leading-relaxed">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-16 border-t border-white/10 pt-12">
            <h2 className="font-display text-xl font-semibold mb-2">More movie guides</h2>
            <p className="text-sm text-[#6B7280] mb-6">
              Browse the movie guides currently prioritized for search discovery and editorial expansion.
            </p>
            <AllMovieGuideLinks exceptSlug={slug} />
          </section>

          {relatedFooterSlugs.length > 0 && (
            <section
              className="mt-16 border-t border-white/10 pt-12"
              aria-labelledby="related-movies-footer-heading"
            >
              <h2
                id="related-movies-footer-heading"
                className="font-display text-xl font-semibold text-[#FAFAFA] mb-2"
              >
                Related movies
              </h2>
              <p className="text-sm text-[#9CA3AF] mb-6 max-w-2xl leading-relaxed">
                Hand-picked guides from this page&apos;s data—same editorial lane as{" "}
                <span className="text-[#D1D5DB]">{source.title}</span>.
              </p>
              <ul className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                {relatedFooterSlugs.map((s, i) => {
                  const b = getRecommendationBundle(s);
                  const targetTitle = b?.sourceMovie.title ?? s;
                  const targetYear = b?.sourceMovie.year ?? 0;
                  const anchor = relatedMovieFooterAnchor(i, source.title, targetTitle, targetYear);
                  return (
                    <li key={s} className="sm:max-w-md">
                      <Link
                        href={`/movies-like/${s}`}
                        className="inline-block w-full sm:w-auto rounded-xl border border-white/10 bg-[#141414] px-4 py-3 text-sm text-amber-500/90 hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors text-balance leading-snug"
                      >
                        {anchor}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <EditorialAttribution updatedIso={guideUpdatedIso} />

          <p className="text-sm text-[#6B7280] mt-6">
            <Link href="/blog" className="text-amber-500 hover:text-amber-400 transition-colors">
              Cinematic essays
            </Link>
            <span className="mx-2" aria-hidden>
              ·
            </span>
            <Link href="/popular" className="text-amber-500 hover:text-amber-400 transition-colors">
              Popular guides
            </Link>
          </p>
        </main>
      </div>
    </>
  );
}
