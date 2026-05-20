/**
 * Regenerate recommendations + source blurb via OpenAI, resolve TMDB IDs, write JSON.
 *
 *   node scripts/regenerate-recs.mjs saltburn
 *   node scripts/regenerate-recs.mjs --all-flagged
 *
 * Requires OPENAI_API_KEY and TMDB_API_KEY in .env.local
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  loadAllBundles,
  relatedByGenreOverlap,
  buildFaq,
  runQualityAudit,
} from "./quality-lib.mjs";
import { validateWhyBlurb } from "./recommendation-why-blurb.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data", "recommendations");
const cacheDir = path.join(root, ".cache");
const tmdbCachePath = path.join(cacheDir, "tmdb-script-cache.json");

const MOODS = new Set(["dark", "uplifting", "tense", "funny", "bittersweet"]);
const OPENAI_MODEL = "gpt-4o-mini";
const CHRONOLOGY_RULE =
  "IMPORTANT: Respect chronology in your descriptions. If the recommended film predates the source, acknowledge it as an antecedent or influence without implying it copied or was inspired by the newer film—older films cannot be inspired by movies that didn't exist yet. If the recommended film postdates the source, you may note it builds on a tradition the source helped establish. Either way, write the chronological framing in your own words; do NOT copy any example phrases from this instruction.";

function loadEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!existsSync(p)) return {};
  const raw = readFileSync(p, "utf8");
  const out = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...process.env, ...loadEnvLocal() };
const OPENAI_API_KEY = env.OPENAI_API_KEY?.trim();
const TMDB_API_KEY = env.TMDB_API_KEY?.trim();

let tmdbCache = {};
if (existsSync(tmdbCachePath)) {
  try {
    tmdbCache = JSON.parse(readFileSync(tmdbCachePath, "utf8"));
  } catch {
    tmdbCache = {};
  }
}

function saveTmdbCache() {
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
  writeFileSync(tmdbCachePath, JSON.stringify(tmdbCache, null, 2));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function tmdbFetch(pathname) {
  const cacheKey = pathname;
  if (tmdbCache[cacheKey]) return tmdbCache[cacheKey];
  if (!TMDB_API_KEY) throw new Error("TMDB_API_KEY missing");
  const url = `https://api.themoviedb.org/3${pathname}${pathname.includes("?") ? "&" : "?"}api_key=${TMDB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${pathname} → ${res.status}`);
  const data = await res.json();
  tmdbCache[cacheKey] = data;
  saveTmdbCache();
  await sleep(200);
  return data;
}

function yearFromDate(d) {
  if (!d) return 0;
  return parseInt(d.slice(0, 4), 10) || 0;
}

function normTitle(t) {
  return String(t)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchMovie(title, year) {
  const q = encodeURIComponent(title);
  const pathWithYear = year ? `/search/movie?query=${q}&year=${year}` : `/search/movie?query=${q}`;
  const data = await tmdbFetch(pathWithYear);
  const results = data.results || [];
  if (!results.length && year) {
    return await searchMovie(title, null);
  }
  if (!results.length) return null;

  const nt = normTitle(title);
  let best = results[0];
  let bestScore = -1;
  for (const r of results) {
    const rt = normTitle(r.title || r.original_title || "");
    let score = 0;
    if (rt === nt) score += 100;
    else if (rt.includes(nt) || nt.includes(rt)) score += 50;
    const ry = yearFromDate(r.release_date);
    if (year && ry) score += 20 - Math.min(20, Math.abs(ry - year));
    score += Math.min(10, (r.popularity || 0) / 10);
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

async function fetchMovieDetail(id) {
  return tmdbFetch(`/movie/${id}?append_to_response=credits`);
}

function extractJsonObject(text) {
  const t = String(text).trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : t;
  return JSON.parse(raw);
}

/** Strip control chars / lone UTF-16 surrogates so JSON.stringify → OpenAI never breaks the request body. */
function sanitizeChatText(s) {
  return String(s)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ")
    .replace(/[\uD800-\uDFFF]/g, "");
}

