import type { FaqItem, RecommendationEntry, SourceMovie } from "@/lib/types/recommendation";

const MOOD_COPY: Record<RecommendationEntry["mood"], string> = {
  dark: "a dark, uncompromising tone",
  uplifting: "an uplifting, hopeful tone",
  tense: "a tense, propulsive tone",
  funny: "a sharp, often funny tone",
  bittersweet: "a bittersweet, emotionally layered tone",
};

/** Enriched fields optional — used only for SEO paragraph generation. */
export type RecommendationForSeoParagraph = RecommendationEntry & {
  overview?: string | null;
  genreNames?: readonly string[];
};

export type SourceForSeoParagraph = SourceMovie & {
  overview?: string | null;
};

const BANNED_PHRASES = [
  "where it overlaps",
  "the register is",
  "without feeling like a copy",
  "strong pick for anyone",
  "you will notice the same appetite",
  "it lines up with",
  "keeps the viewing experience cohesive",
  "same appetite for momentum",
  "vague “vibe match”",
  "not a cosmetic swap",
  "same neighborhood of",
  "earns its own slot beside",
] as const;

function scrubBannedPhrases(text: string): string {
  let t = text;
  for (const phrase of BANNED_PHRASES) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    t = t.replace(re, "").replace(/\s{2,}/g, " ").trim();
  }
  return t.replace(/\s+([.,;])/g, "$1").trim();
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** First sentence or clause, capped — for concrete plot texture. */
function plotHook(overview: string | null | undefined, fallback: string): string {
  if (!overview || overview.length < 20) return fallback;
  const cleaned = overview.replace(/\s+/g, " ").trim();
  const parts = cleaned.split(/(?<=[.!?])\s+/);
  const chunk = (parts[0]?.length >= 40 ? parts[0] : `${parts[0] ?? ""} ${parts[1] ?? ""}`).trim();
  const words = chunk.split(/\s+/).slice(0, 18).join(" ");
  return words || fallback;
}

function primaryGenre(genres: readonly string[] | undefined, fallback: string): string {
  const g = genres?.[0]?.trim();
  return g || fallback;
}

function themePhrase(shared: string[]): string {
  if (!shared.length) return "pace, stakes, and character pressure";
  return shared.slice(0, 3).map((v) => v.replace(/-/g, " ")).join(", ");
}

type ParagraphCtx = {
  sourceTitle: string;
  recTitle: string;
  sourceYear: number;
  recYear: number;
  sourceHook: string;
  recHook: string;
  themes: string;
  moodDesc: string;
  sourceGenre: string;
  recGenre: string;
};

/**
 * Twelve standalone paragraph shapes (tone, plot spine, character pressure, payoff, stakes,
 * genre lens, fork, era, viewer hook, mood, centerpiece beat, texture). Each is written as a
 * single short rationale—no shared closing library, no [intro]+[overlap]+[tail] assembly.
 * Pages cap at ten rows, so a shuffled subset guarantees distinct structure per recommendation.
 */
const PARAGRAPH_STYLE_COUNT = 12;

function capWhyItFitsParagraph(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const trimmed = sentences.slice(0, 3).join(" ");
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= 58) return trimmed;
  const cut = words.slice(0, 52).join(" ");
  return /[.!?]$/.test(cut) ? cut : `${cut}.`;
}

