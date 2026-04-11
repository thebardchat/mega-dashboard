#!/usr/bin/env python3
"""
ShaneBrain MEGA DASHBOARD Server v3.0
Serves the frontend with proxy API endpoints for Yahoo Finance, NWS Weather,
system health checks, sobriety tracker, self-talk affirmations, network status,
achievements, and build status.

Runs on Raspberry Pi 5 with Python standard library only (no pip needed).

Usage:
    python frontend/server.py

Then open: http://localhost:8300
"""

import http.server
import socketserver
import os
import json
import time
import threading
import urllib.request
import urllib.error
import ssl
import subprocess
import random
from pathlib import Path
from datetime import datetime, date, timedelta, timezone

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PORT = 8300
DIRECTORY = Path(__file__).parent

FUND_SYMBOLS = ["RFNGX", "RICAX", "RGAGX", "BTC-USD", "DOGE-USD", "ETH-USD", "SPY", "QQQ"]
YAHOO_PRIMARY = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=1d&interval=1d"
YAHOO_FALLBACK = "https://query2.finance.yahoo.com/v8/finance/chart/{symbol}?range=1d&interval=1d"
YAHOO_CORS_PROXY = "https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=1d&interval=1d"

NWS_POINTS_URL = "https://api.weather.gov/points/34.9331,-86.5700"
NWS_USER_AGENT = "(ShaneBrain Dashboard, brazeltonshane@gmail.com)"

OLLAMA_URL = "http://localhost:11434/api/tags"
WEAVIATE_URL = "http://localhost:8080/v1/.well-known/ready"
WEAVIATE_META_URL = "http://localhost:8080/v1/meta"
MCP_URL = "http://localhost:8100"
MCP_HEALTH_URL = "http://localhost:8400/health"

SOBRIETY_DATE = date(2023, 11, 27)
WEIGHT_FILE = DIRECTORY / "weight.json"
BOTS_FILE = DIRECTORY / "bots.json"
MEGA_HOME = Path("/media/shane/ANGEL_CLOUD/mega-shanebrain")
MEGA_PERSONA_FILE = MEGA_HOME / "persona.json"
MEGA_MEMORY_DB = MEGA_HOME / "memory.db"
MEGA_TRAINING_FILE = MEGA_HOME / "training.jsonl"
MEGA_OLLAMA_URL = "http://localhost:11434/api/generate"   # local Ollama — llama3.1:8b lives here
MEGA_MODEL = "llama3.2:3b"                                # 3b — fast on Pi, always loaded

TICKER_CACHE_TTL = 60        # seconds
WEATHER_CACHE_TTL = 900       # 15 minutes
HEALTH_CACHE_TTL = 30         # seconds
NETWORK_CACHE_TTL = 30        # seconds
BUILD_CACHE_TTL = 30          # seconds

TAILSCALE_NODES = {
    "Pi/shanebrain": "100.67.120.6",
    "Pulsar": "100.81.70.117",
    "Laptop": "100.94.122.125",
    "Bullfrog": "100.87.222.17",
}

# ---------------------------------------------------------------------------
# Thread-safe cache
# ---------------------------------------------------------------------------

_cache_lock = threading.Lock()
_cache: dict = {}


def cache_get(key: str):
    """Return cached (value, True) if fresh, else (None, False)."""
    with _cache_lock:
        entry = _cache.get(key)
        if entry and (time.time() - entry["ts"]) < entry["ttl"]:
            return entry["data"], True
    return None, False


def cache_set(key: str, data, ttl: int):
    with _cache_lock:
        _cache[key] = {"data": data, "ts": time.time(), "ttl": ttl}


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

# Reusable SSL context that doesn't verify certs (Yahoo often has issues on Pi)
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE


def _fetch_json(url: str, headers: dict | None = None, timeout: int = 10):
    """Fetch a URL and return parsed JSON. Raises on failure."""
    req = urllib.request.Request(url)
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=timeout, context=_ssl_ctx) as resp:
        return json.loads(resp.read().decode("utf-8", errors="replace"))


def _check_connection(url: str, timeout: int = 5) -> bool:
    """Return True if the URL responds with any 2xx status."""
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout, context=_ssl_ctx) as resp:
            return 200 <= resp.status < 300
    except Exception:
        return False


def _fetch_json_safe(url: str, headers: dict | None = None, timeout: int = 5):
    """Fetch JSON, return None on failure instead of raising."""
    try:
        return _fetch_json(url, headers=headers, timeout=timeout)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Weather icon mapper
# ---------------------------------------------------------------------------

_WEATHER_ICONS = {
    "sunny": "\u2600\ufe0f",
    "clear": "\u2600\ufe0f",
    "mostly sunny": "\ud83c\udf24\ufe0f",
    "mostly clear": "\ud83c\udf19",
    "partly sunny": "\u26c5",
    "partly cloudy": "\u26c5",
    "mostly cloudy": "\ud83c\udf25\ufe0f",
    "cloudy": "\u2601\ufe0f",
    "overcast": "\u2601\ufe0f",
    "rain": "\ud83c\udf27\ufe0f",
    "showers": "\ud83c\udf27\ufe0f",
    "chance showers": "\ud83c\udf26\ufe0f",
    "slight chance showers": "\ud83c\udf26\ufe0f",
    "thunderstorms": "\u26c8\ufe0f",
    "chance thunderstorms": "\u26c8\ufe0f",
    "snow": "\u2744\ufe0f",
    "fog": "\ud83c\udf2b\ufe0f",
    "wind": "\ud83d\udca8",
    "hot": "\ud83c\udf21\ufe0f",
    "cold": "\u2744\ufe0f",
}


def _weather_icon(description: str) -> str:
    desc_lower = description.lower()
    for keyword, icon in _WEATHER_ICONS.items():
        if keyword in desc_lower:
            return icon
    return "\u2600\ufe0f"


# ---------------------------------------------------------------------------
# Affirmations (50+)
# ---------------------------------------------------------------------------

AFFIRMATIONS = [
    {"message": "You are capable and strong.", "category": "strength"},
    {"message": "Your sobriety is a superpower.", "category": "sobriety"},
    {"message": "Your children are watching a man who never quits.", "category": "fatherhood"},
    {"message": "Every day sober is a victory.", "category": "sobriety"},
    {"message": "You are building something that outlives you.", "category": "legacy"},
    {"message": "Discipline today creates freedom tomorrow.", "category": "discipline"},
    {"message": "You are a provider. You are a protector.", "category": "fatherhood"},
    {"message": "Hard work is your language of love.", "category": "work"},
    {"message": "You chose the harder path and it made you stronger.", "category": "strength"},
    {"message": "Your mind is sharp. Your will is iron.", "category": "strength"},
    {"message": "The person you were does not define the person you are becoming.", "category": "growth"},
    {"message": "Rest is not weakness. It is strategy.", "category": "wisdom"},
    {"message": "You show up every single day. That matters.", "category": "discipline"},
    {"message": "Your family is your mission. Stay locked in.", "category": "fatherhood"},
    {"message": "Clarity comes from sobriety. You earned it.", "category": "sobriety"},
    {"message": "You are proof that people can change.", "category": "growth"},
    {"message": "Nobody outworks you. Remember that.", "category": "work"},
    {"message": "Small steps still move you forward.", "category": "growth"},
    {"message": "You are not behind. You are on your own timeline.", "category": "wisdom"},
    {"message": "The code you write today is a letter to your future self.", "category": "legacy"},
    {"message": "Your worst day sober is better than your best day drunk.", "category": "sobriety"},
    {"message": "Stay dangerous. Stay humble. Stay building.", "category": "discipline"},
    {"message": "Alabama built different. So are you.", "category": "strength"},
    {"message": "Your children will tell stories about what you built.", "category": "legacy"},
    {"message": "You already survived what should have broken you.", "category": "strength"},
    {"message": "Every line of code is a brick in your empire.", "category": "legacy"},
    {"message": "You do not need permission to level up.", "category": "growth"},
    {"message": "The grind is the gift.", "category": "discipline"},
    {"message": "Your sobriety gave you back your mind. Use it.", "category": "sobriety"},
    {"message": "You are not just surviving. You are building.", "category": "growth"},
    {"message": "Your kids do not need a perfect dad. They need a present one.", "category": "fatherhood"},
    {"message": "Consistency beats talent when talent does not show up.", "category": "discipline"},
    {"message": "You turned pain into purpose.", "category": "strength"},
    {"message": "The Raspberry Pi on your desk is proof you never stop learning.", "category": "legacy"},
    {"message": "Sobriety is not the absence of fun. It is the presence of everything.", "category": "sobriety"},
    {"message": "You are the architect of your own comeback.", "category": "growth"},
    {"message": "Sleep well tonight. You earned it.", "category": "wisdom"},
    {"message": "Your work ethic is your resume.", "category": "work"},
    {"message": "No one is coming to save you. You already saved yourself.", "category": "strength"},
    {"message": "You are writing code that your grandchildren might read.", "category": "legacy"},
    {"message": "Progress over perfection. Always.", "category": "wisdom"},
    {"message": "The man in the mirror today would make yesterday proud.", "category": "growth"},
    {"message": "You do not owe anyone an explanation for your growth.", "category": "wisdom"},
    {"message": "Every sober morning is a gift you gave yourself.", "category": "sobriety"},
    {"message": "Your family tree changes because of you.", "category": "legacy"},
    {"message": "Be the dad you needed.", "category": "fatherhood"},
    {"message": "You traded bottles for builds. Best trade you ever made.", "category": "sobriety"},
    {"message": "When you feel like quitting, remember why you started.", "category": "discipline"},
    {"message": "You are not a finished product. You are a work in progress.", "category": "growth"},
    {"message": "Silence the doubt. Trust the process.", "category": "wisdom"},
    {"message": "You were born to build, not to break.", "category": "strength"},
    {"message": "Your legacy is not what you leave behind. It is what you build right now.", "category": "legacy"},
    {"message": "Keep stacking days. Keep stacking wins.", "category": "sobriety"},
    {"message": "The best code is written by the one who refuses to give up.", "category": "work"},
    {"message": "You are teaching your children that reinvention is possible.", "category": "fatherhood"},
    {"message": "Brick by brick. Day by day. You are unstoppable.", "category": "discipline"},
]

