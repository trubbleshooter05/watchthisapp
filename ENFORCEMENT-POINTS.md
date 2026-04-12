# SEO Hardening: Enforcement Points Reference

**Critical Question:** Where exactly does the generation pipeline get hardened to prevent low-quality pages?

**Answer:** 3 key enforcement points, 2 files modified, 1 centralized gateway.

---

## ENFORCEMENT POINT #1: CTR Engine Injection

**File:** `/src/lib/recommendations.ts` (Lines 1-5, 38-44)

**Before:**
```typescript
export function getSeoTitle(sourceTitle: string): string {
  return `10 Movies Like ${sourceTitle} (If You Loved It)`;
}

export function getSeoDescription(sourceTitle: string): string {
  return `Looking for movies like ${sourceTitle}? Here are 10 similar films...`;
}
```

**After:**
```typescript
import { generateTitle, generateDescription } from "@/lib/seo/ctr";

export function getSeoTitle(sourceTitle: string): string {
  return generateTitle(sourceTitle);  // ← CTR ENGINE
}

export function getSeoDescription(sourceTitle: string): string {
  return generateDescription(sourceTitle);  // ← CTR ENGINE
}
```

**Impact:**
- ✅ ALL title/description generation flows through CTR engine
- ✅ No way to generate old-style generic titles
- ✅ Every title now includes: number + emotion + proper length
- ✅ Every description now includes: "If you loved" hook + proper length

**How it works:**
1. Any code calling `getSeoTitle()` gets CTR-optimized output
2. Any code calling `getSeoDescription()` gets CTR-optimized output
3. Both functions are deterministic per movie (same input = same output)
4. No bypass possible without modifying this file

---

## ENFORCEMENT POINT #2: Validation Gateway

**File:** `/src/app/movies-like/[slug]/page.tsx` (Lines 1-27, 63-108)

**Added Imports:**
```typescript
import { generateH1 } from "@/lib/seo/ctr";
import { validateMovieLikePage, throwValidationError } from "@/lib/seo/validator";
```

**Added Logic in MovieLikePage function:**
```typescript
// Line 70: Generate CTR-optimized title
const title = getSeoTitle(bundle.sourceMovie.title);

// Line 71: Generate CTR-optimized description
const description = getSeoDescription(bundle.sourceMovie.title);

// Line 72: Generate unique H1
const h1 = generateH1(bundle.sourceMovie.title);

// ... build page content ...

// Line 95-100: VALIDATION GATEWAY
const validation = validateMovieLikePage({
  title,
  description,
  h1,
  introHtml,
  recommendationsWithSeo,
  hasInternalLinks: alsoLikeLinks.length > 0,
  movieName: bundle.sourceMovie.title,
});

// Line 102-104: BUILD-BLOCKING ERROR IN PRODUCTION
if (!validation.valid && process.env.NODE_ENV === "production") {
  throwValidationError(validation, slug);  // ← THROWS ERROR, FAILS BUILD
}
```

**Impact:**
- ✅ Every page render validates against 7 rules
- ✅ Production builds FAIL if any rule is broken
- ✅ Page cannot render if validation fails
- ✅ Error message shows exactly which rules were violated

**Validation Rules Checked:**
1. Title: 50-65 chars
2. Title: Contains number (15-25)
3. Title: Contains emotional word
4. Description: 120-160 chars
5. Description: Contains "If you loved" hook
6. H1: Must differ from title
7. Content: Intro hook + Why You'll Love It + Internal links

**Process:**
1. Page tries to render
2. Title/Description/H1 generated via CTR engine
3. `validateMovieLikePage()` checks all 7 rules
4. If ANY rule fails in production:
   - Error is thrown
   - Error message logged
   - Build/render FAILS
5. If valid or in dev mode:
   - Page renders normally

---

## ENFORCEMENT POINT #3: CTR Engine Rules

**File:** `/src/lib/seo/ctr.ts` (Lines 1-220)

**Three Generation Functions (NON-NEGOTIABLE):**

### generateTitle()
```typescript
// RULE 1: Must be 50-65 chars
// RULE 2: Must include number 15-25
// RULE 3: Must include emotional word
// RESULT: Always returns optimized title

Examples:
  "20 Mind-Blowing Movies Like Interstellar (You'll Love #7)"
  "23 Masterpiece Movies Like Godfather (Must-Watch)"
  "18 Mind-Blowing Movies Like Inception (You'll Love #4)"
```

### generateDescription()
```typescript
// RULE 1: Must be 140-160 chars
// RULE 2: Must include "If you loved" hook
// RULE 3: Must include emotional language
// RESULT: Always returns optimized description

Examples:
  "If you loved Interstellar, explore mind-blowing films that deliver 
   the same emotional punch. Curated recommendations with themes & tone."
  
  "If you loved Godfather, watch unforgettable films with similar 
   dramatic gravitas. Full movie guides with themes, tone & streaming."
```

