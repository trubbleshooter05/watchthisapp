/**
 * Default origin when NEXT_PUBLIC_SITE_URL is unset.
 * Use www so sitemap/robots match the canonical host (apex redirects to www on Vercel).
 */
export const SITE_URL_FALLBACK = "https://www.movieslike.app";

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  let origin = raw || SITE_URL_FALLBACK;
  origin = origin.replace(/\/$/, "");
  // Align with Vercel redirect: apex → www (avoids GSC “no referring sitemap” on www URLs).
  if (origin === "https://movieslike.app" || origin === "http://movieslike.app") {
    return SITE_URL_FALLBACK;
  }
  return origin;
}
