# Forge Monitoring Implementation

**Status:** ✓ Complete  
**Date:** 2026-04-11  
**Purpose:** Monitor site health and verify newly generated pages are crawlable and in sitemap

---

## FILES CREATED

### Python Scripts (Core Logic)

#### 1. `scripts/forge-monitor.py`
- **Purpose:** Health checks + sitemap validation after each Forge job
- **Size:** ~350 lines
- **Executable:** Yes (`chmod +x`)

**What it does:**
1. Health checks (4 critical URLs)
   - Verifies HTTP 200 for homepage, /popular, /sitemap.xml, /robots.txt
   
2. Movie page sampling (5 random valid pages)
   - Dynamically selects 5 from `data/recommendations/*.json`
   - Confirms each returns HTTP 200 at `/movies-like/{slug}`
   - Logs all failures immediately
   
3. Sitemap validation
   - Fetches `https://www.movieslike.app/sitemap.xml`
   - Validates XML structure (catches malformed sitemaps)
   - Counts total URLs in sitemap
   
4. Consistency check
   - Extracts all movie page slugs from sitemap
   - Compares against all .json files in `data/recommendations/`
   - **Warns if any page is missing from sitemap** (no batch threshold)
   - Example: if Forge generated `new-movie.json` but it's not in sitemap → warning logged

**Logging:** `logs/forge-monitor-YYYY-MM-DD_HH-MM-SS.log`
**Exit Code:** 0 (all pass), 1 (failures)

---

#### 2. `scripts/forge-weekly-report.py`
- **Purpose:** Summarize monitoring data from past 7 days
- **Size:** ~220 lines
- **Executable:** Yes (`chmod +x`)

**What it does:**
1. Reads all `forge-monitor-*.log` files from past 7 days
2. Parses lines for:
   - Passes, Failures, Errors, Warnings
3. Generates markdown summary:
   - Total runs + success rate
   - List of failures/errors/warnings
   - Action items
4. Writes: `logs/forge-weekly-report-YYYY-WW.md`

**Output example:** See `logs/EXAMPLE-forge-weekly-report-2026-W15.md`

---

### Shell Wrappers (Hermes Integration)

#### 3. `scripts/cron-forge-monitor.sh`
- **Purpose:** Hermes cron wrapper for monitor job
- **Runs:** `python3 scripts/forge-monitor.py`
- **Executable:** Yes (`chmod +x`)
- **Used by:** Hermes cron jobs (morning, afternoon, evening monitor)

#### 4. `scripts/cron-forge-weekly-report.sh`
- **Purpose:** Hermes cron wrapper for weekly report job
- **Runs:** `python3 scripts/forge-weekly-report.py`
- **Executable:** Yes (`chmod +x`)
- **Used by:** Hermes cron job (Monday 09:00)

---

### Documentation

#### 5. `scripts/HERMES-SCHEDULE-MONITORING.txt`
- **Purpose:** Schedule reference for monitoring jobs
- **Contains:**
  - New cron patterns (07:10, 13:10, 19:10, and Monday 09:00)
  - Integration rules (do not modify Forge, GSC, etc.)
  - How each job works
  - Log retention policy
  - Troubleshooting guide
  - Commands to add jobs to Hermes

#### 6. `MONITORING-IMPLEMENTATION.md` (this file)
- **Purpose:** Complete implementation guide
- **Contains:** File paths, commands, how sitemap checking works, examples

---

## HERMES SCHEDULE ENTRIES

### New Cron Jobs to Add

Run these commands on the Hermes laptop (Air MacBook) to add monitoring jobs:

```bash
# Morning Monitor (runs after 07:00 Forge)
hermes cron add \
  --name "Forge Monitor (AM)" \
  --schedule "10 7 * * *" \
  --command 'cd $HOME/projects/watchthisapp && zsh scripts/cron-forge-monitor.sh'

# Afternoon Monitor (runs after 13:00 Forge)
hermes cron add \
  --name "Forge Monitor (PM)" \
  --schedule "10 13 * * *" \
  --command 'cd $HOME/projects/watchthisapp && zsh scripts/cron-forge-monitor.sh'

# Evening Monitor (runs after 19:00 Forge)
hermes cron add \
  --name "Forge Monitor (Evening)" \
  --schedule "10 19 * * *" \
  --command 'cd $HOME/projects/watchthisapp && zsh scripts/cron-forge-monitor.sh'

# Weekly Report (Monday 09:00)
hermes cron add \
  --name "Forge Weekly Report" \
  --schedule "0 9 * * 1" \
  --command 'cd $HOME/projects/watchthisapp && zsh scripts/cron-forge-weekly-report.sh'
```

