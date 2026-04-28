/**
 * CTR Engine: Generates SEO-optimized titles, descriptions, and H1s
 * with emotional triggers, numbers, and curiosity hooks
 *
 * RULES (NON-NEGOTIABLE):
 * - Title: Include number (15-25) + emotional word + 50-65 chars
 * - Description: 120-160 chars + "If you loved" hook
 * - H1: Must differ from title + emotional + curiosity
 */

const EMOTIONAL_TRIGGERS = [
  "mind-blowing",
  "unforgettable",
  "jaw-dropping",
  "dark",
  "insane",
  "addictive",
  "underrated",
  "hidden-gem",
  "breathtaking",
  "mesmerizing",
  "stunning",
  "gripping",
  "haunting",
  "brilliant",
  "masterpiece",
];

const CURIOSITY_PHRASES = [
  "you absolutely need to see",
  "that'll blow your mind",
  "that deserve more love",
  "hidden in plain sight",
  "you probably missed",
  "that'll haunt you",
  "you won't forget",
  "that hit different",
  "you've been sleeping on",
];

const NUMBERS = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function pickFromSeed<T>(seed: number, arr: T[]): T {
  return arr[seed % arr.length]!;
}

/**
 * Generate CTR-optimized title with number + emotional word
 * When `recommendationCount` is set (>0), that value is the headline count (matches on-page list length).
 * Otherwise falls back to a seeded 15–25 style number for legacy pages.
 * Target: 50-65 chars
 */
export function generateTitle(movieName: string, recommendationCount?: number): string {
  const seed = hashCode(movieName);
  const number =
    typeof recommendationCount === "number" && recommendationCount > 0
      ? recommendationCount
      : pickFromSeed(seed, NUMBERS);
  const emotion = pickFromSeed(seed + 1, EMOTIONAL_TRIGGERS);

  const templates = [
    `${number} ${emotion.charAt(0).toUpperCase() + emotion.slice(1)} Movies Like ${movieName}`,
    `${number} ${emotion.charAt(0).toUpperCase() + emotion.slice(1)} Films Like ${movieName}`,
    `Movies Like ${movieName}: ${number} ${emotion} Picks`,
    `Top ${number} Movies Like ${movieName} (${emotion.charAt(0).toUpperCase() + emotion.slice(1)})`,
  ];

  const selected = pickFromSeed(seed + 2, templates);

  // Ensure it's in the 50-65 char range, trim if needed
  if (selected.length > 65) {
    return selected.substring(0, 62) + "...";
  }
  if (selected.length < 50) {
    const suffix = " Worth Watching Next";
    if (selected.length + suffix.length <= 65) return `${selected}${suffix}`;
    return `${selected} Picks Worth Watching`;
  }
  return selected;
}

/**
 * Generate CTR-optimized meta description
 * Format: "If you loved [Movie]... [curiosity hook]"
 * Target: 140-160 chars
 */
export function generateDescription(movieName: string): string {
  const seed = hashCode(movieName);
  const curiosity = pickFromSeed(seed, CURIOSITY_PHRASES);
  const emotion = pickFromSeed(seed + 1, EMOTIONAL_TRIGGERS);

  const templates = [
    `If you loved ${movieName}, explore ${emotion} films ${curiosity}, with clear notes on shared themes, tone, and streaming context.`,
    `If you loved ${movieName}, find ${emotion} films ${curiosity} that echo the same mood, stakes, and emotional aftertaste.`,
    `If you loved ${movieName}, these ${emotion} picks carry a related feeling, with specific comparisons so you can choose faster.`,
    `If you loved ${movieName}, start with these ${emotion} recommendations built around similar tension, style, and story appetite.`,
  ];

  const selected = pickFromSeed(seed + 2, templates);

  // Trim to 140-160 chars
  let desc = selected;
  if (desc.length > 160) {
    desc = desc.substring(0, 157) + "…";
  } else if (desc.length < 140) {
    // Pad if too short (optional enhancement)
    const suffix = " Find your next watch here.";
    if (desc.length + suffix.length <= 160) {
      desc += suffix;
    }
  }

  return desc;
}

