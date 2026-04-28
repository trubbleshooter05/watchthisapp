import { getRecommendationBundle } from "@/lib/recommendations";

export type MovieCollection = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  intro: string;
  redditSignal: string;
  slugs: string[];
  related: string[];
};

export const MOVIE_COLLECTIONS: MovieCollection[] = [
  {
    slug: "single-location-movies",
    title: "Best Single Location Movies",
    h1: "Single location movies that make one room feel huge",
    description:
      "A curated MoviesLike collection for people searching Reddit for single-location thrillers, dramas, and contained survival films.",
    intro:
      "Single-location movies work when pressure, blocking, and character choices do the heavy lifting. Start here if you want films that squeeze tension from apartments, bunkers, cars, call centers, and other tight spaces.",
    redditSignal: "Demand Scout surfaced: “Single location movies you enjoyed and why?”",
    slugs: ["12-angry-men", "10-cloverfield-lane", "locke", "the-guilty", "buried", "phone-booth"],
    related: ["movies-about-cults", "coming-of-age-summer-dramas"],
  },
  {
    slug: "movies-about-cults",
    title: "Movies About Cults",
    h1: "Movies about cults, coercion, and charismatic control",
    description:
      "A curated path into cult movies, paranoid communities, and psychological thrillers about belief, belonging, and control.",
    intro:
      "Cult films are not only about robes and rituals. The strongest ones make ordinary social pressure feel dangerous: a dinner party that curdles, a retreat that isolates, or a leader whose certainty becomes a trap.",
    redditSignal: "Demand Scout surfaced: “Movies where people are in a cult.”",
    slugs: ["midsommar", "the-master", "apostle", "rosemarys-baby", "suspiria", "get-out"],
    related: ["single-location-movies", "20-movies-before-20"],
  },
  {
    slug: "coming-of-age-summer-dramas",
    title: "Coming-of-Age Summer Dramas",
    h1: "Coming-of-age summer movies with heart, ache, and sunburnt memory",
    description:
      "Heartfelt coming-of-age summer dramas for viewers who want nostalgia, friendship, first love, and bittersweet endings.",
    intro:
      "The best summer coming-of-age movies feel warm until they sting. They use long days, first freedom, and temporary friendships to show characters realizing life will not stay the same.",
    redditSignal: "Demand Scout surfaced: “Movie suggestions for coming of age summer heartfelt dramas.”",
    slugs: ["aftersun", "stand-by-me", "almost-famous", "lady-bird", "the-perks-of-being-a-wallflower", "before-sunrise"],
    related: ["20-movies-before-20", "single-location-movies"],
  },
  {
    slug: "20-movies-before-20",
    title: "20 Movies Before 20",
    h1: "Movies to watch before 20 when you want the canon without homework",
    description:
      "A starter movie canon for younger viewers: crowd-pleasers, emotional landmarks, and conversation-starting films that still play well.",
    intro:
      "A good before-20 list should not feel like a syllabus. It should give you films that open doors: animation, thrillers, romance, social satire, sci-fi, and a few emotional bruisers you will understand differently later.",
    redditSignal: "Demand Scout surfaced: “20 movies before 20.”",
    slugs: ["spirited-away", "the-breakfast-club", "parasite", "get-out", "inception", "interstellar"],
    related: ["coming-of-age-summer-dramas", "movies-about-cults"],
  },
];

export function getMovieCollection(slug: string): MovieCollection | undefined {
  return MOVIE_COLLECTIONS.find((collection) => collection.slug === slug);
}

export function getAllMovieCollectionSlugs(): string[] {
  return MOVIE_COLLECTIONS.map((collection) => collection.slug);
}

export function getCollectionMovieLinks(collection: MovieCollection) {
  return collection.slugs.flatMap((slug) => {
    const bundle = getRecommendationBundle(slug);
    if (!bundle) return [];
    return {
      slug,
      title: bundle.sourceMovie.title,
      year: bundle.sourceMovie.year,
      genres: bundle.sourceMovie.genres,
      description: bundle.seoDescription ?? bundle.sourceMovie.whyPeopleLoveIt ?? "",
    };
  });
}
