/* mega-intelligence.js — MEGA-SHANEBRAIN Intelligence panel — bot roster, zones, Gemini */
// =============================================================================
// MEGA-SHANEBRAIN INTELLIGENCE PANEL — Self-improving bot crew dashboard
// Polls /api/mega-brain every 30s
// =============================================================================

let _megaBrainData = null;

async function loadMegaBrain() {
    try {
        const res = await fetch(`${CONFIG.apiBase}/api/mega-brain`);
        _megaBrainData = await res.json();
        renderMegaBrain(_megaBrainData);
    } catch (e) {
        console.error('MegaBrain load failed:', e);
    }
}

function renderMegaBrain(d) {
    if (!d || d.status !== 'ok') return;

    // IQ
    const iqTrend = d.mega_iq_trend || 'stable';
    const trendColor = iqTrend === 'improving' ? '#0f0' : iqTrend === 'declining' ? '#f44' : '#ff7700';
    const trendArrow = iqTrend === 'improving' ? '▲' : iqTrend === 'declining' ? '▼' : '→';
    setText('mb-iq', d.mega_iq || '--');
    setHtml('mb-iq-trend', `<span style="color:${trendColor}">${trendArrow} ${iqTrend}</span>`);

    // Corpus stats
    setText('mb-training', d.training_count ?? '--');
    setText('mb-memory', d.memory_count ?? '--');
    setHtml('mb-approved', `<span style="color:#0f0">${d.arc_approved_today||0}</span>/<span style="color:#f44">${d.arc_rejected_today||0}</span>`);

    // Gemini budget bar
    const budget = d.gemini_budget || {};
    const callsToday = budget.calls_today || 0;
    const pct = Math.round((callsToday / 4) * 100);
    const budgetBar = document.getElementById('mb-gemini-bar');
    if (budgetBar) {
        budgetBar.style.width = pct + '%';
        budgetBar.style.background = pct >= 75 ? '#f44' : pct >= 50 ? '#ff7700' : '#0f0';
    }
    setText('mb-gemini-calls', `auto: ${callsToday}/4 today`);

    // Manual budget (separate)
    const manualBudget = d.gemini_manual_budget || {};
    const manualCalls = manualBudget.calls_today || 0;
    const manualEl = document.getElementById('mb-gemini-manual');
    if (manualEl) manualEl.textContent = `manual: ${manualCalls}/4`;

    // Gemini guidance
    const guidance = d.gemini_guidance || d.gemini_budget || {};
    if (guidance.overall_assessment) {
        setText('mb-gemini-text', guidance.overall_assessment);
        setText('mb-gemini-focus', guidance.priority_focus ? `→ ${guidance.priority_focus}` : '');
    }

    // Zone activity bars
    const zones = d.zone_activity || {};
    const maxZone = Math.max(1, ...Object.values(zones));
    ['brain','leftHand','rightHand','leftFoot','rightFoot'].forEach(z => {
        const count = zones[z] || 0;
        const pct = Math.round((count / maxZone) * 100);
        const bar = document.getElementById(`zone-bar-${z}`);
        const lbl = document.getElementById(`zone-pct-${z}`);
        if (bar) bar.style.width = Math.max(4, pct) + '%';
        if (lbl) lbl.textContent = count;
    });

    // Bot roster
    renderBotRoster(d.bots || []);

    // Weld commit log
    renderWeldLog(d.weld_log || []);
}

// ── MEGA Crew character mapping ──

function _crewCharacterForBot(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('arc')) return 'arc';
    if (n.includes('weld')) return 'weld';
    if (n.includes('sentinel') || n.includes('watchdog') || n.includes('alerter')) return 'sentinel';
    if (n.includes('scribe') || n.includes('log')) return 'scribe';
    if (n.includes('health') || n.includes('pulse') || n.includes('monitor')) return 'pulse';
    if (n.includes('echo') || n.includes('messeng') || n.includes('discord')) return 'echo';
    return 'weld';
}

function _crewStatusForBot(status) {
    const s = (status || '').toLowerCase();
    if (s === 'running' || s === 'active' || s === 'online') return 'active';
    if (s === 'idle' || s === 'waiting') return 'sleeping';
    if (s === 'working' || s === 'processing') return 'busy';
    return 'sleeping';
}

let _crewCanvasCounter = 0;