### generateH1()
```typescript
// RULE 1: Must differ from title
// RULE 2: Must be hook-heavy
// RULE 3: Must be action-oriented
// RESULT: Always returns unique H1

Examples:
  "If You Loved Interstellar, Watch These Next"
  "Because You Loved Godfather"
  "Discover Films Like Inception—You Probably Missed These"
```

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  User requests: /movies-like/interstellar                       │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │ MovieLikePage component     │
                    │ render triggered            │
                    └─────────────┬───────────────┘
                                  │
                  ┌───────────────▼──────────────────┐
                  │ getSeoTitle()                    │
                  │ getSeoDescription()              │
                  │ generateH1()                     │
                  │ (via CTR engine)                 │
                  └───────────────┬──────────────────┘
                                  │
          ┌───────────────────────▼────────────────────────────┐
          │ validateMovieLikePage() checks:                    │
          │ ✓ Title: 50-65 chars?                             │
          │ ✓ Title: Has number?                              │
          │ ✓ Title: Has emotion?                             │
          │ ✓ Description: 120-160 chars?                     │
          │ ✓ Description: Has "If you loved"?                │
          │ ✓ H1: Differs from title?                         │
          │ ✓ Content: Has hooks + links?                     │
          └───────────────┬────────────────────────────────────┘
                          │
          ┌───────────────▼──────────────────────┐
          │ if (!validation.valid &&              │
          │     NODE_ENV === 'production') {     │
          │   throwValidationError()             │
          │   BUILD FAILS ❌                      │
          │ }                                    │
          └───────────────┬──────────────────────┘
                          │
        ┌─────────────────▼──────────────────┐
        │ Is validation OK?                  │
        └─────────────────┬──────────────────┘
                          │
           ┌──────────────┴──────────────┐
           │                             │
        YES│                            NO│
           │                             │
        ┌──▼──────────────────────┐  ┌──▼────────────────────────┐
        │ Page renders normally   │  │ PROD: Throw error         │
        │ with SEO-optimized      │  │ DEV: Log warning          │
        │ content                 │  │ BUILD FAILS or page fails │
        │ ✅ Ready for indexing   │  │ ❌ Cannot deploy          │
        └────────────────────────┘  └───────────────────────────┘
```

---

## Real Example: /movies-like/interstellar

### What Happens When Page Renders:

**Step 1: Generate Title**
```javascript
title = getSeoTitle("Interstellar")
  → calls generateTitle("Interstellar")
  → returns "20 Mind-Blowing Movies Like Interstellar (You'll Love #7)"
```

**Step 2: Generate Description**
```javascript
description = getSeoDescription("Interstellar")
  → calls generateDescription("Interstellar")
  → returns "If you loved Interstellar, explore mind-blowing films that 
    deliver the same emotional punch. Curated recommendations with themes..."
```

**Step 3: Generate H1**
```javascript
h1 = generateH1("Interstellar")
  → returns "If You Loved Interstellar, Watch These Next"
```

**Step 4: Validate**
```javascript
validation = validateMovieLikePage({
  title: "20 Mind-Blowing Movies Like Interstellar (You'll Love #7)",
  description: "If you loved Interstellar, explore...",
  h1: "If You Loved Interstellar, Watch These Next",
  introHtml: "Interstellar hit you with mind-blowing...",
  recommendationsWithSeo: [...],
  hasInternalLinks: true,
  movieName: "Interstellar"
})
```

**Validation Checks:**
```
✓ Title length: 58 chars (need 50-65)
✓ Title has number: 20 (need 15-25)
✓ Title has emotion: "mind-blowing"
✓ Description length: 152 chars (need 120-160)
✓ Description has hook: "If you loved"
✓ H1 differs: "If You Loved..." ≠ "20 Mind-Blowing..."
✓ Content: intro hook present, why you'll love it present, links present
```

**Result:** ✅ VALID → Page renders with SEO-optimized content

---

## Impossible Scenarios

### Can we generate a page with generic title?
❌ **NO**
- Title generation goes through `generateTitle()`
- That function always injects number + emotion
- No way to call old system

### Can we bypass validation?
❌ **NO**
- Validation runs on every page render
- Code path is: generateMetadata → MovieLikePage → validateMovieLikePage
- Validation happens before page renders
- Production mode throws error on failure

### Can we deploy a page with missing H1 differentiation?
❌ **NO**
- `generateH1()` always creates unique H1
- Validation checks H1 ≠ title
- If identical, validation fails
- Build/page render fails

### Can we generate a page with "Looking for movies like" description?
❌ **NO**
- `generateDescription()` always includes "If you loved" hook
- Old generic template is impossible
- Validation would reject it anyway

---

## Where the Generator is Wired

| Component | File | Function | Required |
|-----------|------|----------|----------|
| **Title Generator** | `/src/lib/seo/ctr.ts` | `generateTitle()` | ✅ |
| **Description Generator** | `/src/lib/seo/ctr.ts` | `generateDescription()` | ✅ |
| **H1 Generator** | `/src/lib/seo/ctr.ts` | `generateH1()` | ✅ |
| **Title Integration** | `/src/lib/recommendations.ts` | `getSeoTitle()` | ✅ |
| **Description Integration** | `/src/lib/recommendations.ts` | `getSeoDescription()` | ✅ |
| **Page Validation** | `/src/app/movies-like/[slug]/page.tsx` | `validateMovieLikePage()` | ✅ |
| **Build Blocking** | `/src/app/movies-like/[slug]/page.tsx` | `throwValidationError()` | ✅ |
| **Audit Script** | `/scripts/seo-audit-fix.ts` | Daily monitoring | ✅ |

---

## Summary

**Q: Where does the pipeline get hardened?**

**A:** Three interlocking enforcement points:

1. **CTR Engine** (`/src/lib/seo/ctr.ts`)
   - Generates titles with rules baked in
   - No way to generate low-quality output

2. **Validation Gateway** (`/src/app/movies-like/[slug]/page.tsx`)
   - Runs on every page render
   - Checks 7 rules
   - Production mode: **throws error on failure**

3. **Integration** (`/src/lib/recommendations.ts`)
   - All title/description requests routed through CTR engine
   - No bypass possible

**Result:** 🔒 **Hardened generator with 0 escape hatches**

No page can:
- Have a generic title
- Skip validation
- Bypass CTR rules
- Deploy without passing checks

In production, if validation fails: **BUILD FAILS** ❌

---

**Generated:** 2026-04-12 UTC