async function openaiJson(system, user) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing in .env.local");
  const sys = sanitizeChatText(system);
  const usr = sanitizeChatText(user);
  let body;
  try {
    body = JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: usr },
      ],
    });
  } catch (e) {
    throw new Error(`Failed to serialize OpenAI request: ${e.message}`);
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || JSON.stringify(data));
  }
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");
  return extractJsonObject(content);
}

function buildRecPrompt({ title, year, whyPeopleLoveIt, vibes }) {
  const vibeStr = Array.isArray(vibes) ? vibes.join(", ") : String(vibes);
  return `I need 10 movie recommendations for someone who loved "${title}" (${year}).

Here's what people love about ${title}:
${whyPeopleLoveIt}

Key vibes: ${vibeStr}

RULES — follow these exactly:
1. Each recommendation must share the EMOTIONAL EXPERIENCE or THEMATIC CORE of ${title}, not just surface-level genre. "Both are dramas" is not a reason. "Both explore how obsession corrodes identity" IS a reason.

2. For EACH recommendation, write a "whyYoullLoveIt" that is:
   - Exactly 1–2 complete sentences (full clauses, no fragments, no clipped endings)
   - References a SPECIFIC element of ${title} (a character dynamic, a scene type, a feeling, a theme)
   - Connects it to a SPECIFIC element of the recommended movie
   - NEVER starts with "If you liked ${title}", "If ${title} clicked for you", or "If ${title} resonated for you"
   - NEVER uses generic phrases like "both trade in [genre]", "similar willingness to go big", "emotional DNA", "laid groundwork", "this predecessor shows", "carries the torch"

3. Do NOT recommend sequels, films from the same franchise, or films by the same director unless the connection is non-obvious.

4. Mix 70% well-known films with 30% hidden gems (TMDB rating 7.0+ that are less mainstream).

5. Sort recommendations by matchPercentage descending (highest first).

6. Assign match percentages between 70-98. Reserve 95+ for genuine spiritual siblings.

7. Assign mood to each: exactly one of: dark, uplifting, tense, funny, bittersweet.

8. sharedVibes: 3-6 short kebab-case or single-word tags (e.g. obsession, class-anxiety, psychological).

9. UNIQUENESS: Every recommendation must open with a DIFFERENT word and use a DIFFERENT sentence structure. No two blurbs on this list may share the same opening word. Vary your angle across the 10 entries: use temporal connections, tonal parallels, character-focused observations, plot-structural comparisons, and cinematically specific descriptions.

Return ONLY valid JSON with this shape (10 items in recommendations):
{
  "recommendations": [
    {
      "title": "The Talented Mr. Ripley",
      "year": 1999,
      "matchPercentage": 96,
      "whyYoullLoveIt": "One or two complete sentences here.",
      "sharedVibes": ["obsession", "class", "psychological"],
      "mood": "dark"
    }
  ]
}`;
}

function buildSourcePrompt({ title, year }) {
  return `Write a 2-sentence description of why audiences love "${title}" (${year}). Be specific — reference actual elements of the film (characters, scenes, themes, directorial choices). Do NOT use empty critic-speak like "stunning visuals," "great performances," "lush cinematography," or "tour de force." Write like a friend who's passionate about this movie explaining it over drinks.

Also provide 4-6 short vibe tags (kebab-case) capturing tone and theme.

Return ONLY JSON: { "whyPeopleLoveIt": "...", "vibes": ["tag-one", "tag-two"] }`;
}

