/**
 * Fill stub recommendation bundles using TMDB (no overview paste).
 * Skips files that already look complete (10 recs, no EDIT placeholders).
 *
 *   node scripts/fill-all-bundles.mjs
 *   node scripts/fill-all-bundles.mjs --force        # overwrite everything (dangerous)
 *   node scripts/fill-all-bundles.mjs --refine-auto  # re-pick TMDB recs for auto-filled bundles only
 *   node scripts/fill-all-bundles.mjs --fix-sequels  # re-fill only pages that have sequel recs
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pickValidBlurb } from "./recommendation-why-blurb.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const force = process.argv.includes("--force");
const refineAuto = process.argv.includes("--refine-auto");
const fixSequels = process.argv.includes("--fix-sequels");
const onlySlug = getArg("--only-slug", null);

function getArg(flag, fallback = null) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

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

const dataDir = path.join(__dirname, "..", "data", "recommendations");

async function tmdb(pathname) {
  const url = `https://api.themoviedb.org/3${pathname}${pathname.includes("?") ? "&" : "?"}api_key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${pathname} → ${res.status}`);
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function needsFill(bundle) {
  if (force) return true;
  const w = bundle.sourceMovie?.whyPeopleLoveIt ?? "";
  const v = bundle.sourceMovie?.vibes ?? [];
  const recs = bundle.recommendations ?? [];
  const faqStr = JSON.stringify(bundle.faq ?? []);
  if (recs.length < 10) return true;
  if (w.includes("EDIT THIS") || w.includes("EDIT:")) return true;
  if (v.some((x) => String(x).startsWith("EDIT"))) return true;
  if (faqStr.includes("EDIT")) return true;
  return false;
}

/** Bundles filled by this script use this sentence pattern on every rec. */
function isAutoTemplate(bundle) {
  const t = bundle.recommendations?.[0]?.whyYoullLoveIt ?? "";
  return t.startsWith("If ") && t.includes(" clicked for you, ") && t.includes(" is a strong next stop:");
}

/** Returns true if the bundle has any obvious sequel/franchise recommendations. */
function hasSequelRecs(bundle) {
  const sourceTitle = bundle.sourceMovie?.title ?? "";
  const recs = bundle.recommendations ?? [];
  return recs.some((r) => isSequelOrFranchise(sourceTitle, null, r.title ?? ""));
}

/**
 * Returns true if recTitle is a sequel/franchise entry of the source movie.
 * Uses title-prefix matching and collection-name word overlap.
 */
