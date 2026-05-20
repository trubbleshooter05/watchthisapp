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

/** Returns a stable integer hash for a string. */
function simpleHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return Math.abs(h >>> 0);
}

/** Bundles filled by this script use one of these template signatures. */
function isAutoTemplate(bundle) {
  const recs = bundle.recommendations ?? [];
  if (recs.length === 0) return false;
  const t0 = recs[0]?.whyYoullLoveIt ?? "";
  // Legacy "clicked for you" pattern
  if (t0.startsWith("If ") && t0.includes(" clicked for you, ") && t0.includes(" is a strong next stop:")) return true;
  // Current fill-all-bundles patterns: majority of recs start with "If " + source title or use "worked for you"
  const ifCount = recs.filter((r) => (r.whyYoullLoveIt ?? "").startsWith("If ")).length;
  const workedCount = recs.filter((r) => (r.whyYoullLoveIt ?? "").toLowerCase().includes("worked for you")).length;
  return ifCount >= 5 || workedCount >= 3;
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
  // 0
  (t, y, genres, dir) =>
    `${t} (${y}) stuck because it commits to its ${(genres[0] ?? "story").toLowerCase()} premise without apologizing—viewers remember set pieces and momentum as much as plot.${dir ? ` ${dir}'s control of tone keeps the ride coherent.` : ""}`,
  // 1
  (t, y, genres, dir) =>
    `People revisit ${t} for the same reason it broke through in ${y}: clear stakes, memorable faces, and a ${(genres[1] ?? genres[0] ?? "genre").toLowerCase()} rhythm that doesn't stall in the middle.${dir ? ` ${dir} keeps the ensemble pointed in one direction.` : ""}`,
  // 2
  (t, y, genres) =>
    `${t} works as a ${(genres[0] ?? "crowd").toLowerCase()} movie with a point of view—fans quote moments, but they also argue about what the film is actually saying about power, desire, or survival.`,
  // 3
  (t, y, genres) =>
    `Audiences latched onto ${t} (${y}) as a ${(genres[0] ?? "sharp").toLowerCase()} theatrical experience: big enough for a group watch, specific enough to reward a second viewing once you know where it's headed.`,
  // 4
  (t, y, genres, dir) =>
    `${t} (${y}) lands somewhere specific in the memory: not just a ${(genres[0] ?? "film").toLowerCase()} but a feeling, the kind of watch that gets referenced in conversations years later.${dir ? ` ${dir}'s decisions hold up under scrutiny.` : ""}`,
  // 5
  (t, y, genres, dir) =>
    `What keeps ${t} in rotation is that it rewards a rewatch—the ${(genres[0] ?? "story").toLowerCase()} mechanics are richer than they appear, and the setup pays off more than you noticed the first time.${dir ? ` ${dir} hides the craft well.` : ""}`,
  // 6
  (t, y, genres) =>
    `${t} (${y}) earns its reputation by doing the hard thing: it's a ${(genres[0] ?? "genre").toLowerCase()} film that actually has something to say, and the audience knows it even when they can't articulate why.`,
  // 7
  (t, y, genres, dir) =>
    `Few ${(genres[0] ?? "films").toLowerCase()} from ${y} stuck like ${t}—it found the nerve that matters and pressed on it without letting up.${dir ? ` ${dir} understood the assignment.` : ""}`,
];

const whySecond = [
  // 0
  (g) =>
    ` The ${g.slice(0, 2).join(" and ").toLowerCase()} blend is the engine: it lets the film shift registers without feeling like two different movies stitched together.`,
  // 1
  (g) =>
    ` That ${g.slice(0, 2).join(" and ").toLowerCase()} combination gives it range—it can go broad when it needs to and pull back into something intimate without losing the audience.`,
  // 2
  (g) =>
    ` It commits to ${g[0]?.toLowerCase() ?? "its genre"} without hedging: no false warmth to soften the edges, no filler to pad the runtime.`,
  // 3
  (g) =>
    ` The ${g[0]?.toLowerCase() ?? "genre"} core is where fans keep coming back—it delivers on the promise the opening scene makes.`,
];

