import type { FaqItem, RecommendationEntry, SourceMovie } from "@/lib/types/recommendation";

const MOOD_COPY: Record<RecommendationEntry["mood"], string> = {
  dark: "a dark, uncompromising tone",
  uplifting: "an uplifting, hopeful tone",
  tense: "a tense, propulsive tone",
  funny: "a sharp, often funny tone",
  bittersweet: "a bittersweet, emotionally layered tone",
};

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
 * 2–3 sentences per recommendation: editorial line + similarity, tone, themes, audience.
 */
export function buildRecommendationSeoParagraph(
  rec: RecommendationEntry,
  source: SourceMovie,
): string {
  const themes = rec.sharedVibes.length
    ? rec.sharedVibes.map((v) => v.replace(/-/g, " ")).join(", ")
    : "story rhythm and stakes";
  const moodDesc = MOOD_COPY[rec.mood];
  const g0 = source.genres[0]?.toLowerCase() ?? "that film’s";
  const v = rec.tmdbId;

  const s2 = pickVariant(v, [
    `It lines up with ${source.title} through ${themes}, while the overall feel stays ${moodDesc}—so the echo is thematic, not a retread.`,
    `Where it overlaps ${source.title} is ${themes}; the register is ${moodDesc}, which keeps the viewing experience cohesive without feeling like a copy.`,
    `You will notice the same appetite for ${themes} that ${source.title} fans respond to, delivered with ${moodDesc} energy that still lets the story breathe.`,
  ]);

  const s3 = pickVariant(v + 1, [
    `Best for viewers who liked ${source.title}’s ${g0} flavor and want a new title that earns its twists honestly.`,
    `Ideal if you want the same “why am I still thinking about this?” afterglow—without sacrificing clarity or character work.`,
    `A strong pick for anyone who treats ${source.title} as a benchmark and wants another film that respects patience and payoff.`,
  ]);

  const out = `${rec.whyYoullLoveIt} ${s2} ${s3}`;
  return out.replace(/\s+/g, " ").trim();
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
