# Forge Monitoring — Deployment Checklist

**Date:** 2026-04-11  
**Status:** Ready for Hermes deployment

---

## FILES CREATED

All files are in your watchthisapp repo root.

### Executable Scripts

```
✓ scripts/forge-monitor.py              (9.2 KB, executable)
✓ scripts/forge-weekly-report.py        (5.8 KB, executable)
✓ scripts/cron-forge-monitor.sh         (0.7 KB, executable)
✓ scripts/cron-forge-weekly-report.sh   (0.7 KB, executable)
```

### Documentation

```
✓ MONITORING-IMPLEMENTATION.md          (Complete implementation guide)
✓ scripts/HERMES-SCHEDULE-MONITORING.txt (Hermes setup & reference)
✓ logs/EXAMPLE-forge-monitor-SUCCESS.log (Example: passing run)
✓ logs/EXAMPLE-forge-weekly-report-2026-W15.md (Example: weekly summary)
```

---

## EXACT COMMANDS TO RUN

### 1. Verify Scripts Are Executable

```bash
# From repo root:
ls -l scripts/forge-*.py scripts/cron-forge-*.sh
# All should show 'x' permission bit
```

✓ **Status:** Already set during creation

---

### 2. Test Monitor Script (Optional, Read-Only)

```bash
cd ~/projects/watchthisapp

# Real run (makes HTTP requests, generates log):
python3 scripts/forge-monitor.py

# Dry-run (no requests):
python3 scripts/forge-monitor.py --dry-run

# Check log was created:
ls -lt logs/forge-monitor-*.log | head -1
```

---

### 3. Add Monitoring Jobs to Hermes

Run on the Hermes laptop (Air MacBook):

```bash
# ===== MORNING MONITOR (runs 10 min after 07:00 Forge) =====
hermes cron add \
  --name "Forge Monitor (AM)" \
  --schedule "10 7 * * *" \
  --command 'cd $HOME/projects/watchthisapp && zsh scripts/cron-forge-monitor.sh'

# ===== AFTERNOON MONITOR (runs 10 min after 13:00 Forge) =====
hermes cron add \
  --name "Forge Monitor (PM)" \
  --schedule "10 13 * * *" \
  --command 'cd $HOME/projects/watchthisapp && zsh scripts/cron-forge-monitor.sh'

# ===== EVENING MONITOR (runs 10 min after 19:00 Forge) =====
hermes cron add \
  --name "Forge Monitor (Evening)" \
  --schedule "10 19 * * *" \
  --command 'cd $HOME/projects/watchthisapp && zsh scripts/cron-forge-monitor.sh'

# ===== WEEKLY REPORT (Monday 09:00) =====
hermes cron add \
  --name "Forge Weekly Report" \
  --schedule "0 9 * * 1" \
  --command 'cd $HOME/projects/watchthisapp && zsh scripts/cron-forge-weekly-report.sh'
```

---

### 4. Verify Jobs Were Added

```bash
hermes cron list
# Should show 4 new "Forge Monitor" and "Forge Weekly Report" entries

hermes status
# Gateway should be "healthy"
```

---

### 5. Optional: Remove Old Monitoring Jobs (If Any Exist)

If you had previous monitoring attempts, clean them up:

```bash
hermes cron list | grep -i "monitor\|weekly"
# Note any old job IDs, then delete:
hermes cron delete <job-id>
```

---

## SCHEDULE REFERENCE

After deployment, your movieslike schedule will be:

```
Time        Job                        Command
------      ---                        -------
6:00 AM     Vega GSC Daily             (existing, unchanged)
7:00 AM     Forge Morning              (existing, unchanged)
7:10 AM     ★ Forge Monitor (AM)       zsh scripts/cron-forge-monitor.sh

1:00 PM     Forge Afternoon            (existing, unchanged)
1:10 PM     ★ Forge Monitor (PM)       zsh scripts/cron-forge-monitor.sh

7:00 PM     Forge Evening              (existing, unchanged)
7:10 PM     ★ Forge Monitor (Evening)  zsh scripts/cron-forge-monitor.sh

Monday 9 AM ★ Forge Weekly Report      zsh scripts/cron-forge-weekly-report.sh

★ = NEW
```

---

## WHAT EACH JOB DOES

