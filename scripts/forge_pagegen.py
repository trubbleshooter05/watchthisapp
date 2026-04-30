#!/usr/bin/env python3
"""
Forge queue runner: generate recommendation JSON from T1/T2 priority lists,
or bypass the queue entirely when --slug is passed.

Paths use this script's repo root and Path.home() only — no /Volumes/ladmin or Mac Mini mounts.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = REPO_ROOT / "scripts"
DATA_REC = REPO_ROOT / "data" / "recommendations"
QUEUE_FILE = SCRIPTS_DIR / "forge_queue.json"
GENERATE_NEW_PAGE = SCRIPTS_DIR / "generate_new_page.py"
PUBLISH_PATHS = ["data/recommendations", "scripts/forge_queue.json"]
PUBLISH_COMMIT_MESSAGE = "Forge: add recommendation pages [auto]"


def _preview_value(val: Any, max_len: int = 120) -> str:
    s = repr(val)
    if len(s) > max_len:
        return s[:max_len] + "..."
    return s


def _normalize_tier_list(raw: Any, tier_name: str) -> list[dict[str, Any]]:
    """
    forge_queue.json must use t1/t2 as arrays of objects, e.g.
    {"t1": [{"title": "...", "year": "2024", "slug": ""}], "t2": []}
    Malformed string payloads or scalar values are skipped with a warning (no crash).
    """
    if raw is None:
        return []
    if isinstance(raw, str):
        # Common failure: t1 was set to a plain string; list(str) would become char runs and break .get()
        print(
            f"FORGE WARN: {tier_name} expected a JSON array of objects, got str. "
            f"type={type(raw).__name__!r} preview={_preview_value(raw)}",
            flush=True,
        )
        return []
    if isinstance(raw, dict):
        print(
            f"FORGE WARN: {tier_name} expected a JSON array, got dict. "
            f"type={type(raw).__name__} preview={_preview_value(raw)}",
            flush=True,
        )
        return []
    if not isinstance(raw, list):
        print(
            f"FORGE WARN: {tier_name} expected a JSON array, got {type(raw).__name__}. "
            f"preview={_preview_value(raw)}",
            flush=True,
        )
        return []

    out: list[dict[str, Any]] = []
    for i, item in enumerate(raw):
        if isinstance(item, dict):
            out.append(item)
            continue
        print(
            f"FORGE WARN: {tier_name}[{i}] expected dict row, got {type(item).__name__}. "
            f"preview={_preview_value(item)} — skipping row",
            flush=True,
        )
    return out


def slugify(title: str) -> str:
    txt = unicodedata.normalize("NFKD", title)
    txt = txt.encode("ascii", "ignore").decode("ascii")
    txt = txt.lower()
    txt = re.sub(r"['’ʼ]", "", txt)
    txt = re.sub(r"[^a-z0-9]+", "-", txt)
    txt = re.sub(r"-{2,}", "-", txt).strip("-")
    return txt


def slug_to_title(slug: str) -> str:
    s = slug.strip().lower()
    if s.startswith("movies-like-"):
        s = s[len("movies-like-") :]
    s = s.replace("-", " ")
    return s.strip().title() if s else slug


def normalize_slug(slug: str) -> str:
    s = slug.strip()
    if s.startswith("movies-like-"):
        s = s[len("movies-like-") :]
    return s


def load_queue() -> dict[str, list[dict[str, Any]]]:
    if not QUEUE_FILE.exists():
        return {"t1": [], "t2": []}
    try:
        data = json.loads(QUEUE_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"FORGE WARN: invalid JSON in {QUEUE_FILE}: {e}", flush=True)
        return {"t1": [], "t2": []}
    if not isinstance(data, dict):
        print(
            f"FORGE WARN: queue root must be a JSON object, got {type(data).__name__}. preview={_preview_value(data)}",
            flush=True,
        )
        return {"t1": [], "t2": []}
    t1 = _normalize_tier_list(data.get("t1"), "t1")
    t2 = _normalize_tier_list(data.get("t2"), "t2")
    return {"t1": t1, "t2": t2}


def save_queue(queue: dict[str, list[dict[str, Any]]]) -> None:
    QUEUE_FILE.write_text(json.dumps(queue, indent=2) + "\n", encoding="utf-8")


def remove_queue_entry(title: str, slug: str) -> None:
    """Drop a generated or failed queue row so one bad title cannot block future jobs."""
    queue = load_queue()
    changed = False
    for tier in ("t1", "t2"):
        kept: list[dict[str, Any]] = []
        for row in queue.get(tier, []):
            row_title = str(row.get("title") or "").strip()
            row_slug = str(row.get("slug") or "").strip() or slugify(row_title)
            if row_title == title and row_slug == slug:
                changed = True
                continue
            kept.append(row)
        queue[tier] = kept
    if changed:
        save_queue(queue)


def demote_avatar(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Push Avatar-titled rows to the end so one blockbuster doesn't starve the queue."""
    safe: list[dict[str, Any]] = []
    for i, row in enumerate(entries):
        if not isinstance(row, dict):
            print(
                f"FORGE WARN: demote_avatar row[{i}] expected dict, got {type(row).__name__}. "
                f"preview={_preview_value(row)} — skipping",
                flush=True,
            )
            continue
        safe.append(row)

    def is_avatar(row: dict[str, Any]) -> bool:
        t = str(row.get("title") or "").lower()
        return "avatar" in t

    head = [e for e in safe if not is_avatar(e)]
    tail = [e for e in safe if is_avatar(e)]
    return head + tail


