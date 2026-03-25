/** Used when NEXT_PUBLIC_SITE_URL is missing so metadata, sitemap, and JSON-LD stay on the live domain. */
export const SITE_URL_FALLBACK = "https://movieslike.app";

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const origin = raw || SITE_URL_FALLBACK;
  return origin.replace(/\/$/, "");
}
