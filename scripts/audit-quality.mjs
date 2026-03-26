/**
 * Quality audit: templated / duplicate "why you'll love it" text per page.
 *
 *   node scripts/audit-quality.mjs
 */
import { writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runQualityAudit } from "./quality-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data", "recommendations");
const reportPath = path.join(__dirname, "audit-quality-report.json");

const { rows, flaggedSlugs } = runQualityAudit(dataDir);

console.log("=== Recommendation quality audit ===\n");
console.log("Total pages:", rows.length);
console.log("Flagged pages:", flaggedSlugs.length);
console.log("");

for (const r of rows) {
  if (!r.flagged) continue;
  console.log(`— ${r.slug}`);
  for (const iss of r.issues) {
    if (iss.type === "high_similarity") {
      console.log(`    [similarity ${iss.score}] rec #${iss.pair[0] + 1} vs #${iss.pair[1] + 1}`);
    } else if (iss.type === "identical_opening_prefix") {
      console.log(`    [same opening prefix] rec indices: ${iss.indices.map((i) => i + 1).join(", ")}`);
      console.log(`      prefix: "${iss.detail}"`);
    } else if (iss.type === "shared_opening_3plus") {
      console.log(`    [3+ similar openings] rec indices: ${iss.indices.map((i) => i + 1).join(", ")}`);
    } else if (iss.type === "template_phrase") {
      console.log(`    [template] rec #${iss.indices[0] + 1}: contains "${iss.detail}"`);
    } else {
      console.log(`    [${iss.type}]`, JSON.stringify(iss));
    }
  }
  console.log("");
}

if (flaggedSlugs.length === 0) {
  console.log("No issues flagged. Nice.\n");
}

const report = {
  generatedAt: new Date().toISOString(),
  dataDir,
  flaggedSlugs,
  bySlug: Object.fromEntries(
    rows.filter((r) => r.flagged).map((r) => [r.slug, { issues: r.issues }])
  ),
};

writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log("Wrote", reportPath);
