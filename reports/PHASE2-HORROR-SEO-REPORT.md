# Phase 2 — Horror cluster (5 pages) + Vega import stub

**Scope:** Existing `/movies-like/*` guides only (no new routes).  
**Engagement:** “Top picks if you liked [movie]” strip + Continue watching enabled for the same slug set as `top-gun-maverick` (see `src/lib/movies-like-engagement.ts`).  
**Distinctness:** Each page uses a different CTR emotional token in **seoTitle** (Gripping / Haunting / Addictive / Breathtaking / Stunning). **seoH1** and **seoDescription** strings are unique per film.

**Browser tab title** uses the root layout template: `{seoTitle} | MoviesLike`.

---

## 1. `/movies-like/the-unhealer`

| Field | Value |
| --- | --- |
| **seoTitle** | 10 Gripping Movies Like The Unhealer (Ranked Next Picks) |
| **meta description** | If you loved The Unhealer's curse-thriller tension, these 10 dark fantasy horrors match its dread, revenge beats, and gnarly stakes—ranked with streaming picks. |
| **H1 (on-page)** | If The Unhealer’s Curse Hooked You, Queue These 10 Next |

**Inbound internal links added (from other guides’ `relatedPages`, outside the core-5 cluster):**

- `midsommar.json`
- `bodies-bodies-bodies.json`
- `a-quiet-place.json`
- `sinister.json`
- `us.json`

---

## 2. `/movies-like/hereditary`

| Field | Value |
| --- | --- |
| **seoTitle** | 10 Haunting Movies Like Hereditary (Family Horror Next) |
| **meta description** | If you loved Hereditary’s grief-soaked dread, these 10 films echo its family trauma, occult shock, and slow-burn terror—ranked with where to stream. |
| **H1 (on-page)** | Hereditary Fans: 10 Essential Films When You Need More Dread |

**Inbound internal links added:**

- `the-babadook.json`
- `the-witch.json`
- `insidious.json`

---

## 3. `/movies-like/get-out`

| Field | Value |
| --- | --- |
| **seoTitle** | 10 Addictive Movies Like Get Out (Social Thriller Picks) |
| **meta description** | If you loved Get Out’s social thriller twists, these 10 picks match its tension, satire sting, and can’t-look-away pacing—hand-ranked with streaming context. |
| **H1 (on-page)** | After Get Out: 10 Thrillers That Hit the Same Nerve |

**Phase 2 note:** `seoTitle` was updated from “Gripping” to **“Addictive”** so it does not overlap *The Unhealer*’s “Gripping” pattern.

**Inbound internal links added:**

- `midsommar.json`
- `us.json`
- `nope.json`

---

## 4. `/movies-like/the-conjuring`

| Field | Value |
| --- | --- |
| **seoTitle** | 10 Breathtaking Movies Like The Conjuring (Haunted-House Next) |
| **meta description** | If you loved The Conjuring’s haunted-house dread, these 10 paranormal chillers deliver investigators, jump scares, and creeping dread—ranked for fans. |
| **H1 (on-page)** | The Conjuring Fans: 10 More Cases Worth Your Night |

**Inbound internal links added:**

- `a-quiet-place.json`
- `insidious.json`
- `annabelle.json`

---

## 5. `/movies-like/men`

| Field | Value |
| --- | --- |
| **seoTitle** | 10 Stunning Movies Like Men (Folk Horror & Dread Picks) |
| **meta description** | If you loved Men’s surreal folk horror, these 10 films match its unease, metaphor-heavy dread, and unforgettable atmosphere—ranked with streaming notes. |
| **H1 (on-page)** | Because Men Left You Uneasy: 10 Films to Chase That Feeling |

**Inbound internal links added:**

- `bodies-bodies-bodies.json`
- `the-witch.json`
- `ex-machina.json`

---

## Files touched (code + data)

- `src/lib/movies-like-engagement.ts` — slug allowlist for Top picks + Continue watching.
- `src/app/movies-like/[slug]/page.tsx` — shared “Top picks if you liked {title}” block (highlighted card); Continue watching for all slugs in allowlist.
- `data/recommendations/get-out.json` — `seoTitle` distinctness (Addictive).
- Eleven `data/recommendations/*.json` files — `relatedPages` prepends as listed above.
- `reports/vega-gsc-latest.csv` — template for future Vega/GSC imports (no guessed URLs).
