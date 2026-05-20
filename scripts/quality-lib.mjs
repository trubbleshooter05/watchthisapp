/**
 * Shared quality checks for recommendation bundles (used by audit + regen).
 */
import { readFileSync, readdirSync } from "fs";
import path from "path";
import { validateWhyBlurb } from "./recommendation-why-blurb.mjs";

const TEMPLATE_MARKERS = [
  // Legacy fill-all-bundles v1 phrases
  "clicked for you",
  "strong next stop",
  "is a strong next stop",
  "both trade in",
  "similar willingness to go big",
  // fill-all-bundles v2 Template 0 phrases (now removed from generator)
  "worked for you",
  "strong next pick",
  "makes a natural follow-up",
  "rhyme in the ways that matter",
  "many fans queue",
  // LLM chronology-rule copy phrases
  "laid groundwork",
  "this predecessor shows",
  "emotional dna",
  // fix-template-blurbs legacy phrases
  "same conversation as",
  "natural next step after",
];

export function loadAllBundles(dataDir) {
  const out = {};
  for (const f of readdirSync(dataDir).filter((x) => x.endsWith(".json"))) {
    const slug = f.replace(/\.json$/, "");
    out[slug] = JSON.parse(readFileSync(path.join(dataDir, f), "utf8"));
  }
  return out;
}

/** Sørensen–Dice on character bigrams (0–1). */
export function diceBigramSimilarity(a, b) {
  const norm = (s) =>
    String(s)
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  const s1 = norm(a);
  const s2 = norm(b);
  if (s1.length < 2 || s2.length < 2) return s1 === s2 ? 1 : 0;

  const bigrams = (s) => {
    const m = new Map();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      m.set(bg, (m.get(bg) || 0) + 1);
    }
    return m;
  };
  const A = bigrams(s1);
  const B = bigrams(s2);
  let inter = 0;
  for (const [bg, c] of A) {
    if (B.has(bg)) inter += Math.min(c, B.get(bg));
  }
  let sumA = 0;
  for (const c of A.values()) sumA += c;
  let sumB = 0;
  for (const c of B.values()) sumB += c;
  return (2 * inter) / (sumA + sumB) || 0;
}

export function openingPrefix(text, len = 72) {
  return String(text)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, len);
}

export function firstWordsKey(text, wordCount = 10) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, wordCount)
    .join(" ");
}

/**
 * @returns {{ slug: string, flagged: boolean, issues: Array<{ type: string, detail?: string, indices?: number[], pair?: [number, number], score?: number }> }}
 */
export function auditBundle(slug, bundle) {
  const issues = [];
  const recs = bundle.recommendations ?? [];
  const texts = recs.map((r) => r.whyYoullLoveIt || "");

  for (let i = 0; i < texts.length; i++) {
    const t = texts[i].toLowerCase();
    for (const marker of TEMPLATE_MARKERS) {
      if (t.includes(marker)) {
        issues.push({ type: "template_phrase", detail: marker, indices: [i] });
        break;
      }
    }
  }

  for (let i = 0; i < texts.length; i++) {
    const v = validateWhyBlurb(texts[i]);
    if (!v.ok) {
      issues.push({ type: "weak_blurb", detail: v.reason, indices: [i] });
    }
  }

  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const score = diceBigramSimilarity(texts[i], texts[j]);
      if (score > 0.7) {
        issues.push({ type: "high_similarity", pair: [i, j], score: Math.round(score * 1000) / 1000 });
      }
    }
  }

  const byPrefix = new Map();
  texts.forEach((t, idx) => {
    const p = openingPrefix(t);
    if (!byPrefix.has(p)) byPrefix.set(p, []);
    byPrefix.get(p).push(idx);
  });
  for (const [pref, indices] of byPrefix) {
    if (indices.length >= 2) {
      issues.push({ type: "identical_opening_prefix", detail: pref.slice(0, 90) + (pref.length > 90 ? "…" : ""), indices });
    }
  }

  const byFirstWords = new Map();
  texts.forEach((t, idx) => {
    const k = firstWordsKey(t, 8);
    if (!byFirstWords.has(k)) byFirstWords.set(k, []);
    byFirstWords.get(k).push(idx);
  });
  for (const indices of byFirstWords.values()) {
    if (indices.length >= 3) {
      issues.push({ type: "shared_opening_3plus", indices: [...indices] });
    }
  }

  const seen = new Set();
  const deduped = [];
  for (const iss of issues) {
    const key = JSON.stringify(iss);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(iss);
  }

  const flagged = deduped.length > 0;
  return { slug, flagged, issues: deduped };
}

export function runQualityAudit(dataDir) {
  const bundles = loadAllBundles(dataDir);
  const rows = [];
  for (const slug of Object.keys(bundles).sort()) {
    rows.push(auditBundle(slug, bundles[slug]));
  }
  const flaggedSlugs = rows.filter((r) => r.flagged).map((r) => r.slug);
  return { rows, flaggedSlugs, bundles };
}

export function relatedByGenreOverlap(allBundles, slug, sourceGenres) {
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

export function buildFaq(title, year, genres, recTitles, vote, collectionName) {
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
