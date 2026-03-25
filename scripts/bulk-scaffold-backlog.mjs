/**
 * For each entry in scripts/backlog.json, if data/recommendations/<slug>.json is missing,
 * TMDB search → write stub bundle (same shape as scaffold-movie.mjs).
 *
 *   node scripts/bulk-scaffold-backlog.mjs
 *
 * Skips existing files (e.g. full parasite.json). Does not overwrite.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
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

const key = loadKey();
if (!key) {
  console.error("Set TMDB_API_KEY in the environment or .env.local");
  process.exit(1);
}

const backlog = JSON.parse(readFileSync(path.join(__dirname, "backlog.json"), "utf8"));
const outDir = path.join(__dirname, "..", "data", "recommendations");

async function searchFirstId(title, year) {
  const q = encodeURIComponent(title);
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${q}&year=${year}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${title}: ${res.status}`);
  const data = await res.json();
  const r = data.results?.[0];
  return r?.id ?? null;
}

async function fetchMovie(id) {
  const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${key}`);
  if (!res.ok) throw new Error(`movie ${id}: ${res.status}`);
  return res.json();
}

const existing = new Set(readdirSync(outDir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")));

let created = 0;
let skipped = 0;

for (const row of backlog) {
  const outFile = path.join(outDir, `${row.slug}.json`);
  if (existsSync(outFile)) {
    skipped++;
    continue;
  }

  try {
    const id = await searchFirstId(row.title, row.year);
    if (!id) {
      console.error("NOT FOUND:", row.slug, row.title);
      continue;
    }
    const m = await fetchMovie(id);
    const year = m.release_date ? parseInt(m.release_date.slice(0, 4), 10) : row.year;
    const genres = (m.genres || []).map((g) => g.name);

    const bundle = {
      sourceMovie: {
        tmdbId: m.id,
        title: m.title,
        slug: row.slug,
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
      relatedPages: [
        "interstellar",
        "parasite",
        "inception",
        "fight-club",
        "mean-girls",
        "midsommar",
        "the-notebook",
        "shutter-island",
      ]
        .filter((s) => existing.has(s) && s !== row.slug)
        .slice(0, 5),
    };

    writeFileSync(outFile, JSON.stringify(bundle, null, 2));
    console.log("wrote", row.slug, m.id, m.title);
    created++;
    existing.add(row.slug);
  } catch (e) {
    console.error(row.slug, e.message);
  }
  await new Promise((r) => setTimeout(r, 280));
}

console.log("\nDone. created:", created, "skipped (already exists):", skipped);
console.log("Next: fill whyPeopleLoveIt, vibes, 10 recommendations, faq per file—or ask your editor to batch-write.");
