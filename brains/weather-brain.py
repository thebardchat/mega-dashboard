#!/usr/bin/env python3
"""
ShaneBrain Brains Farm — Weather Brain
Job: Every 15 minutes, fetch NWS forecast for Hazel Green AL, detect severe conditions, and write weather-brain.json with alert flag.
Output: /mnt/shanebrain-raid/shanebrain-core/mega-dashboard/weather-brain.json
Service: weather-brain.service

Built with Claude (Anthropic) · Runs on Raspberry Pi 5 + Pironman 5-MAX
Constitution: thebardchat/shanebrain-core/constitution/CONSTITUTION.md v1.0
"""

import json
import ssl
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

OUTPUT_PATH = Path("/mnt/shanebrain-raid/shanebrain-core/mega-dashboard/weather-brain.json")
NWS_POINTS_URL = "https://api.weather.gov/points/34.9331,-86.5700"
USER_AGENT = "(ShaneBrain Dashboard, shane@angelcloud.local)"
POLL_EVERY = 900

SEVERE_KEYWORDS = [
    "tornado", "severe", "warning", "watch", "hail",
    "hurricane", "flash flood", "blizzard", "ice storm",
]


def make_ssl_ctx():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def nws_get(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, context=make_ssl_ctx(), timeout=20) as resp:
        return json.loads(resp.read())


def is_severe(text: str) -> bool:
    lowered = text.lower()
    return any(kw in lowered for kw in SEVERE_KEYWORDS)


def run():
    while True:
        try:
            # Step 1: Get forecast URL from NWS points
            points_data = nws_get(NWS_POINTS_URL)
            forecast_url = points_data["properties"]["forecast"]

            # Step 2: Fetch forecast, read first 3 periods
            forecast_data = nws_get(forecast_url)
            periods = forecast_data["properties"]["periods"][:3]

            forecast = []
            severe_alert = False
            alert_text = ""

            for period in periods:
                name = period.get("name", "")
                temp = period.get("temperature", 0)
                desc = period.get("shortForecast", "")

                forecast.append({"name": name, "temp": temp, "desc": desc})

                if is_severe(desc) and not severe_alert:
                    severe_alert = True
                    alert_text = desc

            # Current conditions from first period
            current_temp = forecast[0]["temp"] if forecast else 0
            current_desc = forecast[0]["desc"] if forecast else "Unknown"

            if severe_alert:
                message = f"SEVERE ALERT: {alert_text}"
            else:
                message = f"{current_temp}\u00b0F and {current_desc.lower()}. No alerts."

            output = {
                "status": "ok",
                "updated": datetime.now(timezone.utc).isoformat(),
                "data": {
                    "current_temp": current_temp,
                    "current_desc": current_desc,
                    "severe_alert": severe_alert,
                    "alert_text": alert_text,
                    "forecast": forecast,
                },
                "message": message,
            }
        except Exception as e:
            output = {
                "status": "error",
                "updated": datetime.now(timezone.utc).isoformat(),
                "data": {
                    "current_temp": 0,
                    "current_desc": "Unavailable",
                    "severe_alert": False,
                    "alert_text": "",
                    "forecast": [],
                },
                "message": f"Weather Brain error: {e}",
            }

        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT_PATH.write_text(json.dumps(output, indent=2))
        print(f"[weather-brain] {output['updated']} — {output['message']}")
        time.sleep(POLL_EVERY)


if __name__ == "__main__":
    run()