function buildWhyPeopleLoveIt(title, year, genreNames, director) {
  const g = genreNames.length ? genreNames : ["Drama"];
  // Hash on title + year for better spread across movies; different for intro vs second
  const introIdx = simpleHash(title + String(year)) % whyIntro.length;
  const secondIdx = simpleHash(title + String(year) + "2nd") % whySecond.length;
  const first = whyIntro[introIdx](title, year, g, director);
  const second = g.length > 1 ? whySecond[secondIdx](g) : ` The film leans hard into its core genre, which is exactly what fans say they wanted more of in that era.`;
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

/**
 * 16 varied templates. Selected by (hash of source+rec title + recIndex) % 16 so
 * every slot on the same page gets a different template and different opening word.
 * Rules: no "worked for you", no "strong next pick/stop", no "DNA", no "rhyme in
 * the ways", no "natural follow-up", no consecutive same-opener.
 */
const WHY_TEMPLATES = [
  // 0 — rec-first, genre → mood arc
  (src, rec, year, sg, moodHint) =>
    `${rec} (${year}) channels the ${sg} energy of ${src} into a completely different story. Expect the same ${moodHint}, earned through its own logic rather than borrowed from the first watch.`,
  // 1 — mood-first, then genre bridge
  (src, rec, year, sg, moodHint) =>
    `The ${moodHint} that makes ${src} linger is the through-line here. ${rec} (${year}) gets there through ${sg}—same destination, entirely different route.`,
  // 2 — contrast structure: where X does A, Y does B
  (src, rec, year, sg, moodHint) =>
    `Where ${src} builds its ${sg} world through one story, ${rec} (${year}) arrives at the same ${moodHint} from a fresh angle. Different characters, same emotional charge.`,
  // 3 — viewer behaviour opening
  (src, rec, year, sg, moodHint) =>
    `Viewers who connected with ${src}'s ${sg} core tend to find ${rec} (${year}) almost immediately. The ${moodHint} is recognisable even when the characters and plot are entirely new.`,
  // 4 — critical quality claim
  (src, rec, year, sg, moodHint) =>
    `${rec} (${year}) earns its place here through the same ${sg} commitment that keeps ${src} rewatchable. It delivers ${moodHint} without shortchanging either half.`,
  // 5 — genre-as-method: X uses Y to get to Z
  (src, rec, year, sg, moodHint) =>
    `${src} uses ${sg} to get under your skin; ${rec} (${year}) works the same seam with different tools. The ${moodHint} is the reward both films share.`,
  // 6 — audience discovery pattern
  (src, rec, year, sg, moodHint) =>
    `${src} fans keep landing on ${rec} (${year}) because the ${sg} wavelength is unmistakable. Both films build toward ${moodHint} without cheating to get there.`,
  // 7 — result-first, then explanation
  (src, rec, year, sg, moodHint) =>
    `The ${moodHint} that ${src} delivers so well reappears in ${rec} (${year}), anchored by the same ${sg} instincts. Different film, same essential itch scratched.`,
  // 8 — structural trust observation
  (src, rec, year, sg, moodHint) =>
    `${rec} (${year}) understands that ${sg} works best when it trusts the audience—the same principle that drives ${src}. Both films close on ${moodHint} you won't shake quickly.`,
  // 9 — specificity-of-feeling
  (src, rec, year, sg, moodHint) =>
    `There's a specific kind of ${sg} satisfaction in ${src} that ${rec} (${year}) reproduces through its own logic. The ${moodHint} is the handshake between them.`,
  // 10 — tonal register statement
  (src, rec, year, sg, moodHint) =>
    `${rec} (${year}) occupies the same tonal register as ${src}: committed ${sg}, ${moodHint}, and zero interest in making things easier than they need to be.`,
  // 11 — lateral move framing
  (src, rec, year, sg, moodHint) =>
    `Think of ${rec} (${year}) as a lateral move from ${src}—the ${sg} priorities are the same, the story is entirely different. The ${moodHint} is what seals the pairing.`,
  // 12 — year-first variety
  (src, rec, year, sg, moodHint) =>
    `${year}'s ${rec} works the same ${sg} terrain as ${src} and lands at the same destination: ${moodHint} that feels earned rather than manufactured.`,
  // 13 — comparative without "DNA" or "conversation"
  (src, rec, year, sg, moodHint) =>
    `Both ${src} and ${rec} (${year}) insist on ${sg} without softening the edges. The ${moodHint} is the payoff fans of either film tend to cite first.`,
  // 14 — viewer psychology
  (src, rec, year, sg, moodHint) =>
    `${rec} (${year}) will feel intuitive to anyone who responded to ${src}'s ${sg} approach. The ${moodHint} plays differently here—same frequency, new transmission.`,
  // 15 — architecture metaphor (surface / beneath)
  (src, rec, year, sg, moodHint) =>
    `${src} and ${rec} (${year}) share an architecture: ${sg} on the surface, ${moodHint} beneath it. The second film earns the comparison with a distinct narrative arc.`,
];

function buildWhyYoullLoveIt(sourceTitle, sourceGenres, recTitle, recYear, recGenres, mood, recIndex) {
  const shared = sourceGenres.filter((x) => recGenres.includes(x));
  const sg = (shared.length ? shared : recGenres).slice(0, 2).join(" and ").toLowerCase() || "genre";
  const moodHint =
    mood === "funny"
      ? "comic timing and sharper banter"
      : mood === "dark"
        ? "unease that lingers after the credits"
        : mood === "bittersweet"
          ? "emotional honesty that stings a little"
          : mood === "uplifting"
            ? "earned warmth without sentimentality"
            : "momentum and clean stakes";

  // Use (source+rec hash + slot index) so every recommendation slot on the page
  // uses a different template, eliminating identical-opening repetition.
  const base = simpleHash(sourceTitle + recTitle);
  const templateIdx = (base + (recIndex ?? 0) * 3) % WHY_TEMPLATES.length;
  const fn = WHY_TEMPLATES[templateIdx];
  const raw = fn(sourceTitle, recTitle, recYear, sg, moodHint);
  const { validateWhyBlurb: _v, pickValidBlurb: _p } = { validateWhyBlurb: null, pickValidBlurb: null };
  // Inline import-free validation: just ensure not empty and ends with punctuation
  const trimmed = raw.replace(/\s+/g, " ").trim();
  return trimmed.match(/[.!?]$/) ? trimmed : trimmed + ".";
}

function sharedVibesList(sourceGenres, recGenres) {
  const shared = sourceGenres.map(toKebabGenre).filter((x) => recGenres.map(toKebabGenre).includes(x));
  const pad = recGenres.map(toKebabGenre).filter((x) => !shared.includes(x));
  return [...new Set([...shared, ...pad])].slice(0, 5);
}

const watchNextAnswers = [
  (title, top3, r0) =>
    `Start with ${r0}—it's the closest match—then work through ${top3.split(", ").slice(1).join(" and ")} for the wider orbit.`,
  (title, top3, r0) =>
    `${top3} are all strong follow-ups: same emotional range, completely different stories.`,
  (title, top3, r0) =>
    `Try ${top3}. Each one rewards the instincts that made ${title} click, without simply repeating it.`,
  (title, top3, r0) =>
    `${r0} first—it's the tightest match—then ${top3.split(", ").slice(1).join(" and ")} branch out from there.`,
];

const genreAnswers = [
  (title, year, g) =>
    `${title} (${year}) is best described as ${g}. Stores and algorithms use different labels, but that mix is what fans actually recognize on a rewatch.`,
  (title, year, g, g0) =>
    `Most people file ${title} under ${g}, though the film earns more than one label. The ${g0} side is what makes it feel distinct from similar releases.`,
  (title, year, g, g0) =>
    `${title} (${year}) blends ${g}—the ${g0} element drives the plot, but the rest is why people keep coming back.`,
  (title, year, g) =>
    `Strictly it's ${g}, but ${title} plays like it knows what genre it belongs to and pushes against it. That tension is part of the appeal.`,
];

function buildFaq(title, year, genres, recTitles, vote, collectionName) {
  const g = genres.join(", ") || "drama";
  const g0 = (genres[0] ?? "genre").toLowerCase();
  const top3 = recTitles.slice(0, 3).join(", ");
  const r0 = recTitles[0] ?? top3;
  // Use title hash for variant selection so the same movie always gets the same answer
  // but different movies get different phrasing.
  const h = simpleHash(title + String(year));
  const qa = [
    {
      question: `What should I watch after ${title}?`,
      answer: watchNextAnswers[h % watchNextAnswers.length](title, top3, r0),
    },
    {
      question: `What genre is ${title}?`,
      answer: genreAnswers[h % genreAnswers.length](title, year, g, g0),
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
      answer: `Viewer scores sit around ${vote.toFixed(1)}/10 on TMDB—high enough that replays are common for people who like this ${g0} lane.`,
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
            pickMood(recGenres.length ? recGenres : sourceGenres),
            i
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
