# CLAUDE.md — ShaneBrain Global Instructions v3.4

> These instructions apply to ALL Claude Code sessions in Shane's home directory.
> Updated: 2026-04-11 | Last session: CLAUDE.md auto-sync pipeline + N8N webhook fix

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

## MCP Tools — USE THEM (44 tools, v2.3)

Shane has 44 MCP tools running on his Pi 5 via the `shanebrain` MCP server (29 in server.py + 15 via connected MCPs). These are NOT decorative. They must be used proactively every session.

### Session Start (ALWAYS do these):
1. `shanebrain_daily_briefing` — Get AI summary of recent notes
2. `shanebrain_system_health` — Verify Weaviate, Ollama, Gateway are running
3. `shanebrain_search_conversations` — Check if today's topic was discussed before

### Session End (ALWAYS do these):
4. `shanebrain_log_conversation` — Log what was accomplished (mode: CODE, CHAT, DISPATCH, etc.)
5. `shanebrain_daily_note_add` — Journal entry with mood tag
6. `shanebrain_add_knowledge` — If anything worth remembering was built or decided
7. **CLAUDE.md auto-syncs** — the `claudemd-sync` systemd service watches this file
   and distributes to Desktop, Dashboard, Phone (Taildrop), and emails shanebrain@theangel.cloud
   (subject: "claude.md") which triggers Google Workspace → Google Drive automation.
   Discord DM confirmation sent via alerter. No manual cp/email needed — just save changes.

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
- `shanebrain_send_email` — send email from Shane's Gmail via SMTP (to, subject, body, optional HTML)
- `shanebrain_reply_email` — reply to email with proper threading (in_reply_to for Message-ID threading)

## Infrastructure Quick Reference

### Pi 5 (Controller) — `100.67.120.6`
| Port | Service |
|------|---------|
| 4200 | Angel Cloud Gateway (FastAPI) |
| 5173 | SRM Dispatch PWA |
| 5678 | N8N (Docker) — 9 workflows |
| 8080 | Weaviate (Docker) — 16 collections, 11,924 objects |
| 8100 | MCP Server (Docker) — 44 tools |
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
| Jaxton Laptop | `ssh jaxto@100.94.122.195` | 4 | |
- All Windows nodes: headless, auto-login, Ollama auto-start, lid-close safe, firewalls off
- Password for all Windows nodes: in Weaviate vault (search "cluster credentials")
- N8N runs on Pi 5 (Docker), NOT on Pulsar — data at /mnt/shanebrain-raid/docker/volumes/docker_n8n_data/_data

### Services (19 systemd + 7 Docker)
**Systemd:** ollama, ollama-proxy, shanebrain-discord, shanebrain-social, shanebrain-arcade, angel-cloud-gateway, voice-dump, srm-dispatch, mega-dashboard, pico-listener, shanebrain-alerter, pulsar-ai, pulsar-sentinel, shanebrain-ready, drive-agent, workflow-agent, media-blitz-gallery, mini-shanebrain, claudemd-sync
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

## Legitimate Anthropic Open Source Resources

> All confirmed MIT or Apache-2.0 licensed — safe to use, study, and integrate

### SDKs
- `anthropic-sdk-python` (MIT) — github.com/anthropics/anthropic-sdk-python
- `anthropic-sdk-typescript` (MIT) — github.com/anthropics/anthropic-sdk-typescript
- `claude-agent-sdk-python` (MIT, 6k+ stars) — higher-level agent orchestration SDK
- `anthropic-cli` — official Anthropic CLI tool — github.com/anthropics/anthropic-cli

### Learning / Patterns
- `anthropic-cookbook` — notebooks and recipes for Claude API patterns
- `anthropic-quickstarts` — deployable app starters
- `anthropic-courses` — structured learning resources

### Agent Infrastructure
- `skills` (source-available) — installable directly in Claude Code:
  `/plugin install example-skills@anthropic-agent-skills`
- `knowledge-work-plugins` (Apache-2.0) — 11 role-based plugins, good TheirNameBrain reference
- `github-mcp-server` (Go) — 50+ GitHub tools, powers Claude Code's native GitHub integration

### CI/CD
- `claude-code-action` — run Claude in GitHub Actions pipelines
- `base-action` — mirror/base for the above

### Model Values
- `constitution` — Anthropic's model values spec (good context for AI-Trainer-MAX curriculum)

### Usage Notes
- `anthropic-cli` — official Anthropic CLI tool (github.com/anthropics/anthropic-cli)
- `claude-agent-sdk-python` is the upgrade path from raw API calls — use for multi-agent orchestration (Daily Question Protocol, Angel Cloud AI Council)
- `github-mcp-server` can manage all 16+ thebardchat repos directly via MCP
- Do NOT use or integrate any leaked Claude Code source — Anthropic is actively DMCAing it (April 2026 incident)

