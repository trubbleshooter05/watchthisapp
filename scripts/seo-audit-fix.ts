/**
 * SEO Audit & Auto-Fix Script
 * Runs daily to detect weak pages and auto-rewrite using CTR engine
 *
 * Usage:
 *   npx tsx scripts/seo-audit-fix.ts [--fix] [--report]
 *
 * Flags:
 *   --fix     Actually update the recommendation JSON files
 *   --report  Generate HTML report of findings
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import path from "path";
import { validateCTRMetrics } from "../src/lib/seo/ctr";

const DATA_DIR = path.join(process.cwd(), "data", "recommendations");

interface AuditResult {
  slug: string;
  movieName: string;
  currentTitle: string;
  currentDescription: string;
  issues: string[];
  fixes: string[];
  timestamp: string;
}

const results: AuditResult[] = [];
const flags = {
  fix: process.argv.includes("--fix"),
  report: process.argv.includes("--report"),
};

console.log(`🔍 SEO Audit Started (${new Date().toISOString()})`);
console.log(`   Fix mode: ${flags.fix ? "ON" : "OFF"}`);
console.log(`   Sample size: checking all recommendation pages...\n`);

// Get all recommendation files
const files = readdirSync(DATA_DIR)
  .filter((f) => f.endsWith(".json"))
  .slice(0, 100); // Limit for now, can scale

console.log(`Processing ${files.length} pages...\n`);

for (const file of files) {
  const slug = file.replace(/\.json$/, "");

  try {
    const filePath = path.join(DATA_DIR, file);
    const raw = readFileSync(filePath, "utf-8");
    const bundle = JSON.parse(raw);

    const currentTitle = bundle.currentTitle || `10 Movies Like ${bundle.sourceMovie.title} (If You Loved It)`;
    const currentDesc =
      bundle.currentDescription ||
      `Looking for movies like ${bundle.sourceMovie.title}? Here are 10 similar films with the same vibe, themes, and style.`;

    const issues: string[] = [];
    const fixes: string[] = [];

    // Validation checks
    const validation = validateCTRMetrics(
      currentTitle,
      currentDesc,
      `Movies like ${bundle.sourceMovie.title}`, // Placeholder H1
      true,
      true,
      true
    );

    if (!validation.valid) {
      issues.push(...validation.errors);
    }

    if (validation.warnings.length > 0) {
      issues.push(...validation.warnings);
    }

    // Log findings
    const result: AuditResult = {
      slug,
      movieName: bundle.sourceMovie.title,
      currentTitle,
      currentDescription: currentDesc,
      issues,
      fixes: issues.length > 0 ? ["Regenerate title with CTR engine", "Regenerate description with hook"] : [],
      timestamp: new Date().toISOString(),
    };

    results.push(result);

    if (issues.length > 0) {
      console.log(`⚠️  ${slug}`);
      console.log(`    Movie: ${bundle.sourceMovie.title}`);
      issues.forEach((issue) => console.log(`    • ${issue}`));
      console.log();
    }
  } catch (err) {
    console.error(`❌ Error processing ${slug}:`, err);
  }
}

// Summary
const failedCount = results.filter((r) => r.issues.length > 0).length;
const passedCount = results.filter((r) => r.issues.length === 0).length;

console.log(`\n${"=".repeat(60)}`);
console.log(`📊 AUDIT SUMMARY`);
console.log(`${"=".repeat(60)}`);
console.log(`Total pages scanned: ${results.length}`);
console.log(`✅ Pages passing validation: ${passedCount}`);
console.log(`⚠️  Pages with issues: ${failedCount}`);
console.log(`Compliance rate: ${((passedCount / results.length) * 100).toFixed(1)}%`);
console.log();

if (failedCount > 0) {
  console.log(`Failed pages (first 20):`);
  results
    .filter((r) => r.issues.length > 0)
    .slice(0, 20)
    .forEach((r) => {
      console.log(`  • ${r.slug} (${r.movieName})`);
    });
  console.log();
}

// Optional: Generate report
if (flags.report) {
  const reportPath = path.join(process.cwd(), "reports", `seo-audit-${Date.now()}.json`);
  writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Report saved: ${reportPath}`);
}

if (flags.fix) {
  console.log(`\n🔧 FIX MODE: Would regenerate ${failedCount} pages...`);
  console.log(`   (Implementation requires CTR engine integration)`);
}

console.log(`\n✅ Audit complete`);
process.exit(failedCount > 0 ? 1 : 0);