_affirmation_index = 0
_affirmation_lock = threading.Lock()


def _next_affirmation() -> dict:
    global _affirmation_index
    with _affirmation_lock:
        aff = AFFIRMATIONS[_affirmation_index % len(AFFIRMATIONS)]
        _affirmation_index += 1
    return aff


# ---------------------------------------------------------------------------
# API handlers
# ---------------------------------------------------------------------------

SHANE_QUOTES = [
    "If they're not changing their own code, they're not actually growing.",
    "File structure first.",
    "800 million users. Digital legacy for generations.",
    "Solutions over explanations.",
    "The Pi is running. The bots are online. I built this.",
    "Small consistent actions beat big sporadic ones.",
    "Building for the people Big Tech is about to leave behind.",
    "Faith. Family. Sobriety. Local AI.",
]

JEFF_QUOTES = [
    "Great Place to Work — Jeff Hollingshead, SRM Concrete",
    "Q1 sales are through the roof — pedal to the metal!",
    "We take care of our people, and our people take care of our customers.",
]


def handle_tickers() -> tuple[int, dict | list]:
    """Build ticker data from market-sentinel + weather + quotes."""
    cached, hit = cache_get("tickers")
    if hit:
        return 200, cached

    # ── Price data: prefer market-sentinel.json (brain-updated), fallback to Yahoo ──
    CRYPTO_SYMS = {"BTC-USD", "DOGE-USD", "ETH-USD"}
    tech = []
    crypto = []

    # Try market-sentinel.json first (updated by market-sentinel brain)
    sentinel_path = DIRECTORY / "market-sentinel.json"
    sentinel_ok = False
    try:
        with open(sentinel_path) as f:
            sentinel = json.load(f)
        holdings = sentinel.get("data", {}).get("holdings", [])
        if holdings and any(h.get("price") for h in holdings):
            for h in holdings:
                sym = h["symbol"]
                price = h.get("price")
                change = round(price - h.get("prev_close", price), 2) if price and h.get("prev_close") else 0
                pct = h.get("change_pct", 0)
                entry = {"symbol": sym.replace("-USD", ""), "price": price, "change": change, "pct": pct}
                if sym in CRYPTO_SYMS:
                    crypto.append(entry)
                else:
                    tech.append(entry)
            sentinel_ok = True
    except Exception:
        pass

    # Fallback: Yahoo Finance direct
    if not sentinel_ok:
        for symbol in FUND_SYMBOLS:
            data = None
            for url_template in [YAHOO_PRIMARY, YAHOO_FALLBACK, YAHOO_CORS_PROXY]:
                try:
                    url = url_template.format(symbol=symbol)
                    raw = _fetch_json(url)
                    meta = raw["chart"]["result"][0]["meta"]
                    price = meta.get("regularMarketPrice", 0)
                    prev_close = meta.get("chartPreviousClose", meta.get("previousClose", price))
                    change = round(price - prev_close, 2) if prev_close else 0
                    change_pct = round((change / prev_close) * 100, 2) if prev_close else 0
                    entry = {"symbol": symbol.replace("-USD", ""), "price": round(price, 2), "change": change, "pct": change_pct}
                    if symbol in CRYPTO_SYMS:
                        crypto.append(entry)
                    else:
                        tech.append(entry)
                    data = True
                    break
                except Exception:
                    continue
            if not data:
                entry = {"symbol": symbol.replace("-USD", ""), "price": None, "change": None, "pct": None}
                if symbol in CRYPTO_SYMS:
                    crypto.append(entry)
                else:
                    tech.append(entry)

    # ── Forecast ticker from weather cache ──
    forecast_ticker = []
    try:
        weather_cached, whit = cache_get("weather")
        if not whit:
            _, weather_cached = handle_weather()
        if weather_cached and "forecast" in weather_cached:
            for f in weather_cached["forecast"]:
                hi = f.get("high", "?")
                lo = f.get("low")
                desc = f.get("description", "")
                temp_str = f"{hi}°F" if lo is None else f"{hi}/{lo}°F"
                forecast_ticker.append(f"{f.get('day','?')}: {temp_str} {desc}")
    except Exception:
        pass

    # ── Quotes ──
    shane_quotes = random.sample(SHANE_QUOTES, min(3, len(SHANE_QUOTES)))
    jeff_quotes = random.sample(JEFF_QUOTES, min(2, len(JEFF_QUOTES)))

    categorized = {
        "tech": tech,
        "crypto": crypto,
        "forecast_ticker": forecast_ticker,
        "shane_quotes": shane_quotes,
        "jeff_quotes": jeff_quotes,
    }
    cache_set("tickers", categorized, TICKER_CACHE_TTL)
    return 200, categorized


def handle_weather() -> tuple[int, dict]:
    """Fetch weather for Hazel Green, AL from NWS API with caching."""
    cached, hit = cache_get("weather")
    if hit:
        return 200, cached

    headers = {"User-Agent": NWS_USER_AGENT, "Accept": "application/geo+json"}

    try:
        # Step 1: get grid point
        points = _fetch_json(NWS_POINTS_URL, headers=headers, timeout=10)
        forecast_url = points["properties"]["forecast"]

        # Step 2: get forecast
        forecast_data = _fetch_json(forecast_url, headers=headers, timeout=10)
        periods = forecast_data["properties"]["periods"]

        # Build current from first period
        current_period = periods[0]
        current = {
            "temp": current_period.get("temperature", 0),
            "description": current_period.get("shortForecast", "Unknown"),
            "humidity": current_period.get("relativeHumidity", {}).get("value", None),
            "wind": f"{current_period.get('windDirection', '')} {current_period.get('windSpeed', '')}",
        }

        # Build forecast (day/night pairs -> daily entries, up to 7 days)
        forecast = []
        i = 0
        while i < len(periods) and len(forecast) < 7:
            p = periods[i]
            if p.get("isDaytime", True):
                day_name = p.get("name", "")[:3]
                high = p.get("temperature", 0)
                desc = p.get("shortForecast", "")
                # Try to get the night low
                low = None
                if i + 1 < len(periods) and not periods[i + 1].get("isDaytime", True):
                    low = periods[i + 1].get("temperature", 0)
                    i += 2
                else:
                    i += 1
                forecast.append({
                    "day": day_name,
                    "high": high,
                    "low": low,
                    "description": desc,
                    "icon": _weather_icon(desc),
                })
            else:
                # Night period without preceding day (e.g., first period is tonight)
                i += 1

        result = {"current": current, "forecast": forecast}
        cache_set("weather", result, WEATHER_CACHE_TTL)
        return 200, result

    except Exception as e:
        return 503, {"error": "Weather service unavailable", "detail": str(e)}


