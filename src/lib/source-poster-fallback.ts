const TMDB_IMAGE = "https://image.tmdb.org/t/p";

const SOURCE_POSTER_URLS: Partial<Record<string, string>> = {
  "forbidden-fruits": "https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Forbidden_Fruits_poster.jpg/500px-Forbidden_Fruits_poster.jpg",
};

const SOURCE_POSTER_PATHS: Partial<Record<string, string>> = {
  "quieres-ser-mi-novia": "/oscW8xV8EhRYj7iAhyVlBohKqxo.jpg",
  "sniper-no-nation": "/tUmARo0TZEK1EaSuS6dU35FhDyU.jpg",
  "star-wars-the-mandalorian-and-grogu": "/m8lEffySgTuKxN3VsMd2gdgx1aw.jpg",
  "the-crucifix-blood-of-the-exorcist": "/u3qOxvlykoTpurg1G8VOcawoePI.jpg",
  "thrash": "/adk8weka3O5648g3de4z3y4aE7G.jpg",
};

export function sourcePosterFallbackUrl(slug: string, size: "w342" | "w500" = "w500"): string | null {
  const url = SOURCE_POSTER_URLS[slug];
  if (url) return url;
  const path = SOURCE_POSTER_PATHS[slug];
  return path ? `${TMDB_IMAGE}/${size}${path}` : null;
}