function validateRecItem(x, i) {
  const yr = typeof x.year === "number" ? x.year : parseInt(x.year, 10);
  if (!x.title || !Number.isFinite(yr)) return `rec[${i}] missing title/year`;
  x.year = yr;
  if (typeof x.matchPercentage !== "number" || x.matchPercentage < 70 || x.matchPercentage > 98)
    return `rec[${i}] bad matchPercentage`;
  if (!x.whyYoullLoveIt || typeof x.whyYoullLoveIt !== "string") return `rec[${i}] missing whyYoullLoveIt`;
  if (!MOODS.has(x.mood)) return `rec[${i}] bad mood: ${x.mood}`;
  if (!Array.isArray(x.sharedVibes) || x.sharedVibes.length < 2) return `rec[${i}] sharedVibes`;
  const low = x.whyYoullLoveIt.toLowerCase();
  if (
    low.includes("clicked for you") ||
    low.includes("strong next stop") ||
    low.includes("strong next pick") ||
    low.includes("both trade in") ||
    low.includes("emotional dna") ||
    low.includes("laid groundwork") ||
    low.includes("this predecessor shows") ||
    low.includes("makes a natural follow-up") ||
    low.includes("rhyme in the ways that matter") ||
    /if you liked /.test(low) ||
    /if you loved /.test(low) ||
    /if you? .{2,30} resonated for you/.test(low)
  )
    return `rec[${i}] banned template phrase in whyYoullLoveIt`;
  const v = validateWhyBlurb(x.whyYoullLoveIt);
  if (!v.ok) return `rec[${i}] whyYoullLoveIt: ${v.reason}`;
  x.whyYoullLoveIt = v.text;
  return null;
}

function moodFromGenreNames(names) {
  const g = new Set(names.map((x) => x.toLowerCase()));
  if (g.has("comedy") && !g.has("horror")) return "funny";
  if (g.has("horror")) return "dark";
  if (g.has("romance")) return "bittersweet";
  if (g.has("family") || g.has("animation")) return "uplifting";
  return "tense";
}

async function buildTmdbPadEntry(movieResult, matchPercentage, slotIndex) {
  const detail = await fetchMovieDetail(movieResult.id);
  const ry = yearFromDate(detail.release_date);
  const genreNames = (detail.genres || []).map((g) => g.name);
  const genres = genreNames.map((n) => n.toLowerCase().replace(/\s+/g, "-"));
  const t = detail.title || movieResult.title;
  // Genre-neutral hooks — no subject-specific references (social class, awkward rooms, etc.)
  // 14 hooks so a page with multiple TMDB-padded slots gets varied language.
  const hooks = [
    `${t} (${ry}) surfaces consistently in audience overlap data for this genre—different story, recognisably similar emotional register throughout.`,
    `Viewers who appreciated the pacing and payoff of the previous film tend to respond well to ${t}: the narrative structure rhymes even when the subject matter diverges.`,
    `${t} is a practical addition based on TMDB audience overlap—not a copy, but it satisfies the tonal appetite that brought you here.`,
    `Consider ${t} (${ry}) a lateral move: the character dynamics shift, the genre energy stays close enough to feel like a natural continuation.`,
    `${t} (${ry}) operates at the same emotional temperature—new cast, new conflict, comparable investment in the outcome.`,
    `The connection between this film and ${t} comes down to pacing and stakes, not plot similarity: both earn their endings rather than giving them away early.`,
    `${t} (${ry}) rewards the instincts that brought you to this list—it approaches its story from a different angle but lands on a comparable register.`,
    `Audience behaviour data places ${t} in frequent rotation alongside this genre: the tonal overlap holds even as the specific story changes completely.`,
    `${t} (${ry}) is the kind of film that satisfies the same underlying drive—different surface, comparable depth once it finds its footing.`,
    `Where many recommendations feel like genre copies, ${t} (${ry}) earns its place through structural and tonal alignment rather than surface similarity.`,
    `${t} keeps appearing in watchlists alongside these titles because the emotional investment it asks for—and delivers—matches the pattern established here.`,
    `${t} (${ry}) rounds out this list as a dependable tonal companion: the story goes somewhere different, but the craft and register stay consistent.`,
    `Viewers who finished the previous film often queue ${t} next—the overlap is not in plot but in the kind of attention both films demand.`,
    `${t} (${ry}) fits the emotional neighbourhood of this selection: unhurried where it needs to be, sharp when the story calls for it.`,
  ];
  // No scrub needed — hooks no longer reference "the last film"
  const scrub = (s) => s;
  let whyYoullLoveIt = "";
  for (let k = 0; k < hooks.length; k++) {
    const raw = scrub(hooks[(slotIndex + k) % hooks.length]);
    const v = validateWhyBlurb(raw);
    if (v.ok) {
      whyYoullLoveIt = v.text;
      break;
    }
  }
  if (!whyYoullLoveIt) {
    const raw = scrub(hooks[slotIndex % hooks.length]);
    const v = validateWhyBlurb(raw);
    whyYoullLoveIt = v.ok ? v.text : raw;
  }
  return {
    tmdbId: detail.id,
    title: t,
    year: ry,
    posterPath: detail.poster_path ?? null,
    matchPercentage,
    whyYoullLoveIt,
    sharedVibes: genres.slice(0, 5),
    mood: moodFromGenreNames(genreNames),
  };
}

