/**
 * Create data/recommendations/<slug>.json with sourceMovie filled from TMDB.
 * You must add recommendations[], faq[], relatedPages[] yourself (or paste from ChatGPT).
 *
 * Usage:
 *   node scripts/scaffold-movie.mjs <slug> <tmdbNumericId>
 *
 * Example:
 *   node scripts/scaffold-movie.mjs parasite 496243
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadKey() {
  const env = process.env.TMDB_API_KEY?.trim();
  if (env) return env;
  const p = path.join(__dirname, "..", ".env.local");
  if (!existsSync(p)) return null;
  const raw = readFileSync(p, "utf8");
  const m = raw.match(/^TMDB_API_KEY=(.+)$/m);
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
}

const [, , slug, idStr] = process.argv;
if (!slug || !idStr) {
  console.error("Usage: node scripts/scaffold-movie.mjs <slug> <tmdbId>");
  process.exit(1);
}

const tmdbId = parseInt(idStr, 10);
if (Number.isNaN(tmdbId)) {
  console.error("tmdbId must be a number");
  process.exit(1);
}

const key = loadKey();
if (!key) {
  console.error("Set TMDB_API_KEY in the environment or .env.local");
  process.exit(1);
}

const outDir = path.join(__dirname, "..", "data", "recommendations");
const outFile = path.join(outDir, `${slug}.json`);
if (existsSync(outFile)) {
  console.error("Refusing to overwrite:", outFile);
  process.exit(1);
}

const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${key}`);
if (!res.ok) {
  console.error("TMDB error", res.status, await res.text());
  process.exit(1);
}
const m = await res.json();

const year = m.release_date ? parseInt(m.release_date.slice(0, 4), 10) : 0;
const genres = (m.genres || []).map((g) => g.name);

const bundle = {
  sourceMovie: {
    tmdbId: m.id,
    title: m.title,
    slug,
    year,
    genres,
    whyPeopleLoveIt:
      "EDIT THIS: 2–4 sentences on why audiences love this film—specific, not a plot copy from IMDB.",
    vibes: ["EDIT", "ADD", "3-5", "TAGS"],
  },
  recommendations: [],
  faq: [
    {
      question: `EDIT: What movie is most similar to ${m.title}?`,
      answer: "EDIT: Your original answer.",
    },
  ],
  relatedPages: [],
};

writeFileSync(outFile, JSON.stringify(bundle, null, 2));
console.log("Wrote", outFile);
console.log("Next: fill whyPeopleLoveIt, vibes, 10 recommendations, faq, relatedPages (existing slugs only).");
