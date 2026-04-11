#!/usr/bin/env python3
"""
ShaneBrain Brains Farm — Knowledge Harvester Brain
Job: Every 10 minutes, query Weaviate LegacyKnowledge for total count and recently added objects, report harvest stats.
Output: /mnt/shanebrain-raid/shanebrain-core/mega-dashboard/knowledge-harvester.json
Service: knowledge-harvester-brain.service

Built with Claude (Anthropic) · Runs on Raspberry Pi 5 + Pironman 5-MAX
Constitution: thebardchat/shanebrain-core/constitution/CONSTITUTION.md v1.0
"""

import json
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

OUTPUT_PATH = Path("/mnt/shanebrain-raid/shanebrain-core/mega-dashboard/knowledge-harvester.json")
WEAVIATE_URL = "http://localhost:8080/v1/graphql"
POLL_EVERY = 600

COUNT_QUERY = '{ Aggregate { LegacyKnowledge { meta { count } } } }'
RECENT_QUERY = (
    '{ Get { LegacyKnowledge(limit: 5, sort: [{path: ["_creationTimeUnix"], order: desc}]) '
    '{ content source } } }'
)


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


def get_total_count() -> int:
    result = graphql_query(COUNT_QUERY)
    return result["data"]["Aggregate"]["LegacyKnowledge"][0]["meta"]["count"]


def get_recent_sources() -> list:
    result = graphql_query(RECENT_QUERY)
    objects = result["data"]["Get"]["LegacyKnowledge"] or []
    sources = []
    for obj in objects:
        src = obj.get("source") or ""
        if src:
            sources.append(src)
    return sources


def run():
    while True:
        try:
            total_count = get_total_count()
            recent_sources = get_recent_sources()
            last_harvest_count = len(recent_sources)

            message = f"{total_count} knowledge objects in Weaviate. Brain is fed."

            output = {
                "status": "ok",
                "updated": datetime.now(timezone.utc).isoformat(),
                "data": {
                    "total_count": total_count,
                    "last_harvest_count": last_harvest_count,
                    "recent_sources": recent_sources,
                },
                "message": message,
            }
        except Exception as e:
            output = {
                "status": "error",
                "updated": datetime.now(timezone.utc).isoformat(),
                "data": {
                    "total_count": 0,
                    "last_harvest_count": 0,
                    "recent_sources": [],
                },
                "message": f"Knowledge Harvester error: {e}",
            }

        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT_PATH.write_text(json.dumps(output, indent=2))
        print(f"[knowledge-harvester] {output['updated']} — {output['message']}")
        time.sleep(POLL_EVERY)


if __name__ == "__main__":
    run()
