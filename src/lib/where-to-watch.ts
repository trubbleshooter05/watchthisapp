/** Outbound search URLs for “Where to Watch” (no API; user lands on provider search for the title). */
export function buildWhereToWatchUrls(movieTitle: string) {
  const q = encodeURIComponent(movieTitle.trim() || "movie");
  const tag = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG;

  const baseAmazon = `https://www.amazon.com/gp/video/search?phrase=${q}`;
  const amazonPrime = tag
    ? `${baseAmazon}&tag=${encodeURIComponent(tag)}`
    : baseAmazon;

  return {
    netflix: `https://www.netflix.com/search?q=${q}`,
    amazonPrime,
    appleTv: `https://tv.apple.com/search?term=${q}`,
    fandango: `https://www.fandango.com/search?q=${q}`,
    justWatch: `https://www.justwatch.com/us/search?q=${q}`,
  };
}
