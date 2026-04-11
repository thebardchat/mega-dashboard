#!/usr/bin/env python3
"""
ShaneBrain Brains Farm — Book Progress Brain
Job: Every 15 min, scan the book repo and report chapter count, word count, and last modified file.
Output: /mnt/shanebrain-raid/shanebrain-core/mega-dashboard/book-progress.json
Service: book-progress-brain.service

Built with Claude (Anthropic) · Runs on Raspberry Pi 5 + Pironman 5-MAX
Constitution: thebardchat/shanebrain-core/constitution/CONSTITUTION.md v1.0
"""

import json
import os
import time
from datetime import datetime

OUTPUT_PATH = "/mnt/shanebrain-raid/shanebrain-core/mega-dashboard/book-progress.json"
BOOK_REPO   = "/home/shanebrain/you-probably-think-this-book-is-about-you/"
POLL_EVERY  = 900  # 15 minutes

SKIP_KEYWORDS = {"readme", "notes", "meta", "constitution"}


def is_chapter_file(filename: str) -> bool:
    """Return True if this file should be counted as a chapter."""
    name_lower = filename.lower()
    # Must be .md or .txt
    if not (name_lower.endswith(".md") or name_lower.endswith(".txt")):
        return False
    # Skip files containing blacklisted keywords
    stem = os.path.splitext(name_lower)[0]
    for kw in SKIP_KEYWORDS:
        if kw in stem:
            return False
    return True


def count_words(filepath: str) -> int:
    """Count whitespace-delimited words in a file, gracefully."""
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as fh:
            return len(fh.read().split())
    except Exception:
        return 0


def scan_book() -> dict:
    chapter_files = []
    total_words   = 0
    latest_mtime  = 0
    latest_name   = None

    if not os.path.isdir(BOOK_REPO):
        return {
            "chapter_count": 0,
            "word_count":    0,
            "last_chapter":  None,
            "last_modified": None,
            "_error":        f"Book repo not found: {BOOK_REPO}",
        }

    for fname in os.listdir(BOOK_REPO):
        fpath = os.path.join(BOOK_REPO, fname)
        if not os.path.isfile(fpath):
            continue
        if not is_chapter_file(fname):
            continue
        chapter_files.append(fname)
        total_words += count_words(fpath)
        mtime = os.path.getmtime(fpath)
        if mtime > latest_mtime:
            latest_mtime = mtime
            latest_name  = fname

    last_modified_str = (
        datetime.fromtimestamp(latest_mtime).strftime("%Y-%m-%dT%H:%M:%S")
        if latest_mtime else None
    )

    return {
        "chapter_count": len(chapter_files),
        "word_count":    total_words,
        "last_chapter":  latest_name,
        "last_modified": last_modified_str,
    }


def build_message(data: dict) -> str:
    chapters = data.get("chapter_count", 0)
    words    = data.get("word_count", 0)
    if "_error" in data:
        return f"Book repo missing. Check path."
    if chapters == 0:
        return "No chapters found yet. Time to write."
    return f"{chapters} chapters, {words:,} words. Still building."


def poll() -> dict:
    data = scan_book()
    return {
        "status":  "ok",
        "updated": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "data":    data,
        "message": build_message(data),
    }


def main():
    while True:
        try:
            result = poll()
        except Exception as exc:
            result = {
                "status":  "error",
                "updated": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
                "data":    {},
                "message": f"Book progress brain error: {exc}",
            }
        try:
            with open(OUTPUT_PATH, "w") as fh:
                json.dump(result, fh, indent=2)
        except Exception as write_err:
            print(f"[book-progress-brain] Write failed: {write_err}")
        time.sleep(POLL_EVERY)


if __name__ == "__main__":
    main()
