#!/usr/bin/env python3
"""
ShaneBrain Brains Farm — Market Sentinel Brain
Job: Watch ticker symbols every 60s, fire an alert if any holding moves >3% in a session.
Output: /mnt/shanebrain-raid/shanebrain-core/mega-dashboard/market-sentinel.json
Service: market-sentinel-brain.service

Built with Claude (Anthropic) · Runs on Raspberry Pi 5 + Pironman 5-MAX
Constitution: thebardchat/shanebrain-core/constitution/CONSTITUTION.md v1.0
"""

import json
import ssl
import time
import urllib.request
from datetime import datetime, timezone

OUTPUT = "/mnt/shanebrain-raid/shanebrain-core/mega-dashboard/market-sentinel.json"
POLL_EVERY = 60

SYMBOLS = ["RFNGX", "RICAX", "RGAGX", "BTC-USD", "DOGE-USD", "ETH-USD", "SPY", "QQQ"]
ALERT_THRESHOLD = 3.0

HEADERS = {
    "User-Agent": "Mozilla/5.0 ShaneBrainDashboard/1.0",
    "Accept": "application/json",
}


def get_ssl_context():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def fetch_quote(symbol: str) -> dict | None:
    ctx = get_ssl_context()
    urls = [
        f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=1d&interval=1d",
        f"https://query2.finance.yahoo.com/v8/finance/chart/{symbol}?range=1d&interval=1d",
    ]
    for url in urls:
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
                raw = json.loads(resp.read().decode())
            result = raw["chart"]["result"][0]
            meta = result["meta"]
            price = meta.get("regularMarketPrice") or meta.get("previousClose")
            prev_close = meta.get("previousClose") or meta.get("chartPreviousClose")
            if price is None or prev_close is None or prev_close == 0:
                continue
            change_pct = ((price - prev_close) / prev_close) * 100.0
            return {
                "symbol": symbol,
                "price": round(price, 4),
                "prev_close": round(prev_close, 4),
                "change_pct": round(change_pct, 2),
                "alert": abs(change_pct) >= ALERT_THRESHOLD,
            }
        except Exception:
            continue
    return None


def build_output(holdings: list[dict]) -> dict:
    alerts = []
    for h in holdings:
        if h.get("alert"):
            sign = "+" if h["change_pct"] >= 0 else ""
            alerts.append(f"{h['symbol']} {sign}{h['change_pct']}%")

    any_alert = len(alerts) > 0

    if alerts:
        msg = f"{alerts[0]} — watch it."
    else:
        msg = "Markets quiet."

    return {
        "status": "ok",
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"),
        "data": {
            "holdings": holdings,
            "alerts": alerts,
            "any_alert": any_alert,
        },
        "message": msg,
    }


def write_output(payload: dict):
    tmp = OUTPUT + ".tmp"
    with open(tmp, "w") as f:
        json.dump(payload, f, indent=2)
    import os
    os.replace(tmp, OUTPUT)


def run_once():
    holdings = []
    for symbol in SYMBOLS:
        result = fetch_quote(symbol)
        if result:
            holdings.append(result)
        else:
            holdings.append({
                "symbol": symbol,
                "price": None,
                "prev_close": None,
                "change_pct": None,
                "alert": False,
                "error": "fetch_failed",
            })
    payload = build_output(holdings)
    write_output(payload)


def main():
    while True:
        try:
            run_once()
        except Exception as e:
            error_payload = {
                "status": "error",
                "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"),
                "data": {"holdings": [], "alerts": [], "any_alert": False},
                "message": f"Brain error: {e}",
            }
            write_output(error_payload)
        time.sleep(POLL_EVERY)


if __name__ == "__main__":
    main()