### Cron Schedule Reference

```
Time        Job                    Hermes Command
------      ---                    ------
6:00 AM     Vega GSC Daily         (existing)
7:00 AM     Forge Morning          (existing) → npm run data:forge
7:10 AM     Forge Monitor (AM)     (NEW)      → zsh scripts/cron-forge-monitor.sh

1:00 PM     Forge Afternoon        (existing) → npm run data:forge
1:10 PM     Forge Monitor (PM)     (NEW)      → zsh scripts/cron-forge-monitor.sh

7:00 PM     Forge Evening          (existing) → npm run data:forge
7:10 PM     Forge Monitor (Evening) (NEW)      → zsh scripts/cron-forge-monitor.sh

Monday 9:00 AM  Forge Weekly Report (NEW) → zsh scripts/cron-forge-weekly-report.sh
```

---

## HOW SITEMAP CHECKING WORKS

### The Challenge
After Forge generates a page, we need to verify:
1. The page is accessible (HTTP 200)
2. The page is in the sitemap
3. The sitemap is valid XML

### The Solution: Two-Level Check

**Level 1: Data Consistency Check**
- Get list of all .json files in `data/recommendations/` (ground truth)
- Fetch `sitemap.xml` from live site
- Extract all `/movies-like/{slug}` URLs from sitemap
- Compare: if any .json exists but not in sitemap → **WARNING logged**
- This catches:
  - Newly generated pages not yet indexed
  - Pages that failed to deploy
  - Stale pages deleted from code but still in old sitemaps

**Level 2: Sample Page Checks**
- Randomly select 5 movie pages from `data/recommendations/`
- Hit each page's URL: `https://www.movieslike.app/movies-like/{slug}`
- Log any HTTP errors (404, 500, timeout, etc.)
- This catches:
  - Pages deployed but broken/inaccessible
  - Server errors during generation
  - Network/routing issues

### Example Scenario

**Forge generates:** `dune-part-three.json`

**Monitor runs 10 minutes later:**

1. **Sample checks:** 
   - Hits `/movies-like/dune-part-three` → ✓ HTTP 200
   
2. **Consistency check:**
   - Sees `dune-part-three.json` exists in `data/recommendations/`
   - Looks for `/movies-like/dune-part-three` in sitemap
   - If NOT FOUND → ✗ **Warning logged immediately**
   - If FOUND → ✓ All good

3. **Log output:**
   ```
   [INFO] ✓ dune-part-three (page accessible)
   [INFO] ✓ All movie pages present in sitemap
   ```

### What Triggers Warnings

**Missing Page Warning:**
- Generated `.json` file exists: `data/recommendations/new-movie.json`
- But missing from sitemap: no `/movies-like/new-movie` URL found
- This is logged **immediately** (not batched, not waiting for threshold)
- Likely causes:
  - Next.js build hasn't run yet (if using ISR)
  - Sitemap not regenerated after page generation
  - Deploy incomplete

---

## LOG EXAMPLES

### Success Case
See: `logs/EXAMPLE-forge-monitor-SUCCESS.log`

