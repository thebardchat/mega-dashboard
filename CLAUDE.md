# CLAUDE.md — ShaneBrain Global Instructions v3.2

> These instructions apply to ALL Claude Code sessions in Shane's home directory.
> Updated: 2026-04-01 | Last session: massive 3-day build sprint

## How Shane Works — READ THIS FIRST

Shane is a high-autonomy orchestrator who delegates massive, multi-project workloads with minimal upfront specification, steering through real-time corrections rather than detailed planning. He says "do them all" and means it. He wants Claude to DO the work, not explain how to do it. 1,802 Bash calls and 100 commits prove this.

**What this means for you (Claude):**
- When Shane gives a broad directive, execute systematically across all targets
- Don't ask permission for every step — he gave permission. Just do it.
- Check what's already configured BEFORE assuming fresh setup is needed
- Let's focus on one thing at a time. Don't suggest other improvements until the current goal is fully verified working.
- Before applying changes to all files, show the result on one file first so Shane can verify the approach
- Before starting any session, run a quick diagnostic: `tailscale status`, `ls ~/.ssh/`, `git remote -v`, running services
- Shane will correct course in real-time — that's his style, not a failure
- Marathon sessions spanning 5-10 goals are normal — stay organized
- Shane rates Claude as essential but regularly cleans up after missteps — minimize those

**What Shane builds:** Noir audiobooks, home AI infrastructure (4 machines), financial tools, social bots, MCP tools, Roblox games, dispatch systems, security frameworks, training curricula — often 3-4 unrelated projects per session.

**What NOT to do:**
- Don't overwrite his creative voice or prose style
- Don't give circular advice
- Don't rediscover environment details every session (that's what this file is for)
- Don't pick approaches that fail before pivoting — check constraints first

## MCP Tools — USE THEM (42 tools, v2.2)

Shane has 42 MCP tools running on his Pi 5 via the `shanebrain` MCP server. These are NOT decorative. They must be used proactively every session.

### Session Start (ALWAYS do these):
1. `shanebrain_daily_briefing` — Get AI summary of recent notes
2. `shanebrain_system_health` — Verify Weaviate, Ollama, Gateway are running
3. `shanebrain_search_conversations` — Check if today's topic was discussed before

### Session End (ALWAYS do these):
4. `shanebrain_log_conversation` — Log what was accomplished (mode: CODE, CHAT, DISPATCH, etc.)
5. `shanebrain_daily_note_add` — Journal entry with mood tag
6. `shanebrain_add_knowledge` — If anything worth remembering was built or decided
7. **Save CLAUDE.md to Desktop, Dashboard, and Taildrop to phone** — always preserve state

### During Sessions (use contextually):
- `shanebrain_vault_search` / `vault_add` / `vault_list_categories` — credentials and personal docs
- `shanebrain_search_knowledge` — prior decisions, context, technical history
- `shanebrain_draft_create` / `draft_search` — write emails, posts, messages
- `shanebrain_plan_write` / `plan_read` / `plan_list` — multi-session project planning
- `shanebrain_search_friends` / `get_top_friends` — people Shane knows
- `shanebrain_security_log_recent` / `security_log_search` / `privacy_audit_search` — security events
- `shanebrain_chat` — Full RAG chat through local Ollama (100% local)
- `shanebrain_ollama_generate` / `ollama_list_models` — direct LLM inference
- `shanebrain_rag_list_classes` / `rag_delete` — Weaviate admin
- `shanebrain_search_conversations` / `get_conversation_history` / `log_conversation` — session history
- `shanebrain_daily_note_search` — search journal entries
- `shanebrain_weather` — Hazel Green weather + 3-day forecast
- `shanebrain_reminder_add` / `reminder_check` — timed reminders with priority
- `shanebrain_audiobook_status` — recorded vs unrecorded book chapters
- `shanebrain_service_restart` — restart allowlisted systemd services
- `shanebrain_backup_status` — restic + weaviate backup health
- `shanebrain_disk_usage` — RAID/SD/external drive usage with alerts
- `shanebrain_github_stats` — star counts and Starstruck progress
- `shanebrain_led_control` — Pironman 5 RGB LEDs
- `shanebrain_voice_dumps_list` — recent voice recordings and transcripts
- `shanebrain_cron_list` — all cron jobs and systemd timers
- `shanebrain_sobriety_days` — days sober since 11/27/2023
- `shanebrain_quick_note` — ultra-fast note, zero friction
- `shanebrain_docker_status` — running containers with health
- `shanebrain_knowledge_stats` — RAG breakdown by category and source
- `shanebrain_n8n_command` — send commands to N8N workflows

