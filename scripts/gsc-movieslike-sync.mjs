/**
 * Pull Search Console queries starting with "movies like",
 * extract movie titles, and generate only missing recommendation pages.
 *
 * Usage:
 *   node scripts/gsc-movieslike-sync.mjs --dry-run
 *   node scripts/gsc-movieslike-sync.mjs --days 30 --max-new 20
 */

import { createSign } from "crypto";
import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data", "recommendations");

const args = process.argv.slice(2);
function hasFlag(flag) {
  return args.includes(flag);
}
function getArg(flag, fallback) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const DAYS = Math.max(1, parseInt(getArg("--days", "28"), 10) || 28);
const ROW_LIMIT = Math.max(25, parseInt(getArg("--row-limit", "1000"), 10) || 1000);
const MAX_NEW = Math.max(1, parseInt(getArg("--max-new", "25"), 10) || 25);
const MIN_IMPRESSIONS = Math.max(0, parseFloat(getArg("--min-impressions", "1")) || 1);
const DRY_RUN = hasFlag("--dry-run");

const credsPathArg = getArg("--credentials", "");
const envCredsPath = process.env.GSC_SERVICE_ACCOUNT_FILE || process.env.GSC_CREDENTIALS_FILE || "";
const defaultCredsPath = path.join(root, "gsc-service-account.json");
const credsPath = credsPathArg || envCredsPath || defaultCredsPath;

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function loadDotEnvVar(name) {
  const p = path.join(root, ".env.local");
  if (!existsSync(p)) return null;
  const raw = readFileSync(p, "utf8");
  const m = raw.match(new RegExp(`^${name}=(.+)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
}

function slugify(title) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''’ʼ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeTitle(title) {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLooseKey(title) {
  return normalizeTitle(title).replace(/\s+/g, "");
}

function canonicalizeExtractedTitle(rawTitle) {
  const key = normalizeLooseKey(rawTitle);
  const aliases = new Map([
    ["lalaland", "La La Land"],
    ["topgun2", "Top Gun: Maverick"],
    ["topgunii", "Top Gun: Maverick"],
    ["topgunmaverick", "Top Gun: Maverick"],
    ["mavericktopgun", "Top Gun: Maverick"],
  ]);
  return aliases.get(key) || rawTitle;
}

function existingSlugs() {
  return new Set(
    readdirSync(dataDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
  );
}

function isoDateDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function candidatesFromEnv() {
  const explicit = process.env.GSC_SITE_URL || loadDotEnvVar("GSC_SITE_URL");
  if (explicit) return [explicit];

  const site =
    process.env.NEXT_PUBLIC_SITE_URL ||
    loadDotEnvVar("NEXT_PUBLIC_SITE_URL") ||
    "https://movieslike.app";

  const host = site.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const noWww = host.replace(/^www\./, "");

  return [
    `sc-domain:${noWww}`,
    `https://${noWww}/`,
    `https://www.${noWww}/`,
    site.endsWith("/") ? site : `${site}/`,
  ];
}

function buildJwtAssertion(creds) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: creds.token_uri || "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const toSign = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign("RSA-SHA256");
  signer.update(toSign);
  signer.end();
  const signature = signer.sign(creds.private_key);
  const encodedSig = signature
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${toSign}.${encodedSig}`;
}

async function fetchAccessToken(creds) {
  const assertion = buildJwtAssertion(creds);
  const res = await fetch(creds.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function querySearchConsole(accessToken, siteUrl) {
  const endpoint =
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}` +
    `/searchAnalytics/query`;

  const body = {
    startDate: isoDateDaysAgo(DAYS),
    endDate: todayIso(),
    dimensions: ["query"],
    rowLimit: ROW_LIMIT,
    dimensionFilterGroups: [
      {
        filters: [
          {
            dimension: "query",
            operator: "contains",
            expression: "movies like ",
          },
        ],
      },
    ],
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`GSC query failed (${res.status}): ${await res.text()}`);
  }

  return res.json();
}

