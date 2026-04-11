#!/usr/bin/env python3
"""
ShaneBrain Brains Farm — Weight Coach Brain
Job: Watches weight.json, calculates trend + projected goal date, generates
     a short coaching message via shanebrain-3b, writes weight-coach.json.
Output: /mnt/shanebrain-raid/shanebrain-core/mega-dashboard/weight-coach.json
Service: weight-coach-brain.service

Built with Claude (Anthropic) · Runs on Raspberry Pi 5 + Pironman 5-MAX
Constitution: thebardchat/shanebrain-core/constitution/CONSTITUTION.md v1.0
"""

import json
import time
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime, date, timedelta

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BASE = Path("/mnt/shanebrain-raid/shanebrain-core/mega-dashboard")
WEIGHT_FILE = BASE / "weight.json"
OUTPUT_FILE = BASE / "weight-coach.json"
OLLAMA_URL  = "http://localhost:11434/api/generate"
MODEL       = "shanebrain-3b"
POLL_EVERY  = 300   # seconds — check every 5 min, constitutional max

FALLBACK_MESSAGES = [
    "Keep showing up. Every entry is a win.",
    "Consistency beats intensity. Log it and move.",
    "Progress is happening even when you can't see it.",
    "One day at a time. One pound at a time.",
    "You already started. That's the hardest part.",
]
_fallback_index = 0

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_weight_data():
    try:
        with open(WEIGHT_FILE) as f:
            return json.load(f)
    except Exception:
        return None


def calc_trend(entries):
    """Return avg lbs/day over the full log. Negative = losing weight."""
    if len(entries) < 2:
        return None
    first = entries[0]
    last  = entries[-1]
    try:
        d0 = date.fromisoformat(first["date"])
        d1 = date.fromisoformat(last["date"])
        days = (d1 - d0).days or 1
        return (last["weight"] - first["weight"]) / days
    except Exception:
        return None


def project_goal(current_weight, trend_per_day, goal_weight=200):
    """Return projected date to reach goal, or None if trending wrong way."""
    if trend_per_day is None or trend_per_day >= 0:
        return None
    lbs_to_go = current_weight - goal_weight
    days_needed = int(lbs_to_go / abs(trend_per_day))
    return (date.today() + timedelta(days=days_needed)).isoformat()


def ask_ollama(prompt):
    """Call shanebrain-3b, return response text or None."""
    payload = json.dumps({
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.7, "num_predict": 60},
    }).encode()
    try:
        req = urllib.request.Request(
            OLLAMA_URL,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read())
            return data.get("response", "").strip()
    except Exception:
        return None


def fallback_message():
    global _fallback_index
    msg = FALLBACK_MESSAGES[_fallback_index % len(FALLBACK_MESSAGES)]
    _fallback_index += 1
    return msg


def build_coaching_message(data, trend, projected_goal):
    start  = data.get("start_weight", 382)
    entries = data.get("entries", [])
    if not entries:
        return fallback_message()

    current = entries[-1]["weight"]
    lost    = round(start - current, 1)
    days_logged = len(entries)

    trend_str = ""
    if trend is not None:
        rate = abs(round(trend * 7, 1))
        direction = "losing" if trend < 0 else "gaining"
        trend_str = f"He is {direction} about {rate} lbs per week on average."

    goal_str = ""
    if projected_goal:
        goal_str = f"At this pace he will reach 200 lbs around {projected_goal}."

    prompt = (
        f"You are ShaneBrain, a personal AI coach for Shane Brazelton. "
        f"Shane started at {start} lbs and is now at {current} lbs — he has lost {lost} lbs total. "
        f"He has logged his weight {days_logged} time(s). {trend_str} {goal_str} "
        f"Write ONE short, direct, encouraging coaching message for Shane. "
        f"Max 2 sentences. Sound like a real coach who knows him personally. "
        f"Do not use the word 'journey'. Do not use emojis."
    )

    response = ask_ollama(prompt)
    return response if response else fallback_message()


def write_output(data, trend, projected_goal, message):
    entries = data.get("entries", [])
    current = entries[-1]["weight"] if entries else data.get("start_weight", 382)
    start   = data.get("start_weight", 382)
    lost    = round(start - current, 1)

    out = {
        "status": "ok",
        "updated": datetime.now().isoformat(timespec="seconds"),
        "data": {
            "start_weight": start,
            "current_weight": current,
            "lost": lost,
            "entries_count": len(entries),
            "trend_lbs_per_day": round(trend, 4) if trend is not None else None,
            "trend_lbs_per_week": round(trend * 7, 2) if trend is not None else None,
            "projected_goal_date": projected_goal,
            "goal_weight": 200,
        },
        "message": message,
    }
    with open(OUTPUT_FILE, "w") as f:
        json.dump(out, f, indent=2)


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def run():
    print("[Weight Coach Brain] Starting...")
    last_entry_count = -1

    while True:
        try:
            data = load_weight_data()
            if data:
                entries = data.get("entries", [])
                count   = len(entries)

                # Only generate a new coaching message if a new entry was logged
                if count != last_entry_count:
                    print(f"[Weight Coach Brain] New entry detected ({count} total). Generating...")
                    trend         = calc_trend(entries)
                    projected     = project_goal(entries[-1]["weight"] if entries else 382, trend) if entries else None
                    message       = build_coaching_message(data, trend, projected)
                    write_output(data, trend, projected, message)
                    last_entry_count = count
                    print(f"[Weight Coach Brain] Done. Message: {message[:80]}")
                else:
                    # Still update timestamps/data without calling Ollama
                    if OUTPUT_FILE.exists():
                        with open(OUTPUT_FILE) as f:
                            existing = json.load(f)
                        existing["updated"] = datetime.now().isoformat(timespec="seconds")
                        with open(OUTPUT_FILE, "w") as f:
                            json.dump(existing, f, indent=2)

        except Exception as e:
            print(f"[Weight Coach Brain] Error: {e}")

        time.sleep(POLL_EVERY)


if __name__ == "__main__":
    run()
