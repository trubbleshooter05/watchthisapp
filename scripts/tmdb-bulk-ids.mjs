/**
 * Resolve TMDB movie IDs for scripts/backlog.json (skips slugs that already have JSON).
 *
 * Usage (from repo root, TMDB_API_KEY in env or .env.local):
 *   node scripts/tmdb-bulk-ids.mjs
 *
 * Copy the TSV into a spreadsheet, then run scaffold-movie.mjs per row.
 */
import { readFileSync, existsSync } from "fs";
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
const dataDir = path.join(__dirname, "..", "data", "recommendations");

async function searchMovie(title, year) {
  const q = encodeURIComponent(title);
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${q}&year=${year}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const data = await res.json();
  const r = data.results?.[0];
  if (!r) return null;
  return { id: r.id, title: r.title, release_date: r.release_date };
}

console.log("slug\ttmdbId\ttitle\trelease_date\texists_json");

for (const row of backlog) {
  const jsonPath = path.join(dataDir, `${row.slug}.json`);
  if (existsSync(jsonPath)) {
    console.log(`${row.slug}\t(skip)\t—\t—\talready exists`);
    continue;
  }
  try {
    const hit = await searchMovie(row.title, row.year);
    if (!hit) {
      console.log(`${row.slug}\t?\tNOT FOUND\t\t`);
      continue;
    }
    console.log(`${row.slug}\t${hit.id}\t${hit.title}\t${hit.release_date || ""}\t`);
  } catch (e) {
    console.log(`${row.slug}\tERROR\t${e.message}\t\t`);
  }
  await new Promise((r) => setTimeout(r, 250));
}
