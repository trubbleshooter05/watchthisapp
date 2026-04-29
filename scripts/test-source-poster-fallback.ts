import { strict as assert } from "assert";
import { sourcePosterFallbackUrl } from "../src/lib/source-poster-fallback";

const expected = {
  "quieres-ser-mi-novia": "https://image.tmdb.org/t/p/w500/oscW8xV8EhRYj7iAhyVlBohKqxo.jpg",
  "sniper-no-nation": "https://image.tmdb.org/t/p/w500/tUmARo0TZEK1EaSuS6dU35FhDyU.jpg",
  "star-wars-the-mandalorian-and-grogu": "https://image.tmdb.org/t/p/w500/m8lEffySgTuKxN3VsMd2gdgx1aw.jpg",
  "the-crucifix-blood-of-the-exorcist": "https://image.tmdb.org/t/p/w500/u3qOxvlykoTpurg1G8VOcawoePI.jpg",
  "thrash": "https://image.tmdb.org/t/p/w500/adk8weka3O5648g3de4z3y4aE7G.jpg",
};

for (const [slug, url] of Object.entries(expected)) {
  assert.equal(sourcePosterFallbackUrl(slug), url, slug);
}

assert.equal(sourcePosterFallbackUrl("not-a-known-fallback"), null);

console.log("source poster fallback test passed");
