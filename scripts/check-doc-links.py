#!/usr/bin/env python3
"""Check local files and Markdown anchors in current project documentation."""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit

FENCES = re.compile(r"^(`{3,}|~{3,}).*?^\1[^\n]*$", re.MULTILINE | re.DOTALL)
MARKDOWN_LINKS = re.compile(r"!?\[[^\]\n]*\]\(\s*(<[^>]+>|[^\s)]+)")
HTML_LINKS = re.compile(r"\b(?:href|src)=[\"']([^\"']+)[\"']")


def anchors(content: str) -> set[str]:
    identifiers = set(re.findall(r"\bid=[\"']([^\"']+)[\"']", content))
    counts: dict[str, int] = {}
    for title in re.findall(r"^#{1,6}\s+(.+?)\s*#*\s*$", content, re.MULTILINE):
        title = re.sub(r"<[^>]+>", "", title).lower()
        slug = re.sub(r"[^\w\- ]", "", title).replace(" ", "-")
        count = counts.get(slug, 0)
        identifiers.add(f"{slug}-{count}" if count else slug)
        counts[slug] = count + 1
    return identifiers


def check(root: Path) -> int:
    files = sorted(root.glob("*.md"))
    files.extend(sorted((root / "docs").rglob("*.md")))
    files.extend(sorted((root / "assets" / "readme").rglob("*.md")))
    files = [path for path in files if path.is_file()]
    failures: list[str] = []
    checked = 0
    for document in files:
        content = FENCES.sub("", document.read_text(encoding="utf-8"))
        targets = MARKDOWN_LINKS.findall(content) + HTML_LINKS.findall(content)
        for target in targets:
            target = target.strip("<>")
            url = urlsplit(target)
            if url.scheme or url.netloc:
                continue
            checked += 1
            path = unquote(url.path)
            destination = (
                (
                    root / path.lstrip("/")
                    if path.startswith("/")
                    else document.parent / path
                )
                if path
                else document
            )
            label = f"{document.relative_to(root)}: {target}"
            if not destination.exists():
                failures.append(f"Missing local target: {label}")
            elif url.fragment and destination.suffix == ".md":
                text = FENCES.sub("", destination.read_text(encoding="utf-8"))
                if unquote(url.fragment) not in anchors(text):
                    failures.append(f"Missing Markdown anchor: {label}")
    if failures:
        print("\n".join(failures))
        return 1
    print(f"Checked {checked} local links in {len(files)} current documents.")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--root", type=Path, default=Path(__file__).resolve().parents[1]
    )
    args = parser.parse_args()
    raise SystemExit(check(args.root.resolve()))
