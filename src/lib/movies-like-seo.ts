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
  "strong pick for anyone",
  "keeps the viewing experience cohesive",
  "without feeling like a copy",
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

function shuffleTemplateSlots(rng: () => number): Array<{ id: number; invert: boolean }> {
  const slots: Array<{ id: number; invert: boolean }> = [];
  for (let id = 0; id < 10; id++) {
    slots.push({ id, invert: false }, { id, invert: true });
  }
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [slots[i], slots[j]] = [slots[j]!, slots[i]!];
  }
  return slots;
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

function contrastBeat(source: SourceForSeoParagraph, rec: RecommendationForSeoParagraph): string {
  const sg = source.genres[0];
  const rg = rec.genreNames?.[0];
  if (sg && rg && sg.toLowerCase() !== rg.toLowerCase()) {
    return `${sg} gives way to ${rg} in how the plot weights each scene`;
  }
  const dy = Math.abs(source.year - rec.year);
  if (dy >= 14) {
    return `${source.year} and ${rec.year} ask for different cultural readouts even when the hook sounds related`;
  }
  if (rec.mood && MOOD_COPY[rec.mood]) {
    return `the finish is pitched ${MOOD_COPY[rec.mood]}, so the ride does not mirror ${source.title} beat for beat`;
  }
  return `setpieces and turning points land in different rooms than ${source.title} chooses`;
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
  contrast: string;
};

/**
 * Ten distinct structural templates (tone, theme, narrative, comparison, audience × 2).
 * `invert` flips clause order when we must reuse a template index on long lists.
 */
function runTemplate(id: number, ctx: ParagraphCtx, invert: boolean): string {
  const { sourceTitle, recTitle, sourceHook, recHook, themes, moodDesc, sourceGenre, recGenre, contrast } =
    ctx;

  const blocks: Record<number, [string, string]> = {
    0: [
      `${recTitle} keeps ${themes} in motion, yet the register is ${moodDesc}: ${sourceTitle} roots tension in ${sourceHook}; here the pressure tracks ${recHook}.`,
      `The ${moodDesc} delivery is the pivot—${recTitle} still honors ${themes}, but unlike ${sourceTitle}’s ${sourceGenre} spine (${sourceHook}), this version steers through ${recHook}.`,
    ],
    1: [
      `Tone-first, ${recTitle} is ${moodDesc} where ${sourceTitle} leaned on ${sourceGenre} storytelling—parallel curiosity, different aftertaste when ${recHook} replaces ${sourceHook}.`,
      `If ${sourceTitle} trained you on ${sourceHook}, ${recTitle} answers with ${recHook} while holding ${themes}—only the emotional temperature matches ${moodDesc}, not the scene list.`,
    ],
    2: [
      `The thematic braid is ${themes}, but the moral math shifts: ${sourceTitle} stages ${sourceHook} while ${recTitle} forces the conflict through ${recHook}.`,
      `${themes} stay visible, then diverge: ${recHook} becomes the engine in ${recTitle}, whereas ${sourceTitle} hung its weight on ${sourceHook}.`,
    ],
    3: [
      `Shared DNA (${themes}) hides a fork—${sourceTitle}’s plot leans on ${sourceHook}; ${recTitle} re-threads the same worries through ${recHook}.`,
      `You will recognize ${themes}, yet the story argues differently: ${sourceHook} versus ${recHook} is not a cosmetic swap between ${sourceTitle} and ${recTitle}.`,
    ],
    4: [
      `Narrative geometry changes: ${sourceTitle} builds toward ${sourceHook}; ${recTitle} reroutes stakes so ${recHook} carries the climax’s weight.`,
      `Same appetite for momentum, different spine—${sourceTitle} locks the arc around ${sourceHook}, ${recTitle} around ${recHook}.`,
    ],
    5: [
      `Plot mileage is not parallel—${sourceHook} in ${sourceTitle} versus ${recHook} in ${recTitle} means beats land in a new order even when ${themes} echo.`,
      `Sequencing matters: where ${sourceTitle} resolves through ${sourceHook}, ${recTitle} saves its sharpest turns for ${recHook}.`,
    ],
    6: [
      `Side-by-side, ${sourceTitle} is ${sourceGenre}-forward (${sourceHook}) and ${recTitle} pushes ${recGenre} choices (${recHook})—${contrast}.`,
      `Compare the lenses: ${sourceTitle} frames ${sourceHook}; ${recTitle} reframes the night around ${recHook}, so ${contrast}.`,
    ],
    7: [
      `Stack ${sourceTitle} against ${recTitle}: one leans ${sourceHook}, the other bets on ${recHook}—same neighborhood of ${themes}, different floor plan.`,
      `The contrast is concrete—${sourceHook} vs ${recHook}—not a vague “vibe match,” which is why ${recTitle} earns its own slot beside ${sourceTitle}.`,
    ],
    8: [
      `For ${sourceTitle} fans who want ${themes} but need a lateral move, ${recTitle} trades ${sourceGenre} habits for ${recHook} while staying ${moodDesc}.`,
      `Audiences who liked ${sourceHook} in ${sourceTitle} often chase ${recHook} next; ${recTitle} delivers that handoff without pretending the story beats are identical.`,
    ],
    9: [
      `You arrive carrying ${sourceTitle}’s ${themes} expectations—${recTitle} honors the itch, then bends the plot through ${recHook} instead of repeating ${sourceHook}.`,
      `Built for viewers who measure films by payoff, not poster: ${recTitle} pays off ${themes} via ${recHook}, where ${sourceTitle} paid via ${sourceHook}.`,
    ],
  };

  const pair = blocks[id] ?? blocks[0]!;
  const base = invert ? pair[1]! : pair[0]!;
  return base;
}

