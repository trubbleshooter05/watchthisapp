const LLMS_TXT = `# MoviesLike

> Curated movie recommendation guides with streaming links. Discover films similar to ones you love, with editorial write-ups and where to watch.

## Pages

- /: Homepage with popular movie guides
- /movies-like/{slug}: Individual movie recommendation guides (1,000+ guides)
- /popular: Most popular movie recommendation pages
- /blog: Cinematic essays and editorial content
- /collections: Curated movie collections by theme
- /browse: Browse all movie guides

## About

MoviesLike provides human-curated movie recommendations. Each guide includes 10-20 film recommendations with editorial notes on why fans of the source film will enjoy each pick, plus streaming availability links.

## Content

Each /movies-like/{slug} page contains:
- Curated recommendations with match explanations
- FAQ section answering common "what to watch" questions
- Where to watch / streaming links
- Related movie guides for further discovery
`;

export function GET() {
  return new Response(LLMS_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