function renderBotRoster(bots) {
    const el = document.getElementById('mb-bot-roster');
    if (!el) return;
    if (!bots.length) { el.innerHTML = '<div class="mb-roster-empty">No bot data yet</div>'; return; }

    _crewCanvasCounter++;
    const batch = _crewCanvasCounter;

    el.innerHTML = bots.map((b, i) => {
        const active = b.status === 'ACTIVE';
        const dotColor = active ? '#0f0' : '#f44';
        const action = (b.last_action || '').slice(0, 45);
        const ver = b.instruction_version || 1;
        const canvasId = `crew-cv-${batch}-${i}`;
        return `<div class="mb-bot-row">
            <canvas class="mb-bot-crew-canvas" id="${canvasId}" width="40" height="55"></canvas>
            <span class="mb-bot-dot" style="color:${dotColor}">●</span>
            <span class="mb-bot-name">${b.name || '?'}</span>
            <span class="mb-bot-ver" title="Instruction version">v${ver}</span>
            <span class="mb-bot-action">${escapeHtml(action)}</span>
        </div>`;
    }).join('');

    // Draw MEGA Crew characters after DOM update
    if (typeof MegaCrew !== 'undefined') {
        requestAnimationFrame(() => {
            bots.forEach((b, i) => {
                const canvasId = `crew-cv-${batch}-${i}`;
                const charId = _crewCharacterForBot(b.name);
                const charStatus = _crewStatusForBot(b.status);
                MegaCrew.drawWithStatus(canvasId, charId, charStatus, { width: 40, height: 55, scale: 0.5 });
            });
        });
    }
}

function renderWeldLog(entries) {
    const el = document.getElementById('mb-weld-log');
    if (!el) return;
    if (!entries.length) { el.innerHTML = '<div class="weld-log-empty">No commits yet</div>'; return; }
    el.innerHTML = entries.slice().reverse().map(e => {
        const ts = (e.ts || '').slice(11, 16);
        const type = e.change_type || '?';
        const target = e.target || '?';
        const conf = e.arc_confidence ? ` (${Math.round(e.arc_confidence * 100)}%)` : '';
        const typeColor = type === 'instruction_update_proposal' ? '#00ffff' : type === 'training_batch' ? '#0f0' : '#ff7700';
        return `<div class="weld-log-row">
            <span class="weld-ts">${ts}</span>
            <span class="weld-type" style="color:${typeColor}">${type.replace('_proposal','').replace('_',' ').toUpperCase()}</span>
            <span class="weld-target">${target}</span>
            <span class="weld-conf">${conf}</span>
        </div>`;
    }).join('');
}

// ── Gemini Manual Trigger ────────────────────────────────────────────────────

async function triggerGeminiManual() {
    const btn = document.getElementById('gemini-trigger-btn');
    if (!btn) return;
    btn.textContent = 'ANALYZING...';
    btn.classList.add('gemini-btn-loading');

    try {
        const resp = await fetch(`${CONFIG.apiBase}/api/gemini/trigger`, { method: 'POST' });
        const data = await resp.json();

        if (data.result) {
            const r = data.result;
            const note = document.getElementById('mb-gemini-text');
            const focus = document.getElementById('mb-gemini-focus');
            if (note) note.textContent = r.assessment || 'Analysis complete';
            if (focus) focus.textContent = r.recommendation ? `PRIORITY: ${r.recommendation}` : '';
            addMegaLog(`Gemini: Grade ${r.crew_grade || '?'} — ${(r.bottleneck || '').slice(0, 60)}`);
            btn.textContent = `GRADE: ${r.crew_grade || '?'}`;
        } else {
            btn.textContent = data.message || 'DONE';
        }

        if (data.budget) {
            const manualEl = document.getElementById('mb-gemini-manual');
            if (manualEl) manualEl.textContent = `manual: ${data.budget.calls_today}`;
        }
    } catch (e) {
        btn.textContent = 'ERROR';
        addMegaLog('Gemini trigger failed: ' + e.message);
    } finally {
        btn.classList.remove('gemini-btn-loading');
        setTimeout(() => { btn.textContent = 'ACTIVATE GEMINI'; }, 3000);
    }
}

// setText, setHtml moved to shared.js

// Voice Dump panel — show count from knowledge harvester data
async function loadVoiceDumpStats() {
    try {
        const res = await fetch(`${CONFIG.apiBase}/api/knowledge-harvester`);
        const d = await res.json();
        const el = document.getElementById('voice-dump-stats');
        if (!el) return;
        const count = d?.data?.total_count ?? d?.total_count ?? null;
        const recent = d?.data?.recent_sources ?? [];
        const dumps = recent.filter(s => s === 'voice-dump').length;
        if (count !== null) {
            el.textContent = `${count} knowledge objects · ${dumps} recent voice dumps ingested`;
        }
    } catch (e) { /* silent */ }
}