def handle_health() -> tuple[int, dict]:
    """Check health of all services. Primary: localhost:8400/health, fallback: individual checks."""
    cached, hit = cache_get("health")
    if hit:
        return 200, cached

    # Try primary health endpoint first
    primary_health = _fetch_json_safe(MCP_HEALTH_URL, timeout=5)

    ollama_ok = False
    model_name = "---"
    knowledge_count = 0
    memory_count = 0
    weaviate_meta = None

    if primary_health:
        # Use primary health data if available, supplement with our own checks
        ollama_ok = primary_health.get("ollama", False)
        model_name = primary_health.get("model", "---")
        knowledge_count = primary_health.get("knowledge", 0)
        memory_count = primary_health.get("memories", 0)
    
    # Always do our own checks as well (primary may not have everything)
    try:
        data = _fetch_json(OLLAMA_URL, timeout=5)
        ollama_ok = True
        models = [m.get("name", "") for m in data.get("models", [])]
        model_name = models[0] if models else "---"
    except Exception:
        pass

    weaviate_ok = _check_connection(WEAVIATE_URL)
    mcp_ok = _check_connection(MCP_URL + "/health")
    gateway_ok = _check_connection("http://localhost:4200/api/health")

    # Check Weaviate meta
    weaviate_meta = _fetch_json_safe(WEAVIATE_META_URL, timeout=5)

    # Get knowledge + memory counts from Weaviate
    if weaviate_ok:
        try:
            resp_body = json.dumps({"query": "{ Aggregate { LegacyKnowledge { meta { count } } } }"}).encode()
            req = urllib.request.Request(
                "http://localhost:8080/v1/graphql",
                data=resp_body,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                agg = json.loads(resp.read().decode())
                knowledge_count = agg.get("data", {}).get("Aggregate", {}).get("LegacyKnowledge", [{}])[0].get("meta", {}).get("count", 0)
        except Exception:
            pass
        try:
            resp_body = json.dumps({"query": "{ Aggregate { Conversation { meta { count } } } }"}).encode()
            req = urllib.request.Request(
                "http://localhost:8080/v1/graphql",
                data=resp_body,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                agg = json.loads(resp.read().decode())
                memory_count = agg.get("data", {}).get("Aggregate", {}).get("Conversation", [{}])[0].get("meta", {}).get("count", 0)
        except Exception:
            pass

    result = {
        "ollama": ollama_ok,
        "weaviate": weaviate_ok,
        "mcp": mcp_ok,
        "gateway": gateway_ok,
        "model": model_name,
        "knowledge": knowledge_count,
        "memories": memory_count,
        "weaviate_version": weaviate_meta.get("version", "unknown") if weaviate_meta else "unavailable",
        "timestamp": datetime.now().isoformat(),
    }
    cache_set("health", result, HEALTH_CACHE_TTL)
    return 200, result


def handle_sobriety() -> tuple[int, dict]:
    """Calculate days of sobriety since 2023-11-27."""
    today = date.today()
    delta = today - SOBRIETY_DATE
    return 200, {
        "days": delta.days,
        "since": SOBRIETY_DATE.isoformat(),
    }


def handle_selftalk() -> tuple[int, dict]:
    """Return a rotating self-talk affirmation."""
    return 200, _next_affirmation()


GCAL_TOKEN_FILE = Path("/mnt/shanebrain-raid/shanebrain-core/scripts/gcal_token.json")
GCAL_CACHE_FILE = Path("/mnt/shanebrain-raid/shanebrain-core/scripts/gcal_cache.json")
GCAL_CACHE_TTL = 300  # 5 minutes


def _fetch_google_calendar() -> list[dict]:
    """Fetch upcoming events from Google Calendar API using stored OAuth token."""
    if not GCAL_TOKEN_FILE.exists():
        raise FileNotFoundError("No Google Calendar token. Run google_calendar_setup.py")

    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build

    token_data = json.loads(GCAL_TOKEN_FILE.read_text())
    creds = Credentials(
        token=token_data.get("token"),
        refresh_token=token_data.get("refresh_token"),
        token_uri=token_data.get("token_uri"),
        client_id=token_data.get("client_id"),
        client_secret=token_data.get("client_secret"),
        scopes=token_data.get("scopes"),
    )

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        # Save refreshed token
        token_data["token"] = creds.token
        GCAL_TOKEN_FILE.write_text(json.dumps(token_data, indent=2))

    service = build("calendar", "v3", credentials=creds)
    now = datetime.now(timezone.utc).isoformat()
    week_later = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

    result = service.events().list(
        calendarId="primary",
        timeMin=now,
        timeMax=week_later,
        maxResults=20,
        singleEvents=True,
        orderBy="startTime",
    ).execute()

    events = []
    for ev in result.get("items", []):
        start = ev.get("start", {})
        dt_str = start.get("dateTime", start.get("date", ""))
        all_day = "date" in start and "dateTime" not in start

        # Parse time for display
        time_str = ""
        date_str = ""
        day_name = ""
        if dt_str:
            try:
                from datetime import datetime as _dt
                if "T" in dt_str:
                    # Has time component
                    dt = _dt.fromisoformat(dt_str)
                    time_str = dt.strftime("%-I:%M %p")
                    date_str = dt.strftime("%b %d")
                    day_name = dt.strftime("%a")
                else:
                    # All-day event
                    dt = _dt.strptime(dt_str, "%Y-%m-%d")
                    date_str = dt.strftime("%b %d")
                    day_name = dt.strftime("%a")
                    time_str = "ALL DAY"
            except Exception:
                pass

        events.append({
            "title": ev.get("summary", "(No title)"),
            "description": (ev.get("description") or "")[:200],
            "time": time_str,
            "date": date_str,
            "day": day_name,
            "allDay": all_day,
            "location": ev.get("location", ""),
            "link": ev.get("htmlLink", ""),
            "status": ev.get("status", ""),
        })

    # Cache results
    GCAL_CACHE_FILE.write_text(json.dumps({
        "events": events,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }, indent=2))

    return events


def handle_calendar() -> tuple[int, dict]:
    """Return upcoming calendar events from Google Calendar."""
    cached, hit = cache_get("calendar")
    if hit:
        return 200, cached

    # Try cached file first (faster than API call)
    if GCAL_CACHE_FILE.exists():
        try:
            cache_data = json.loads(GCAL_CACHE_FILE.read_text())
            fetched = cache_data.get("fetched_at", "")
            if fetched:
                age = (datetime.now(timezone.utc) - datetime.fromisoformat(fetched)).total_seconds()
                if age < GCAL_CACHE_TTL:
                    result = {
                        "events": cache_data["events"],
                        "source": "google-cached",
                        "message": f"{len(cache_data['events'])} events this week",
                    }
                    cache_set("calendar", result, GCAL_CACHE_TTL)
                    return 200, result
        except Exception:
            pass

    # Fetch fresh from Google Calendar API
    try:
        events = _fetch_google_calendar()
        result = {
            "events": events,
            "source": "google",
            "message": f"{len(events)} events this week",
        }
        cache_set("calendar", result, GCAL_CACHE_TTL)
        return 200, result
    except Exception as e:
        # Fallback to stale cache if available
        if GCAL_CACHE_FILE.exists():
            try:
                cache_data = json.loads(GCAL_CACHE_FILE.read_text())
                return 200, {
                    "events": cache_data.get("events", []),
                    "source": "google-stale",
                    "message": f"Using cached data (API error: {str(e)[:50]})",
                }
            except Exception:
                pass

        return 200, {
            "events": [],
            "source": "disconnected",
            "message": "Calendar not connected. Run google_calendar_setup.py to authorize.",
        }


GMAIL_USER = os.environ.get("GMAIL_USER", "brazeltonshane@gmail.com")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "kjsquztxjattpfgn")
EMAIL_CACHE_TTL = 120  # 2 minutes


def handle_emails() -> tuple[int, dict]:
    """Fetch recent inbox emails via IMAP + janitor/responder stats."""
    cached, hit = cache_get("emails")
    if hit:
        return 200, cached

    import imaplib
    import email as _email
    import email.header
    import email.utils

    def _decode_header(raw):
        parts = []
        for b, enc in _email.header.decode_header(raw or ""):
            parts.append(b.decode(enc or "utf-8", errors="replace") if isinstance(b, bytes) else (b or ""))
        return "".join(parts).strip()

    emails_out = []
    unread_count = 0
    try:
        ctx = ssl.create_default_context()
        conn = imaplib.IMAP4_SSL("imap.gmail.com", 993, ssl_context=ctx)
        conn.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        conn.select("INBOX", readonly=True)

        # Get unread count
        _, unread_data = conn.search(None, "UNSEEN")
        unread_ids = unread_data[0].split() if unread_data[0] else []
        unread_count = len(unread_ids)

        # Fetch latest 12 emails (any status)
        _, all_data = conn.search(None, "ALL")
        all_ids = all_data[0].split() if all_data[0] else []
        fetch_ids = all_ids[-12:]  # last 12

        def _get_text_body(msg_obj, max_len=300):
            """Extract plain-text body snippet from email message."""
            if msg_obj.is_multipart():
                for part in msg_obj.walk():
                    ct = part.get_content_type()
                    if ct == "text/plain":
                        payload = part.get_payload(decode=True)
                        if payload:
                            text = payload.decode(part.get_content_charset() or "utf-8", errors="replace")
                            # Clean up whitespace
                            lines = [l.strip() for l in text.strip().splitlines() if l.strip()]
                            return " ".join(lines)[:max_len]
                # Fallback: try text/html stripped of tags
                for part in msg_obj.walk():
                    ct = part.get_content_type()
                    if ct == "text/html":
                        payload = part.get_payload(decode=True)
                        if payload:
                            import re as _re
                            html = payload.decode(part.get_content_charset() or "utf-8", errors="replace")
                            text = _re.sub(r'<[^>]+>', ' ', html)
                            text = _re.sub(r'\s+', ' ', text).strip()
                            return text[:max_len]
            else:
                payload = msg_obj.get_payload(decode=True)
                if payload:
                    text = payload.decode(msg_obj.get_content_charset() or "utf-8", errors="replace")
                    lines = [l.strip() for l in text.strip().splitlines() if l.strip()]
                    return " ".join(lines)[:max_len]
            return ""

        for eid in reversed(fetch_ids):
            try:
                _, msg_data = conn.fetch(eid, "(FLAGS BODY.PEEK[])")
                raw = msg_data[0][1]
                flags_raw = msg_data[0][0].decode("utf-8", errors="replace") if msg_data[0][0] else ""
                msg = _email.message_from_bytes(raw)

                from_raw = _decode_header(msg.get("From", ""))
                subject = _decode_header(msg.get("Subject", "(no subject)"))
                date_raw = msg.get("Date", "")
                parsed_date = _email.utils.parsedate_to_datetime(date_raw) if date_raw else None
                time_str = parsed_date.strftime("%I:%M %p") if parsed_date else ""
                date_str = parsed_date.strftime("%b %d") if parsed_date else ""

                # Extract display name from "Name <email>" format
                if "<" in from_raw:
                    from_name = from_raw.split("<")[0].strip().strip('"')
                    if not from_name:
                        from_name = from_raw.split("<")[1].rstrip(">")
                else:
                    from_name = from_raw

                is_read = "\\Seen" in flags_raw
                is_important = "\\Flagged" in flags_raw

                # Extract sender email address
                from_email = ""
                if "<" in from_raw and ">" in from_raw:
                    from_email = from_raw.split("<")[1].rstrip(">")
                else:
                    from_email = from_raw

                # Get body snippet
                snippet = _get_text_body(msg)

                emails_out.append({
                    "id": eid.decode() if isinstance(eid, bytes) else str(eid),
                    "from": from_name[:40],
                    "fromEmail": from_email[:60],
                    "subject": subject[:120],
                    "snippet": snippet,
                    "time": time_str,
                    "date": date_str,
                    "read": is_read,
                    "important": is_important,
                })
            except Exception:
                continue

        conn.logout()
    except Exception as e:
        return 200, {
            "emails": [],
            "unreadCount": 0,
            "source": "imap-error",
            "message": f"Gmail connection failed: {str(e)[:100]}",
            "janitor": _load_email_bot_stats(),
        }

    # Load janitor + responder stats
    bot_stats = _load_email_bot_stats()

    result = {
        "emails": emails_out,
        "unreadCount": unread_count,
        "source": "imap",
        "janitor": bot_stats,
        "message": f"{unread_count} unread" if unread_count else "Inbox clean",
    }
    cache_set("emails", result, EMAIL_CACHE_TTL)
    return 200, result


def _load_email_bot_stats() -> dict:
    """Read janitor + responder state files for dashboard stats."""
    stats = {}
    janitor_state = Path("/mnt/shanebrain-raid/shanebrain-core/scripts/email_janitor_state.json")
    responder_state = Path("/mnt/shanebrain-raid/shanebrain-core/scripts/email_responder_state.json")
    try:
        with open(janitor_state) as f:
            jd = json.load(f)
        last_run = jd.get("runs", [])[-1] if jd.get("runs") else {}
        stats["janitor_last_run"] = last_run.get("ts", "")
        stats["janitor_total_cleaned"] = jd.get("total_cleaned", 0)
        rpt = last_run.get("report", {})
        stats["janitor_last_purged"] = rpt.get("purged_spam", 0) + rpt.get("purged_trash", 0)
        stats["janitor_last_moved"] = rpt.get("moved_to_trash", 0)
    except Exception:
        pass
    try:
        with open(responder_state) as f:
            rd = json.load(f)
        last_run = rd.get("runs", [])[-1] if rd.get("runs") else {}
        stats["responder_last_run"] = last_run.get("ts", "")
        stats["responder_total_drafted"] = rd.get("total_drafted", 0)
        rpt = last_run.get("report", {})
        stats["responder_last_drafted"] = rpt.get("drafted", 0)
        stats["responder_last_drafts"] = rd.get("last_drafts", [])[:3]
    except Exception:
        pass
    return stats


def handle_network() -> tuple[int, dict]:
    """Ping Tailscale nodes and return status."""
    cached, hit = cache_get("network")
    if hit:
        return 200, cached

    nodes = []
    for name, ip in TAILSCALE_NODES.items():
        try:
            result = subprocess.run(
                ["ping", "-c", "1", "-W", "1", ip],
                capture_output=True,
                text=True,
                timeout=3,
            )
            online = result.returncode == 0
            # Parse latency from ping output
            latency = None
            if online and "time=" in result.stdout:
                try:
                    latency = float(result.stdout.split("time=")[1].split(" ")[0])
                except (IndexError, ValueError):
                    pass
        except Exception:
            online = False
            latency = None

        nodes.append({
            "name": name,
            "ip": ip,
            "online": online,
            "latency_ms": latency,
        })

    response = {
        "nodes": nodes,
        "timestamp": datetime.now().isoformat(),
    }
    cache_set("network", response, NETWORK_CACHE_TTL)
    return 200, response


def handle_achievements() -> tuple[int, dict]:
    """Return achievements list (hardcoded for now)."""
    # Calculate sobriety milestones
    today = date.today()
    sober_days = (today - SOBRIETY_DATE).days

    sobriety_milestones = []
    milestones = [
        (30, "30 Days Sober"),
        (60, "60 Days Sober"),
        (90, "90 Days Sober"),
        (180, "6 Months Sober"),
        (365, "1 Year Sober"),
        (500, "500 Days Sober"),
        (730, "2 Years Sober"),
        (860, "860 Days Strong"),
    ]
    for days_needed, label in milestones:
        sobriety_milestones.append({
            "name": label,
            "earned": sober_days >= days_needed,
            "category": "sobriety",
        })

    achievements = {
        "sobriety": sobriety_milestones,
        "engineering": [
            {"name": "First Commit", "earned": True, "category": "code"},
            {"name": "100 Commits", "earned": True, "category": "code"},
            {"name": "500 Commits", "earned": True, "category": "code"},
            {"name": "1000 Commits", "earned": True, "category": "code"},
            {"name": "ShaneBrain Core Deployed", "earned": True, "category": "code"},
            {"name": "MCP Server Live (20 Tools)", "earned": True, "category": "code"},
            {"name": "Angel Cloud Gateway Live", "earned": True, "category": "code"},
            {"name": "Pulsar Sentinel Built", "earned": True, "category": "code"},
        ],
        "bots": [
            {"name": "Discord Bot Deployed", "earned": True, "category": "bots"},
            {"name": "Social Bot Deployed", "earned": True, "category": "bots"},
            {"name": "Arcade Bot Deployed", "earned": True, "category": "bots"},
            {"name": "AI-Trainer-MAX Created", "earned": True, "category": "bots"},
        ],
        "knowledge": [
            {"name": "First Knowledge Chunk Ingested", "earned": True, "category": "knowledge"},
            {"name": "50 Knowledge Chunks", "earned": True, "category": "knowledge"},
            {"name": "100 Knowledge Chunks", "earned": True, "category": "knowledge"},
            {"name": "RAG System Online", "earned": True, "category": "knowledge"},
            {"name": "Weaviate 17 Collections", "earned": True, "category": "knowledge"},
        ],
        "sober_days": sober_days,
        "timestamp": datetime.now().isoformat(),
    }
    return 200, achievements


def handle_buildstatus() -> tuple[int, dict]:
    """Return current build/agent status from systemd services and docker containers."""
    cached, hit = cache_get("buildstatus")
    if hit:
        return 200, cached

    # Check systemd services
    services_to_check = [
        "angel-cloud-gateway",
        "shanebrain-social",
        "shanebrain-discord",
        "shanebrain-arcade",
        "ollama",
    ]
    services = []
    for svc in services_to_check:
        try:
            result = subprocess.run(
                ["systemctl", "is-active", svc],
                capture_output=True,
                text=True,
                timeout=5,
            )
            status = result.stdout.strip()
        except Exception:
            status = "unknown"
        services.append({"name": svc, "status": status})

    # Check docker containers
    containers = []
    try:
        result = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}\t{{.Status}}\t{{.Image}}"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            for line in result.stdout.strip().split("\n"):
                if line.strip():
                    parts = line.split("\t")
                    name = parts[0] if len(parts) > 0 else "unknown"
                    status = parts[1] if len(parts) > 1 else "unknown"
                    image = parts[2] if len(parts) > 2 else "unknown"
                    containers.append({
                        "name": name,
                        "status": status,
                        "image": image,
                    })
    except Exception:
        pass

    response = {
        "services": services,
        "containers": containers,
        "timestamp": datetime.now().isoformat(),
    }
    cache_set("buildstatus", response, BUILD_CACHE_TTL)
    return 200, response


