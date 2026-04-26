#!/usr/bin/env python3
"""vega_gsc_pull.py — movieslike-vega Hermes skill helper

Writes:
  vega_report_YYYYMMDD.json — full GSC pull (gaps, CTR fixes, decay, top pages, meta)
  vega_summary_YYYYMMDD.json — compact headline metrics + text summary only

Important: total_impressions_7d / total_clicks_7d come from a dimensionless GSC query
(property totals for the date range).  Do NOT use the sum of page-level rows as “totals” —
the API returns at most rowLimit rows sorted by clicks (then ties), so summing rows
undercounts badly on long-tail sites.

Do not create vega_report_*.json from LLM/agent write tools; that produced tiny junk files
with wrong calendar dates.  Only this script should emit vega_report_*.json.
"""
import json
import os
import re
import sys
from datetime import date, timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path.home() / ".hermes/.env")

GSC_CREDS = os.getenv("GSC_CREDENTIALS_FILE", str(Path.home() / ".gsc_service_account.json"))
GSC_SITE = os.getenv("GSC_SITE_URL", "sc-domain:movieslike.app")
SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]

# Slug JSONs: default to watchthisapp repo on this machine (Forge uses the same).
_DEFAULT_MOVIES = Path.home() / "projects/watchthisapp/data/recommendations"
MACMINI_MOVIES = Path(os.getenv("VEGA_MOVIES_DIR", str(_DEFAULT_MOVIES)))

RESULTS_DIR = Path(os.getenv("VEGA_RESULTS_DIR", str(Path.home() / "clawd/results")))
SHARE_RESULTS = Path(os.getenv("VEGA_SHARE_RESULTS", "/Volumes/openclaw/clawd/results"))
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

# GSC returns max 25,000 rows per request; page breakdowns are sorted by clicks desc.
ROW_LIMIT_PAGES = min(int(os.getenv("VEGA_ROW_LIMIT", "25000")), 25000)
ROW_LIMIT_QUERIES = min(int(os.getenv("VEGA_ROW_LIMIT", "25000")), 25000)

IS_SUNDAY = date.today().weekday() == 6

# Minimum bytes for a “full” report on disk (guards against empty/partial writes)
MIN_FULL_REPORT_BYTES = 400


def get_svc():
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    creds = service_account.Credentials.from_service_account_file(GSC_CREDS, scopes=SCOPES)
    return build("searchconsole", "v1", credentials=creds, cache_discovery=False)


def gsc_query(
    svc,
    start,
    end,
    dims,
    limit=500,
    *,
    search_type="web",
    data_state="all",
):
    """searchType=web matches the default Search Performance “Web” tab."""
    try:
        body = {
            "startDate": start,
            "endDate": end,
            "dimensions": list(dims),
            "rowLimit": limit,
            "searchType": search_type,
            "dataState": data_state,
        }
        return (
            svc.searchanalytics()
            .query(siteUrl=GSC_SITE, body=body)
            .execute()
            .get("rows", [])
        )
    except Exception as e:
        print(f"GSC error: {e}", file=sys.stderr)
        return []


def gsc_property_totals(svc, start, end):
    """Single aggregate row: true site clicks/impressions for the range (web search)."""
    rows = gsc_query(svc, start, end, [], limit=1)
    if not rows:
        return 0, 0.0, 0.0
    r = rows[0]
    return int(r.get("clicks", 0)), float(r.get("impressions", 0)), float(r.get("ctr", 0) or 0)


def load_slugs():
    if not MACMINI_MOVIES.exists():
        print(f"WARNING: VEGA_MOVIES_DIR missing — content_gaps will be wrong: {MACMINI_MOVIES}", file=sys.stderr)
        return set()
    return {f.stem for f in MACMINI_MOVIES.glob("*.json")}


def norm_site_path(page_url: str) -> str:
    """Strip protocol + host; handle www and non-www."""
    u = page_url.strip()
    for prefix in ("https://www.movieslike.app", "http://www.movieslike.app", "https://movieslike.app", "http://movieslike.app"):
        if u.startswith(prefix):
            u = u[len(prefix) :]
            break
    return u if u.startswith("/") else f"/{u}"


def find_gaps(rows, slugs):
    gaps = []
    for r in rows:
        q = r["keys"][0].lower()
        imp = r.get("impressions", 0)
        if imp < 20 or not re.search(r"(movies? like|similar to|films? like)", q):
            continue
        title = re.sub(r"^(movies? like|similar to|films? like)\s+", "", q, flags=re.I).strip()
        slug = "movies-like-" + re.sub(r"\s+", "-", re.sub(r"[^a-z0-9\s]", "", title.lower())).strip("-")
        if slug not in slugs:
            gaps.append({"query": q, "slug": slug, "impressions": int(imp), "has_page": False})
    return sorted(gaps, key=lambda x: -x["impressions"])