function pickLengthVariant(text: string, rng: () => number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 42) return text;
  const cap = rng() < 0.45 ? 36 : rng() < 0.7 ? 44 : 52;
  return words.slice(0, cap).join(" ").replace(/[,;]$/, "") + (words.length > cap ? "…" : "");
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
  const slots = shuffleTemplateSlots(rng);

  return recs.map((rec, i) => {
    const { id: templateId, invert } = slots[i] ?? {
      id: i % 10,
      invert: Math.floor(i / 10) % 2 === 1,
    };
    const overflow = i >= 20 ? Math.floor(i / 20) : 0;

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
      contrast: contrastBeat(source, rec),
    };

    let extension = runTemplate(templateId, ctx, invert);
    if (overflow > 0) {
      extension = `On a longer shortlist, ${extension.charAt(0).toLowerCase()}${extension.slice(1)}`;
    }
    extension = pickLengthVariant(extension, rng);

    const why = scrubBannedPhrases(rec.whyYoullLoveIt?.trim() ?? "");
    let combined: string;
    if (!why) {
      combined = extension;
    } else if (rng() < 0.38) {
      combined = `${extension} ${why}`;
    } else {
      combined = `${why} ${extension}`;
    }
    return scrubBannedPhrases(combined).replace(/\s+/g, " ").trim();
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
export function buildMoviesLikeIntro(source: SourceMovie, overview: string | null, slug: string): string {
  const { title, genres, vibes, whyPeopleLoveIt } = source;
  const genreStr = genres.length ? genres.slice(0, 4).join(", ") : "distinctive storytelling";
  const vibePhrase = vibes.length
    ? vibes.slice(0, 6).map((v) => v.replace(/-/g, " ")).join(", ")
    : "memorable atmosphere";

  const keywordSentence = `If you are looking for movies like ${title}, the ten picks below are chosen to echo what made the original feel special—not random genre matches, but films that chase a comparable emotional and stylistic fingerprint.`;

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
    ` Short rationales keep the page scannable: you will see where tone, stakes, and style line up with what you already liked.`,
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
      answer: `Use the ranked list above: it highlights ten close cousins—similar tension, character dynamics, and storytelling ambition—so you can queue something tonight without endless browsing.`,
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
