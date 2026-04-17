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

export type RecommendationBundle = {
  sourceMovie: SourceMovie;
  recommendations: RecommendationEntry[];
  faq: FaqItem[];
  relatedPages: string[];
  /** Replaces algorithmic intro when set (plain-text paragraphs). */
  customIntroParagraphs?: string[];
  /** Optional H2 blocks after intro (e.g. “why people love”, theme explainer). */
  editorialSections?: EditorialSection[];
  /** Override CTR-generated meta when you need an exact title/description (must still satisfy validator). */
  seoTitle?: string;
  seoDescription?: string;
  seoH1?: string;
};
