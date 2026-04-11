# CLAUDE.md — Mega Dashboard

> Project-specific instructions for the ShaneBrain Mega Dashboard.
> Updated: 2026-04-11

## What This Is

A full-screen cyberpunk command center running on Raspberry Pi 5 at `http://100.67.120.6:8300`. It's Shane's personal mission control — sobriety tracker, weather, stock tickers, email, calendar, health monitoring, 4-node Ollama cluster status, AI bot council, book progress, and more. 24+ live panels, all auto-refreshing.

## Architecture

```
server.py (Python 3.13, stdlib only, port 8300)
├── index.html          — single-page dashboard, all panels
├── style.css           — cyberpunk theme, mobile responsive, crew animations
├── crew.html           — standalone crew character showcase page
├── crew-art/*.png      — 6 DreamWorks-quality character renders (Arc, Weld, Sentinel, Scribe, Pulse, Echo)
├── panels/             — modular JS files loaded by init.js
│   ├── init.js         — DOMContentLoaded bootstrap, all setInterval timers
│   ├── shared.js       — CONFIG object, utility functions
│   ├── brain-panels.js — MEGA-SHANEBRAIN, weather-brain, market sentinel, mood tracker, knowledge harvester
│   └── (27 more panel modules)
└── brains/             — Python microservices + systemd units (10 brains)
    ├── *-brain.py      — each brain: FastAPI or script, talks to Ollama + Weaviate
    └── *-brain.service — systemd units
```

## Running It

```bash
# The dashboard runs as a systemd service
sudo systemctl restart mega-dashboard

# Or manually
cd /mnt/shanebrain-raid/shanebrain-core/mega-dashboard
python3 server.py
# → http://localhost:8300
```

## Key Design Decisions

- **No pip dependencies for server.py** — stdlib only (http.server, urllib, json, subprocess, threading). This keeps the dashboard bootable with zero install steps on the Pi.
- **Panels are modular JS** — each `panels/*.js` file owns one concern. `init.js` bootstraps them all.
- **Brains are independent Python services** — each brain has its own systemd unit. They expose HTTP endpoints that `server.py` proxies to the frontend.
- **No build step** — raw HTML/CSS/JS served directly. No webpack, no bundler, no npm.
- **Mobile responsive** — breakpoints at 768px and 480px. Used daily on iPhone.

## MEGA Crew Characters

6 AI crew members rendered as PNG art in `crew-art/`:

| Character | Role | Glow Color | Panel |
|-----------|------|-----------|-------|
| **Arc** | Shield / Infrastructure | `#00e5ff` | Cluster |
| **Weld** | Builder / CI-CD | `#76ff03` | Build Status |
| **Sentinel** | Watchdog / Security | `#b388ff` | Watchdog |
| **Scribe** | Knowledge / Docs | `#ffd740` | Knowledge |
| **Pulse** | Health / Weather | `#ff4081` | Weather |
| **Echo** | Comms / Network | `#82b1ff` | Network |

Characters appear as:
- **Panel header avatars** (40px, circular, breathing animation, status dot)
- **Crew lineup bar** (80px, bobbing at staggered speeds per character)
- CSS classes: `.crew-avatar`, `.crew-lineup-char`, `.crew-avatar-wrap`, `.crew-status-dot`
- Animations: `crew-breathe` (3s scale pulse), `crew-bob` (per-character `--bob-duration`)

Previously these were Canvas-drawn geometric shapes in `panels/mega-crew.js`. That file is kept but no longer called from `init.js`.

## Brains (10 active)

| Brain | Purpose |
|-------|---------|
| book-progress | Tracks audiobook chapter progress |
| cluster | 4-node Ollama cluster health |
| knowledge-harvester | Auto-ingests voice dumps + docs to Weaviate |
| letter | Daily AI-generated letter |
| market-sentinel | Stock/crypto sentiment analysis |
| mood-tracker | Mood logging + trends |
| social-reporter | Social media activity digest |
| system-watchdog | Service health + disk + Docker monitoring |
| weather | NWS weather with AI commentary |
| weight-coach | Weight loss tracking + coaching |

## API Endpoints (server.py)

All prefixed with `/api/`:
- `/api/tickers` — stock + crypto prices (Yahoo Finance)
- `/api/weather` — NWS forecast
- `/api/health` — system health (Ollama, Weaviate, MCP, Docker, disk)
- `/api/sobriety` — days sober since 2023-11-27
- `/api/network` — Tailscale node status + ping
- `/api/build` — GitHub Actions build status
- `/api/calendar` — Google Calendar events (via MCP)
- `/api/emails` — Gmail inbox (via MCP)
- `/api/bots` — bot council status
- `/api/cluster` — Ollama cluster node status
- `/api/mega-brain` — MEGA-SHANEBRAIN AI panel
- `/api/weight` — weight tracking data
- `/api/book-progress` — audiobook chapter status
- `/api/watchdog` — system watchdog report
- `/api/market-sentinel` — market analysis
- `/api/mood` — mood tracker
- `/api/knowledge-harvester` — knowledge ingestion stats
- `/api/weather-brain` — AI weather commentary
- `/api/voice-dumps` — voice transcription stats

## Tailscale Cluster Nodes

```
Pi/shanebrain   100.67.120.6    (controller)
Pulsar           100.81.70.117   (fastest, priority 1)
Bullfrog         100.87.222.17
Laptop           100.94.122.125
```

## Style Guide

- Cyberpunk aesthetic: dark background (#080812), neon accents, matrix rain
- Panel borders: subtle glow, rounded corners
- Fonts: monospace throughout
- Colors: cyan (#00e5ff), green (#76ff03), purple (#b388ff), amber (#ffd740)
- Animations should be subtle — breathing, bobbing, pulsing. Nothing jarring.

## What NOT to Do

- Don't add npm, webpack, or any build tooling
- Don't add pip dependencies to server.py
- Don't modify crew.html — it's the source of truth for character art
- Don't remove mega-crew.js — it's kept as fallback
- Don't break mobile responsiveness
- Don't hardcode secrets — credentials come from Weaviate vault

## GitHub

Repo: [thebardchat/mega-dashboard](https://github.com/thebardchat/mega-dashboard)
The live version runs from `/mnt/shanebrain-raid/shanebrain-core/mega-dashboard/` on the Pi.