/**
 * Generate H1 that differs from title
 * Must be hook-heavy and curiosity-driven
 * Example: "If You Loved Interstellar, Watch These Next"
 */
export function generateH1(movieName: string, recommendationCount?: number): string {
  const seed = hashCode(movieName);
  const curiosity = pickFromSeed(seed, CURIOSITY_PHRASES);
  const countForList =
    typeof recommendationCount === "number" && recommendationCount > 0
      ? recommendationCount
      : pickFromSeed(seed + 1, NUMBERS);

  const templates = [
    `If You Loved ${movieName}, Watch These Next`,
    `Discover Films Like ${movieName}—${curiosity}`,
    `Because You Loved ${movieName}`,
    `${movieName} Fans: These Films Are Essential`,
    `If ${movieName} Moved You, These Will Too`,
    `Loved ${movieName}? Your Next ${countForList} Must-Watches`,
    `Loved ${movieName}? Here Are ${countForList} Films Worth Your Time`,
  ];

  return pickFromSeed(seed + 2, templates);
}

/**
 * Generate an improved intro hook (first 2 sentences)
 * Must reference original movie + promise similar emotional experience
 * Target: 120 words total for intro
 */
export function generateIntroHook(movieName: string, genres: string[], vibes: string[]): string {
  const seed = hashCode(movieName);
  const emotion = pickFromSeed(seed, EMOTIONAL_TRIGGERS);

  const genreStr = genres.length ? genres.slice(0, 3).join(", ") : "cinema";
  const vibeStr = vibes.length ? vibes.slice(0, 2).join(" and ") : "storytelling";

  const hooks = [
    `${movieName} hit you with ${emotion} storytelling that stuck around long after the credits. If you're still thinking about it, here are films that deliver the same emotional gut-punch and ${vibeStr} DNA.`,
    `${movieName} isn't just a movie—it's an experience that rewired how you think about ${genreStr}. Looking for more films with that same ${emotion} impact? These picks echo the same themes, tone, and ${vibeStr} backbone.`,
    `What made ${movieName} so ${emotion.replace('-', ' ')} was its refusal to compromise on ${vibeStr} and stakes. If that resonated with you, the films below are built on that same commitment to craft and emotional payoff.`,
  ];

  return pickFromSeed(seed + 2, hooks);
}

/**
 * Validate CTR metrics for a generated page
 * Returns validation result with specific failures
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateCTRMetrics(
  title: string,
  description: string,
  h1: string,
  hasIntroHook: boolean,
  hasWhyYouWillLoveIt: boolean,
  hasInternalLinks: boolean,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Title validation
  if (!title || title.length < 50 || title.length > 65) {
    errors.push(`Title must be 50-65 chars, got ${title.length}: "${title}"`);
  }
  if (!/\d+/.test(title)) {
    errors.push(`Title must include a number (15-25 range): "${title}"`);
  }
  const emotionalWords = EMOTIONAL_TRIGGERS.some(word => title.toLowerCase().includes(word));
  if (!emotionalWords) {
    errors.push(
      `Title must include emotional word (${EMOTIONAL_TRIGGERS.slice(0, 5).join(", ")}, etc.): "${title}"`
    );
  }

  // Description validation
  if (!description || description.length < 120 || description.length > 160) {
    errors.push(`Description must be 120-160 chars, got ${description.length}: "${description}"`);
  }
  if (!description.toLowerCase().includes("if you loved")) {
    errors.push(`Description must include "If you loved" hook: "${description}"`);
  }

  // H1 validation
  if (!h1) {
    errors.push("H1 is required");
  } else if (h1.toLowerCase() === title.toLowerCase()) {
    errors.push(`H1 must differ from title (both are identical)`);
  }
  if (h1 && h1.length < 30) {
    warnings.push(`H1 might be too short: "${h1}"`);
  }

  // Content structure validation
  if (!hasIntroHook) {
    errors.push("Page must have intro hook (first 2 sentences about original movie)");
  }
  if (!hasWhyYouWillLoveIt) {
    errors.push("Page must have 'Why You'll Love It' sections for recommendations");
  }
  if (!hasInternalLinks) {
    errors.push("Page must have internal links to related movies");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