def find_ctr_fixes(rows):
    fixes = []
    for r in rows:
        page = r["keys"][0]
        imp = r.get("impressions", 0)
        ctr = r.get("ctr", 0)

        if imp < 30 or ctr >= 0.03:
            continue

        slug = page.replace("https://www.movieslike.app/", "").replace("https://movieslike.app/", "").strip("/")
        if slug.startswith("movies-like/"):
            name = slug.replace("movies-like/", "").replace("-", " ").title()
        else:
            name = slug.replace("-", " ").title() or "This Movie"

        titles = [
            f"15 Mind-Blowing Movies Like {name} (You Haven’t Seen)",
            f"Best Movies Like {name} — Hidden Gems You Need to Watch",
            f"Love {name}? Watch These 17 Similar Movies Next",
            f"Movies Like {name}: 15 Picks That Hit Just as Hard",
        ]

        metas = [
            f"Obsessed with {name}? These movies deliver the same vibe, twists, and emotion.",
            f"If you loved {name}, these films will hit the same way.",
            f"Looking for movies like {name}? These picks are shockingly similar.",
        ]

        fixes.append(
            {
                "page": page.replace("https://www.movieslike.app", "").replace("https://movieslike.app", ""),
                "impressions": int(imp),
                "ctr": round(ctr * 100, 2),
                "recommended_titles": titles,
                "recommended_metas": metas,
            }
        )

    return sorted(fixes, key=lambda x: -x["impressions"])[:20]


def find_decay(this_w, last_w):
    this_map = {norm_site_path(r["keys"][0]): r.get("position", 99) for r in this_w}
    last_map = {norm_site_path(r["keys"][0]): r.get("position", 99) for r in last_w}
    decay = []
    for page, pos_now in this_map.items():
        pos_before = last_map.get(page)
        if pos_before and (pos_now - pos_before) >= 2.0:
            decay.append(
                {
                    "page": page,
                    "position_last_week": round(pos_before, 1),
                    "position_this_week": round(pos_now, 1),
                    "change": round(pos_now - pos_before, 1),
                }
            )
    return sorted(decay, key=lambda x: -x["change"])


def top_performers(rows):
    return sorted(
        [
            {
                "page": norm_site_path(r["keys"][0]),
                "clicks": int(r.get("clicks", 0)),
                "ctr": round(r.get("ctr", 0) * 100, 2),
                "position": round(r.get("position", 99), 1),
            }
            for r in rows
        ],
        key=lambda x: -x["clicks"],
    )[:10]


def weekly_extras(svc, slugs):
    today = date.today()
    start = (today - timedelta(days=28)).strftime("%Y-%m-%d")
    rows = gsc_query(svc, start, today.strftime("%Y-%m-%d"), ["page"], ROW_LIMIT_PAGES)
    clicks = sum(r.get("clicks", 0) for r in rows)
    indexed = len(rows)
    total = len(slugs)
    weekly_avg = clicks / 4
    gap = max(0, 50000 - weekly_avg * 4)
    return {
        "indexation_rate_pct": round(indexed / max(total, 1) * 100, 1),
        "total_pages_indexed": indexed,
        "total_pages_in_sitemap": total,
        "sessions_28d": int(clicks),
        "weekly_avg_sessions": int(weekly_avg),
        "projected_weeks_to_mediavine": round(gap / max(weekly_avg, 1), 1) if gap > 0 else 0,
        "monthly_pace": int(weekly_avg * 4),
    }