function extractMovieTitle(query) {
  const m = query.match(/^\s*movies\s+like\s+(.+?)\s*$/i);
  if (!m) return null;

  let t = m[1].trim();
  t = t.split(/[?|:]/)[0];
  t = t.replace(/\s+(reddit|netflix|hulu|amazon|prime video|disney plus)\b.*$/i, "");
  t = t.split(/\s+(and|or)\s+/i)[0];
  t = t.replace(/^["'`]+|["'`]+$/g, "");
  t = t.replace(/\s+\d{4}$/g, "");
  t = t.replace(/\s+/g, " ").trim();

  // Strip trailing filler words from noisy queries (e.g. "la la land on").
  const trailingStopwords = new Set([
    "on",
    "in",
    "at",
    "for",
    "with",
    "to",
    "from",
    "where",
    "when",
    "movie",
    "movies",
    "film",
    "films",
    "series",
    "show",
  ]);
  while (t) {
    const parts = t.split(" ");
    const tail = parts[parts.length - 1].toLowerCase();
    if (!trailingStopwords.has(tail)) break;
    parts.pop();
    t = parts.join(" ").trim();
  }

  t = canonicalizeExtractedTitle(t);
  t = t.replace(/\s+/g, " ").trim();
  if (!t || t.length < 2) return null;

  const n = normalizeTitle(t);
  if (["movie", "movies", "films", "film"].includes(n)) return null;
  return t;
}

function uniqueCandidates(rows) {
  const bestBySlug = new Map();

  for (const row of rows) {
    const q = row?.keys?.[0];
    if (!q) continue;
    const title = extractMovieTitle(q);
    if (!title) continue;
    const slug = slugify(title);
    if (!slug) continue;

    const impressions = Number(row.impressions || 0);
    if (impressions < MIN_IMPRESSIONS) continue;

    const existing = bestBySlug.get(slug);
    if (!existing || impressions > existing.impressions) {
      bestBySlug.set(slug, {
        slug,
        title,
        query: q,
        clicks: Number(row.clicks || 0),
        impressions,
      });
    }
  }

  return [...bestBySlug.values()].sort((a, b) => b.impressions - a.impressions);
}

function runGenerate(title) {
  const py =
    process.env.PYTHON_BIN ||
    "python3";
  const cmd = [path.join("scripts", "generate_new_page.py"), "--title", title];
  return spawnSync(py, cmd, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
}

async function main() {
  if (!existsSync(credsPath)) {
    throw new Error(`Credentials file not found: ${credsPath}`);
  }

  const creds = JSON.parse(readFileSync(credsPath, "utf8"));
  if (!creds.client_email || !creds.private_key) {
    throw new Error(`Invalid service-account JSON at ${credsPath}`);
  }

  const accessToken = await fetchAccessToken(creds);

  let rows = [];
  let chosenSite = null;
  const siteCandidates = candidatesFromEnv();

  for (const site of siteCandidates) {
    try {
      const data = await querySearchConsole(accessToken, site);
      rows = data.rows || [];
      chosenSite = site;
      break;
    } catch (e) {
      process.stderr.write(`Site probe failed (${site}): ${e.message}\n`);
    }
  }

  if (!chosenSite) {
    throw new Error("Could not query Search Console for any site candidate. Set GSC_SITE_URL explicitly.");
  }

  console.log(`Using GSC property: ${chosenSite}`);
  console.log(`Fetched ${rows.length} query rows for last ${DAYS} days.`);

  const extracted = uniqueCandidates(rows);
  const existing = existingSlugs();
  const missing = extracted.filter((c) => !existing.has(c.slug));

  console.log(`Extracted titles: ${extracted.length}`);
  console.log(`Missing pages: ${missing.length}`);

  if (missing.length === 0) {
    console.log("Nothing new to generate.");
    return;
  }

  const targets = missing.slice(0, MAX_NEW);
  console.log(`Planned generation count: ${targets.length} (max-new=${MAX_NEW})`);

  for (const item of targets) {
    console.log(` - ${item.title}  [${item.slug}]  impressions=${item.impressions}`);
  }

  if (DRY_RUN) {
    console.log("Dry run complete. No files generated.");
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const item of targets) {
    console.log(`\nGenerating: ${item.title}`);
    const result = runGenerate(item.title);
    if (result.status === 0) ok++;
    else fail++;
  }

  console.log(`\nGeneration complete. success=${ok} failed=${fail}`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
