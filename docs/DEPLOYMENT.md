# MoviesLike deployment source

**Production:** `https://www.movieslike.app` is deployed from **`movieslike`** (GitHub `watchthisapp-prod`, Vercel project `watchthisapp-prod`).

**Legacy corpus:** **`watchthisapp`** holds 4,465 JSON bundles + forge automation — archive only while Path B is active.

## Verify alignment

```bash
# Production Vercel project should point at:
cd ~/projects/watchthisapp
git remote -v
vercel ls   # if CLI linked

# WIP rewrite (do NOT deploy until SEO parity):
cd ~/projects/movieslike
```

## Environment

| Variable | Production value |
|----------|------------------|
| `NEXT_PUBLIC_SITE_URL` | `https://www.movieslike.app` |

Defined in `src/lib/site-url.ts` with apex → www normalization.

## SEO files (production)

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | metadataBase, default title/description, OG |
| `src/app/robots.ts` | Crawl rules + sitemap pointer |
| `src/app/sitemap.ts` | ~4.4k URLs (movies-like, blog, collections) |
| `src/lib/site-url.ts` | Canonical host helper |

## Pre-cutover checklist (`movieslike` → production)

- [ ] Add `metadataBase` + OG to `app/layout.tsx`
- [ ] Port `getSiteUrl()` from watchthisapp
- [ ] Sync `robots.ts` rules with production
- [ ] Sitemap parity (blog, collections, programmatic pages)
- [ ] Run `npm run build` and compare sitemap URL count
- [ ] GSC URL Inspection on 5 sample pages after deploy

## CTR improvements (watchthisapp)

Edit `generateMetadata` in:

- `src/app/movies-like/[slug]/page.tsx` — add year, mood, or “8 picks” in title
- `src/app/popular/page.tsx` — expand meta description with examples

Test in GSC Performance after 2–4 weeks.