def main():
    print("=== VEGA starting ===")
    print(f"  siteUrl={GSC_SITE!r}  movies_dir={MACMINI_MOVIES}")
    svc = get_svc()
    slugs = load_slugs()
    today = date.today()
    end_7d = today.strftime("%Y-%m-%d")
    start_7d = (today - timedelta(days=7)).strftime("%Y-%m-%d")
    end_14d = (today - timedelta(days=8)).strftime("%Y-%m-%d")
    start_14d = (today - timedelta(days=14)).strftime("%Y-%m-%d")

    print("  Fetching GSC data (property totals + page/query breakdowns)...")
    total_clk_7d, total_imp_7d, _ = gsc_property_totals(svc, start_7d, end_7d)

    q_7d = gsc_query(svc, start_7d, end_7d, ["query"], ROW_LIMIT_QUERIES)
    p_7d = gsc_query(svc, start_7d, end_7d, ["page"], ROW_LIMIT_PAGES)
    q_14d = gsc_query(svc, start_14d, end_14d, ["query"], ROW_LIMIT_QUERIES)
    p_14d = gsc_query(svc, start_14d, end_14d, ["page"], ROW_LIMIT_PAGES)

    # Diagnostic: sum of returned page rows (NOT equal to property total on long-tail sites)
    sample_imp_sum = sum(r.get("impressions", 0) for r in p_7d)

    gaps = find_gaps(q_7d, slugs)
    fixes = find_ctr_fixes(p_7d)
    decay = find_decay(p_7d, p_14d)
    top = top_performers(p_7d)

    parts = []
    if gaps:
        parts.append(f"{len(gaps)} keyword gaps — top: \"{gaps[0]['query']}\" ({gaps[0]['impressions']} impressions)")
    if fixes:
        parts.append(f"{len(fixes)} pages need CTR fixes")
    if decay:
        parts.append(f"{len(decay)} pages losing ranking")
    summary = ". ".join(parts) or "No significant issues today."

    report = {
        "date": today.isoformat(),
        "gsc_site": GSC_SITE,
        "window_7d": {"start": start_7d, "end": end_7d},
        "window_prior_7d": {"start": start_14d, "end": end_14d},
        "total_impressions_7d": int(total_imp_7d),
        "total_clicks_7d": int(total_clk_7d),
        "meta": {
            "search_type": "web",
            "data_state": "all",
            "page_rows_returned_7d": len(p_7d),
            "query_rows_returned_7d": len(q_7d),
            "sum_impressions_in_page_rows_7d": int(sample_imp_sum),
            "note": "total_impressions_7d is from a dimensionless GSC query (property aggregate for web). "
            "sum_impressions_in_page_rows_7d sums returned page rows only; it is not a site total and may be "
            "higher or lower than the property line due to GSC aggregation, thresholds, and how www/canonical URLs split.",
        },
        "content_gaps": gaps,
        "ctr_fixes": fixes,
        "ranking_decay": decay[:10],
        "top_performers": top,
        "summary": summary,
    }

    if IS_SUNDAY:
        print("  Sunday — running full audit...")
        report["weekly_audit"] = weekly_extras(svc, slugs)

    raw = json.dumps(report, indent=2)
    if len(raw.encode()) < MIN_FULL_REPORT_BYTES:
        print(
            f"ERROR: Report too small ({len(raw)} bytes) — refusing to write vega_report (partial GSC failure?)",
            file=sys.stderr,
        )
        sys.exit(1)

    stamp = today.strftime("%Y%m%d")
    report_name = f"vega_report_{stamp}.json"
    summary_name = f"vega_summary_{stamp}.json"

    (RESULTS_DIR / report_name).write_text(raw)
    summary_payload = {
        "date": today.isoformat(),
        "gsc_site": GSC_SITE,
        "total_impressions_7d": int(total_imp_7d),
        "total_clicks_7d": int(total_clk_7d),
        "gaps": len(gaps),
        "ctr_fixes": len(fixes),
        "decay": len(decay),
        "top_page": top[0]["page"] if top else None,
        "summary": summary,
    }

    (RESULTS_DIR / summary_name).write_text(json.dumps(summary_payload, indent=2))

    if SHARE_RESULTS.parent.exists():
        try:
            SHARE_RESULTS.mkdir(parents=True, exist_ok=True)
            (SHARE_RESULTS / report_name).write_text(raw)
            (SHARE_RESULTS / summary_name).write_text(json.dumps(summary_payload, indent=2))
        except OSError:
            pass

    print("\n🔍 VEGA COMPLETE")
    print(f"  Property totals (7d, web): {int(total_imp_7d):,} impressions | {int(total_clk_7d):,} clicks")
    print(f"  Page-row sample sum (not a total): {int(sample_imp_sum):,} across {len(p_7d)} rows")
    print(f"  Gaps: {len(gaps)} | CTR fixes: {len(fixes)} | Decay: {len(decay)}")
    print(f"  Top page: {top[0]['page'] if top else 'none'}")
    print(f"  Wrote {RESULTS_DIR / report_name}  +  {summary_name}")
    if IS_SUNDAY and "weekly_audit" in report:
        wa = report["weekly_audit"]
        print(
            f"  Mediavine pace: {wa['monthly_pace']:,}/mo | ~{wa['projected_weeks_to_mediavine']} weeks remaining"
        )


if __name__ == "__main__":
    main()