function isSequelOrFranchise(sourceTitle, collectionName, recTitle) {
  if (!recTitle) return false;
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const src = norm(sourceTitle);
  const rec = norm(recTitle);

  // Exact match (shouldn't happen but guard anyway)
  if (rec === src) return true;

  // Rec title starts with source title (e.g. "Back to the Future Part II")
  if (rec.startsWith(src + " ")) return true;

  // Collection-based: remove generic words then check word overlap
  if (collectionName) {
    const collKey = norm(collectionName)
      .replace(/\b(collection|franchise|series|saga|universe|films?|movies?|parts?)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const collWords = collKey.split(" ").filter((w) => w.length > 3);
    if (collWords.length >= 2) {
      const recWords = new Set(rec.split(" "));
      const hits = collWords.filter((w) => recWords.has(w)).length;
      if (hits / collWords.length >= 0.65) return true;
    }
  }

  return false;
}

function pickTopRecommendations(merged, sourceId, sourceGenreIds, sourceTitle, collectionName) {
  const deduped = [];
  const seen = new Set();
  for (const r of merged) {
    if (!r?.id || r.id === sourceId || seen.has(r.id)) continue;
    seen.add(r.id);
    const recTitle = r.title || r.original_title || "";
    if (isSequelOrFranchise(sourceTitle, collectionName, recTitle)) continue;
    deduped.push(r);
  }

  function overlap(r) {
    return (r.genre_ids || []).filter((gid) => sourceGenreIds.includes(gid)).length;
  }

  function rank(list) {
    return [...list].sort((a, b) => {
      const o = overlap(b) - overlap(a);
      if (o !== 0) return o;
      const vc = (b.vote_count || 0) - (a.vote_count || 0);
      if (vc !== 0) return vc;
      return (b.vote_average || 0) - (a.vote_average || 0);
    });
  }

  let minVotes = 250;
  let minAvg = 6.2;
  for (let attempt = 0; attempt < 4; attempt++) {
    const filtered = deduped.filter(
      (r) => (r.vote_count || 0) >= minVotes && (r.vote_average || 0) >= minAvg
    );
    if (filtered.length >= 10) return rank(filtered).slice(0, 10);
    minVotes = Math.floor(minVotes * 0.45);
    minAvg = Math.max(5.4, minAvg - 0.35);
  }
  return rank(deduped).slice(0, 10);
}

function yearFromDate(d) {
  if (!d) return 0;
  return parseInt(d.slice(0, 4), 10) || 0;
}

function toKebabGenre(g) {
  return g.toLowerCase().replace(/\s+&\s+/g, "-").replace(/\s+/g, "-");
}

function pickMood(genreNames) {
  const g = new Set(genreNames.map((x) => x.toLowerCase()));
  if (g.has("comedy") && !g.has("horror")) return "funny";
  if (g.has("horror") || (g.has("thriller") && g.has("crime"))) return "dark";
  if (g.has("romance") && (g.has("drama") || g.has("comedy"))) return "bittersweet";
  if (g.has("family") || g.has("animation")) return "uplifting";
  if (g.has("comedy")) return "funny";
  return "tense";
}

function directorName(credits) {
  const c = credits?.crew?.find((x) => x.job === "Director");
  return c?.name ?? null;
}

const whyIntro = [
  (t, y, genres, dir) =>
    `${t} (${y}) stuck because it commits to its ${(genres[0] ?? "story").toLowerCase()} premise without apologizing—viewers remember set pieces and momentum as much as plot.${dir ? ` ${dir}'s control of tone keeps the ride coherent.` : ""}`,
  (t, y, genres, dir) =>
    `People revisit ${t} for the same reason it broke through in ${y}: clear stakes, memorable faces, and a ${(genres[1] ?? genres[0] ?? "genre").toLowerCase()} rhythm that doesn't stall in the middle.${dir ? ` ${dir} keeps the ensemble pointed in one direction.` : ""}`,
  (t, y, genres) =>
    `${t} works as a ${(genres[0] ?? "crowd").toLowerCase()} movie with a point of view—fans quote moments, but they also argue about what the film is actually saying about power, desire, or survival.`,
  (t, y, genres) =>
    `Audiences latched onto ${t} (${y}) as a ${(genres[0] ?? "sharp").toLowerCase()} theatrical experience: big enough for a group watch, specific enough to reward a second viewing once you know where it's headed.`,
];

function buildWhyPeopleLoveIt(title, year, genreNames, director) {
  const g = genreNames.length ? genreNames : ["Drama"];
  const idx = Math.abs([...title].reduce((a, c) => a + c.charCodeAt(0), 0)) % whyIntro.length;
  const first = whyIntro[idx](title, year, g, director);
  const second =
    g.length > 1
      ? ` The ${g.slice(0, 2).join(" and ").toLowerCase()} blend is the engine: it lets the film shift registers without feeling like two different movies stitched together.`
      : ` The film leans hard into its core genre, which is exactly what fans say they wanted more of from blockbusters in that era.`;
  return (first + second).replace(/\s+/g, " ").trim();
}

function buildVibes(genreNames, vote) {
  const base = genreNames.slice(0, 4).map(toKebabGenre);
  const extra = [];
  if (vote >= 7.8) extra.push("crowd-favorite");
  else if (vote < 6.8) extra.push("divisive");
  else extra.push("rewatchable");
  return [...new Set([...base, ...extra])].slice(0, 6);
}

function buildWhyYoullLoveIt(sourceTitle, sourceGenres, recTitle, recYear, recGenres, mood) {
  const shared = sourceGenres.filter((x) => recGenres.includes(x));
  const sg = shared.length
    ? shared.slice(0, 2).join(" and ").toLowerCase()
    : recGenres.slice(0, 2).join(" and ").toLowerCase();
  const moodHint =
    mood === "funny"
      ? "comic timing and sharper banter"
      : mood === "dark"
        ? "unease that lingers after the credits"
        : mood === "bittersweet"
          ? "emotional whiplash that feels honest"
          : mood === "uplifting"
            ? "earned warmth without mush"
            : "momentum and clean stakes";

  return pickValidBlurb([
    () =>
      `If ${sourceTitle} worked for you, ${recTitle} (${recYear}) is a strong next pick. The two films share ${sg} throughlines and ${moodHint}, even though the stories go in different directions.`,
    () =>
      `${recTitle} (${recYear}) makes a natural follow-up to ${sourceTitle} for viewers who want more of that flavor. Both lean into ${sg} and deliver ${moodHint}, while keeping the plot and characters fresh.`,
    () =>
      `After ${sourceTitle}, many fans queue ${recTitle} (${recYear}) next because the pairing feels intuitive. You still get ${sg} and the same appetite for ${moodHint}, wrapped in a new story that stands on its own.`,
    () =>
      `${recTitle} (${recYear}) belongs in the same conversation as ${sourceTitle}: both foreground ${sg} and ${moodHint} without feeling like a retread. The second film earns its place with a distinct narrative arc.`,
    () =>
      `${sourceTitle} and ${recTitle} (${recYear}) are not the same movie, but they rhyme in the ways that matter. Each commits to ${sg}, brings ${moodHint}, and trusts the audience to stay with a bold swing.`,
  ]);
}

function sharedVibesList(sourceGenres, recGenres) {
  const shared = sourceGenres.map(toKebabGenre).filter((x) => recGenres.map(toKebabGenre).includes(x));
  const pad = recGenres.map(toKebabGenre).filter((x) => !shared.includes(x));
  return [...new Set([...shared, ...pad])].slice(0, 5);
}

function buildFaq(title, year, genres, recTitles, vote, collectionName) {
  const g = genres.join(", ") || "drama";
  const top3 = recTitles.slice(0, 3).join(", ");
  const qa = [
    {
      question: `What should I watch after ${title}?`,
      answer: `Try ${top3}—each shares DNA with ${title} while changing the setting enough to feel fresh.`,
    },
    {
      question: `What genre is ${title}?`,
      answer: `${title} (${year}) is best described as ${g}. Stores and algorithms use different labels, but that mix is what fans actually recognize on a rewatch.`,
    },
  ];
  if (collectionName) {
    qa.push({
      question: `Is ${title} part of a franchise?`,
      answer: `Yes—it's part of the "${collectionName}" storyline. You can enjoy it standalone, but sequels and tie-ins build on characters and continuity established here.`,
    });
  } else {
    qa.push({
      question: `Is ${title} worth revisiting?`,
      answer: `Viewer scores sit around ${vote.toFixed(1)}/10 on TMDB—high enough that replays are common for people who like this ${(genres[0] ?? "film").toLowerCase()} lane.`,
    });
  }
  return qa;
}

function relatedByGenreOverlap(allBundles, slug, sourceGenres) {
  const scores = [];
  for (const [s, b] of Object.entries(allBundles)) {
    if (s === slug) continue;
    const og = b.sourceMovie?.genres ?? [];
    const overlap = sourceGenres.filter((g) => og.includes(g)).length;
    scores.push({ s, overlap });
  }
  scores.sort((a, b) => b.overlap - a.overlap || a.s.localeCompare(b.s));
  return scores.slice(0, 7).map((x) => x.s);
}

async function main() {
  const genreList = await tmdb("/genre/movie/list");
  const idToGenre = Object.fromEntries(genreList.genres.map((g) => [g.id, g.name]));

  const files = readdirSync(dataDir).filter((f) => f.endsWith(".json"));
  const allBundles = {};
  for (const f of files) {
    const slug = f.replace(/\.json$/, "");
    allBundles[slug] = JSON.parse(readFileSync(path.join(dataDir, f), "utf8"));
  }

  let filled = 0;
  let skipped = 0;

  for (const slug of Object.keys(allBundles).sort()) {
    if (onlySlug && slug !== onlySlug) {
      skipped++;
      continue;
    }

    const bundle = allBundles[slug];
    if (!bundle.sourceMovie?.tmdbId) {
      console.warn("skip (no tmdbId):", slug);
      skipped++;
      continue;
    }
    if (fixSequels) {
      if (!hasSequelRecs(bundle)) {
        skipped++;
        continue;
      }
    } else if (refineAuto) {
      if (!isAutoTemplate(bundle)) {
        skipped++;
        continue;
      }
    } else if (!needsFill(bundle)) {
      skipped++;
      continue;
    }

    const id = bundle.sourceMovie.tmdbId;
    try {
      const detail = await tmdb(`/movie/${id}?append_to_response=credits`);
      await sleep(260);
      const recData = await tmdb(`/movie/${id}/recommendations`);
      await sleep(260);
      const simData = await tmdb(`/movie/${id}/similar`);
      await sleep(260);

      const merged = [...(recData.results || []), ...(simData.results || [])];
      const sourceGenreIds = (detail.genres || []).map((g) => g.id);
      const collectionName = detail.belongs_to_collection?.name ?? null;
      const picked = pickTopRecommendations(merged, id, sourceGenreIds, detail.title || bundle.sourceMovie.title, collectionName);

      const sourceGenres = (detail.genres || []).map((g) => g.name);
      const dir = directorName(detail.credits);
      const y = yearFromDate(detail.release_date) || bundle.sourceMovie.year;
      const vote = detail.vote_average ?? 7;
      if (picked.length < 10) {
        console.warn("only", picked.length, "recs for", slug);
      }

      const recommendations = picked.map((r, i) => {
        const recGenres = (r.genre_ids || []).map((gid) => idToGenre[gid]).filter(Boolean);
        const ry = yearFromDate(r.release_date);
        return {
          tmdbId: r.id,
          title: r.title || r.original_title || "Unknown",
          year: ry,
          posterPath: r.poster_path ?? null,
          matchPercentage: Math.max(55, 96 - i * 2),
          whyYoullLoveIt: buildWhyYoullLoveIt(
            detail.title || bundle.sourceMovie.title,
            sourceGenres,
            r.title || r.original_title,
            ry,
            recGenres.length ? recGenres : sourceGenres,
            pickMood(recGenres.length ? recGenres : sourceGenres)
          ),
          sharedVibes: sharedVibesList(sourceGenres, recGenres.length ? recGenres : sourceGenres),
          mood: pickMood(recGenres.length ? recGenres : sourceGenres),
        };
      });

      const faq = buildFaq(
        detail.title || bundle.sourceMovie.title,
        y,
        sourceGenres,
        recommendations.map((r) => r.title),
        vote,
        collectionName
      );

      const out = {
        sourceMovie: {
          tmdbId: detail.id,
          title: detail.title || bundle.sourceMovie.title,
          slug,
          year: y,
          genres: sourceGenres.length ? sourceGenres : bundle.sourceMovie.genres,
          whyPeopleLoveIt: buildWhyPeopleLoveIt(detail.title || bundle.sourceMovie.title, y, sourceGenres, dir),
          vibes: buildVibes(sourceGenres.length ? sourceGenres : bundle.sourceMovie.genres, vote),
        },
        recommendations,
        faq,
        relatedPages: relatedByGenreOverlap(allBundles, slug, sourceGenres.length ? sourceGenres : bundle.sourceMovie.genres),
      };

      writeFileSync(path.join(dataDir, `${slug}.json`), JSON.stringify(out, null, 2));
      console.log("filled", slug);
      filled++;
      allBundles[slug] = out;

      await sleep(280);
    } catch (e) {
      console.error("FAIL", slug, e.message);
    }
  }

  console.log("\nDone. filled:", filled, "skipped:", skipped);
}

main();
