import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AllMovieGuideLinks } from "@/components/AllMovieGuideLinks";
import { RecommendationList } from "@/components/RecommendationList";
import { enrichMovieLikePage } from "@/lib/enrich-page";
import { posterPlaceholderHint } from "@/lib/tmdb";
import {
  filterExistingRelatedSlugs,
  getRecommendationBundle,
  getSeoDescription,
  getSeoTitle,
} from "@/lib/recommendations";
import type { RecommendationBundle } from "@/lib/types/recommendation";
import { getSiteUrl } from "@/lib/site-url";

/** Fetch TMDB at request time so `TMDB_API_KEY` works with `next start` without rebuilding. */
export const revalidate = 86400;

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = params;
  const bundle = getRecommendationBundle(slug);
  if (!bundle) return {};
  const t = bundle.sourceMovie.title;
  const title =
    slug === "the-chorus"
      ? "Movies Like The Chorus: 10 Moving Dramas About Music"
      : slug === "get-out"
        ? "Movies Like Get Out: 10 Creepy Thrillers That Stick"
        : getSeoTitle(t);
  const description =
    slug === "the-chorus"
      ? "Loved The Chorus? 10 moving dramas about music, mentorship, and redemption—with match scores and where to stream."
      : slug === "get-out"
        ? "Loved Get Out's polite nightmare? 10 films with the same itch—social horror, gaslighting, and slow dread. Match scores + where to stream."
        : getSeoDescription(t);
  const baseUrl = getSiteUrl();
  return {
    title,
    description,
    alternates: { canonical: `/movies-like/${slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `${baseUrl}/movies-like/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function jsonLd(bundle: RecommendationBundle, base: string, slug: string) {
  const url = `${base}/movies-like/${slug}`;
  const movie = {
    "@type": "Movie",
    name: bundle.sourceMovie.title,
    datePublished: String(bundle.sourceMovie.year),
    genre: bundle.sourceMovie.genres,
    url,
  };
  const itemList = {
    "@type": "ItemList",
    name: `Movies like ${bundle.sourceMovie.title}`,
    numberOfItems: bundle.recommendations.length,
    itemListElement: bundle.recommendations.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${r.title} (${r.year})`,
    })),
  };
  const faq = {
    "@type": "FAQPage",
    mainEntity: bundle.faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
  return { "@context": "https://schema.org", "@graph": [movie, itemList, faq] };
}

export default async function MovieLikePage({ params }: Props) {
  const { slug } = params;
  const bundle = getRecommendationBundle(slug);
  if (!bundle) notFound();

  const { source, recommendations } = await enrichMovieLikePage(bundle);
  const related = filterExistingRelatedSlugs(bundle.relatedPages);
  const baseUrl = getSiteUrl();
  const structured = jsonLd(bundle, baseUrl, slug);

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
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance mb-4">
            {source.title}
          </h1>
          <p className="text-lg text-[#9CA3AF] max-w-2xl text-pretty mb-10">
            Loved the vibe? Here are ten films that hit similar notes—with match scores, reasons to
            watch, and where to stream in the US.
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
              <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">Why people love it</h2>
              <p className="text-[#D1D5DB] leading-relaxed">{source.whyPeopleLoveIt}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                {source.vibes.map((v) => (
                  <span
                    key={v}
                    className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-[#9CA3AF]"
                  >
                    {v}
                  </span>
                ))}
              </div>
              {source.runtimeLabel && (
                <p className="text-sm text-[#6B7280]">
                  Runtime {source.runtimeLabel}
                  {source.voteAverage != null && <> · ★ {source.voteAverage.toFixed(1)}</>}
                </p>
              )}
            </div>
          </section>

          <h2 className="font-display text-2xl font-bold mb-8">Your 10 recommendations</h2>
          {bundle.recommendations.length === 0 ? (
            <p className="text-sm text-amber-500/90 border border-amber-500/20 rounded-xl bg-amber-500/5 px-4 py-3 max-w-xl">
              This guide is being filled out—recommendations will appear here after the list is added
              to the site data.
            </p>
          ) : (
            <RecommendationList items={recommendations} />
          )}

          <section className="mt-16 border-t border-white/10 pt-12">
            <h2 className="font-display text-xl font-semibold mb-6 flex items-center gap-2">
              <span aria-hidden>❓</span> FAQ
            </h2>
            <dl className="space-y-6">
              {bundle.faq.map((f) => (
                <div key={f.question}>
                  <dt className="font-medium text-[#FAFAFA] mb-1">{f.question}</dt>
                  <dd className="text-[#9CA3AF] leading-relaxed">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>

          {related.length > 0 && (
            <section className="mt-16 border-t border-white/10 pt-12">
              <h2 className="font-display text-xl font-semibold mb-6">Similar vibes</h2>
              <ul className="flex flex-wrap gap-3">
                {related.map((s) => {
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
            <h2 className="font-display text-xl font-semibold mb-2">More movie guides</h2>
            <p className="text-sm text-[#6B7280] mb-6">
              Browse every &quot;movies like&quot; page on the site—including ones still waiting to be
              indexed.
            </p>
            <AllMovieGuideLinks exceptSlug={slug} />
          </section>
        </main>
      </div>
    </>
  );
}
