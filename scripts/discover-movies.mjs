/**
 * Auto-discover movies from TMDB and populate scripts/backlog.json.
 *
 * Usage:
 *   node scripts/discover-movies.mjs              # discover 5000 movies (default)
 *   node scripts/discover-movies.mjs --limit 1000 # discover 1000 movies
 *   node scripts/discover-movies.mjs --limit 500 --min-votes 1000
 *
 * Options:
 *   --limit N        How many NEW movies to add to backlog.json (default: 5000)
 *   --min-votes N    Minimum TMDB vote count (default: 300) — higher = more well-known
 *   --min-rating N   Minimum TMDB rating (default: 6.0)
 *   --min-pop N      Minimum TMDB popularity score (default: 5)
 *   --lang XX        Original language filter (default: none = all languages)
 *   --english-only   Shortcut for --lang en
 *   --dry-run        Show what would be added without writing backlog.json
 *
 * Requires TMDB_API_KEY in .env.local
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const backlogPath = path.join(__dirname, "backlog.json");
const dataDir = path.join(root, "data", "recommendations");

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(flag, fallback) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}
const LIMIT = parseInt(getArg("--limit", "5000"), 10);
const MIN_VOTES = parseInt(getArg("--min-votes", "300"), 10);
const MIN_RATING = parseFloat(getArg("--min-rating", "6.0"));
const MIN_POP = parseFloat(getArg("--min-pop", "5"));
const LANG = args.includes("--english-only") ? "en" : getArg("--lang", null);
const DRY_RUN = args.includes("--dry-run");

// ── Load TMDB API key ─────────────────────────────────────────────────────────
function loadKey() {
  const env = process.env.TMDB_API_KEY?.trim();
  if (env) return env;
  const p = path.join(root, ".env.local");
  if (!existsSync(p)) return null;
  const raw = readFileSync(p, "utf8");
  const m = raw.match(/^TMDB_API_KEY=(.+)$/m);
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
}

const TMDB_KEY = loadKey();
if (!TMDB_KEY) {
  console.error("TMDB_API_KEY not found in environment or .env.local");
  process.exit(1);
}

// ── Load existing slugs (already in backlog or already built) ─────────────────
function existingSlugs() {
  const built = new Set(
    readdirSync(dataDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
  );
  const backlog = existsSync(backlogPath)
    ? JSON.parse(readFileSync(backlogPath, "utf8"))
    : [];
  for (const entry of backlog) built.add(entry.slug);
  return built;
}

// ── Slug generation ───────────────────────────────────────────────────────────
function toSlug(title) {
  return title
    .toLowerCase()
    .replace(/[''ʼ]/g, "")            // remove apostrophes
    .replace(/[^a-z0-9]+/g, "-")      // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, "")          // trim leading/trailing hyphens
    .replace(/-{2,}/g, "-");           // collapse double hyphens
}

// ── TMDB fetch with retry ─────────────────────────────────────────────────────
async function tmdbFetch(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        const wait = parseInt(res.headers.get("retry-after") || "10", 10) * 1000;
        console.warn(`Rate limited — waiting ${wait / 1000}s`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.json();
    } catch (e) {
      if (attempt === retries) throw e;
      await sleep(2000 * attempt);
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🎬 TMDB Movie Discover`);
  console.log(`  Target:     ${LIMIT} new movies`);
  console.log(`  Min votes:  ${MIN_VOTES}`);
  console.log(`  Min rating: ${MIN_RATING}`);
  console.log(`  Min pop:    ${MIN_POP}`);
  console.log(`  Language:   ${LANG ?? "all"}`);
  console.log(`  Dry run:    ${DRY_RUN}\n`);

  const existing = existingSlugs();
  console.log(`Already have ${existing.size} slugs (built + backlog). Skipping these.\n`);

  const newEntries = [];
  let page = 1;
  const MAX_PAGES = 500; // TMDB caps at page 500

  while (newEntries.length < LIMIT && page <= MAX_PAGES) {
    let url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}`
      + `&sort_by=popularity.desc`
      + `&vote_count.gte=${MIN_VOTES}`
      + `&vote_average.gte=${MIN_RATING}`
      + `&page=${page}`;

    if (LANG) url += `&with_original_language=${LANG}`;

    const data = await tmdbFetch(url);
    const results = data.results ?? [];

    if (results.length === 0) {
      console.log(`No results on page ${page}. Stopping.`);
      break;
    }

    for (const movie of results) {
      if (newEntries.length >= LIMIT) break;

      // Apply filters
      if ((movie.popularity ?? 0) < MIN_POP) continue;
      if (!movie.title || !movie.release_date) continue;

      const year = parseInt(movie.release_date.slice(0, 4), 10);
      if (!year || year < 1950) continue;

      const slug = toSlug(movie.title);
      if (!slug || slug.length < 2) continue;
      if (existing.has(slug)) continue;

      // Mark as seen so duplicates within this run are skipped
      existing.add(slug);

      newEntries.push({
        slug,
        title: movie.title,
        year,
      });
    }

    const totalPages = data.total_pages ?? page;
    process.stdout.write(
      `\r  Page ${page}/${Math.min(totalPages, MAX_PAGES)} — found ${newEntries.length}/${LIMIT} new movies`
    );

    page++;
    await sleep(250); // ~4 requests/sec — well within TMDB limits
  }

  console.log(`\n\nDiscovered ${newEntries.length} new movies.`);

  if (newEntries.length === 0) {
    console.log("Nothing new to add.");
    return;
  }

  if (DRY_RUN) {
    console.log("\n[DRY RUN] Would add:");
    newEntries.slice(0, 20).forEach((e) => console.log(`  ${e.slug} — ${e.title} (${e.year})`));
    if (newEntries.length > 20) console.log(`  ... and ${newEntries.length - 20} more`);
    return;
  }

  // Merge with existing backlog (don't overwrite entries already there)
  const existingBacklog = existsSync(backlogPath)
    ? JSON.parse(readFileSync(backlogPath, "utf8"))
    : [];

  const merged = [...existingBacklog, ...newEntries];
  writeFileSync(backlogPath, JSON.stringify(merged, null, 2));

  console.log(`\n✅ Added ${newEntries.length} entries to scripts/backlog.json`);
  console.log(`   Total backlog entries: ${merged.length}`);
  console.log(`\nNext step:`);
  console.log(`   npm run data:bulk-scaffold`);
  console.log(`   npm run data:fill-all`);
  console.log(`   (optional) npm run data:regen-recs -- --all-flagged`);
  console.log(`   npm run build && git add -A && git commit -m "Add movies" && git push\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
