#!/usr/bin/env python3
"""
Forge Monitor: Verify site health and newly generated pages are crawlable.
Runs AFTER each Forge job (07:10, 13:10, 19:10).

Checks:
  - HTTP 200 for critical site pages
  - Sample 5 existing movie pages for accessibility
  - Validate sitemap XML structure
  - Verify movie pages exist in sitemap

Exit: 0 on success, 1 on failures.
Logging: logs/forge-monitor-YYYY-MM-DD_HH-MM-SS.log
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
LOGS_DIR = REPO_ROOT / "logs"
DATA_REC = REPO_ROOT / "data" / "recommendations"
SITE_URL = "https://www.movieslike.app"

# Health check URLs
HEALTH_CHECKS = [
    f"{SITE_URL}/",
    f"{SITE_URL}/popular",
    f"{SITE_URL}/sitemap.xml",
    f"{SITE_URL}/robots.txt",
]

MOVIE_PAGES_TO_CHECK = 5


class Monitor:
    def __init__(self):
        self.timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        self.log_file = LOGS_DIR / f"forge-monitor-{self.timestamp}.log"
        self.failures = []
        self.warnings = []

        LOGS_DIR.mkdir(parents=True, exist_ok=True)

    def log(self, level: str, msg: str) -> None:
        """Write to log file and print."""
        line = f"[{datetime.now().isoformat()}] {level:8s} {msg}"
        print(line)
        with self.log_file.open("a", encoding="utf-8") as f:
            f.write(line + "\n")

    def check_http(self, url: str) -> bool:
        """Return True if URL returns HTTP 200, False otherwise."""
        try:
            req = urllib.request.Request(url, method="HEAD")
            # Add User-Agent to avoid rejection
            req.add_header("User-Agent", "MovieLikeMonitor/1.0")
            with urllib.request.urlopen(req, timeout=10) as response:
                return response.status == 200
        except (urllib.error.URLError, urllib.error.HTTPError, Exception):
            return False

    def health_checks(self) -> bool:
        """Verify critical site URLs return 200."""
        self.log("INFO", "=== Health Checks ===")
        all_ok = True

        for url in HEALTH_CHECKS:
            ok = self.check_http(url)
            status = "✓" if ok else "✗"
            self.log("INFO" if ok else "ERROR", f"{status} {url}")
            if not ok:
                all_ok = False
                self.failures.append(f"Health check failed: {url}")

        return all_ok

    def get_valid_movie_slugs(self) -> list[str]:
        """Get all valid movie slugs from data/recommendations."""
        if not DATA_REC.exists():
            self.log("ERROR", f"Data directory not found: {DATA_REC}")
            return []

        slugs = []
        for json_file in DATA_REC.glob("*.json"):
            slug = json_file.stem
            slugs.append(slug)

        return sorted(slugs)

    def sample_movie_pages(self) -> list[str]:
        """Select up to 5 random valid movie slugs."""
        all_slugs = self.get_valid_movie_slugs()

        if not all_slugs:
            self.log("ERROR", "No movie pages found in data/recommendations")
            self.failures.append("No movie pages available to check")
            return []

        num_to_check = min(MOVIE_PAGES_TO_CHECK, len(all_slugs))
        selected = random.sample(all_slugs, num_to_check)

        self.log("INFO", f"Sampling {num_to_check} movie pages (from {len(all_slugs)} available)")
        return selected

    def check_movie_pages(self, slugs: list[str]) -> bool:
        """Verify sample movie pages return HTTP 200."""
        self.log("INFO", "=== Movie Page Checks ===")

        if not slugs:
            self.log("WARNING", "No movie pages to check")
            return True  # Not a failure, just nothing to check

        all_ok = True
        for slug in slugs:
            url = f"{SITE_URL}/movies-like/{slug}"
            ok = self.check_http(url)
            status = "✓" if ok else "✗"
            self.log("INFO" if ok else "ERROR", f"{status} {slug}")
            if not ok:
                all_ok = False
                self.failures.append(f"Movie page failed: {slug}")

        self.log("INFO", f"Checked {len(slugs)} movie pages")
        return all_ok

    def fetch_sitemap(self) -> str | None:
        """Fetch sitemap.xml content."""
        url = f"{SITE_URL}/sitemap.xml"
        try:
            req = urllib.request.Request(url)
            req.add_header("User-Agent", "MovieLikeMonitor/1.0")
            with urllib.request.urlopen(req, timeout=10) as response:
                return response.read().decode("utf-8")
        except Exception as e:
            self.log("ERROR", f"Failed to fetch sitemap: {e}")
            self.failures.append(f"Could not fetch sitemap: {str(e)}")
            return None

    def validate_sitemap(self, content: str) -> tuple[bool, int, list[str]]:
        """
        Validate sitemap XML and extract movie page URLs.

        Returns: (is_valid, url_count, movie_urls)
        """
        try:
            root = ET.fromstring(content)
        except ET.ParseError as e:
            self.log("ERROR", f"Sitemap XML parsing failed: {e}")
            self.failures.append(f"Sitemap is not valid XML: {str(e)}")
            return False, 0, []

        # Extract all <loc> elements
        # Sitemap namespace: http://www.sitemaps.org/schemas/sitemap/0.9
        namespace = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        urls = []

        for url_elem in root.findall(".//s:url/s:loc", namespace):
            if url_elem.text:
                urls.append(url_elem.text)

        # Filter to movie pages only
        movie_urls = [u for u in urls if "/movies-like/" in u]

        self.log("INFO", f"Sitemap valid. Total URLs: {len(urls)}, Movie pages: {len(movie_urls)}")
        return True, len(urls), movie_urls

    def check_missing_pages(self, movie_urls: list[str]) -> bool:
        """
        Check if all data/recommendations/*.json files are represented in sitemap.

        Returns True if all pages are in sitemap, False if any are missing.
        """
        self.log("INFO", "=== Sitemap Consistency Check ===")

        all_slugs = self.get_valid_movie_slugs()
        sitemap_slugs = set()

        # Extract slugs from sitemap URLs
        for url in movie_urls:
            # URL format: https://www.movieslike.app/movies-like/{slug}
            match = re.search(r"/movies-like/([^/?]+)", url)
            if match:
                sitemap_slugs.add(match.group(1))

        self.log("INFO", f"Found {len(sitemap_slugs)} unique movie pages in sitemap")

        # Check for missing pages
        missing = []
        for slug in all_slugs:
            if slug not in sitemap_slugs:
                missing.append(slug)

        if missing:
            self.log("WARNING", f"Missing from sitemap ({len(missing)} pages):")
            for slug in missing[:10]:  # Log first 10
                self.log("WARNING", f"  - {slug}")
            if len(missing) > 10:
                self.log("WARNING", f"  ... and {len(missing) - 10} more")

            self.warnings.append(f"{len(missing)} movie pages are missing from sitemap")
            return False
        else:
            self.log("INFO", "✓ All movie pages present in sitemap")
            return True

    def run(self) -> int:
        """Run all checks."""
        self.log("INFO", f"=== Forge Monitor Start ({self.timestamp}) ===")

        # Health checks
        health_ok = self.health_checks()

        # Movie page checks
        sample_slugs = self.sample_movie_pages()
        pages_ok = self.check_movie_pages(sample_slugs)

        # Sitemap validation
        self.log("INFO", "=== Sitemap Validation ===")
        sitemap_content = self.fetch_sitemap()
        sitemap_ok = False
        if sitemap_content:
            sitemap_ok, total_urls, movie_urls = self.validate_sitemap(sitemap_content)
            if sitemap_ok:
                consistency_ok = self.check_missing_pages(movie_urls)
            else:
                consistency_ok = False
        else:
            consistency_ok = False

        # Summary
        self.log("INFO", "=== Summary ===")
        if self.failures:
            self.log("ERROR", f"FAILED: {len(self.failures)} error(s)")
            for failure in self.failures:
                self.log("ERROR", f"  - {failure}")

        if self.warnings:
            self.log("WARNING", f"WARNINGS: {len(self.warnings)}")
            for warning in self.warnings:
                self.log("WARNING", f"  - {warning}")

        success = len(self.failures) == 0
        status = "✓ PASS" if success else "✗ FAIL"
        self.log("INFO", f"{status} - Log: {self.log_file}")

        return 0 if success else 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Monitor Forge job health and sitemap consistency")
    parser.add_argument("--dry-run", action="store_true", help="Log only, do not make requests")
    args = parser.parse_args()

    if args.dry_run:
        print("[DRY RUN] Monitoring disabled")
        return 0

    monitor = Monitor()
    return monitor.run()


if __name__ == "__main__":
    raise SystemExit(main())