def handle_mega_chat(body: bytes) -> tuple[int, dict]:
    """MEGA chat — mega-brain on port 11434, stateful memory."""
    import sqlite3 as _sq
    try:
        payload = json.loads(body.decode("utf-8"))
        message = payload.get("message", "").strip()
        session_id = payload.get("session_id", "web")
        if not message:
            return 400, {"error": "message required"}

        # Pull recent context from memory.db (limit to 4 turns to keep context short)
        context_lines = []
        try:
            conn = _sq.connect(str(MEGA_MEMORY_DB), timeout=5)
            cur = conn.cursor()
            cur.execute(
                "SELECT role, content FROM conversations WHERE session_id=? ORDER BY id DESC LIMIT 4",
                (session_id,)
            )
            rows = list(reversed(cur.fetchall()))
            conn.close()
            context_lines = [f"{r}: {c}" for r, c in rows]
        except Exception:
            pass

        history = "\n".join(context_lines)
        prompt = f"{history}\nuser: {message}\nmega:" if history else f"user: {message}\nmega:"

        # Use mega-brain's baked-in system prompt — no override needed
        req_body = json.dumps({
            "model": MEGA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.7, "num_predict": 60},
        }).encode()

        try:
            req = urllib.request.Request(
                MEGA_OLLAMA_URL,
                data=req_body,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=180) as resp:
                data = json.loads(resp.read())
                response_text = data.get("response", "").strip()
        except Exception as e:
            return 503, {"error": str(e), "model_loading": True}

        if not response_text:
            return 503, {"error": "No response", "model_loading": True}

        # Save to memory.db
        ts = datetime.now().isoformat(timespec="seconds")
        try:
            conn = _sq.connect(str(MEGA_MEMORY_DB), timeout=5)
            cur = conn.cursor()
            cur.execute("INSERT INTO conversations (session_id,ts,role,content) VALUES (?,?,?,?)",
                        (session_id, ts, "user", message))
            cur.execute("INSERT INTO conversations (session_id,ts,role,content) VALUES (?,?,?,?)",
                        (session_id, ts, "assistant", response_text))
            conn.commit()
            conn.close()
        except Exception:
            pass

        # Append to training corpus
        try:
            entry = json.dumps({"ts": ts, "session_id": session_id, "user": message, "mega": response_text}) + "\n"
            with open(MEGA_TRAINING_FILE, "a") as f:
                f.write(entry)
        except Exception:
            pass

        return 200, {"status": "ok", "response": response_text, "session_id": session_id}

    except Exception as e:
        return 500, {"error": str(e)}


