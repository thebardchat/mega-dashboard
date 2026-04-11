#!/usr/bin/env python3
"""
ShaneBrain Brains Farm — Letter Brain
Job: Pulls a recent memory from Weaviate LegacyKnowledge, generates today's
     personalized Daily Letter to My Sons via shanebrain-3b, writes letter-brain.json.
Output: /mnt/shanebrain-raid/shanebrain-core/mega-dashboard/letter-brain.json
Service: letter-brain.service

Built with Claude (Anthropic) · Runs on Raspberry Pi 5 + Pironman 5-MAX
Constitution: thebardchat/shanebrain-core/constitution/CONSTITUTION.md v1.0
"""

import json
import time
import urllib.request
import urllib.error
from datetime import datetime, date
from pathlib import Path
import random

BASE        = Path("/mnt/shanebrain-raid/shanebrain-core/mega-dashboard")
OUTPUT_FILE = BASE / "letter-brain.json"
OLLAMA_URL  = "http://localhost:11434/api/generate"
WEAVIATE_URL = "http://localhost:8080/v1/graphql"
MODEL       = "shanebrain-3b"
GENERATE_AT = 5   # hour to generate (5 AM matches alerter)
POLL_EVERY  = 300  # check every 5 min

SONS = ["Gavin", "Kai", "Pierce", "Jaxton", "Ryker"]

FALLBACK_LETTER = (
    "Dear Boys,\n\n"
    "Another day. I'm here. I'm sober. I'm building — and thinking about you every single step. "
    "This whole system started because I wanted to prove that one person, one Pi, and enough heart "
    "can build something that lasts. You are the reason it lasts.\n\n"
    "Never forget that. With all my love, Dad"
)


def fetch_random_memory():
    """Pull a random knowledge chunk from Weaviate LegacyKnowledge."""
    query = json.dumps({
        "query": """
        {
          Get {
            LegacyKnowledge(limit: 50) {
              content
              source
            }
          }
        }
        """
    }).encode()
    try:
        req = urllib.request.Request(
            WEAVIATE_URL,
            data=query,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            items = data.get("data", {}).get("Get", {}).get("LegacyKnowledge", [])
            if items:
                chosen = random.choice(items)
                return chosen.get("content", "")[:400]
    except Exception:
        pass
    return None


def ask_ollama(prompt):
    payload = json.dumps({
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.85, "num_predict": 200},
    }).encode()
    try:
        req = urllib.request.Request(
            OLLAMA_URL,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read())
            return data.get("response", "").strip()
    except Exception:
        return None


def generate_letter():
    memory = fetch_random_memory()
    today  = date.today().strftime("%B %d, %Y")
    sons_str = ", ".join(SONS[:-1]) + ", and " + SONS[-1]

    memory_context = ""
    if memory:
        memory_context = (
            f"Use this as inspiration from Shane's recent thoughts or experiences: \"{memory}\". "
            f"Weave it naturally into the letter without quoting it directly. "
        )

    prompt = (
        f"You are Shane Brazelton — a Christian father, recovering man, dispatcher, and builder "
        f"in Hazel Green, Alabama. Write a short, heartfelt daily letter to your sons: {sons_str}. "
        f"Today is {today}. {memory_context}"
        f"The letter should be 3-4 short paragraphs. Personal, grounded, not preachy. "
        f"Start with 'Dear Boys,' and end with 'With all my love, Dad'. "
        f"Do not use emojis. Do not use the word 'journey'. Sound like a real father talking, not a motivational poster."
    )

    response = ask_ollama(prompt)
    return response if response else FALLBACK_LETTER


def write_output(letter_text):
    out = {
        "status": "ok",
        "updated": datetime.now().isoformat(timespec="seconds"),
        "date": date.today().isoformat(),
        "letter": letter_text,
        "message": "Letter generated from your memories.",
    }
    with open(OUTPUT_FILE, "w") as f:
        json.dump(out, f, indent=2)


def run():
    print("[Letter Brain] Starting...")
    last_generated_date = None

    while True:
        try:
            now  = datetime.now()
            today = date.today().isoformat()

            # Generate at 5 AM or if no letter exists yet for today
            should_generate = (
                last_generated_date != today and
                (now.hour >= GENERATE_AT or not OUTPUT_FILE.exists())
            )

            if should_generate:
                print("[Letter Brain] Generating today's letter...")
                letter = generate_letter()
                write_output(letter)
                last_generated_date = today
                print(f"[Letter Brain] Done. ({len(letter)} chars)")

        except Exception as e:
            print(f"[Letter Brain] Error: {e}")

        time.sleep(POLL_EVERY)


if __name__ == "__main__":
    run()
