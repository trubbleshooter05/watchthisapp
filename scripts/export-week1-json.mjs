import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const bundles = require("./week1-bundles.cjs");

const out = path.join(__dirname, "..", "data", "recommendations");
mkdirSync(out, { recursive: true });

for (const [slug, bundle] of Object.entries(bundles)) {
  writeFileSync(path.join(out, `${slug}.json`), JSON.stringify(bundle, null, 2));
  console.log("wrote", slug);
}
