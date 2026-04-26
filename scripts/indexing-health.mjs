/**
 * Post-deploy indexing health checks for movieslike.app.
 *
 * - Does NOT ping Google sitemap endpoints.
 * - Does NOT use Google Indexing API (not appropriate for normal movie guide pages;
 *   rely on sitemap, internal links, and manual GSC URL Inspection for priority URLs).
 *
 * Usage:
 *   node scripts/indexing-health.mjs
 *   node scripts/indexing-health.mjs --slugs foo,bar
 *   node scripts/indexing-health.mjs --git-base HEAD~2 --git-head HEAD
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const LOGS_DIR = path.join(root, "logs");
const HEALTH_LOG = path.join(LOGS_DIR, "indexing_health.md");
const GSC_STATE = path.join(LOGS_DIR, "indexing_health_gsc_state.json");

const SITE_ORIGIN = "https://www.movieslike.app";
const ROBOTS_URL = `${SITE_ORIGIN}/robots.txt`;
const SITEMAP_URL = `${SITE_ORIGIN}/sitemap.xml`;
const REQUIRED_ROBOTS_SNIPPET = "Sitemap: https://www.movieslike.app/sitemap.xml";
const DAILY_GSC_CAP = 10;

const UA = "MoviesLikeIndexingHealth/1.0";

const args = process.argv.slice(2);
function getArg(flag, fallback) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}
function hasFlag(flag) {
  return args.includes(flag);
}

const GIT_BASE = getArg("--git-base", "HEAD~1");
const GIT_HEAD = getArg("--git-head", "HEAD");
const SLUGS_ARG = getArg("--slugs", "");

function slugsFromGit() {
  try {
    const out = execSync(
      `git diff --name-only ${GIT_BASE} ${GIT_HEAD} -- data/recommendations`,
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    const slugs = [];
    for (const line of out.split("\n")) {
      const t = line.trim();
      const m = t.match(/^data\/recommendations\/(.+)\.json$/);
      if (m) slugs.push(m[1]);
    }
    return [...new Set(slugs)].sort();
  } catch {
    return [];
  }
}

function parseSlugList(raw) {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function stripTrailingSlashPath(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function canonicalMatches(href, expectedFullUrl) {
  try {
    const a = new URL(href.trim(), SITE_ORIGIN);
    const b = new URL(expectedFullUrl);
    return (
      a.origin === b.origin &&
      stripTrailingSlashPath(a.pathname) === stripTrailingSlashPath(b.pathname)
    );
  } catch {
    return false;
  }
}

function extractCanonical(html) {
  const lower = html.toLowerCase();
  const idx = lower.indexOf("canonical");
  if (idx === -1) return null;
  const window = html.slice(Math.max(0, idx - 80), idx + 200);
  let m = window.match(
    /<link[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']+)["'][^>]*>/i
  );
  if (m) return m[1].trim();
  m = window.match(
    /<link[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["']canonical["'][^>]*>/i
  );
  return m ? m[1].trim() : null;
}

function parseSitemapLocs(xml) {
  const locs = new Set();
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    try {
      const u = new URL(m[1].trim());
      const norm = `${u.origin}${stripTrailingSlashPath(u.pathname)}`;
      locs.add(norm);
    } catch {
      /* skip */
    }
  }
  return locs;
}

function normalizePageUrl(url) {
  const u = new URL(url);
  return `${u.origin}${stripTrailingSlashPath(u.pathname)}`;
}

async function fetchText(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(25000),
  });
  const text = await res.text();
  return { status: res.status, text };
}

async function fetchBinary(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(60000),
  });
  const buf = new Uint8Array(await res.arrayBuffer());
  return { status: res.status, buf };
}

function loadGscState() {
  const utcDate = new Date().toISOString().slice(0, 10);
  try {
    const raw = readFileSync(GSC_STATE, "utf8");
    const j = JSON.parse(raw);
    if (j.utcDate !== utcDate) {
      return { utcDate, listed: [] };
    }
    if (!Array.isArray(j.listed)) return { utcDate, listed: [] };
    return { utcDate, listed: j.listed };
  } catch {
    return { utcDate, listed: [] };
  }
}

function saveGscState(state) {
  mkdirSync(LOGS_DIR, { recursive: true });
  writeFileSync(GSC_STATE, JSON.stringify(state, null, 2) + "\n", "utf8");
}

function nowIso() {
  return new Date().toISOString();
}