async function padFromTmdb(sourceTmdbId, out, seen) {
  const recData = await tmdbFetch(`/movie/${sourceTmdbId}/recommendations`);
  await sleep(200);
  const simData = await tmdbFetch(`/movie/${sourceTmdbId}/similar`);
  const merged = [...(recData.results || []), ...(simData.results || [])];
  let pct = 72;
  let slot = out.length;
  for (const r of merged) {
    if (out.length >= 10) break;
    if (!r?.id || r.id === sourceTmdbId || seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(await buildTmdbPadEntry(r, Math.max(70, pct), slot));
    slot++;
    pct -= 2;
  }
}

async function resolveRecommendations(llmRecs, sourceTmdbId) {
  const out = [];
  const seen = new Set();
  for (let i = 0; i < llmRecs.length; i++) {
    const r = llmRecs[i];
    const hit = await searchMovie(r.title, r.year);
    if (!hit) {
      console.warn(`TMDB miss: "${r.title}" (${r.year}) — skipping`);
      continue;
    }
    if (hit.id === sourceTmdbId) continue;
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    const detail = await fetchMovieDetail(hit.id);
    const ry = yearFromDate(detail.release_date) || r.year;
    out.push({
      tmdbId: detail.id,
      title: detail.title || r.title,
      year: ry,
      posterPath: detail.poster_path ?? null,
      matchPercentage: r.matchPercentage,
      whyYoullLoveIt: r.whyYoullLoveIt.trim(),
      sharedVibes: r.sharedVibes.map((s) => String(s).toLowerCase().replace(/\s+/g, "-")),
      mood: r.mood,
    });
  }
  if (out.length < 10) {
    console.warn(`Only ${out.length} LLM recs resolved; padding from TMDB similar/recommendations.`);
    await padFromTmdb(sourceTmdbId, out, seen);
  }
  return out;
}

async function regenerateOne(slug) {
  const filePath = path.join(dataDir, `${slug}.json`);
  if (!existsSync(filePath)) throw new Error(`No bundle: ${slug}`);

  const bundle = JSON.parse(readFileSync(filePath, "utf8"));
  const src = bundle.sourceMovie;
  if (!src?.tmdbId) throw new Error("Missing sourceMovie.tmdbId");

  const detail = await fetchMovieDetail(src.tmdbId);
  const sourceGenres = (detail.genres || []).map((g) => g.name);
  const vote = detail.vote_average ?? 7;
  const collectionName = detail.belongs_to_collection?.name ?? null;
  const title = detail.title || src.title;
  const year = yearFromDate(detail.release_date) || src.year;

  const system = `You are a film critic with encyclopedic knowledge and strong opinions. You recommend movies based on FEELING and EXPERIENCE, not just genre tags. ${CHRONOLOGY_RULE} Output valid JSON only.`;
  const userRec = buildRecPrompt({
    title,
    year,
    whyPeopleLoveIt: src.whyPeopleLoveIt,
    vibes: src.vibes,
  });

  let data = await openaiJson(system, userRec);
  await sleep(1000);

  let recs = data.recommendations;
  if (!Array.isArray(recs) || recs.length !== 10) {
    const fix = await openaiJson(
      system,
      `${userRec}\n\nERROR: You must return exactly 10 recommendations in the array. You returned ${recs?.length ?? 0}. Fix and reply with full JSON only.`
    );
    await sleep(1000);
    recs = fix.recommendations;
  }
  if (!Array.isArray(recs) || recs.length !== 10) {
    throw new Error(`Expected 10 recommendations from model, got ${recs?.length}`);
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const issues = [];
    for (let i = 0; i < recs.length; i++) {
      const bad = validateRecItem(recs[i], i);
      if (bad) issues.push(bad);
    }
    if (!issues.length) break;
    const repair = await openaiJson(
      system,
      `Fix this recommendation list. Issues:\n${issues.slice(0, 15).join("\n")}

Rules for whyYoullLoveIt: 1–2 complete sentences only (no fragments, no clipped endings, no stitched half-phrases). Each sentence must end with . ! or ? and contain at least eight words.
If you write two sentences, separate them with a single space after the first final period.

Return full JSON with key "recommendations" (array of 10). Titles must be real movies.

${JSON.stringify(recs).slice(0, 8000)}`
    );
    await sleep(1000);
    recs = repair.recommendations;
    if (!Array.isArray(recs) || recs.length !== 10) {
      throw new Error(`Repair returned invalid recommendations length: ${recs?.length}`);
    }
  }

  for (let i = 0; i < recs.length; i++) {
    const err = validateRecItem(recs[i], i);
    if (err) throw new Error(err);
  }

  let resolved = await resolveRecommendations(recs, src.tmdbId);
  if (resolved.length < 10) {
    throw new Error(`Only ${resolved.length}/10 recommendations after TMDB resolve + pad for ${slug}`);
  }
  resolved = resolved.slice(0, 10);

  const sourceData = await openaiJson(
    system,
    buildSourcePrompt({ title, year })
  );
  await sleep(1000);

  if (!sourceData.whyPeopleLoveIt || !Array.isArray(sourceData.vibes)) {
    throw new Error("Source response missing whyPeopleLoveIt or vibes");
  }

  const newSource = {
    ...src,
    title,
    year,
    genres: sourceGenres.length ? sourceGenres : src.genres,
    whyPeopleLoveIt: String(sourceData.whyPeopleLoveIt).trim(),
    vibes: sourceData.vibes.map((v) => String(v).toLowerCase().replace(/\s+/g, "-")).slice(0, 8),
  };

  const faq = buildFaq(title, year, newSource.genres, resolved.map((r) => r.title), vote, collectionName);

  const allBundles = loadAllBundles(dataDir);
  const next = {
    sourceMovie: newSource,
    recommendations: resolved,
    faq,
    relatedPages: [],
  };
  next.relatedPages = relatedByGenreOverlap({ ...allBundles, [slug]: next }, slug, newSource.genres);

  writeFileSync(filePath, JSON.stringify(next, null, 2));
  console.log("Wrote", filePath);
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const allFlagged = process.argv.includes("--all-flagged");

  if (!OPENAI_API_KEY || !TMDB_API_KEY) {
    console.error("Need OPENAI_API_KEY and TMDB_API_KEY in .env.local");
    process.exit(1);
  }

  if (allFlagged) {
    const { flaggedSlugs } = runQualityAudit(dataDir);
    if (!flaggedSlugs.length) {
      console.log("No flagged pages from audit. Nothing to do.");
      return;
    }
    console.log("Regenerating", flaggedSlugs.length, "pages:", flaggedSlugs.join(", "));
    for (const slug of flaggedSlugs) {
      try {
        console.log("\n>>>", slug);
        await regenerateOne(slug);
      } catch (e) {
        console.error("FAILED", slug, e.message);
      }
    }
    return;
  }

  const slug = args[0];
  if (!slug) {
    console.error("Usage: node scripts/regenerate-recs.mjs <slug>\n       node scripts/regenerate-recs.mjs --all-flagged");
    process.exit(1);
  }

  await regenerateOne(slug);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
