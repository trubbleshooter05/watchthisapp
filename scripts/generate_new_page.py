#!/usr/bin/env python3
"""
Generate one missing movie page JSON bundle from a raw movie title.

Pipeline:
1) Resolve title -> TMDB movie id
2) Scaffold data/recommendations/<slug>.json
3) Fill only that slug's recommendation bundle
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import unicodedata
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus
from urllib.request import urlopen


REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "data" / "recommendations"


def parse_dotenv(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    out: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        key, value = s.split("=", 1)
        out[key.strip()] = value.strip().strip('"').strip("'")
    return out


def env(name: str, dotenv: dict[str, str]) -> str | None:
    value = os.environ.get(name)
    if value:
        return value.strip()
    value = dotenv.get(name)
    return value.strip() if value else None


def slugify(title: str) -> str:
    txt = unicodedata.normalize("NFKD", title)
    txt = txt.encode("ascii", "ignore").decode("ascii")
    txt = txt.lower()
    txt = re.sub(r"['’ʼ]", "", txt)
    txt = re.sub(r"[^a-z0-9]+", "-", txt)
    txt = re.sub(r"-{2,}", "-", txt).strip("-")
    return txt


def normalize_title_for_match(title: str) -> str:
    txt = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode("ascii")
    txt = txt.lower()
    txt = re.sub(r"[^a-z0-9 ]+", " ", txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt


def normalize_loose_key(title: str) -> str:
    return normalize_title_for_match(title).replace(" ", "")


def tmdb_json(url: str) -> dict[str, Any]:
    with urlopen(url, timeout=30) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw)


def pick_best_tmdb_match(results: list[dict[str, Any]], wanted_title: str) -> dict[str, Any] | None:
    if not results:
        return None

    wanted = normalize_title_for_match(wanted_title)
    wanted_loose = normalize_loose_key(wanted_title)

    # Favor mainstream results when possible to avoid obscure exact-string traps.
    mainstream = [m for m in results if int(m.get("vote_count") or 0) >= 150]
    pool = mainstream if mainstream else results

    def score(m: dict[str, Any]) -> tuple[float, float, float]:
        title = normalize_title_for_match(str(m.get("title") or m.get("original_title") or ""))
        title_loose = normalize_loose_key(title)
        pop = float(m.get("popularity") or 0.0)
        votes = float(m.get("vote_count") or 0.0)
        rating = float(m.get("vote_average") or 0.0)

        exact = 2.0 if title == wanted else 0.0
        exact_loose = 1.5 if title_loose == wanted_loose else 0.0
        starts = 1.0 if title.startswith(wanted) or wanted.startswith(title) else 0.0
        overlap = 0.0
        if wanted and title:
            w = set(wanted.split(" "))
            t = set(title.split(" "))
            if w:
                overlap = len(w & t) / len(w)

        return (exact + exact_loose + starts + overlap, votes * 0.01 + pop, rating)

    return max(pool, key=score)


def run(cmd: list[str], cwd: Path) -> None:
    proc = subprocess.run(cmd, cwd=str(cwd), check=False)
    if proc.returncode != 0:
        raise RuntimeError(f"Command failed ({proc.returncode}): {' '.join(cmd)}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate one missing movie recommendation page")
    parser.add_argument("--title", required=True, help="Movie title from query extraction")
    parser.add_argument("--slug", default="", help="Optional slug override")
    parser.add_argument("--dry-run", action="store_true", help="Resolve only, do not generate files")
    args = parser.parse_args()

    dotenv = parse_dotenv(REPO_ROOT / ".env.local")
    tmdb_key = env("TMDB_API_KEY", dotenv)
    if not tmdb_key:
        print("TMDB_API_KEY missing (env or .env.local)", file=sys.stderr)
        return 1

    title = re.sub(r"\s+", " ", args.title).strip()
    if not title:
        print("Empty title after normalization", file=sys.stderr)
        return 1

    slug = args.slug.strip() or slugify(title)
    if not slug:
        print(f"Could not build slug from title: {title}", file=sys.stderr)
        return 1

    out_file = DATA_DIR / f"{slug}.json"
    if out_file.exists():
        print(f"SKIP exists: {out_file}")
        return 0

    search_url = (
        "https://api.themoviedb.org/3/search/movie"
        f"?api_key={quote_plus(tmdb_key)}&query={quote_plus(title)}&include_adult=false"
    )
    search = tmdb_json(search_url)
    results = search.get("results") or []
    best = pick_best_tmdb_match(results, title)
    if not best or not best.get("id"):
        print(f"No TMDB match for: {title}", file=sys.stderr)
        return 1

    tmdb_id = int(best["id"])
    resolved_title = str(best.get("title") or title)
    print(f"Resolved '{title}' -> '{resolved_title}' (tmdbId={tmdb_id}, slug={slug})")

    if args.dry_run:
        return 0

    run(["node", "scripts/scaffold-movie.mjs", slug, str(tmdb_id)], REPO_ROOT)
    run(["node", "scripts/fill-all-bundles.mjs", "--only-slug", slug], REPO_ROOT)
    print(f"Generated: {out_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