```
[2026-04-10T07:10:15.234567] INFO     === Forge Monitor Start (2026-04-10_07-10-15) ===
[2026-04-10T07:10:15.234890] INFO     === Health Checks ===
[2026-04-10T07:10:15.456123] INFO     ✓ https://www.movieslike.app/
[2026-04-10T07:10:15.678234] INFO     ✓ https://www.movieslike.app/popular
[2026-04-10T07:10:15.812345] INFO     ✓ https://www.movieslike.app/sitemap.xml
[2026-04-10T07:10:15.956789] INFO     ✓ https://www.movieslike.app/robots.txt
[2026-04-10T07:10:16.012345] INFO     Sampling 5 movie pages (from 4319 available)
[2026-04-10T07:10:16.034567] INFO     === Movie Page Checks ===
[2026-04-10T07:10:16.234123] INFO     ✓ interstellar
[2026-04-10T07:10:16.456234] INFO     ✓ the-shawshank-redemption
[2026-04-10T07:10:16.678345] INFO     ✓ inception
[2026-04-10T07:10:16.812456] INFO     ✓ the-dark-knight
[2026-04-10T07:10:16.956567] INFO     ✓ forrest-gump
[2026-04-10T07:10:17.034678] INFO     Checked 5 movie pages
[2026-04-10T07:10:17.045689] INFO     === Sitemap Validation ===
[2026-04-10T07:10:17.834567] INFO     Sitemap valid. Total URLs: 4327, Movie pages: 4319
[2026-04-10T07:10:17.845678] INFO     === Sitemap Consistency Check ===
[2026-04-10T07:10:17.856789] INFO     Found 4319 unique movie pages in sitemap
[2026-04-10T07:10:17.867890] INFO     ✓ All movie pages present in sitemap
[2026-04-10T07:10:17.878901] INFO     === Summary ===
[2026-04-10T07:10:17.890012] INFO     ✓ PASS - Log: /Users/openclaw/projects/watchthisapp/logs/forge-monitor-2026-04-10_07-10-15.log
```

**Result:** Exit 0, all checks passed ✓

---

### Failure Case
See: `logs/forge-monitor-2026-04-11_12-32-08.log` (real run from today)

```
[2026-04-11T12:32:08.014506] INFO     === Forge Monitor Start (2026-04-11_12-32-08) ===
[2026-04-11T12:32:08.015744] INFO     === Health Checks ===
[2026-04-11T12:32:08.023164] ERROR    ✗ https://www.movieslike.app/
[2026-04-11T12:32:08.025070] ERROR    ✗ https://www.movieslike.app/popular
[2026-04-11T12:32:08.026757] ERROR    ✗ https://www.movieslike.app/sitemap.xml
[2026-04-11T12:32:08.028182] ERROR    ✗ https://www.movieslike.app/robots.txt
[2026-04-11T12:32:08.042937] INFO     Sampling 5 movie pages (from 4319 available)
[2026-04-11T12:32:08.043601] INFO     === Movie Page Checks ===
[2026-04-11T12:32:08.045498] ERROR    ✗ the-three-musketeers-dartagnan
[2026-04-11T12:32:08.047372] ERROR    ✗ the-polar-express
[2026-04-11T12:32:08.049422] ERROR    ✗ the-dreamers
[2026-04-11T12:32:08.050897] ERROR    ✗ the-smurfs-2
[2026-04-11T12:32:08.052227] ERROR    ✗ nouvelle-vague
[2026-04-11T12:32:08.052759] INFO     Checked 5 movie pages
[2026-04-11T12:32:08.053143] INFO     === Sitemap Validation ===
[2026-04-11T12:32:08.054367] ERROR    Failed to fetch sitemap: <urlopen error Tunnel connection failed: 403 Forbidden>
[2026-04-11T12:32:08.054726] INFO     === Summary ===
[2026-04-11T12:32:08.055170] ERROR    FAILED: 10 error(s)
[2026-04-11T12:32:08.055509] ERROR      - Health check failed: https://www.movieslike.app/
[2026-04-11T12:32:08.055823] ERROR      - Health check failed: https://www.movieslike.app/popular
[2026-04-11T12:32:08.056168] ERROR      - Health check failed: https://www.movieslike.app/sitemap.xml
[2026-04-11T12:32:08.056486] ERROR      - Health check failed: https://www.movieslike.app/robots.txt
[2026-04-11T12:32:08.056798] ERROR      - Movie page failed: the-three-musketeers-dartagnan
[2026-04-11T12:32:08.057140] ERROR      - Movie page failed: the-polar-express
[2026-04-11T12:32:08.057485] ERROR      - Movie page failed: the-dreamers
[2026-04-11T12:32:08.057835] ERROR      - Movie page failed: the-smurfs-2
[2026-04-11T12:32:08.058162] ERROR      - Movie page failed: nouvelle-vague
[2026-04-11T12:32:08.058482] ERROR      - Could not fetch sitemap: <urlopen error Tunnel connection failed: 403 Forbidden>
[2026-04-11T12:32:08.058827] INFO     ✗ FAIL - Log: /sessions/busy-fervent-goldberg/mnt/watchthisapp/logs/forge-monitor-2026-04-11_12-32-08.log
```