def _weaviate_count(collection: str) -> int:
    """Query Weaviate GraphQL aggregate for a single collection count."""
    try:
        body = json.dumps({"query": f"{{ Aggregate {{ {collection} {{ meta {{ count }} }} }} }}"}).encode()
        req = urllib.request.Request(
            "http://localhost:8080/v1/graphql",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=4) as resp:
            agg = json.loads(resp.read().decode())
            return agg.get("data", {}).get("Aggregate", {}).get(collection, [{}])[0].get("meta", {}).get("count", 0)
    except Exception:
        return -1


def handle_knowledge_stats() -> tuple[int, dict]:
    """Live Weaviate collection counts — queried fresh every call (TTL cached 30s)."""
    cached, hit = cache_get("knowledge_stats")
    if hit:
        return 200, cached

    collections = [
        "LegacyKnowledge",
        "Conversation",
        "ExternalPerspectives",
        "FriendProfile",
        "DailyNote",
        "PersonalDoc",
        "SecurityLog",
        "PrivacyAudit",
        "BrainDoc",
        "BusinessDoc",
        "Document",
        "DraftTemplate",
        "MessageLog",
        "MyBrain",
        "SocialKnowledge",
        "CrisisLog",
        "PersonalDraft",
    ]

    counts = {}
    total = 0
    for col in collections:
        n = _weaviate_count(col)
        counts[col] = n
        if n > 0:
            total += n

    result = {
        "total": total,
        "collections": counts,
        "timestamp": datetime.now().isoformat(),
    }
    cache_set("knowledge_stats", result, 30)  # 30-second TTL — live
    return 200, result


def handle_knowledge_all() -> tuple[int, dict]:
    """Fetch knowledge objects from Weaviate for the Knowledge Stars visualization."""
    cached, hit = cache_get("knowledge_all")
    if hit:
        return 200, cached

    objects = []
    try:
        query = json.dumps({
            "query": '{ Get { LegacyKnowledge(limit: 500) { title category content _additional { id } } } }'
        }).encode()
        req = urllib.request.Request(
            "http://localhost:8080/v1/graphql",
            data=query,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode("utf-8", errors="replace"))
            raw = result.get("data", {}).get("Get", {}).get("LegacyKnowledge", [])
            for obj in raw:
                objects.append({
                    "title": obj.get("title", "Untitled"),
                    "category": obj.get("category", "general"),
                    "content": (obj.get("content", "") or "")[:200],
                })
    except Exception as e:
        print(f"[Knowledge All] Weaviate query failed: {e}")

    result = {"objects": objects, "count": len(objects)}
    cache_set("knowledge_all", result, 120)
    return 200, result


def _read_json_file(path) -> tuple[int, dict]:
    """Generic: read a JSON file and return it, or 503 if missing."""
    try:
        with open(path) as f:
            return 200, json.load(f)
    except FileNotFoundError:
        return 503, {"status": "pending", "message": "Brain not yet started."}
    except Exception as e:
        return 500, {"error": str(e)}


def handle_bots_get() -> tuple[int, dict]:
    """Return bots data."""
    try:
        with open(BOTS_FILE, "r") as f:
            return 200, json.load(f)
    except Exception as e:
        return 500, {"error": str(e)}


