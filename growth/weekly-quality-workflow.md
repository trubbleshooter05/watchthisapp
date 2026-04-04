# Weekly quality workflow — movieslike.app

**When:** Every **Friday** afternoon (1–2 hours)  
**Goal:** Polish the **top 5–10** pages that already get visibility, using data from Search Console + the repo quality audit.

---

## Repo path (pick one)

| Machine | Path |
|--------|------|
| This Mac (Cursor) | `~/projects/watchthisapp` |
| Hermes laptop | `/Volumes/openclaw/projects/watchthisapp` |

Use the same commands below from whichever clone you open in the terminal.

---

## 1. Identify top performers (~10 min)

1. Open **Google Search Console** → property **`movieslike.app`** (domain property is correct; no need to recreate anything).
2. **Performance** → **Search type: Web** → **Last 28 days**.
3. Open the **Pages** tab (or stay on Queries if you’re query-led).
4. Sort by **Clicks** (then **Impressions** if clicks are still thin).
5. Note **top 10 URLs** you care about this week.

**Indexing:** Submit high-priority URLs when they’re live (URL Inspection → **Request indexing**). Use your latest **priority queue** file if you still run automation that writes it:

- `logs/priority-indexing-queue-latest.txt` (next to the repo when the pipeline uses `REPO_MAIN/logs`), **or**
- The **Popular** hub: `https://www.movieslike.app/popular`

You don’t need a second GSC property for `www` if you already use the domain property.

---

## 2. Run the quality audit (~5 min)

```bash
cd ~/projects/watchthisapp   # or: cd /Volumes/openclaw/projects/watchthisapp
node scripts/audit-quality.mjs
```

- Console output lists **flagged** recommendation pages.
- JSON report: `scripts/audit-quality-report.json` (generated locally; listed in `.gitignore`).

In Cursor, ask for a short summary: which flagged slugs overlap your GSC top URLs.

---

## 3. Cross-reference (~5 min)

- **Money pages** = high **clicks/impressions** in GSC **and** flagged (or weak) in the audit.
- Start with **3–5** of those, not the whole site.

---

## 4. Improve top 3–5 pages (~45–90 min)

Edit the matching files under `data/recommendations/<slug>.json` (or use Cursor with explicit file paths).

For each **money page**:

1. **`sourceMovie.whyPeopleLoveIt`** — short, specific, not generic fluff (2–3 sentences).
2. **Recommendations** — tighten **`whyYoullLoveIt`**: real plot/character/style ties, not template phrases.
3. **FAQ** — answers should feel useful, not filler.

Use a strong page (e.g. `data/recommendations/parasite.json`) as the **quality bar**.

---

## 5. Ship (~5 min)

Verify locally, then **commit only what you changed** (avoid blind `git add .`).

```bash
cd ~/projects/watchthisapp   # or Hermes path above
npm run build
git status
git add data/recommendations/<slug>.json   # repeat per file, or add paths you touched
git commit -m "Improve top money pages (weekly quality pass)"
git push origin main
```

**Production deploy:** **`git push` → `watchthisapp-prod` on Vercel** (Git integration). Do **not** rely on `vercel deploy` from automation or random folders.

---

## 6. Track next week

- Note slugs/commits you improved.
- Next Friday: same GSC report — did **clicks** or **average position** move for those URLs?

---

## Cadence reminder (aligned with real automation)

| Frequency | What runs |
|-----------|-----------|
| **Daily** | Automated pipeline on the runner Mac: **up to ~3** new trending recommendation JSONs per run (not 10/day). Push to `main` deploys production. |
| **Weekly (Friday)** | This doc — manual quality on top performers. |
| **Monthly** | Broader strategy / monetization / content gaps (separate planning). |

---

## Quick copy for Cursor

```
Run data/recommendations quality context for movieslike.app:
1) node scripts/audit-quality.mjs
2) Cross-flagged slugs with my GSC top URLs from last 28 days
3) Propose edits for the top 3 money pages only; use parasite.json as benchmark
```
