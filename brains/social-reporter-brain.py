#!/usr/bin/env python3
"""
ShaneBrain Brains Farm — Social Reporter Brain
Job: Query Weaviate FriendProfile and SocialKnowledge counts every 5 minutes and tail the social bot log.
Output: /mnt/shanebrain-raid/shanebrain-core/mega-dashboard/social-reporter.json
Service: social-reporter-brain.service

Built with Claude (Anthropic) · Runs on Raspberry Pi 5 + Pironman 5-MAX
Constitution: thebardchat/shanebrain-core/constitution/CONSTITUTION.md v1.0
"""

import json
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

OUTPUT_PATH = Path("/mnt/shanebrain-raid/shanebrain-core/mega-dashboard/social-reporter.json")
SOCIAL_BOT_LOG = Path("/mnt/shanebrain-raid/shanebrain-core/social-bot.log")
WEAVIATE_URL = "http://localhost:8080/v1/graphql"
POLL_EVERY = 300


def graphql_query(query: str) -> dict:
    payload = json.dumps({"query": query}).encode("utf-8")
    req = urllib.request.Request(
        WEAVIATE_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def get_collection_count(collection: str) -> int:
    query = f'{{ Aggregate {{ {collection} {{ meta {{ count }} }} }} }}'
    result = graphql_query(query)
    return result["data"]["Aggregate"][collection][0]["meta"]["count"]


def read_log_tail(log_path: Path, lines: int = 20) -> list:
    if not log_path.exists():
        return []
    try:
        with open(log_path, "r", errors="replace") as f:
            all_lines = f.readlines()
        tail = [line.rstrip() for line in all_lines[-lines:] if line.strip()]
        return tail
    except Exception as e:
        return [f"[log read error: {e}]"]


def run():
    while True:
        try:
            friend_count = get_collection_count("FriendProfile")
            social_count = get_collection_count("SocialKnowledge")
            recent_log = read_log_tail(SOCIAL_BOT_LOG)

            message = f"{friend_count} friends profiled. {social_count} social knowledge entries harvested."

            output = {
                "status": "ok",
                "updated": datetime.now(timezone.utc).isoformat(),
                "data": {
                    "friend_profiles": friend_count,
                    "social_knowledge": social_count,
                    "recent_log": recent_log,
                },
                "message": message,
            }
        except Exception as e:
            output = {
                "status": "error",
                "updated": datetime.now(timezone.utc).isoformat(),
                "data": {
                    "friend_profiles": 0,
                    "social_knowledge": 0,
                    "recent_log": [],
                },
                "message": f"Social Reporter error: {e}",
            }

        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT_PATH.write_text(json.dumps(output, indent=2))
        print(f"[social-reporter] {output['updated']} — {output['message']}")
        time.sleep(POLL_EVERY)


if __name__ == "__main__":
    run()