## Infrastructure Quick Reference

### Pi 5 (Controller) — `100.67.120.6`
| Port | Service |
|------|---------|
| 4200 | Angel Cloud Gateway (FastAPI) |
| 5173 | SRM Dispatch PWA |
| 5678 | N8N (Docker) — 9 workflows |
| 8080 | Weaviate (Docker) — 18 collections, 1,042 objects |
| 8100 | MCP Server (Docker) — 42 tools |
| 8200 | Voice Dump Pipeline (Whisper) |
| 8250 | Pulsar Sentinel (PQC security) |
| 8300 | Mega Dashboard (stocks, news, sports, achievements, CEO ticker) |
| 11434 | Ollama (local) |
| 11435 | Ollama Cluster Proxy — routes to fastest of 4 nodes |

### 4-Node Cluster SSH
| Node | SSH | Priority | Notes |
|------|-----|----------|-------|
| Pulsar00100 | `ssh hubby@100.81.70.117` | 1 (fastest) | Has llama3.1:8b |
| Pi 5 (local) | localhost | 2 (controller) | Runs everything |
| Bullfrog-R2D2 | `ssh shane@100.87.222.17` | 3 | Has codellama |
| Jaxton Laptop | `ssh jaxto@100.94.122.125` | 4 | |
- All Windows nodes: headless, auto-login, Ollama auto-start, lid-close safe, firewalls off
- Password for all Windows nodes: in Weaviate vault (search "cluster credentials")
- Docker Desktop on Pulsar needs to be running for N8N (added to startup)

### Services (18 systemd + 7 Docker)
**Systemd:** ollama, ollama-proxy, shanebrain-discord, shanebrain-social, shanebrain-arcade, angel-cloud-gateway, voice-dump, srm-dispatch, mega-dashboard, pico-listener, shanebrain-alerter, pulsar-ai, pulsar-sentinel, shanebrain-ready, drive-agent, workflow-agent, media-blitz-gallery, mini-shanebrain
**Docker:** shanebrain-mcp, shanebrain-weaviate, open-webui, portainer, docker-n8n-1, docker-redis-1, docker-postgres-1
**Cron:** restic backup (3AM), weaviate backup (3:15AM), auto-ingest (4AM)
**Timer:** github-poller (every 15 min)