### Forge Monitor (AM/PM/Evening)
- **Runs:** 7:10 AM, 1:10 PM, 7:10 PM (10 min after Forge)
- **Checks:**
  - Health: HTTP 200 for homepage, /popular, /sitemap.xml, /robots.txt
  - Sample: 5 random movie pages return HTTP 200
  - Sitemap: Valid XML, count URLs
  - Consistency: All data/recommendations/*.json are in sitemap
- **Output:** `logs/forge-monitor-YYYY-MM-DD_HH-MM-SS.log`
- **Exit:** 0 (pass) or 1 (failures)

### Forge Weekly Report
- **Runs:** Monday 9:00 AM
- **Reads:** All forge-monitor-*.log files from past 7 days
- **Generates:** Summary markdown report
- **Output:** `logs/forge-weekly-report-YYYY-WW.md`
- **Contains:** Pass/fail counts, warnings, action items

---

## KEY BEHAVIORS

### Monitor Timing
- Forge jobs run at :00 (7:00, 13:00, 19:00)
- Monitor jobs run at :10 (7:10, 13:10, 19:10)
- 10-minute gap prevents race conditions

### Sitemap Consistency Check (How It Works)
1. Get all .json files in `data/recommendations/` (source of truth)
2. Fetch `https://www.movieslike.app/sitemap.xml`
3. Extract all `/movies-like/{slug}` URLs from sitemap
4. Compare: if any .json is missing from sitemap → **log warning immediately**
5. Examples that trigger warning:
   - Forge generated `new-movie.json` but not in sitemap yet
   - Page deployed but sitemap not regenerated
   - Build incomplete or stale

### Logging
- All logs written to `logs/` directory
- Timestamps: `YYYY-MM-DD_HH-MM-SS` format
- Levels: `INFO`, `WARNING`, `ERROR`
- Each run generates new timestamped log file
- No separate alert system (silent logging for now)

### Log Retention
- Monitor logs: 30 days (manual cleanup or cron job)
- Weekly reports: Keep indefinitely (small, useful for history)

---

## NEXT STEPS (POST-DEPLOYMENT)

### Week 1
1. Monitor runs 3x daily automatically via Hermes
2. Check `logs/forge-monitor-*.log` after first Forge job (7:10 AM)
3. Verify monitor jobs appear in `hermes status`
4. Review first weekly report (Monday 9:00 AM)

### Week 2+
- Monitor logs accumulate in `logs/`
- Weekly reports every Monday summarize the week
- If issues appear in logs:
  - Read the log file for detailed errors
  - Check HERMES-SCHEDULE-MONITORING.txt troubleshooting section
  - Manual run: `python3 scripts/forge-monitor.py`

### Cleanup (Optional)
Add a cleanup cron job to keep logs under 30 days:

```bash
hermes cron add \
  --name "Cleanup Old Logs" \
  --schedule "0 2 1 * *" \
  --command 'cd $HOME/projects/watchthisapp && find logs -name "forge-monitor-*.log" -mtime +30 -delete'
```

---

## TROUBLESHOOTING

### Monitor job not running
```bash
hermes status                  # Check gateway is healthy
hermes cron list              # Verify job exists
ls logs/forge-monitor-*.log   # Check logs exist
```

### Monitor reports failures
```bash
# Read the log
less logs/forge-monitor-YYYY-MM-DD_HH-MM-SS.log

# Common failures:
# - Site down: Network/proxy issue, site maintenance
# - Sitemap invalid: XML parsing error, stale sitemap
# - Missing pages: Forge generated but sitemap not updated
```

### Manual test
```bash
cd ~/projects/watchthisapp
python3 scripts/forge-monitor.py    # Full run
python3 scripts/forge-monitor.py --dry-run  # No-op test
```

---

## FILES REFERENCE

### Core Implementation
- `scripts/forge-monitor.py` — Main monitor logic (health, sampling, sitemap checks)
- `scripts/forge-weekly-report.py` — Weekly summary report generation
- `scripts/cron-forge-monitor.sh` — Hermes wrapper (monitor)
- `scripts/cron-forge-weekly-report.sh` — Hermes wrapper (report)

### Documentation
- `MONITORING-IMPLEMENTATION.md` — Complete guide (what, why, how)
- `scripts/HERMES-SCHEDULE-MONITORING.txt` — Setup & reference (Hermes integration)
- `MONITORING-DEPLOYMENT-CHECKLIST.md` — This file (commands & checklist)

### Examples & Logs
- `logs/EXAMPLE-forge-monitor-SUCCESS.log` — Example: successful run
- `logs/EXAMPLE-forge-weekly-report-2026-W15.md` — Example: weekly report
- `logs/forge-monitor-2026-04-11_12-32-08.log` — Real test run (site down, shows failures)

---

## SUMMARY

**Status:** ✓ Implementation complete, ready for Hermes deployment

**New Jobs:** 4
- 3x Monitor (AM/PM/Evening) — runs after each Forge job
- 1x Weekly Report — summarizes past 7 days

**Scripts:** 4 new executables + 3 documentation files

**Next Action:** Run `hermes cron add` commands above on Hermes laptop (Air MacBook)

**Verification:** After 10 minutes, check:
```bash
ls -lart logs/forge-monitor-*.log | tail -1  # Should show recent log
```

---

For complete implementation details, see: `MONITORING-IMPLEMENTATION.md`  
For Hermes setup details, see: `scripts/HERMES-SCHEDULE-MONITORING.txt`
