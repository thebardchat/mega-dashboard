#!/usr/bin/env python3
"""
ShaneBrain Brains Farm — Mood Tracker Brain
Job: Reads mood-log.json (manual entries logged from dashboard), computes 7-day trend + streak, writes mood-tracker.json.
Output: /mnt/shanebrain-raid/shanebrain-core/mega-dashboard/mood-tracker.json
Service: mood-tracker-brain.service

Built with Claude (Anthropic) · Runs on Raspberry Pi 5 + Pironman 5-MAX
Constitution: thebardchat/shanebrain-core/constitution/CONSTITUTION.md v1.0
"""

import json
import os
import time
from datetime import date, datetime, timedelta, timezone

MOOD_LOG = "/mnt/shanebrain-raid/shanebrain-core/mega-dashboard/mood-log.json"
OUTPUT = "/mnt/shanebrain-raid/shanebrain-core/mega-dashboard/mood-tracker.json"
POLL_EVERY = 120


def load_mood_log() -> list[dict]:
    if not os.path.exists(MOOD_LOG):
        with open(MOOD_LOG, "w") as f:
            json.dump({"entries": []}, f, indent=2)
        return []
    with open(MOOD_LOG, "r") as f:
        data = json.load(f)
    return data.get("entries", [])


def compute_streak(entries_by_date: dict, today: date) -> int:
    streak = 0
    check = today
    while True:
        if check.isoformat() in entries_by_date:
            streak += 1
            check -= timedelta(days=1)
        else:
            break
    return streak


def run_once():
    today = date.today()
    entries = load_mood_log()

    # Index entries by date (last entry per date wins)
    entries_by_date: dict[str, dict] = {}
    for entry in entries:
        d = entry.get("date")
        if d:
            entries_by_date[d] = entry

    # Today
    today_entry = entries_by_date.get(today.isoformat())
    today_mood = today_entry.get("mood") if today_entry else None
    today_note = today_entry.get("note", "") if today_entry else ""

    # 7-day average
    seven_day_moods = []
    for i in range(7):
        d = (today - timedelta(days=i)).isoformat()
        if d in entries_by_date:
            m = entries_by_date[d].get("mood")
            if m is not None:
                seven_day_moods.append(m)
    seven_day_avg = round(sum(seven_day_moods) / len(seven_day_moods), 1) if seven_day_moods else None

    # Streak
    streak = compute_streak(entries_by_date, today)

    # Last 14 entries, newest first
    sorted_entries = sorted(entries, key=lambda e: e.get("date", ""), reverse=True)
    last_14 = sorted_entries[:14]

    # Message
    if today_mood is None:
        msg = "No entry today yet."
    else:
        avg_str = f"{seven_day_avg}" if seven_day_avg is not None else "—"
        if streak > 1:
            msg = f"{streak}-day streak. Averaging {avg_str} — solid week."
        else:
            msg = f"Mood logged at {today_mood}/5. Averaging {avg_str} this week."

    payload = {
        "status": "ok",
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"),
        "data": {
            "today": today_mood,
            "today_note": today_note,
            "seven_day_avg": seven_day_avg,
            "streak": streak,
            "entries": last_14,
        },
        "message": msg,
    }

    tmp = OUTPUT + ".tmp"
    with open(tmp, "w") as f:
        json.dump(payload, f, indent=2)
    os.replace(tmp, OUTPUT)


def main():
    while True:
        try:
            run_once()
        except Exception as e:
            error_payload = {
                "status": "error",
                "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"),
                "data": {
                    "today": None,
                    "today_note": "",
                    "seven_day_avg": None,
                    "streak": 0,
                    "entries": [],
                },
                "message": f"Brain error: {e}",
            }
            tmp = OUTPUT + ".tmp"
            with open(tmp, "w") as f:
                json.dump(error_payload, f, indent=2)
            os.replace(tmp, OUTPUT)
        time.sleep(POLL_EVERY)


if __name__ == "__main__":
    main()
