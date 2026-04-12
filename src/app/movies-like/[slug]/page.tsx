import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AllMovieGuideLinks } from "@/components/AllMovieGuideLinks";
import { RecommendationList } from "@/components/RecommendationList";
import { enrichMovieLikePage } from "@/lib/enrich-page";
import { posterPlaceholderHint } from "@/lib/tmdb";
import {
  getRecommendationBundle,
  getRecommendationJsonMtime,
  getSeoDescription,
  getSeoTitle,
} from "@/lib/recommendations";
import {
  buildMoviesLikeIntro,
  buildRecommendationSeoParagraph,
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

/** Fetch TMDB at request time so `TMDB_API_KEY` works with `next start` without rebuilding. */
export const revalidate = 86400;

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = params;
  const bundle = getRecommendationBundle(slug);
  if (!bundle) return {};
  const t = bundle.sourceMovie.title;
  const title = getSeoTitle(t);
  const description = getSeoDescription(t);
  const baseUrl = getSiteUrl();
  const modified = getRecommendationJsonMtime(slug);
  return {
    title,
    description,
    robots: { index: true, follow: true },
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
  const baseUrl = getSiteUrl();

  const title = getSeoTitle(bundle.sourceMovie.title);
  const description = getSeoDescription(bundle.sourceMovie.title);
  const h1 = generateH1(bundle.sourceMovie.title);

  const introHtml = buildMoviesLikeIntro(bundle.sourceMovie, source.overview, slug);
  const whyLoveThese = buildWhyYoullLoveTheseMovies(bundle.sourceMovie, bundle.recommendations);
  const schemaFaq = buildSchemaFaqItems(
    bundle.sourceMovie.title,
    bundle.recommendations.map((r) => r.title),
  );
  const mergedFaq = mergeFaqForPage(bundle.faq, schemaFaq);

  const recommendationsWithSeo = recommendations.map((r) => ({
    ...r,
    seoParagraph: buildRecommendationSeoParagraph(r, bundle.sourceMovie),
  }));

  const alsoLikeLinks = pickAlsoLikeSlugs(slug);

  // ✅ VALIDATION: Fail build if SEO rules are broken
  const validation = validateMovieLikePage({
    title,
    description,
    h1,
    introHtml,
    recommendationsWithSeo,
    hasInternalLinks: alsoLikeLinks.length > 0,
    movieName: bundle.sourceMovie.title,
  });

  // Log validation results for monitoring (non-blocking - page always renders)
  logValidationIssues(validation, slug);

  const structured = buildMovieLikePageJsonLd({
    baseUrl,
    slug,
    bundle,
    source,
    faqItems: mergedFaq,
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
          <p className="text-amber-500/90 text-sm font-medium mb-2">Movies like</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance mb-6">
            {h1}
          </h1>
          <p className="text-base sm:text-lg text-[#D1D5DB] max-w-3xl text-pretty leading-relaxed mb-12">
            {introHtml || `Discover films similar to ${source.title}. Explore our curated collection of recommendations that capture the same themes, tone, and emotional resonance.`}
          </p>

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
                <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-[#4B5563] px-4 text-center">
                  {posterPlaceholderHint()}
                </div>
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

          <h2 className="font-display text-2xl font-bold mb-8">Your 10 recommendations</h2>
          {bundle.recommendations.length === 0 ? (
            <p className="text-sm text-amber-500/90 border border-amber-500/20 rounded-xl bg-amber-500/5 px-4 py-3 max-w-xl">
              This guide is being filled out—recommendations will appear here after the list is added
              to the site data.
            </p>
          ) : (
            <RecommendationList items={recommendationsWithSeo} />
          )}

          {bundle.recommendations.length > 0 && (
            <section className="mt-16 border-t border-white/10 pt-12">
              <h2 className="font-display text-xl font-semibold text-[#FAFAFA] mb-4">
                Why You&apos;ll Love These Movies
              </h2>
              <p className="text-[#D1D5DB] leading-relaxed max-w-3xl text-pretty">{whyLoveThese}</p>
            </section>
          )}

          {alsoLikeLinks.length > 0 && (
            <section className="mt-16 border-t border-white/10 pt-12">
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
              Browse every &quot;movies like&quot; page on the site—including ones still waiting to be
              indexed.
            </p>
            <AllMovieGuideLinks exceptSlug={slug} />
          </section>

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
