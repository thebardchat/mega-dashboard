#!/usr/bin/env python3
"""
ShaneBrain Brains Farm — System Watchdog Brain
Job: Monitors all services every 30s, auto-restarts failed ones,
     logs heal events, writes system-watchdog.json for the dashboard.
Output: /mnt/shanebrain-raid/shanebrain-core/mega-dashboard/system-watchdog.json
Service: system-watchdog-brain.service

Built with Claude (Anthropic) · Runs on Raspberry Pi 5 + Pironman 5-MAX
Constitution: thebardchat/shanebrain-core/constitution/CONSTITUTION.md v1.0
"""

import json
import subprocess
import time
from datetime import datetime
from pathlib import Path

BASE        = Path("/mnt/shanebrain-raid/shanebrain-core/mega-dashboard")
OUTPUT_FILE = BASE / "system-watchdog.json"
POLL_EVERY  = 30  # seconds

SERVICES = [
    "ollama",
    "mega-dashboard",
    "angel-cloud-gateway",
    "shanebrain-discord",
    "shanebrain-social",
    "shanebrain-arcade",
    "shanebrain-alerter",
    "buddy-claude",
    "weight-coach-brain",
    "system-watchdog-brain",
]

# Services we will auto-restart if they go down
AUTO_RESTART = {
    "ollama",
    "mega-dashboard",
    "angel-cloud-gateway",
    "shanebrain-discord",
    "shanebrain-social",
    "shanebrain-arcade",
    "shanebrain-alerter",
    "buddy-claude",
}

heal_log = []  # in-memory, last 20 events


def is_active(service):
    try:
        r = subprocess.run(
            ["systemctl", "is-active", service],
            capture_output=True, text=True, timeout=5
        )
        return r.stdout.strip() == "active"
    except Exception:
        return False


def restart_service(service):
    try:
        subprocess.run(
            ["sudo", "systemctl", "restart", service],
            capture_output=True, timeout=15
        )
        return True
    except Exception:
        return False


def check_and_heal():
    results = []
    healed_this_cycle = []

    for svc in SERVICES:
        active = is_active(svc)
        status = "active" if active else "down"

        if not active and svc in AUTO_RESTART:
            print(f"[Watchdog] {svc} is down — restarting...")
            success = restart_service(svc)
            time.sleep(3)
            recovered = is_active(svc)
            if recovered:
                status = "healed"
                event = {
                    "service": svc,
                    "event": "auto-healed",
                    "ts": datetime.now().isoformat(timespec="seconds"),
                }
                heal_log.append(event)
                healed_this_cycle.append(svc)
                print(f"[Watchdog] {svc} healed.")
            else:
                status = "failed"
                heal_log.append({
                    "service": svc,
                    "event": "restart-failed",
                    "ts": datetime.now().isoformat(timespec="seconds"),
                })
                print(f"[Watchdog] {svc} restart FAILED.")

        results.append({"name": svc, "status": status})

    # Trim heal log to last 20
    while len(heal_log) > 20:
        heal_log.pop(0)

    all_ok = all(r["status"] in ("active", "healed") for r in results)
    message = "All systems nominal." if all_ok else f"{sum(1 for r in results if r['status'] == 'failed')} service(s) need attention."
    if healed_this_cycle:
        message = f"Auto-healed: {', '.join(healed_this_cycle)}."

    out = {
        "status": "ok",
        "updated": datetime.now().isoformat(timespec="seconds"),
        "all_ok": all_ok,
        "services": results,
        "heal_log": list(reversed(heal_log)),
        "message": message,
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(out, f, indent=2)

    return healed_this_cycle


def run():
    print("[System Watchdog Brain] Starting...")
    while True:
        try:
            healed = check_and_heal()
            if healed:
                print(f"[Watchdog] Healed this cycle: {healed}")
        except Exception as e:
            print(f"[Watchdog] Error: {e}")
        time.sleep(POLL_EVERY)


if __name__ == "__main__":
    run()