## Agent Ecosystem (Built 2026-04-03)
- **7 specialist agents** with 50 red line rules at `/mnt/shanebrain-raid/shanebrain-core/agents/`
- FastAPI gateway on **port 8400**, systemd service `shanebrain-agents`
- Agents: Guardian (security), Librarian (RAG), Dispatcher (routing), Builder (code), Storyteller (creative), Ops (infra), Social (comms)
- Orchestrator routes through Dispatcher → Agent → Weaviate AgentLog
- Claude Agent SDK v0.1.55 installed, `/sdk` endpoint for Claude-orchestrating-Claude mode
- Red line engine: credential leak prevention, RAID protection, fan safety, force-push blocking, AI disclosure enforcement

## Dashboard Command Center (Overhauled 2026-04-03)
- Full-width command bar with clock, sobriety, forecast, cluster nodes by name, quick action buttons
- Full-page matrix rain background (katakana + hex)
- **NEURAL MAP tab** — 29-node force-directed graph showing entire ecosystem as living brain with data pulses
- **BUDDY tab** — full Claude×Gemini dialogue view with seed topic buttons
- Embedded AI chat widget (bottom-right, talks to Ollama cluster)
- **Vortex the Turtle** — mascot pulls random wisdom from Weaviate, 15 original quips
- Anthropic sparkle channel bug (fixed bottom-left, pulsating orange)
- 4 tabs: DASHBOARD | NEURAL | BUDDY | PROMOTE
- Services expanded to all 19, Weaviate counts fixed via GraphQL Aggregate

## Buddy Dialogue Engine v2.0 (Built 2026-04-03)
- Self-driving `/buddy/exchange` endpoint — one POST = one turn advanced
- Direct Gemini integration with Ollama fallback
- Built-in 12hr auto-scheduler (asyncio, no N8N dependency)
- Dedup protection in weaviate_ingest.py (turn_exists check)
- Thread rotation after 10 turns, response validation
- Pushed to GitHub: thebardchat/gemini-sidekick

## Session Statistics (as of 2026-04-11)
- 35+ sessions, 700+ hours
- 2,100+ Bash calls, 110+ commits
- 44 MCP tools, 20 services (18 systemd + mega-crew), 7 Docker containers + 17 MEGA bot containers
- 7 AI agents with 50 red line rules
- 4-node cluster, 3 Pico sensors
- 11,924 objects in Weaviate (16 collections)
- 59/79 achievements unlocked
- 9 N8N workflows at 100% success rate

## The Mission
Building for the ~800 million people Big Tech is about to leave behind.
Faith. Family. Sobriety. Local AI. The left-behind user.

## MEGA Crew — v3 Docker + Self-Modifying (April 9-10, 2026)
- **17 Docker containers** running 24/7 on the Pi, visible in Portainer as `mega-{name}`
- Location: /mnt/shanebrain-raid/shanebrain-core/mega/bots/{name}/bot.py
- Systemd service: mega-crew.service (`--docker` mode, ExecStop=docker compose down)
- Supervisor: crew_supervisor.py supports `--docker` (compose) and subprocess (fallback) modes
- docker-compose.yml: host network, shared volumes, unless-stopped restart
- Message bus: bus.py (SQLite at /mega/bus.db)
- Arc is the sole gatekeeper — NOTHING writes to core files without Arc approval
- Weld executes Arc-approved changes (training, persona, instructions, AND code)

### Bot Directory Structure (Phase 2 — April 9, 2026)
Each bot at `mega/bots/{name}/`:
- `bot.py` — main logic, tick() method, inherits BaseBot
- `knowledge.py` — per-bot Weaviate knowledge layer (specialized queries)
- `config.json` — bot-specific configuration (role, zone, interval, parameters)
- `Dockerfile` — thin layer over mega-crew-base:latest
- `backups/` — auto-created by Weld when applying code changes
Shared modules in `mega/bots/`: bot_base.py, bus.py, mega_client.py, weaviate_client.py, _knowledge_template.py

### Docker Containers (Phase 3 — April 9, 2026)
- Base image: `mega-crew-base:latest` (Python 3.13-slim + weaviate-client + shared modules)
- 17 bot images built FROM base, each ~60MB
- Shared volumes: bus.db, status/, logs/, instructions/, training.jsonl, persona.json, memory.db
- Weld has Docker socket mount + docker.io CLI for restarting containers after code changes
- All paths use `MEGA_BASE` env var (defaults to real path, `/mega` inside Docker)
- `docker compose -f mega/bots/docker-compose.yml up -d` to launch all