function shuffleStyleOrder(rng: () => number): number[] {
  const order = Array.from({ length: PARAGRAPH_STYLE_COUNT }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

function buildWhyItFitsByStyle(style: number, ctx: ParagraphCtx): string {
  const {
    sourceTitle,
    recTitle,
    sourceYear,
    recYear,
    sourceHook,
    recHook,
    themes,
    moodDesc,
    sourceGenre,
    recGenre,
  } = ctx;

  switch (style) {
    case 0:
      return `${recTitle} is pitched ${moodDesc}, which is the first thing you feel beside ${sourceTitle}. ${themes} still braid the two films, but ${recTitle} leans on ${recHook} where ${sourceTitle} anchored itself in ${sourceHook}.`;
    case 1:
      return `In ${sourceTitle}, the spine is ${sourceHook}; ${recTitle} finds its spine in ${recHook}. ${themes} explain why the pairing clicks even though the scene list diverges.`;
    case 2:
      return `Character pressure in ${recTitle} accumulates around ${recHook}, echoing how ${sourceTitle} tightened the screws with ${sourceHook}. The through-line is ${themes}, not mirrored blocking.`;
    case 3:
      return `The afterglow from ${recTitle} is ${moodDesc}: different residue than ${sourceTitle}, even when ${themes} read familiar. Trace the fork to ${sourceHook} versus ${recHook}.`;
    case 4:
      return `What actually breaks in the third act is not the same beat: ${sourceTitle} pays off through ${sourceHook}, while ${recTitle} pushes resolution toward ${recHook}. ${themes} stay urgent in both.`;
    case 5:
      return `${recTitle} handles ${recHook} with a ${recGenre} bias that ${sourceTitle} did not foreground in its ${sourceGenre} read of ${sourceHook}. ${themes} are the bridge.`;
    case 6:
      return `${sourceTitle} and ${recTitle} split at the plot: ${sourceHook} on one side, ${recHook} on the other. ${themes} keep the kinship honest, and ${recTitle} stays ${moodDesc} throughout.`;
    case 7:
      return `A ${recYear} frame changes how ${recHook} lands next to ${sourceTitle} (${sourceYear}) and its ${sourceHook}. ${themes} survive the era shift without forcing the stories to match.`;
    case 8:
      return `If ${sourceHook} is what locked you into ${sourceTitle}, ${recTitle} hands you ${recHook} as the next jolt of narrative curiosity. ${themes} are what make the handoff feel deliberate.`;
    case 9:
      return `${themes} surface in both films, yet ${recTitle} keeps the temperature ${moodDesc}, not a tonal echo of ${sourceTitle}. Compare ${recHook} against ${sourceHook} and the contrast is obvious.`;
    case 10:
      return `${recHook} is the sharpest reason to queue ${recTitle} after ${sourceTitle}: it refracts the same curiosity ${sourceHook} stirred, with ${themes} doing quieter parallel work underneath.`;
    case 11:
      return `Surface texture differs—${recGenre} treatment of ${recHook} beside ${sourceGenre} treatment of ${sourceHook}—while ${themes} stay legible. ${recTitle} commits to ${moodDesc} in how those pieces land.`;
    default:
      return `${recTitle} chases ${themes} through ${recHook} instead of repeating ${sourceHook} from ${sourceTitle}. The overall read stays ${moodDesc}.`;
  }
}

/**
 * Builds one SEO paragraph per recommendation with unique structural templates on a page.
 * Uses TMDB overviews when present for concrete plot hooks; never mutates JSON bundles.
 */
export function buildRecommendationSeoParagraphsForPage(
  recs: RecommendationForSeoParagraph[],
  source: SourceForSeoParagraph,
  pageSlug: string,
): string[] {
  const seed =
    slugEntropy(pageSlug) * 2654435761 +
    recs.reduce((acc, r) => acc + r.tmdbId * 17, 0);
  const rng = mulberry32(seed >>> 0);
  const styleOrder = shuffleStyleOrder(rng);

  return recs.map((rec, i) => {
    const style = styleOrder[i % PARAGRAPH_STYLE_COUNT] ?? 0;

    const sourceHook = plotHook(
      source.overview,
      `${source.genres[0] ?? "its"} central conflict and ensemble pressure`,
    );
    const recHook = plotHook(
      rec.overview,
      `${rec.genreNames?.[0] ?? "drama"}-shaded stakes the synopsis barely names`,
    );

    const ctx: ParagraphCtx = {
      sourceTitle: source.title,
      recTitle: rec.title,
      sourceYear: source.year,
      recYear: rec.year,
      sourceHook,
      recHook,
      themes: themePhrase(rec.sharedVibes),
      moodDesc: MOOD_COPY[rec.mood],
      sourceGenre: primaryGenre(source.genres, "drama"),
      recGenre: primaryGenre(rec.genreNames ?? [], "drama"),
    };

    const raw = buildWhyItFitsByStyle(style, ctx);
    return scrubBannedPhrases(capWhyItFitsParagraph(raw)).replace(/\s+/g, " ").trim();
  });
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function slugEntropy(slug: string): number {
  return slug.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

/**
 * 150–200 word intro: plot/context, appeal, genre/tone/themes, and “movies like [title]”.
 */
export function buildMoviesLikeIntro(
  source: SourceMovie,
  overview: string | null,
  slug: string,
  recommendationCount: number,
): string {
  const { title, genres, vibes, whyPeopleLoveIt } = source;
  const genreStr = genres.length ? genres.slice(0, 4).join(", ") : "distinctive storytelling";
  const vibePhrase = vibes.length
    ? vibes.slice(0, 6).map((v) => v.replace(/-/g, " ")).join(", ")
    : "memorable atmosphere";

  const keywordSentence =
    recommendationCount > 0
      ? `If you are looking for movies like ${title}, the ${recommendationCount} picks below are chosen to echo what made the original feel special—not random genre matches, but films that chase a comparable emotional and stylistic fingerprint.`
      : `If you are looking for movies like ${title}, the recommendations below are chosen to echo what made the original feel special—not random genre matches, but films that chase a comparable emotional and stylistic fingerprint.`;

  let body: string;

  if (overview && overview.length > 40) {
    body = `${overview} Audiences gravitate to ${title} because ${decapitalize(whyPeopleLoveIt)} It sits broadly in ${genreStr}, with ${vibePhrase} running through its DNA—so expectations stay high for craft, character, and momentum. ${keywordSentence}`;
  } else {
    body = `${title} is remembered as a ${genreStr} experience shaped by ${vibePhrase}. People connect with it because ${decapitalize(whyPeopleLoveIt)} The film’s themes and pacing reward viewers who like stories that commit to mood as much as plot. ${keywordSentence}`;
  }

  const ent = slugEntropy(slug);
  const padA = pickVariant(ent, [
    ` Together, these elements explain why ${title} keeps showing up in watchlists—and why a curated list of similar films can save you hours of scrolling.`,
    ` That mix is why ${title} still fuels recommendations years later—and why a focused list of neighbors beats aimless genre browsing.`,
    ` Those ingredients help explain the film’s staying power—and why readers searching for the same rush often want a guided shortlist.`,
  ]);
  const padB = pickVariant(ent + 1, [
    ` Use the ranked picks to plan a coherent marathon: same ambition, varied execution, and hooks that reward repeat viewing.`,
    ` Treat the ranked list as a menu: enough overlap to feel intentional, enough difference to stay surprising.`,
    ` The selections below are sequenced to respect pacing—so you can queue something ambitious without losing the thread.`,
  ]);
  const padC = pickVariant(ent + 2, [
    ` Each note under the titles explains the kinship with ${title}, so you can match mood and runtime to your night—not just the poster.`,
    ` Every entry includes a plain-English reason it belongs beside ${title}, which makes tradeoffs easier when time is limited.`,
    ` Short rationales keep the page scannable: each note names tone, stakes, and style in plain terms so you can compare quickly.`,
  ]);

  let wc = wordCount(body);
  if (wc < 150) {
    body += padA;
    wc = wordCount(body);
  }
  if (wc < 150) {
    body += padB;
    wc = wordCount(body);
  }
  if (wc < 150) {
    body += padC;
  }
  if (wc > 200) {
    body = body.trim().split(/\s+/).filter(Boolean).slice(0, 200).join(" ") + "…";
  }

  return body;
}

function decapitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function pickVariant(seed: number, variants: string[]): string {
  return variants[Math.abs(seed) % variants.length]!;
}

/**
 * Single recommendation helper. Prefer {@link buildRecommendationSeoParagraphsForPage} on movie pages
 * so each row gets a distinct template shape.
 */
export function buildRecommendationSeoParagraph(
  rec: RecommendationForSeoParagraph,
  source: SourceForSeoParagraph,
): string {
  return buildRecommendationSeoParagraphsForPage([rec], source, `single-${rec.tmdbId}`)[0]!;
}

export function buildWhyYoullLoveTheseMovies(
  source: SourceMovie,
  recs: RecommendationEntry[],
): string {
  if (recs.length === 0) {
    return `Once recommendations are live for ${source.title}, this section will summarize what ties the picks together—shared tension, emotional palette, and the kind of viewing night they add up to.`;
  }

  const moodTally = new Map<string, number>();
  for (const r of recs) {
    moodTally.set(r.mood, (moodTally.get(r.mood) ?? 0) + 1);
  }
  const topMood = Array.from(moodTally.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "tense";

  const vibeTally = new Map<string, number>();
  for (const r of recs) {
    for (const v of r.sharedVibes) {
      vibeTally.set(v, (vibeTally.get(v) ?? 0) + 1);
    }
  }
  const topVibes = Array.from(vibeTally.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => k.replace(/-/g, " "));

  const vibeStr = topVibes.length ? topVibes.join(", ") : source.vibes.slice(0, 4).join(", ");

  return [
    `Across these recommendations, you will see recurring fingerprints from ${source.title}: ${vibeStr}, plus a ${topMood} through-line that keeps scenes charged even when the plots diverge.`,
    `The emotional appeal is consistent—films that ask for attention, then reward it with momentum, specificity, and a clear point of view.`,
    `As a viewing experience, the list is built to feel like a guided night at the movies: enough variety to stay surprising, enough overlap to feel intentional, and pacing that respects how ${source.title} trained you to watch.`,
    `If you want the same satisfaction you felt during ${source.title}—that mix of craft, stakes, and atmosphere—these picks are meant to land in the same neighborhood without repeating the same story.`,
  ].join(" ");
}

export function buildSchemaFaqItems(movieTitle: string, recTitles: string[]): FaqItem[] {
  const sample =
    recTitles.length >= 3
      ? recTitles.slice(0, 4).join(", ")
      : recTitles.join(", ") || "the curated picks on this page";

  return [
    {
      question: `What movies are similar to ${movieTitle}?`,
      answer: `Start with films such as ${sample}. Each title on this page is chosen to mirror the vibe, themes, and style that make ${movieTitle} memorable, with short explanations to help you pick where to begin.`,
    },
    {
      question: `What should I watch if I liked ${movieTitle}?`,
      answer: `Use the ranked list above: it highlights ${recTitles.length} close cousins—similar tension, character dynamics, and storytelling ambition—so you can queue something tonight without endless browsing.`,
    },
    {
      question: `Are there movies with the same vibe as ${movieTitle}?`,
      answer: `Yes. The recommendations here lean into overlapping moods and motifs, not just shared genre labels, so you get films that “feel” related in pacing, tone, and emotional payoff.`,
    },
  ];
}

export function mergeFaqForPage(bundleFaq: FaqItem[], schemaFaq: FaqItem[]): FaqItem[] {
  const seen = new Set<string>();
  const out: FaqItem[] = [];
  for (const f of [...schemaFaq, ...bundleFaq]) {
    const k = f.question.trim().toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(f);
  }
  return out;
}