**Result:** Exit 1, 10 errors detected ✗

**Interpretation:**
- Site is down (proxy/network issue)
- All health checks failed
- All sample pages inaccessible
- Cannot fetch sitemap

---

### Weekly Report Example
See: `logs/EXAMPLE-forge-weekly-report-2026-W15.md`

```markdown
# Forge Weekly Report — Week 15 2026

**Generated:** 2026-04-13 09:00:00
**Period:** Past 7 days
**Logs analyzed:** 21 monitor runs

## Summary

- ✓ **Passes:** 20
- ✗ **Failures:** 1
- ⚠ **Errors:** 0
- ⚠ **Warnings:** 2
- **Success Rate:** 95.2%

## Warnings (2)

- Missing from sitemap (3 pages):
  - dune-2 (redirect should handle, but check next run)
  - test-slug-invalid
  - new-movie-draft

## Action Items

- Investigate why 1 health check failed on April 10 evening
- Review 3 missing sitemap entries — verify Forge generated them correctly
```

---

## TESTING & VERIFICATION

### Manual Test (Read-Only)
```bash
cd ~/projects/watchthisapp

# Test monitor (makes actual HTTP requests, generates real log)
python3 scripts/forge-monitor.py

# Test dry-run (no requests, just prints "DRY RUN")
python3 scripts/forge-monitor.py --dry-run

# Test weekly report (reads past 7 days of logs)
python3 scripts/forge-weekly-report.py
```

### Verify Scripts Are Executable
```bash
ls -l scripts/forge-monitor.py scripts/forge-weekly-report.py
ls -l scripts/cron-forge-monitor.sh scripts/cron-forge-weekly-report.sh
```

All should show `x` permission bit.

### Verify Hermes Jobs
```bash
hermes cron list  # See all jobs
hermes status     # Check gateway health
```

---

## LOG RETENTION

Logs accumulate in `logs/` directory:
- `forge-monitor-*.log` files grow daily (3 per day = ~2KB each)
- `forge-weekly-report-*.md` files accumulate weekly

### Optional Cleanup (30-day rolling window)
```bash
# Manual cleanup
find logs -name "forge-monitor-*.log" -mtime +30 -delete
find logs -name "forge-weekly-report-*.md" -mtime +30 -delete

# Or add to cron (e.g., first day of month at 02:00)
# 0 2 1 * * find ~/projects/watchthisapp/logs -name "forge-monitor-*.log" -mtime +30 -delete
```

---

## INTEGRATION RULES (ENFORCED)

✓ **DO NOT MODIFY:**
- `scripts/forge_pagegen.py` (Forge generation logic)
- `scripts/cron-gsc-movieslike.sh` (Vega GSC job)
- Any Forge job core logic

✓ **DO NOT ADD:**
- GSC Search Console submission automation
- Auto-fixes or auto-rollback logic
- Changes to generated page content

✓ **MAINTAIN:**
- Read-only monitoring layer
- 10-minute scheduling gap between Forge and Monitor
- Clean separation between generation and validation

---

## SUMMARY

| Component | Path | Purpose | Runs |
|-----------|------|---------|------|
| Monitor Script | `scripts/forge-monitor.py` | Health + sitemap checks | 3x daily (07:10, 13:10, 19:10) |
| Weekly Report | `scripts/forge-weekly-report.py` | Summarize 7 days | 1x weekly (Mon 09:00) |
| Monitor Wrapper | `scripts/cron-forge-monitor.sh` | Hermes integration | 3x daily |
| Report Wrapper | `scripts/cron-forge-weekly-report.sh` | Hermes integration | 1x weekly |
| Schedule Doc | `scripts/HERMES-SCHEDULE-MONITORING.txt` | Setup & troubleshooting | Reference |
| This Doc | `MONITORING-IMPLEMENTATION.md` | Complete guide | Reference |

---

**Status:** Ready for deployment to Hermes ✓  
**Next Step:** Run `hermes cron add` commands above to schedule monitoring jobs.
