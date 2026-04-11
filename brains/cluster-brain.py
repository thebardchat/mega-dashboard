#!/usr/bin/env python3
"""
ShaneBrain Brains Farm — Cluster Brain
Job: Ping all 4 Ollama cluster nodes every 60s and report online status, loaded model, and latency.
Output: /mnt/shanebrain-raid/shanebrain-core/mega-dashboard/cluster-brain.json
Service: cluster-brain.service

Built with Claude (Anthropic) · Runs on Raspberry Pi 5 + Pironman 5-MAX
Constitution: thebardchat/shanebrain-core/constitution/CONSTITUTION.md v1.0
"""

import json
import time
import urllib.request
import urllib.error
from datetime import datetime

OUTPUT_PATH = "/mnt/shanebrain-raid/shanebrain-core/mega-dashboard/cluster-brain.json"
POLL_EVERY = 60  # seconds

NODES = [
    {"name": "Pi",              "host": "localhost",     "port": 11434},
    {"name": "Pulsar00100",     "host": "100.81.70.117", "port": 11434},
    {"name": "Bullfrog-Max-R2D2","host": "100.87.222.17","port": 11434},
    {"name": "Jaxton-Laptop",   "host": "100.94.122.125","port": 11434},
]


def check_node(node: dict) -> dict:
    url = f"http://{node['host']}:{node['port']}/api/tags"
    result = {
        "name":       node["name"],
        "host":       node["host"],
        "port":       node["port"],
        "online":     False,
        "model":      None,
        "models":     [],
        "latency_ms": None,
    }
    try:
        t0 = time.monotonic()
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            elapsed_ms = round((time.monotonic() - t0) * 1000)
            payload = json.loads(resp.read())
            models = [m["name"] for m in payload.get("models", [])]
            result["online"]     = True
            result["model"]      = models[0] if models else None
            result["models"]     = models
            result["latency_ms"] = elapsed_ms
    except Exception:
        pass
    return result


def build_message(nodes: list) -> str:
    online = [n for n in nodes if n["online"]]
    count  = len(online)
    total  = len(nodes)
    if count == 0:
        return f"0/{total} nodes online. All dark."
    # Highlight fastest node if we have latency data
    ranked = sorted(online, key=lambda n: n["latency_ms"] if n["latency_ms"] is not None else 9999)
    leader = ranked[0]["name"] if ranked else None
    if count == total:
        return f"All {total}/{total} nodes online. {leader} leading."
    offline_names = ", ".join(n["name"] for n in nodes if not n["online"])
    return f"{count}/{total} nodes online. {leader} leading. Offline: {offline_names}."


def poll() -> dict:
    node_results = [check_node(n) for n in NODES]
    online_count = sum(1 for n in node_results if n["online"])
    return {
        "status":  "ok",
        "updated": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "data": {
            "nodes":        node_results,
            "online_count": online_count,
            "total_count":  len(NODES),
        },
        "message": build_message(node_results),
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
                "message": f"Cluster brain error: {exc}",
            }
        try:
            with open(OUTPUT_PATH, "w") as fh:
                json.dump(result, fh, indent=2)
        except Exception as write_err:
            print(f"[cluster-brain] Write failed: {write_err}")
        time.sleep(POLL_EVERY)


if __name__ == "__main__":
    main()
