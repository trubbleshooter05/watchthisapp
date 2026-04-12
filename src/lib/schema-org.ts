import type { EnrichedSource } from "@/lib/enrich-page";
import type { RecommendationBundle } from "@/lib/types/recommendation";

const BRAND = "WatchThis";
const PUBLISHER = "WatchThis Editorial Team";

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
        alternateName: ["WatchThis — MoviesLike.app", "movieslike.app"],
        url: baseUrl,
        description:
          "WatchThis helps you find what to watch next with curated “movies like” guides, streaming context, and editorial recommendations at movieslike.app.",
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
}) {
  const { baseUrl, slug, bundle, source, faqItems } = opts;
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

  return { "@context": "https://schema.org", "@graph": [movie, itemList, faq] };
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
