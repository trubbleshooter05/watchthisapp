/**
 * SEO Validation Layer - FAILS BUILD if rules are broken
 *
 * This validator runs during page generation and build time.
 * If any rule is violated, the build will exit with error code 1.
 */

import { validateCTRMetrics } from "./ctr";

export interface PageValidationConfig {
  title: string;
  description: string;
  h1: string;
  introHtml: string;
  recommendationsWithSeo: Array<{ seoParagraph?: string }>;
  hasInternalLinks: boolean;
  movieName: string;
}

export interface PageValidationResult {
  valid: boolean;
  movieName: string;
  errors: string[];
  warnings: string[];
  timestamp: string;
}

/**
 * Primary validation function - call this before returning page
 * If it fails, throw an error to prevent build
 */
export function validateMovieLikePage(config: PageValidationConfig): PageValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check intro hook exists and is not empty
  const introIsEmpty = !config.introHtml || config.introHtml.trim().length < 50;
  if (introIsEmpty) {
    errors.push("Intro paragraph is missing or too short (min 50 chars)");
  }

  // Check all recommendations have "Why You'll Love It" sections
  const missingWhy = config.recommendationsWithSeo.filter((r) => !r.seoParagraph || r.seoParagraph.trim().length < 20);
  if (missingWhy.length > 0) {
    errors.push(
      `${missingWhy.length} of ${config.recommendationsWithSeo.length} recommendations are missing proper "Why You'll Love It" sections`
    );
  }

  // Check internal links
  if (!config.hasInternalLinks) {
    errors.push('Page must include internal links in "You Might Also Like" section');
  }

  // Validate CTR metrics
  const ctrValidation = validateCTRMetrics(
    config.title,
    config.description,
    config.h1,
    !introIsEmpty,
    config.recommendationsWithSeo.length > 0,
    config.hasInternalLinks,
  );

  errors.push(...ctrValidation.errors);
  warnings.push(...ctrValidation.warnings);

  // Additional checks
  if (config.title.length < 40) {
    errors.push(`Title is too short (${config.title.length} chars): might not display properly in search results`);
  }

  if (config.description.length < 100) {
    errors.push(`Description is too short (${config.description.length} chars): might be truncated in search results`);
  }

  // Check for duplicate title/h1
  if (config.title.toLowerCase().trim() === config.h1.toLowerCase().trim()) {
    errors.push("Title and H1 must be different. H1 should provide a different hook/perspective.");
  }

  const result: PageValidationResult = {
    valid: errors.length === 0,
    movieName: config.movieName,
    errors,
    warnings,
    timestamp: new Date().toISOString(),
  };

  return result;
}

/**
 * Throw validation error to fail build
 * Called when validation fails in production mode
 */
export function throwValidationError(validation: PageValidationResult, slug: string): never {
  const errorMsg = [
    `❌ SEO VALIDATION FAILED for /movies-like/${slug}`,
    `Movie: ${validation.movieName}`,
    `Timestamp: ${validation.timestamp}`,
    ``,
    `Errors (${validation.errors.length}):`,
    ...validation.errors.map((e) => `  • ${e}`),
    ...(validation.warnings.length > 0
      ? [``, `Warnings (${validation.warnings.length}):`, ...validation.warnings.map((w) => `  ⚠ ${w}`)]
      : []),
    ``,
    `Build will fail until these issues are resolved.`,
    `See: /src/lib/seo/validator.ts for validation rules.`,
  ].join("\n");

  console.error(errorMsg);
  throw new Error(errorMsg);
}

/**
 * Non-throwing validation - returns result for logging/monitoring
 */
export function validateWithWarnings(config: PageValidationConfig): PageValidationResult {
  return validateMovieLikePage(config);
}

/**
 * Batch validation for all pages (used in audit script)
 */
export function validatePages(
  pages: Array<{ slug: string; config: PageValidationConfig }>
): Map<string, PageValidationResult> {
  const results = new Map<string, PageValidationResult>();

  for (const { slug, config } of pages) {
    const validation = validateMovieLikePage(config);
    results.set(slug, validation);
  }

  return results;
}

/**
 * Generate validation report
 */
export function generateValidationReport(results: Map<string, PageValidationResult>): {
  totalPages: number;
  validPages: number;
  invalidPages: number;
  totalErrors: number;
  totalWarnings: number;
  failedSlugs: string[];
} {
  const failedSlugs: string[] = [];
  let totalErrors = 0;
  let totalWarnings = 0;

  results.forEach((result, slug) => {
    if (!result.valid) {
      failedSlugs.push(slug);
    }
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
  });

  return {
    totalPages: results.size,
    validPages: results.size - failedSlugs.length,
    invalidPages: failedSlugs.length,
    totalErrors,
    totalWarnings,
    failedSlugs,
  };
}
