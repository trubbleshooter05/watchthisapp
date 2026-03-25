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

export type RecommendationBundle = {
  sourceMovie: SourceMovie;
  recommendations: RecommendationEntry[];
  faq: FaqItem[];
  relatedPages: string[];
};
