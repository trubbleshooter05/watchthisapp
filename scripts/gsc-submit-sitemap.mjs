/**
 * Notify Google Search Console that the sitemap should be fetched (again).
 *
 * Requires a service account with **Owner / Full user** permission on the GSC property
 * and JWT scope https://www.googleapis.com/auth/webmasters (not readonly).
 *
 * Usage:
 *   node scripts/gsc-submit-sitemap.mjs
 *   node scripts/gsc-submit-sitemap.mjs --sitemap https://www.movieslike.app/sitemap.xml
 *
 * Pair with HTTPS pages on www (matches indexing-health SITE_ORIGIN).
 */

import { createSign } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const args = process.argv.slice(2);
function getArg(flag, fallback) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const credsPathArg = getArg("--credentials", "");
const envCredsPath = process.env.GSC_SERVICE_ACCOUNT_FILE || process.env.GSC_CREDENTIALS_FILE || "";
const defaultCredsPath = path.join(root, "gsc-service-account.json");
const credsPath = credsPathArg || envCredsPath || defaultCredsPath;

const FEED_RAW = (
  getArg("--sitemap", "") ||
  process.env.GSC_SUBMIT_SITEMAP_URL ||
  "https://www.movieslike.app/sitemap.xml"
).trim();

function loadDotEnvVar(name) {
  const p = path.join(root, ".env.local");
  if (!existsSync(p)) return null;
  const raw = readFileSync(p, "utf8");
  const m = raw.match(new RegExp(`^${name}=(.+)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
}

function siteCandidatesFromEnv() {
  const explicit = process.env.GSC_SITE_URL || loadDotEnvVar("GSC_SITE_URL");
  if (explicit) return [explicit];

  const site =
    process.env.NEXT_PUBLIC_SITE_URL ||
    loadDotEnvVar("NEXT_PUBLIC_SITE_URL") ||
    "https://movieslike.app";

  try {
    const u = new URL(site.startsWith("http") ? site : `https://${site}`);
    const noWww = u.hostname.replace(/^www\./, "");
    return [
      `sc-domain:${noWww}`,
      `https://${noWww}/`,
      `https://www.${noWww}/`,
    ];
  } catch {
    return ["sc-domain:movieslike.app"];
  }
}

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function buildJwtAssertion(creds) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/webmasters",
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

/**
 * PUT https://searchconsole.googleapis.com/webmasters/v3/sites/{siteUrl}/sitemaps/{feedUrl}
 */
async function submitSitemap(accessToken, siteUrl, feedUrl) {
  const encodedSite = encodeURIComponent(siteUrl);
  const encodedFeed = encodeURIComponent(feedUrl);
  const url =
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedSite}` +
    `/sitemaps/${encodedFeed}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Sitemap submit failed (${res.status}): ${text}`);
  }

  return { status: res.status, body: text };
}

async function main() {
  if (!existsSync(credsPath)) {
    console.error("[gsc-submit-sitemap] No credentials file. Set GSC_SERVICE_ACCOUNT_FILE or add gsc-service-account.json.");
    process.exit(1);
  }

  /** @type {{ client_email: string; private_key: string; token_uri?: string }} */
  const creds = JSON.parse(readFileSync(credsPath, "utf8"));
  console.log("[gsc-submit-sitemap] Using credentials:", creds.client_email);

  let accessToken;
  try {
    accessToken = await fetchAccessToken(creds);
  } catch (e) {
    console.error("[gsc-submit-sitemap] Auth failed:", e.message);
    process.exit(1);
  }

  const sites = siteCandidatesFromEnv();
  let lastOk = false;

  for (const site of sites) {
    try {
      const r = await submitSitemap(accessToken, site, FEED_RAW);
      console.log(`[gsc-submit-sitemap] OK (${r.status}) site=${site} feed=${FEED_RAW}`);
      lastOk = true;
      break;
    } catch (e) {
      console.warn(`[gsc-submit-sitemap] Skip ${site}:`, e.message);
    }
  }

  if (!lastOk) {
    console.error("[gsc-submit-sitemap] Could not submit for any property candidate.");
    console.error("  Hint: verify GSC_SITE_URL matches Search Console exactly and the service account has Full access.");
    process.exit(1);
  }

  console.log("[gsc-submit-sitemap] Done. Google may take time to crawl; check GSC → Sitemaps.");
}

await main();
