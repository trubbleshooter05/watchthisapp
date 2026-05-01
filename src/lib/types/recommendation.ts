export type Mood = "dark" | "uplifting" | "tense" | "funny" | "bittersweet";

export type SourceMovie = {
  tmdbId: number;
  title: string;
  slug: string;
  year: number;
  genres: string[];
  whyPeopleLoveIt: string;
  vibes: string[];
};

export type RecommendationEntry = {
  tmdbId: number;
  title: string;
  year: number;
  posterPath?: string | null;
  matchPercentage: number;
  whyYoullLoveIt: string;
  sharedVibes: string[];
  mood: Mood;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type EditorialSection = {
  heading: string;
  body: string;
};

/** Mid-page internal link with custom anchor copy (SEO clusters). */
export type InternalLinkWithAnchor = {
  slug: string;
  anchorText: string;
};

/** Optional: show Netflix link on “Where to Watch” (availability varies by region). */
export type WhereToWatchConfig = {
  netflix?: boolean;
};

export type RecommendationBundle = {
  sourceMovie: SourceMovie;
  recommendations: RecommendationEntry[];
  faq: FaqItem[];
  relatedPages: string[];
  /** When set, controls whether a Netflix search link is shown alongside Prime & Apple TV. */
  whereToWatch?: WhereToWatchConfig;
  /** Replaces algorithmic intro when set (plain-text paragraphs). */
  customIntroParagraphs?: string[];
  /** Optional H2 blocks after intro (e.g. “why people love”, theme explainer). */
  editorialSections?: EditorialSection[];
  /** Override CTR-generated meta when you need an exact title/description (must still satisfy validator). */
  seoTitle?: string;
  seoDescription?: string;
  seoH1?: string;
  /** Short 1v1 comparison (2–3 sentences), rendered mid-page. */
  shortComparison?: EditorialSection;
  /** Deeper “you might also like” with varied anchors (not default “Movies like …”). */
  midPageYouMightAlsoLike?: InternalLinkWithAnchor[];
};