async function main() {
  mkdirSync(LOGS_DIR, { recursive: true });

  let slugs = SLUGS_ARG ? parseSlugList(SLUGS_ARG) : slugsFromGit();
  if (
    !SLUGS_ARG &&
    slugs.length === 0 &&
    !hasFlag("--allow-empty-slugs")
  ) {
    console.warn(
      "[indexing-health] No changed data/recommendations/*.json in git range " +
        `${GIT_BASE}..${GIT_HEAD}. Set --slugs or --allow-empty-slugs. Running global checks only.`
    );
  }

  const lines = [];
  const failures = [];
  let robotsOk = false;
  let sitemapOk = false;
  let sitemapLocs = new Set();

  lines.push(`## ${nowIso()} — indexing health`);
  lines.push("");
  lines.push(`- Git range: \`${GIT_BASE}..${GIT_HEAD}\``);
  lines.push(`- /movies-like slugs to verify: ${slugs.length}`);
  lines.push("");

  // --- robots.txt ---
  lines.push("### robots.txt");
  try {
    const { status, text } = await fetchText(ROBOTS_URL);
    const hasLine = text.includes(REQUIRED_ROBOTS_SNIPPET);
    robotsOk = status === 200 && hasLine;
    lines.push(`- HTTP: ${status}`);
    lines.push(`- Contains \`${REQUIRED_ROBOTS_SNIPPET}\`: ${hasLine ? "yes" : "no"}`);
    if (!robotsOk) {
      failures.push(
        hasLine
          ? `robots.txt HTTP ${status}`
          : "robots.txt missing required Sitemap line"
      );
    }
  } catch (e) {
    lines.push(`- ERROR: ${e instanceof Error ? e.message : e}`);
    failures.push("robots.txt fetch failed");
  }
  lines.push("");

  // --- sitemap.xml ---
  lines.push("### sitemap.xml");
  try {
    const { status, buf } = await fetchBinary(SITEMAP_URL);
    const xml = new TextDecoder().decode(buf);
    sitemapOk = status === 200;
    lines.push(`- HTTP: ${status}`);
    if (sitemapOk) {
      sitemapLocs = parseSitemapLocs(xml);
      lines.push(`- Parsed <loc> count: ${sitemapLocs.size}`);
    } else {
      failures.push(`sitemap.xml HTTP ${status}`);
    }
  } catch (e) {
    lines.push(`- ERROR: ${e instanceof Error ? e.message : e}`);
    failures.push("sitemap.xml fetch failed");
  }
  lines.push("");

  // --- per-page ---
  lines.push("### /movies-like/ URL checks");
  lines.push("");
  lines.push("| Slug | HTTP | Canonical OK | In sitemap |");
  lines.push("| --- | --- | --- | --- |");

  const gscCandidates = [];

  for (const slug of slugs) {
    const pageUrl = `${SITE_ORIGIN}/movies-like/${slug}`;
    const expectedCanonical = pageUrl;
    let httpOk = false;
    let canonOk = false;
    let inMap = false;

    try {
      const res = await fetch(pageUrl, {
        redirect: "follow",
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(25000),
      });
      httpOk = res.status === 200;
      const buf = new Uint8Array(await res.arrayBuffer());
      const slice = buf.byteLength > 450_000 ? buf.slice(0, 450_000) : buf;
      const html = new TextDecoder().decode(slice);
      const href = extractCanonical(html);
      canonOk = href ? canonicalMatches(href, expectedCanonical) : false;
      inMap = sitemapLocs.has(normalizePageUrl(pageUrl));
    } catch (e) {
      console.error(`[indexing-health] ${slug}: ${e}`);
    }

    const rowFail =
      !httpOk || !canonOk || !inMap
        ? " **FAIL**"
        : "";
    lines.push(
      `| \`${slug}\` | ${httpOk ? 200 : "≠200"} | ${canonOk ? "yes" : "no"} | ${inMap ? "yes" : "no"} |${rowFail}`
    );

    if (!httpOk) failures.push(`${pageUrl} HTTP not 200`);
    if (!canonOk) failures.push(`${pageUrl} canonical mismatch or missing`);
    if (!inMap) failures.push(`${pageUrl} missing from sitemap`);

    if (httpOk && canonOk && inMap) {
      gscCandidates.push(pageUrl);
    }
  }

  if (slugs.length === 0) {
    lines.push("| _(none)_ | — | — | — |");
  }

  lines.push("");

  // --- GSC manual list (daily cap) ---
  lines.push("### Submit these priority URLs manually in GSC URL Inspection");
  lines.push("");
  lines.push(
    "_Limited to 10 new recommendations per UTC day (tracked in `logs/indexing_health_gsc_state.json`). " +
      "Movie pages use sitemap + internal links; no Indexing API._"
  );
  lines.push("");

  const state = loadGscState();
  const already = new Set(state.listed);
  const fresh = gscCandidates.filter((u) => !already.has(u));
  const remaining = Math.max(0, DAILY_GSC_CAP - state.listed.length);
  const toList = fresh.slice(0, remaining);

  state.listed = [...state.listed, ...toList];
  saveGscState(state);

  lines.push(`- UTC date: ${state.utcDate}`);
  lines.push(`- Slots remaining before this run: ${remaining}`);
  lines.push(`- URLs added this run: ${toList.length}`);
  lines.push("");

  if (toList.length === 0) {
    lines.push(
      "_No URLs to list (none passed checks, none new vs git range, or daily cap already reached)._"
    );
  } else {
    toList.forEach((u, i) => {
      lines.push(`${i + 1}. ${u}`);
    });
  }

  lines.push("");
  lines.push("---");
  lines.push("");

  appendFileSync(HEALTH_LOG, lines.join("\n") + "\n", "utf8");

  console.log("");
  console.log("=== Submit these priority URLs manually in GSC URL Inspection ===");
  if (toList.length === 0) {
    console.log("(none this run — see logs/indexing_health.md)");
  } else {
    toList.forEach((u, i) => console.log(`${i + 1}. ${u}`));
  }
  console.log("");
  console.log(`Full report appended to ${HEALTH_LOG}`);

  if (failures.length) {
    console.error("[indexing-health] Failures:");
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
