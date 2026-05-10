export const MOVIE_PAGE_INDEX_WORD_THRESHOLD = 300;

export type MoviePageIndexingWordsInput = {
  pageTitle: string;
  editorialIntro?: string;
  customDescriptions?: string[];
};

export function countMoviePageIndexingWords(input: MoviePageIndexingWordsInput): number {
  const parts: string[] = [input.pageTitle];

  if (input.editorialIntro) parts.push(input.editorialIntro);
  if (input.customDescriptions) parts.push(...input.customDescriptions);

  const combined = parts.join(" ");
  const words = combined.trim().split(/\s+/);

  return words.length;
}

export function moviePageIndexingRobots(wordCount: number) {
  const shouldIndex = wordCount >= MOVIE_PAGE_INDEX_WORD_THRESHOLD;

  return {
    index: shouldIndex,
    follow: true,
    googleBot: {
      index: shouldIndex,
      follow: true,
    },
  };
}