### Pico 2 Sensor Network
- Pi 5: pico2-closet (USB serial → pico-listener service)
- Pulsar: pico2-pulsar (COM5)
- Jaxton: pico2-jaxton (COM3)
- Bullfrog: needs data cable (power-only cables don't work)

### Pulsar AI Bouncer
- Runs 24/7, scans every 30 seconds
- Learning brain at `/mnt/shanebrain-raid/shanebrain-core/pulsar-ai/knowledge/`
- Spawns worker bots based on patterns
- Only overrides Pironman LEDs on RED threats (fans stay under pironman5 control)

### Achievements System
- 59 unlocked / 78 total at `/mnt/shanebrain-raid/mega-dashboard/achievements.json`
- Scrolls in dashboard tickers
- Add new achievements as Shane accomplishes things

### Mega Dashboard Ticker System
- Location: `/mnt/shanebrain-raid/mega-dashboard/index.html`
- Backend: `/mnt/shanebrain-raid/mega-dashboard/dashboard.py`
- Service: `mega-dashboard` (systemd, port 8300)
- **Two fixed-position tickers at bottom of screen:**
  - Top bar: Sports ticker (NFL/NBA/MLB scores, live games) — `#sportsTicker`
  - Bottom bar: Stocks/crypto/news ticker — `#ticker`
- Both tickers pull random quotes from the `shanequotes` JS array (line ~404 in index.html)
- Scroll engine: `startScroll()` using requestAnimationFrame, infinite seamless loop
- Stocks/news ticker also shows: sobriety day count, weather, crypto (BTC/ETH/SOL), tech stocks, cluster status, knowledge count, N8N rate, breaking news, tech news, AI news
- Sports ticker also shows random achievements from `achData`
- **Jeff Hollingshead (SRM CEO) quotes in ticker (added 2026-04-02):**
  - "Stay pedal to the metal, take every order" — Jeff Hollingshead, CEO
  - "Remain obsessed with best-in-class service — it starts with each and every one of us" — Jeff Hollingshead
  - SRM: Official Great Place to Work — 86% team rating
  - Q1 2026: Sales up ~20%, exceeded 15% goal
- To add new quotes: append strings to the `shanequotes` array in index.html, restart `mega-dashboard`

## General Workflow Rules
- Before setting up repos, SSH keys, or services, check what's already configured on the current machine. Run `ls ~/.ssh/`, `git remote -v`, `tailscale status`, etc. before assuming fresh setup is needed.

## Networking / Deployment
- When working with Tailscale Funnel, remember it strips URL path prefixes. Always use hardcoded base paths rather than server-side form action prefixing for routing.

## Git
- For git conflicts, always verify --theirs vs --ours semantics before applying. State which version you're keeping and why before running the command.

## Raspberry Pi Environment
- This user runs services on Raspberry Pi. Be aware: Python 3.13 removed the `cgi` module, Piper TTS needs careful noise_scale tuning to avoid clipping, and aplay conflicts with PipeWire. Prefer `pw-play` or `paplay` for audio playback.

## Creative Writing
- Never overwrite or rewrite the user's creative voice, prose style, or intentional structural choices (e.g., missing notes, dialogue rhythm). Ask before making stylistic changes to creative writing files.

## Rules
- Shane prefers CMD over PowerShell on Windows machines
- Always check AI-generated images for gibberish text before committing
- Shape Shane's voice dumps, don't reimagine them; stay tight to his words
- Temperatures in Fahrenheit always (CPU safe up to 176°F)
- Always save state at end of session (CLAUDE.md to Desktop + Dashboard + Taildrop)
- N8N is on the Pi (Docker), NOT on Pulsar — access at localhost:5678
- Docker containers inside Pi need 172.17.0.1 to reach Pi services (not localhost or host.docker.internal)
- Pironman5 service controls fans — NEVER disable it for LED control

## Book
- "You Probably Think This Book Is About You" — noir vignettes
- Amazon: https://www.amazon.com/Probably-Think-This-Book-About/dp/B0GT25R5FD
- 55 promo images at `/mnt/shanebrain-raid/mega-dashboard/promo-images/`
- Shape Shane's voice dumps, don't reimagine them; stay tight to his words

## Key Projects Built
- **TheirNameBrain** — Legacy AI prototype at `angel-cloud/theirnamebrain.py`
- **Drive Agent** — 8TB + Google Drive scanner at `pulsar-ai/drive-agent.py`
- **Workflow Agent** — Self-building N8N automation at `pulsar-ai/workflow-agent.py`
- **Messenger Storyteller** — Facebook Messenger bot at `angel-cloud/messenger.py`
- **AI-Trainer-MAX** — 36-module curriculum for the 800M

## Automation & CI/CD

### Hooks (settings.json)
Python files auto-syntax-check on edit:
```json
{
  "hooks": {
    "postToolUse": [
      {
        "matcher": "Edit|Write",
        "command": "bash -c 'FILE=\"$CLAUDE_FILE\"; [[ \"$FILE\" == *.py ]] && python -m py_compile \"$FILE\" 2>&1 || true'"
      }
    ]
  }
}
```

### Non-Interactive Runs
Run Claude from scripts/cron:
```bash
claude -p "Review all Python files in src/ for import errors and fix them" --allowedTools "Edit,Read,Bash,Grep" --output-format json > fixes.json
```

### Multi-Repo Health Pipeline
Use sub-agents to fan out across all repos in parallel:
- Check for security vulnerabilities (pip-audit / npm audit)
- Verify README matches actual project structure
- Run existing tests and report failures
- Check for hardcoded secrets or stale API keys
- Create fix branches with corrections, show diff before pushing

### Self-Healing Infrastructure
The Bouncer does basic monitoring. For deeper self-healing:
- SSH into each node, verify key services
- Verify Tailscale Funnel is publicly accessible
- Check disk space, memory, CPU temp on each node
- Auto-restart crashed services
- Discord webhook notification if intervention needed
- Runs as systemd service every 5 minutes + manual trigger

### Audiobook Production Pipeline (ACX Specs)
Test-driven pipeline for publish-ready audio:
- pytest validates: 44.1kHz sample rate, RMS -23dB to -18dB, peak below -3dB, 16-bit depth, proper silence
- ffmpeg compand/loudnorm auto-adjusts until all tests pass
- Manifest validator ensures all tracks in SUMMARY.md have audio files
- QC report showing pass/fail per track with exact measurements

## Session Statistics (as of 2026-04-01)
- 32+ sessions, 673+ hours
- 1,802 Bash calls, 100 commits
- 42 MCP tools, 18 services, 7 Docker containers
- 4-node cluster, 3 Pico sensors
- 1,042 knowledge objects in Weaviate
- 59/79 achievements unlocked
- 9 N8N workflows at 100% success rate

## The Mission
Building for the ~800 million people Big Tech is about to leave behind.
Faith. Family. Sobriety. Local AI. The left-behind user.