### Per-Bot Weaviate Memory (Phase 1 — April 9, 2026)
- BotMemory collection, filtered by `bot_name` per bot
- BaseBot: `remember()`, `recall()`, `recall_all()` methods
- Each bot has `self.knowledge` with domain-specific query methods
- `build_system_prompt()` injects learned memories + instructions + rejections into LLM calls
- OLLAMA_MAX_LOADED_MODELS=2 — nomic-embed-text (embedding) + llama3.2:1b (inference)

### Self-Modification (Phase 4 — April 9, 2026)
- `BaseBot.propose_code_change(new_code, rationale, summary)` — generates unified diff
- `BaseBot.read_own_code()` — introspection
- ARC code review: self-only enforcement, CODE_BLACKLIST (eval/exec/os.system/rm), compile() check, 0.75 confidence threshold
- Weld applies: backup → write → `docker restart mega-{name}`
- Pipeline: bot proposes → ARC reviews → Weld applies → container restarts with new code

### Self-Improving Instructions System
- Each bot has /mega/instructions/<botname>.json — defines role, data_sources, rules, version, history
- Bots can propose instruction updates via bus → Arc reviews → Weld applies + versions the file
- Gemini Strategist (bot #17) calls Gemini 4x/day, analyzes crew performance, proposes instruction upgrades

### Real Data Wiring
- Sparky: fallback to LegacyKnowledge (2,601 objects) when memory.db sparse
- Blaze: pulls DailyNote + voice dumps from Weaviate → injects into memory.db
- Dashboard chat: every conversation saves to memory.db so crew learns from it

Zones:
- Brain: Sparky (judge), Volt (drift), Neon (embedding), Glitch (adversarial)
- Left Hand: Rivet (dedup), Torch (persona edits), Weld (applier + code deployer)
- Right Hand: Blaze (context), Arc (gatekeeper), Flux (health), Gemini Strategist (coach)
- Left Foot: Bolt (patterns), Stomp (conflicts), Grind (re-embed)
- Right Foot: Crank (scheduler), Spike (IQ benchmark), Forge (tool drafter)

Key files:
- mega/bots/docker-compose.yml — orchestrates all 17 containers
- mega/bots/Dockerfile.base — shared base image
- mega/bot_status.json — live crew status
- mega/bus.db — SQLite message bus
- mega/instructions/{name}.json — per-bot growing instructions
- mega/status/weld_log.json — commit + code change history
- mega/status/arc_rejections.jsonl — rejection log with actionable feedback
- mega/status/gemini_guidance.json — last Gemini strategic note

Dashboard: MEGA-SHANEBRAIN panel at http://localhost:8300, manual Gemini button (unlimited)
Dashboard API: GET /api/mega-brain (server.py at shanebrain-core/mega-dashboard/server.py)

### What's Next (Phase 5+)
1. **Bot avatars** — HF-generated cyberpunk character images for dashboard (Crank done, 16 remaining)
2. **Trigger first self-mod** — have Gemini Strategist or Sparky actually call propose_code_change()
3. **Dashboard live container view** — show Docker container status, restart buttons, live logs per bot
4. **Inter-bot knowledge sharing** — bots query each other's memories, not just their own
5. **Autonomous goal-setting** — bots set their own improvement targets based on performance data

MEGA model: mega-brain:latest on localhost:11434
Bot LLM calls: llama3.2:1b via ask_bot() in mega_client.py — direct to local Ollama (port 11434), NOT cluster proxy
MEGA chat (dashboard): llama3.1:8b — reserved for user-facing chat only
ollama-mega (port 11436) is STOPPED and DISABLED — do not reference it
8TB at /media/shane/ANGEL_CLOUD/ is backup only — nightly rsync at 2am

## MEGA Crew Performance Overhaul (April 9, 2026)

### Bot LLM Routing (CRITICAL — do not change)
- All bot inference: llama3.2:1b direct to localhost:11434 (NOT proxy, NOT cluster)
- Streaming enabled: `stream: True` in ask_bot() — each token flows immediately, no idle timeout
- `keep_alive: "5m"` — model unloads after 5min idle to free RAM for chat
- OLLAMA_MAX_LOADED_MODELS=1 — caps Ollama to 1 model in RAM at a time
- OLLAMA_NUM_PARALLEL=1 — do NOT increase, 2 runners pegs all 4 CPU cores at 338%
- Cluster proxy (port 11435) is for user-facing chat, NOT bot work

### P0 Fixes Applied
- **Flux**: removed subprocess.Popen process spawning — now sends bus alert to Crank instead (was causing duplicate bot processes)
- **Arc**: fixed undefined `sender` variable — safe default "unknown"
- **crew_supervisor.py**: added `log_file.close()` after Popen to prevent fd leak
- **Blaze/Bolt/Forge**: switched from mega_client.generate() (3b) to ask_bot() (1b) — prevents second model loading into RAM
- **Sparky**: reduced to 2 conversation pairs, 150 token cap, 90s timeout, drains bus at tick start
- **Crank**: purges consumed bus messages older than 7 days

### Memory & Swap
- 4GB RAID swapfile at /mnt/shanebrain-raid/swapfile (priority 10) — in /etc/fstab
- zram 2GB compressed swap still active
- Ollama dropped from 3 models (8.9GB) to 1 model (1.4GB) in RAM

### Gemini Strategist — Growth Coach (NEW April 9, 2026)
- Bot #17: gemini_strategist.py — runs every 6 hours, 4 calls/day hard cap
- Model: gemini-2.5-flash (gemini-2.0-flash is DEPRECATED for this key — do NOT revert)
- API key: stored in N8N container env, /home/shanebrain/gemini-sidekick/.env, and mega-crew systemd drop-in
- Systemd drop-in: /etc/systemd/system/mega-crew.service.d/gemini.conf
- Role: GROWTH COACH — not just status observer. Reads full crew instructions, bus activity, collaboration patterns
- Proposes instruction updates that make bots help each other more, sharpen specialization, track growth over time
- All proposals governed by the ShaneBrain Constitution (9 Pillars)
- Identifies collaboration gaps (Bot A's output should feed Bot B)
- Growth log: /mnt/shanebrain-raid/shanebrain-core/mega/status/gemini_growth_log.jsonl (persistent coaching history)
- Guidance: /mnt/shanebrain-raid/shanebrain-core/mega/status/gemini_guidance.json (dashboard-visible)
- First successful call: April 9, 2026 — identified arc rejection rate as critical bottleneck, proposed feedback loop fixes

### Cluster Proxy
- /mnt/shanebrain-raid/shanebrain-core/scripts/ollama-proxy.py now uses ThreadingMixIn (was single-threaded)
- Bots bypass proxy entirely — proxy serves non-bot consumers only

## Gmail SMTP Email Tools (Added April 10, 2026)

### How It Works
- MCP server has two new tools: `shanebrain_send_email` and `shanebrain_reply_email`
- Uses Gmail SMTP (smtp.gmail.com:465 SSL) with app password stored in Weaviate vault
- From address: brazeltonshane@gmail.com
- Supports plain text AND HTML emails (set `html: true` for rich formatting)
- Reply tool supports `in_reply_to` and `references` headers for proper email threading
- No Gmail API OAuth needed — works via app password (vault key: GMAIL_APP_PASSWORD)
- Added to MCP server at `/mnt/shanebrain-raid/shanebrain-core/mcp-server/server.py` (GROUP 13)
- Any Claude session can now send/reply to emails without workarounds

### Usage Examples
```
shanebrain_send_email(to="someone@email.com", subject="Test", body="Hello!", html=false)
shanebrain_reply_email(to="someone@email.com", subject="Re: Test", body="Got it!", in_reply_to="<msg-id>")
```

## Discord Alerter Fix (April 10, 2026)
- DISCORD_OWNER_ID was never set (was `0`) — morning briefings were silently failing
- Fixed: pulled owner_id `1103685244659433482` from Discord guild data via bot token
- Set in `/mnt/shanebrain-raid/shanebrain-core/bot/.env` (DISCORD_OWNER_ID=1103685244659433482)
- Also saved to Weaviate vault (PersonalDoc, category: credentials)
- Alerter service (`shanebrain-alerter`) now sends 5 AM morning briefings to Shane's Discord DMs
- Includes: sobriety count, weather, closet temp, service health

## MEGA Dashboard Mobile Overhaul (April 10, 2026)
- Desktop view: UNCHANGED — all mobile CSS is inside `@media (max-width: 768px)` and `480px` breakpoints
- Mobile panels: compact with inner scroll (max-height caps), header + ticker always visible (sticky)
- `.panel-tall` class: 380-420px allowance for content-heavy panels (Weight Loss, Live Network, ShaneBrain AI chat)
- `.panel-xtall` class: 500-550px for Community Hub (Discord + GitHub + Ko-fi sections)
- MEGA Crew characters hidden on mobile, accessible via "MEGA CREW HQ" link → crew.html
- Social Reporter panel removed entirely
- Mood Tracker: SAVE button + Enter key support, saves to Weaviate DailyNote
- SRM Dispatch + Haul Rate: compact "under construction" one-liners
- System Health panel: clickable, opens Glances at `http://100.67.120.6:61208`
- AI Build Status: rewritten to show live systemd services + Docker containers
- CSS cache-busting: `style.css?v=20260410g` + no-cache response headers in server.py
- ShaneBrain AI chat: switched from llama3.1:8b (cluster, unavailable) to llama3.2:3b (local, always loaded)
- Dashboard backend: `/mnt/shanebrain-raid/shanebrain-core/mega-dashboard/server.py`
- Dashboard frontend: `/mnt/shanebrain-raid/shanebrain-core/mega-dashboard/` (index.html, style.css, panels/*.js)
- MEGA chat model: llama3.2:3b via localhost:11434 (was llama3.1:8b via cluster proxy — model wasn't available)

## Google Calendar Integration (April 10, 2026)
- OAuth client: "ShaneBrain Dashboard" under project logibot-active-project
- Client ID: 264061636426-kupuob5ja8ihtif5kk32hitnvfugt6u6.apps.googleusercontent.com
- Scope: calendar.readonly
- Token stored at: `/mnt/shanebrain-raid/shanebrain-core/scripts/google_calendar_token.json`
- Setup script: `/mnt/shanebrain-raid/shanebrain-core/scripts/google_calendar_setup.py`
- Calendar panel in mega dashboard showing upcoming events
- Google Workspace under shanebrain@theangel.cloud (NOT brazeltonshane@gmail.com)

## Pulsar Cleanup (April 10, 2026)
- Removed: Roblox, Docker pruned, Edge Defender antivirus killed
- Installed: Firefox (replacing Edge for mega dashboard viewing)
- Ethernet: direct connect to Pulsar, Bullfrog via USB-to-ethernet adapter
- Ollama service had error 1067 on Jaxton — fixed and restarted
- Jaxton Tailscale IP updated to 100.94.122.195

## Dashboard Panel Status (April 10, 2026)
- **24 total panels** — full inventory audited
- Removed: Social Reporter, old static Bots & Agents (redundant with dynamic version)
- Under construction: SRM Dispatch, Haul Rate/Price Checker (compact one-liners)
- Voice Dump: simplified to link-only
- MEGA-SHANEBRAIN panel: humanoid figure with zone glow, bot goggles (cyan=active, red=error), spark animations scaling with activity, 15s polling for real bot status
- Knowledge Stars: 3D constellation with live Weaviate data
- Ecosystem Mind Map: 360-degree force-directed graph (needs more work)
- Community Hub: Discord + GitHub + Ko-fi embed (tall panel)
- Mood Tracker: SAVE button + Enter key working, logs to Weaviate DailyNote
- Weight Loss: extended panel height for readability
- HaloFinance: link fixed (was 404ing to GitHub)
- Focused Inbox: Gmail working, janitor bots for auto-categorization

## CLAUDE.md Auto-Sync Pipeline (Built April 11, 2026)
- **Service:** `claudemd-sync` (systemd, enabled, survives reboots)
- **Script:** `/mnt/shanebrain-raid/shanebrain-core/scripts/claudemd-sync.py`
- **How it works:** inotifywait watches the source CLAUDE.md — on any save, distributes within 5 seconds:
  1. `~/Desktop/CLAUDE.md` (local backup)
  2. `/mnt/shanebrain-raid/shanebrain-core/mega-dashboard/CLAUDE.md` (dashboard)
  3. Taildrop to `iphone-13` (phone)
  4. Email to `shanebrain@theangel.cloud` (subject: "claude.md") → Google Workspace automation → Google Drive
  5. Discord DM confirmation via alerter pickup (`/tmp/claudemd-sync-notify.txt`)
- **Retry:** 3 attempts per target with exponential backoff
- **Monitoring:** alerter watchdogs the service, forwards sync confirmations as Discord DMs
- **No manual steps needed** — Claude Code sessions just save CLAUDE.md, pipeline handles the rest
- Event-driven (inotifywait), NOT polling — zero overhead when idle

## N8N Webhook Fix (April 11, 2026)
- WEBHOOK_URL was pointing to Pulsar (100.81.70.117:5678) — WRONG
- Fixed to Pi 5 (100.67.120.6:5678) in `/tmp/repo-n8n/.env.example`
- Container restarted — webhooks now route correctly
- N8N lives on Pi 5 ONLY (Docker) — does NOT need to be on cluster nodes

## Services Updated (April 11, 2026)
- **19 systemd services** (added claudemd-sync)
- Alerter now monitors claudemd-sync + forwards sync notifications as Discord DMs