def handle_bots_post(body: bytes) -> tuple[int, dict]:
    """Add a thought to a bot. Body: {"bot_id": "...", "thought": "..."}"""
    try:
        payload = json.loads(body.decode("utf-8"))
        bot_id = payload.get("bot_id", "").strip()
        thought = payload.get("thought", "").strip()
        if not bot_id or not thought:
            return 400, {"error": "bot_id and thought required"}
        with open(BOTS_FILE, "r") as f:
            data = json.load(f)
        found = False
        for bot in data.get("bots", []):
            if bot["id"] == bot_id:
                bot.setdefault("thoughts", []).append({
                    "text": thought,
                    "ts": datetime.now().isoformat(timespec="seconds"),
                })
                found = True
                break
        if not found:
            return 404, {"error": f"Bot {bot_id!r} not found"}
        with open(BOTS_FILE, "w") as f:
            json.dump(data, f, indent=2)
        return 200, data
    except Exception as e:
        return 500, {"error": str(e)}


def handle_weight_get() -> tuple[int, dict]:
    """Return weight loss data."""
    try:
        with open(WEIGHT_FILE, "r") as f:
            data = json.load(f)
        return 200, data
    except Exception as e:
        return 500, {"error": str(e)}


def handle_weight_post(body: bytes) -> tuple[int, dict]:
    """Add a new weight entry. Body: {"weight": 375}"""
    try:
        payload = json.loads(body.decode("utf-8"))
        weight = float(payload.get("weight", 0))
        if weight <= 0:
            return 400, {"error": "Invalid weight"}
        today = date.today().isoformat()
        with open(WEIGHT_FILE, "r") as f:
            data = json.load(f)
        # Replace today's entry if it exists, else append
        entries = data.get("entries", [])
        for entry in entries:
            if entry["date"] == today:
                entry["weight"] = weight
                break
        else:
            entries.append({"date": today, "weight": weight})
        data["entries"] = entries
        with open(WEIGHT_FILE, "w") as f:
            json.dump(data, f, indent=2)
        return 200, data
    except Exception as e:
        return 500, {"error": str(e)}


# ---------------------------------------------------------------------------
# MEGA-SHANEBRAIN Intelligence Panel
# ---------------------------------------------------------------------------

MEGA_BASE = Path("/mnt/shanebrain-raid/shanebrain-core/mega")


def handle_mega_brain() -> tuple[int, dict]:
    """Return crew stats, IQ trend, instruction versions, Gemini guidance."""
    try:
        result = {
            "status": "ok",
            "bots": [],
            "mega_iq": 0,
            "mega_iq_trend": "stable",
            "training_count": 0,
            "memory_count": 0,
            "arc_approved_today": 0,
            "arc_rejected_today": 0,
            "gemini_guidance": {},
            "gemini_budget": {},
            "weld_log": [],
            "zone_activity": {},
        }

        status_file = MEGA_BASE / "bot_status.json"
        if status_file.exists():
            data = json.loads(status_file.read_text())
            result["bots"]               = data.get("bots", [])
            result["mega_iq"]            = data.get("mega_iq", 0)
            result["arc_approved_today"] = data.get("arc_approved_today", 0)
            result["arc_rejected_today"] = data.get("arc_rejected_today", 0)
            result["training_count"]     = data.get("training_count", 0)
            result["memory_count"]       = data.get("memory_count", 0)
            result["zone_activity"]      = data.get("zone_activity", {})
            result["gemini_guidance"]    = data.get("gemini_guidance", {})

        spike_file = MEGA_BASE / "status" / "spike_iq.json"
        if spike_file.exists():
            spike = json.loads(spike_file.read_text())
            result["mega_iq"]       = spike.get("mega_iq", result["mega_iq"])
            result["mega_iq_trend"] = spike.get("trend", "stable")
            result["iq_history"]    = spike.get("history", [])[-10:]

        budget_file = MEGA_BASE / "status" / "gemini_budget.json"
        if budget_file.exists():
            result["gemini_budget"] = json.loads(budget_file.read_text())

        weld_file = MEGA_BASE / "status" / "weld_log.json"
        if weld_file.exists():
            result["weld_log"] = json.loads(weld_file.read_text())[-10:]

        # Manual Gemini budget (separate from auto)
        manual_budget_file = MEGA_BASE / "status" / "gemini_manual_budget.json"
        if manual_budget_file.exists():
            try:
                result["gemini_manual_budget"] = json.loads(manual_budget_file.read_text())
            except Exception:
                pass

        return 200, result
    except Exception as e:
        return 500, {"status": "error", "error": str(e)}


def handle_gemini_trigger(body: bytes):
    """Trigger a manual Gemini strategic analysis. Uses separate budget from auto runs.
    Calls Gemini API directly — does NOT count against the auto 4/day budget."""
    import urllib.request
    import urllib.error
    import os

    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
    GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    MAX_MANUAL_DAILY = 4
    manual_budget_file = MEGA_BASE / "status" / "gemini_manual_budget.json"
    today = date.today().isoformat()

    if not GEMINI_API_KEY:
        return 500, {"status": "error", "message": "GEMINI_API_KEY not configured"}

    # Load/reset manual budget
    manual_budget = {"date": today, "calls_today": 0}
    if manual_budget_file.exists():
        try:
            mb = json.loads(manual_budget_file.read_text())
            if mb.get("date") == today:
                manual_budget = mb
        except Exception:
            pass

    # No budget limit on manual — Shane can hit it as much as he wants

    # Build a crew snapshot for Gemini
    snapshot = {}
    status_file = MEGA_BASE / "bot_status.json"
    if status_file.exists():
        try:
            data = json.loads(status_file.read_text())
            snapshot["bots"] = [{"name": b.get("name"), "status": b.get("status"), "last_action": b.get("last_action", "")[:60]} for b in data.get("bots", [])]
            snapshot["mega_iq"] = data.get("mega_iq")
            snapshot["arc_approved_today"] = data.get("arc_approved_today", 0)
            snapshot["arc_rejected_today"] = data.get("arc_rejected_today", 0)
            snapshot["training_count"] = data.get("training_count", 0)
        except Exception:
            pass

    arc_stats_file = MEGA_BASE / "status" / "arc_stats.json"
    if arc_stats_file.exists():
        try:
            snapshot["arc_stats"] = json.loads(arc_stats_file.read_text())
        except Exception:
            pass

    # Include per-bot configs from Phase 2 directory structure
    bots_dir = MEGA_BASE / "bots"
    bot_configs = {}
    for bot_dir in bots_dir.iterdir():
        cfg_file = bot_dir / "config.json"
        if bot_dir.is_dir() and cfg_file.exists():
            try:
                bot_configs[bot_dir.name] = json.loads(cfg_file.read_text())
            except Exception:
                pass
    if bot_configs:
        snapshot["bot_configs"] = bot_configs

    # Include current instructions
    inst_dir = MEGA_BASE / "instructions"
    instructions = {}
    for inst_file in inst_dir.glob("*.json"):
        try:
            inst = json.loads(inst_file.read_text())
            instructions[inst_file.stem] = {
                "rules": inst.get("rules", []),
                "performance_notes": inst.get("performance_notes", [])[-3:],
            }
        except Exception:
            pass
    if instructions:
        snapshot["current_instructions"] = instructions

    prompt = (
        f"MANUAL STRATEGIC REVIEW requested by Shane.\n\n"
        "ARCHITECTURE: 17 bots on Pi 5, each in mega/bots/{{name}}/ with bot.py, knowledge.py, config.json. "
        "Per-bot Weaviate memory (BotMemory collection). SQLite message bus. "
        "Instructions at mega/instructions/{{name}}.json (hot-reloaded into LLM prompts). "
        "Arc reviews all proposals, Weld applies approved changes.\n\n"
        f"Current crew snapshot:\n{json.dumps(snapshot, indent=2)}\n\n"
        "Analyze the crew's current state. Focus on:\n"
        "1. What's working well right now?\n"
        "2. What's the biggest bottleneck or problem?\n"
        "3. One specific, actionable recommendation (reference specific bot files/configs).\n\n"
        "Respond ONLY with this JSON (no markdown, no explanation):\n"
        '{"assessment": "2-3 sentences on crew health", '
        '"bottleneck": "the #1 issue right now", '
        '"recommendation": "specific action to take", '
        '"crew_grade": "A/B/C/D/F"}'
    )

    try:
        req_body = json.dumps({
            "contents": [{"parts": [{"text": prompt}]}]
        }).encode()
        req = urllib.request.Request(
            GEMINI_URL,
            data=req_body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read())
            raw = data["candidates"][0]["content"]["parts"][0]["text"]

        # Try to parse JSON from Gemini response
        result = {}
        if raw:
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start >= 0:
                try:
                    result = json.loads(raw[start:end])
                except Exception:
                    result = {"assessment": raw[:300], "bottleneck": "parse error", "recommendation": "retry", "crew_grade": "?"}
            else:
                result = {"assessment": raw[:300], "bottleneck": "n/a", "recommendation": "n/a", "crew_grade": "?"}

        # Update manual budget
        manual_budget["calls_today"] = manual_budget.get("calls_today", 0) + 1
        manual_budget["last_call"] = datetime.utcnow().isoformat()
        manual_budget_file.write_text(json.dumps(manual_budget, indent=2))

        # Save result for dashboard display
        manual_result_file = MEGA_BASE / "status" / "gemini_manual_result.json"
        result["ts"] = datetime.utcnow().isoformat()
        result["call_number"] = manual_budget["calls_today"]
        manual_result_file.write_text(json.dumps(result, indent=2))

        return 200, {"status": "ok", "result": result, "budget": manual_budget}

    except Exception as e:
        return 500, {"status": "error", "message": str(e)}