def queue_entries_ordered() -> list[dict[str, Any]]:
    q = load_queue()
    t1 = demote_avatar(q["t1"])
    t2 = demote_avatar(q["t2"])
    return t1 + t2


def run_generate(title: str, slug: str, dry_run: bool) -> int:
    cmd = [sys.executable, str(GENERATE_NEW_PAGE), "--title", title, "--slug", slug]
    if dry_run:
        cmd.append("--dry-run")
    print("RUN:", " ".join(cmd), flush=True)
    proc = subprocess.run(cmd, cwd=str(REPO_ROOT))
    return int(proc.returncode)


def commit_and_push_generated_pages() -> None:
    add_proc = subprocess.run(
        ["git", "add", *PUBLISH_PATHS],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
    )
    if add_proc.returncode != 0:
        err = (add_proc.stderr or add_proc.stdout or "").strip()
        print(f"FORGE WARN: git add failed: {err}", flush=True)
        return

    diff_proc = subprocess.run(
        ["git", "diff", "--cached", "--quiet", "--", *PUBLISH_PATHS],
        cwd=str(REPO_ROOT),
    )
    if diff_proc.returncode == 0:
        return

    commit_proc = subprocess.run(
        ["git", "commit", "-m", PUBLISH_COMMIT_MESSAGE, "--", *PUBLISH_PATHS],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
    )
    if commit_proc.returncode != 0:
        err = (commit_proc.stderr or commit_proc.stdout or "").strip()
        print(f"FORGE WARN: git commit failed: {err}", flush=True)
        return

    push_proc = subprocess.run(
        ["git", "push", "origin", "main"],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
    )
    if push_proc.returncode != 0:
        err = (push_proc.stderr or push_proc.stdout or "").strip()
        print(f"FORGE WARN: git push failed: {err}", flush=True)


def finish_generation(rc: int, dry_run: bool) -> int:
    if rc == 0 and not dry_run:
        commit_and_push_generated_pages()
    return rc


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Forge page generation: priority queue (T1 then T2) or immediate --slug."
    )
    parser.add_argument(
        "--slug",
        default="",
        help="If set, skip T1/T2 entirely and generate this slug immediately.",
    )
    parser.add_argument(
        "--title",
        default="",
        help="TMDB search title. With --slug, overrides the slug-to-title guess.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Pass through to generate_new_page.py")
    args = parser.parse_args()

    if args.slug.strip():
        raw_slug = args.slug.strip()
        slug = normalize_slug(raw_slug)
        title = args.title.strip() or slug_to_title(slug)
        if not title:
            print("ERROR: need --title if slug cannot be converted to a title", file=sys.stderr)
            return 1
        out = DATA_REC / f"{slug}.json"
        if out.exists() and not args.dry_run:
            print(f"SKIP already exists: {out} (delete file first to regenerate)", flush=True)
            return 0
        print("FORGE: --slug mode — bypassing T1/T2 queue", flush=True)
        return finish_generation(run_generate(title, slug, args.dry_run), args.dry_run)

    entries = queue_entries_ordered()
    if not entries:
        print(f"No queue entries in {QUEUE_FILE}. Add t1/t2 rows or use --slug.", flush=True)
        return 0

    for i, row in enumerate(entries):
        if not isinstance(row, dict):
            print(
                f"FORGE WARN: queue row[{i}] expected dict, got {type(row).__name__}. "
                f"preview={_preview_value(row)} — skipping",
                flush=True,
            )
            continue
        title = str(row.get("title") or "").strip()
        if not title:
            continue
        year = str(row.get("year") or "").strip()
        slug_hint = str(row.get("slug") or "").strip()
        slug = slug_hint or slugify(title)
        out = DATA_REC / f"{slug}.json"
        if out.exists():
            print(f"SKIP exists: {out.name}", flush=True)
            if not args.dry_run:
                remove_queue_entry(title, slug)
            continue
        print(f"QUEUE: next up — {title} ({year}) -> {slug}", flush=True)
        rc = run_generate(title, slug, args.dry_run)
        if rc == 0:
            if not args.dry_run:
                remove_queue_entry(title, slug)
            return finish_generation(rc, args.dry_run)
        if args.dry_run:
            return rc
        print(f"FORGE WARN: generation failed for {title} ({slug}); removing row and continuing.", flush=True)
        remove_queue_entry(title, slug)
        continue

    print("QUEUE: nothing to generate (all listed titles already have JSON).", flush=True)
    return finish_generation(0, args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
