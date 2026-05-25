import type { EnrichedSource } from "@/lib/enrich-page";
import type { RecommendationBundle } from "@/lib/types/recommendation";

const BRAND = "MoviesLike";
const PUBLISHER = "MoviesLike Editorial Team";

export function buildOrganizationAndWebSiteJsonLd(baseUrl: string) {
  const orgId = `${baseUrl}/#organization`;
  const websiteId = `${baseUrl}/#website`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: BRAND,
        alternateName: ["MoviesLike.app", "movieslike.app", "www.movieslike.app"],
        url: baseUrl,
        description:
          "MoviesLike helps you find what to watch next with curated “movies like” guides, streaming context, and editorial recommendations at https://www.movieslike.app.",
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: BRAND,
        url: baseUrl,
        inLanguage: "en-US",
        publisher: { "@id": orgId },
      },
    ],
  };
}

export function buildMovieLikePageJsonLd(opts: {
  baseUrl: string;
  slug: string;
  bundle: RecommendationBundle;
  source: EnrichedSource;
  faqItems: RecommendationBundle["faq"];
  /** When false, skip JSON-LD to align with `robots` noindex on thin or non-priority guides. */
  shouldIndex: boolean;
}): Record<string, unknown> | null {
  const { baseUrl, slug, bundle, source, faqItems, shouldIndex } = opts;
  if (!shouldIndex) return null;
  const pageUrl = `${baseUrl}/movies-like/${slug}`;
  const poster = source.posterUrl;
  const description =
    source.overview?.trim() ||
    `Movies like ${bundle.sourceMovie.title}: curated similar films with themes, tone, and streaming notes.`;

  const releaseIso =
    source.releaseDateIso ||
    (bundle.sourceMovie.year ? `${bundle.sourceMovie.year}-01-01` : undefined);

  const movie: Record<string, unknown> = {
    "@type": "Movie",
    "@id": `${pageUrl}#movie`,
    name: bundle.sourceMovie.title,
    url: pageUrl,
    description,
    genre: bundle.sourceMovie.genres,
  };

  if (poster) {
    movie.image = poster;
  }
  if (releaseIso) {
    movie.datePublished = releaseIso;
  }

  if (source.directorNames.length > 0) {
    movie.director = source.directorNames.map((name) => ({
      "@type": "Person",
      name,
    }));
  }

  if (source.actorNames.length > 0) {
    movie.actor = source.actorNames.map((name) => ({
      "@type": "Person",
      name,
    }));
  }

  if (
    source.voteAverage != null &&
    source.voteCount != null &&
    source.voteCount > 0 &&
    source.voteAverage > 0
  ) {
    movie.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Math.round(source.voteAverage * 10) / 10,
      bestRating: 10,
      worstRating: 0,
      ratingCount: source.voteCount,
    };
  }

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
    mainEntity: faqItems.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [movie, itemList, faq],
  } as Record<string, unknown>;
}

export function buildBreadcrumbListJsonLd(
  baseUrl: string,
  items: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.path}`,
    })),
  };
}

export function buildBlogPostingJsonLd(opts: {
  baseUrl: string;
  title: string;
  description: string;
  datePublished: string;
  dateModified: string;
  urlPath: string;
}) {
  const { baseUrl, title, description, datePublished, dateModified, urlPath } = opts;
  const url = `${baseUrl}${urlPath}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: title,
    description,
    datePublished,
    dateModified,
    author: {
      "@type": "Organization",
      name: PUBLISHER,
    },
    publisher: {
      "@type": "Organization",
      name: BRAND,
      url: baseUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    url,
    isPartOf: {
      "@type": "Blog",
      name: `${BRAND} Essays`,
      url: `${baseUrl}/blog`,
    },
  };
}
