#!/usr/bin/env python3
"""
update-sitemap.py — run by GitHub Actions before each FTP deploy.

Reads sitemap.xml, resolves each <loc> to a local file, queries
`git log` for its last commit date, and writes back the <lastmod>
tags in-place. Pages with no matching local file keep their existing
lastmod value.
"""

import re
import subprocess
import sys
from pathlib import Path

SITEMAP = Path("sitemap.xml")
BASE_URL = "https://chef-knife.pk/"

def git_date(filepath: str) -> str | None:
    """Return YYYY-MM-DD of the last commit that touched filepath, or None."""
    try:
        result = subprocess.run(
            ["git", "log", "--format=%as", "-n1", "--", filepath],
            capture_output=True, text=True, check=True
        )
        date = result.stdout.strip()
        return date if date else None
    except subprocess.CalledProcessError:
        return None

def url_to_path(url: str) -> str | None:
    """Convert a sitemap URL to a repo-relative file path."""
    if not url.startswith(BASE_URL):
        return None
    rel = url[len(BASE_URL):]
    if rel == "" or rel == "/":
        return "index.html"
    # strip trailing slash
    rel = rel.rstrip("/")
    return rel

def main():
    content = SITEMAP.read_text(encoding="utf-8")

    # Match each <url> block and update its <lastmod>
    def replace_block(m):
        block = m.group(0)
        loc_match = re.search(r"<loc>(.*?)</loc>", block)
        if not loc_match:
            return block
        url = loc_match.group(1)
        filepath = url_to_path(url)
        if not filepath:
            return block
        date = git_date(filepath)
        if not date:
            return block
        # Replace existing <lastmod> or insert after <loc>
        if "<lastmod>" in block:
            block = re.sub(r"<lastmod>.*?</lastmod>", f"<lastmod>{date}</lastmod>", block)
        else:
            block = block.replace("</loc>", f"</loc>\n    <lastmod>{date}</lastmod>", 1)
        return block

    updated = re.sub(r"<url>.*?</url>", replace_block, content, flags=re.DOTALL)

    if updated != content:
        SITEMAP.write_text(updated, encoding="utf-8")
        print("sitemap.xml updated with fresh lastmod dates.")
    else:
        print("sitemap.xml already up to date.")

if __name__ == "__main__":
    main()