def _save_chat_to_mega_memory(user_msg: str, assistant_msg: str, session_id: str):
    """Save dashboard chat exchange to MEGA memory.db so crew bots can learn from it."""
    try:
        import sqlite3
        db_path = str(MEGA_BASE / "memory.db")
        conn = sqlite3.connect(db_path, timeout=5)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS conversations "
            "(id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT, ts TEXT, "
            "role TEXT, content TEXT, tokens INTEGER)"
        )
        from datetime import datetime
        ts = datetime.utcnow().isoformat()
        conn.execute(
            "INSERT INTO conversations (session_id, ts, role, content, tokens) VALUES (?,?,?,?,?)",
            (session_id, ts, "user", user_msg, len(user_msg.split()))
        )
        conn.execute(
            "INSERT INTO conversations (session_id, ts, role, content, tokens) VALUES (?,?,?,?,?)",
            (session_id, ts, "assistant", assistant_msg, len(assistant_msg.split()))
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[MEGA Memory] Save failed: {e}")


# ---------------------------------------------------------------------------
# Voice Dump / Noir handlers
# ---------------------------------------------------------------------------

NOIR_PIECES_FILE = DIRECTORY / "noir-pieces.json"


def _load_noir_pieces() -> list[dict]:
    try:
        with open(NOIR_PIECES_FILE) as f:
            return json.load(f).get("pieces", [])
    except Exception:
        return []


def _save_noir_pieces(pieces: list[dict]):
    with open(NOIR_PIECES_FILE, "w") as f:
        json.dump({"pieces": pieces}, f, indent=2)


def handle_noir_pieces_get() -> tuple[int, dict]:
    return 200, {"pieces": _load_noir_pieces()}


def handle_transcribe_post(body: bytes) -> tuple[int, dict]:
    """Forward audio to Ollama whisper or return transcript."""
    import tempfile
    # Parse multipart form data to extract audio
    # The audio comes as multipart/form-data with field 'audio'
    try:
        tmp_path = DIRECTORY / "voice_tmp.webm"
        # Simple extraction: find the audio blob in the multipart body
        # Look for the webm magic bytes or content after headers
        idx = body.find(b"\r\n\r\n")
        if idx >= 0:
            # Skip first boundary + headers
            rest = body[idx + 4:]
            # Find the next boundary
            boundary_end = rest.find(b"\r\n--")
            if boundary_end >= 0:
                audio_data = rest[:boundary_end]
            else:
                audio_data = rest
        else:
            audio_data = body
        with open(tmp_path, "wb") as f:
            f.write(audio_data)
        # Use whisper via command line if available
        result = subprocess.run(
            ["whisper", str(tmp_path), "--model", "base", "--output_format", "txt", "--output_dir", str(DIRECTORY)],
            capture_output=True, text=True, timeout=120
        )
        txt_file = DIRECTORY / "voice_tmp.txt"
        if txt_file.exists():
            transcript = txt_file.read_text().strip()
            txt_file.unlink(missing_ok=True)
            tmp_path.unlink(missing_ok=True)
            return 200, {"transcript": transcript}
        # Fallback: try faster-whisper or return error
        tmp_path.unlink(missing_ok=True)
        return 500, {"error": "Whisper transcription produced no output. stderr: " + result.stderr[:200]}
    except FileNotFoundError:
        return 500, {"error": "whisper not installed — run: pip install openai-whisper"}
    except Exception as e:
        return 500, {"error": f"Transcription failed: {e}"}


def handle_noir_shape_post(body: bytes) -> tuple[int, dict]:
    """Shape raw text into noir prose via Ollama."""
    payload = json.loads(body.decode("utf-8"))
    text = payload.get("text", "").strip()
    if not text:
        return 400, {"error": "No text provided"}
    prompt = (
        "You are a noir prose stylist. Reshape the following raw voice dump into tight, "
        "atmospheric noir prose. Keep the meaning and personal voice intact. "
        "Do not add fictional events. Just reshape the style.\n\n"
        f"RAW:\n{text}\n\nNOIR VERSION:"
    )
    try:
        req_body = json.dumps({"model": MEGA_MODEL, "prompt": prompt, "stream": False}).encode()
        req = urllib.request.Request(
            MEGA_OLLAMA_URL, data=req_body,
            headers={"Content-Type": "application/json"}, method="POST"
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode())
        shaped = result.get("response", "").strip()
        if not shaped:
            return 500, {"error": "Model returned empty response"}
        return 200, {"shaped": shaped}
    except Exception as e:
        return 500, {"error": f"Shape failed: {e}"}


def handle_noir_save_post(body: bytes) -> tuple[int, dict]:
    """Save a shaped noir piece."""
    payload = json.loads(body.decode("utf-8"))
    shaped = payload.get("shaped", "").strip()
    raw = payload.get("raw", "").strip()
    order_hint = payload.get("order_hint", "")
    if not shaped:
        return 400, {"error": "No shaped text provided"}
    pieces = _load_noir_pieces()
    piece = {
        "id": f"noir-{int(time.time()*1000)}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "shaped": shaped,
        "raw": raw,
        "order_hint": order_hint,
    }
    pieces.append(piece)
    _save_noir_pieces(pieces)
    return 200, {"saved": True, "id": piece["id"]}


# ---------------------------------------------------------------------------
# Request handler
# ---------------------------------------------------------------------------

API_ROUTES: dict[str, callable] = {
    "/api/tickers": handle_tickers,
    "/api/weather": handle_weather,
    "/api/health": handle_health,
    "/api/sobriety": handle_sobriety,
    "/api/selftalk": handle_selftalk,
    "/api/calendar": handle_calendar,
    "/api/emails": handle_emails,
    "/api/network": handle_network,
    "/api/achievements": handle_achievements,
    "/api/buildstatus": handle_buildstatus,
    "/api/weight": handle_weight_get,
    "/api/bots": handle_bots_get,
    "/api/weight-coach": lambda: _read_json_file(DIRECTORY / "weight-coach.json"),
    "/api/watchdog": lambda: _read_json_file(DIRECTORY / "system-watchdog.json"),
    "/api/letter": lambda: _read_json_file(DIRECTORY / "letter-brain.json"),
    "/api/cluster": lambda: _read_json_file(DIRECTORY / "cluster-brain.json"),
    "/api/book-progress": lambda: _read_json_file(DIRECTORY / "book-progress.json"),
    "/api/market-sentinel": lambda: _read_json_file(DIRECTORY / "market-sentinel.json"),
    "/api/mood": lambda: _read_json_file(DIRECTORY / "mood-tracker.json"),
    "/api/social-reporter": lambda: _read_json_file(DIRECTORY / "social-reporter.json"),
    "/api/knowledge-harvester": lambda: _read_json_file(DIRECTORY / "knowledge-harvester.json"),
    "/api/knowledge-stats": handle_knowledge_stats,
    "/api/knowledge/all": handle_knowledge_all,
    "/api/weather-brain": lambda: _read_json_file(DIRECTORY / "weather-brain.json"),
    "/api/bot-council": lambda: _read_json_file(DIRECTORY / "bot-council.json"),
    "/api/mega-brain": handle_mega_brain,
    "/api/net-chat": lambda: _read_json_file(DIRECTORY / "net-chat.json"),
    "/api/email-responder": lambda: (200, _load_email_bot_stats()),
    "/api/noir/pieces": handle_noir_pieces_get,
    "/api/mcp-status": lambda: _proxy_health("http://localhost:8100/health", "MCP Server"),
    "/api/mega/chat/history": lambda: handle_mega_chat_history(),
}


def handle_mega_chat_history() -> tuple[int, dict]:
    """Return recent chat history from memory.db."""
    import sqlite3 as _sq
    try:
        conn = _sq.connect(str(MEGA_MEMORY_DB), timeout=5)
        cur = conn.cursor()
        cur.execute(
            "SELECT role, content, ts FROM conversations ORDER BY id DESC LIMIT 20"
        )
        rows = [{"role": r, "message": c, "ts": t} for r, c, t in reversed(cur.fetchall())]
        conn.close()
        return 200, {"history": rows}
    except Exception as e:
        return 200, {"history": [], "error": str(e)}


def _proxy_health(url, name):
    """Proxy a health check to an internal service."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "mega-dashboard/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            return 200, {"status": "ok", "service": name, "data": data}
    except Exception as e:
        return 503, {"status": "error", "service": name, "error": str(e)}


class MegaDashboardHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler with CORS headers and API proxy endpoints."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)

    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _send_json(self, status: int, data):
        body = json.dumps(data, ensure_ascii=True).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._send_cors_headers()
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        """Add no-cache headers to all responses so mobile browsers get fresh CSS/JS."""
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def do_GET(self):
        # Strip query string for route matching
        path = self.path.split("?")[0].rstrip("/") or "/"

        handler = API_ROUTES.get(path)
        if handler:
            try:
                status, data = handler()
                self._send_json(status, data)
            except Exception as e:
                self._send_json(500, {"error": "Internal server error", "detail": str(e)})
            return

        # Fall through to static file serving
        super().do_GET()

    def do_POST(self):
        path = self.path.split("?")[0].rstrip("/") or "/"
        if path == "/api/mega/chat":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length) if length else b"{}"
                status, data = handle_mega_chat(body)
                self._send_json(status, data)
            except Exception as e:
                self._send_json(500, {"error": str(e)})
        elif path == "/api/mood":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length) if length else b"{}"
                payload = json.loads(body.decode("utf-8"))
                mood = int(payload.get("mood", 0))
                note = payload.get("note", "").strip()
                if mood < 1 or mood > 5:
                    self._send_json(400, {"error": "mood must be 1-5"})
                    return
                mood_file = DIRECTORY / "mood-log.json"
                try:
                    with open(mood_file) as f:
                        data = json.load(f)
                except Exception:
                    data = {"entries": []}
                today = date.today().isoformat()
                entries = data.get("entries", [])
                for e in entries:
                    if e["date"] == today:
                        e["mood"] = mood
                        e["note"] = note
                        break
                else:
                    entries.append({"date": today, "mood": mood, "note": note})
                data["entries"] = entries
                with open(mood_file, "w") as f:
                    json.dump(data, f, indent=2)

                # Also store to Weaviate DailyNote collection
                weaviate_ok = False
                try:
                    import urllib.request as _ur
                    wv_obj = {
                        "class": "DailyNote",
                        "properties": {
                            "content": f"Mood: {mood}/5" + (f" — {note}" if note else ""),
                            "category": "mood",
                            "date": today,
                        }
                    }
                    req = _ur.Request(
                        "http://localhost:8080/v1/objects",
                        data=json.dumps(wv_obj).encode(),
                        headers={"Content-Type": "application/json"},
                        method="POST",
                    )
                    with _ur.urlopen(req, timeout=5) as resp:
                        if resp.status < 300:
                            weaviate_ok = True
                except Exception as we:
                    print(f"[MOOD] Weaviate write failed: {we}")

                self._send_json(200, {"saved": True, "status": "ok", "weaviate": weaviate_ok})
            except Exception as e:
                self._send_json(500, {"error": str(e)})
        elif path == "/api/bots":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length) if length else b"{}"
                status, data = handle_bots_post(body)
                self._send_json(status, data)
            except Exception as e:
                self._send_json(500, {"error": str(e)})
        elif path == "/api/weight":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length) if length else b"{}"
                status, data = handle_weight_post(body)
                self._send_json(status, data)
            except Exception as e:
                self._send_json(500, {"error": str(e)})
        elif path == "/api/gemini/trigger":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length) if length else b"{}"
                status, data = handle_gemini_trigger(body)
                self._send_json(status, data)
            except Exception as e:
                self._send_json(500, {"error": str(e)})
        elif path == "/api/net-chat":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length) if length else b"{}"
                payload = json.loads(body.decode("utf-8"))
                msg_text = payload.get("message", "").strip()
                node_name = payload.get("node", "Pi").strip()
                if not msg_text:
                    self._send_json(400, {"error": "empty message"})
                    return
                chat_file = DIRECTORY / "net-chat.json"
                try:
                    with open(chat_file) as f:
                        chat_data = json.load(f)
                except Exception:
                    chat_data = {"messages": []}
                from datetime import datetime
                chat_data["messages"].append({
                    "node": node_name,
                    "text": msg_text,
                    "ts": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                })
                # Keep last 100 messages
                chat_data["messages"] = chat_data["messages"][-100:]
                with open(chat_file, "w") as f:
                    json.dump(chat_data, f, indent=2)
                self._send_json(200, {"status": "ok"})
            except Exception as e:
                self._send_json(500, {"error": str(e)})
        elif path == "/api/transcribe":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length) if length else b""
                status, data = handle_transcribe_post(body)
                self._send_json(status, data)
            except Exception as e:
                self._send_json(500, {"error": str(e)})
        elif path == "/api/noir/shape":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length) if length else b"{}"
                status, data = handle_noir_shape_post(body)
                self._send_json(status, data)
            except Exception as e:
                self._send_json(500, {"error": str(e)})
        elif path == "/api/noir/save":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length) if length else b"{}"
                status, data = handle_noir_save_post(body)
                self._send_json(status, data)
            except Exception as e:
                self._send_json(500, {"error": str(e)})
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def end_headers(self):
        # Add CORS to all responses (including static files)
        self._send_cors_headers()
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()

    def log_message(self, format, *args):
        print(f"[MEGA DASHBOARD] {args[0]}")


class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    """Threaded TCP server so API calls don't block static file serving."""
    allow_reuse_address = True
    daemon_threads = True


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    os.chdir(DIRECTORY)

    print(r"""
================================================================================

  ███╗   ███╗███████╗ ██████╗  █████╗
  ████╗ ████║██╔════╝██╔════╝ ██╔══██╗
  ██╔████╔██║█████╗  ██║  ███╗███████║
  ██║╚██╔╝██║██╔══╝  ██║   ██║██╔══██║
  ██║ ╚═╝ ██║███████╗╚██████╔╝██║  ██║
  ╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝
       D A S H B O A R D    v3.0

================================================================================

  SHANEBRAIN // MEGA DASHBOARD SERVER
  ────────────────────────────────────

  Port:            {port}
  Frontend:        {directory}
  API Endpoints:   /api/tickers      (RFNGX, RICAX, RGAGX, BTC, DOGE, ETH, SPY, QQQ)
                   /api/weather      (NWS - Hazel Green, AL)
                   /api/health       (Ollama, Weaviate, MCP, Gateway)
                   /api/sobriety     (Day counter since 2023-11-27)
                   /api/selftalk     (56 rotating affirmations)
                   /api/calendar     (placeholder)
                   /api/emails       (placeholder)
                   /api/network      (Tailscale node pings)
                   /api/achievements (Milestones & badges)
                   /api/buildstatus  (systemd + docker status)

  Open in browser: http://localhost:{port}

  Press Ctrl+C to stop

================================================================================
""".format(port=PORT, directory=DIRECTORY))

    with ThreadedTCPServer(("", PORT), MegaDashboardHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[MEGA DASHBOARD] Server stopped.")


if __name__ == "__main__":
    main()
