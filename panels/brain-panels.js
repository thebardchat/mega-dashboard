/* brain-panels.js — Small brain panels: cluster, book, sentinel, mood, social, harvester, knowledge-stats, watchdog */
// =============================================================================
// CLUSTER BRAIN
// =============================================================================

async function loadCluster() {
    try {
        const res = await fetch(`${CONFIG.apiBase}/api/cluster`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status !== 'ok') return;

        const grid = document.getElementById('cluster-grid');
        if (grid && data.data?.nodes) {
            grid.innerHTML = data.data.nodes.map(n => `
                <div class="cluster-node ${n.online ? 'online' : 'offline'}">
                    <div class="cluster-node-name">
                        <span class="health-dot ${n.online ? 'online' : ''}"></span>
                        ${n.name}
                    </div>
                    <div class="cluster-node-model">${n.online ? (n.models && n.models.length ? n.models.join(', ') : n.model || 'unknown') : 'OFFLINE'}</div>
                    <div class="cluster-node-ping">${n.online ? (n.latency_ms != null ? n.latency_ms + ' ms' : '--') : '--'}</div>
                </div>`).join('');
        }
        const msg = document.getElementById('cluster-msg');
        if (msg) msg.textContent = data.message || '';
    } catch (e) { console.error('Cluster load failed:', e); }
}

// =============================================================================
// BOOK PROGRESS BRAIN
// =============================================================================

async function loadBookProgress() {
    try {
        const res = await fetch(`${CONFIG.apiBase}/api/book-progress`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status !== 'ok') return;

        const d = data.data || {};
        const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };

        el('book-chapters', d.chapter_count ?? '--');
        el('book-words', d.word_count ? d.word_count.toLocaleString() : '--');
        el('book-last', d.last_chapter ? d.last_chapter.replace(/\.(md|txt)$/, '') : '---');

        // Progress bar — assume 30 chapters = 100%
        const pct = Math.min(100, Math.round(((d.chapter_count || 0) / 30) * 100));
        const bar = document.getElementById('book-progress-bar');
        if (bar) bar.style.width = pct + '%';

        const msg = document.getElementById('book-msg');
        if (msg) msg.textContent = data.message || '';
    } catch (e) { console.error('Book progress load failed:', e); }
}

// =============================================================================
// MARKET SENTINEL BRAIN
// =============================================================================

async function loadMarketSentinel() {
    try {
        const res = await fetch(`${CONFIG.apiBase}/api/market-sentinel`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status !== 'ok') return;

        const list = document.getElementById('sentinel-list');
        if (list && data.data?.holdings) {
            list.innerHTML = data.data.holdings.map(h => {
                const pct = h.change_pct != null ? h.change_pct.toFixed(2) : null;
                const dir = pct > 0 ? 'up' : 'down';
                const alertCls = h.alert ? 'alert-row' : '';
                const changeCls = h.alert ? 'alert' : dir;
                const sign = pct > 0 ? '+' : '';
                return `<div class="sentinel-row ${alertCls}">
                    <span class="sentinel-symbol">${h.symbol}</span>
                    <span class="sentinel-price">${h.price != null ? '$' + h.price.toLocaleString() : '--'}</span>
                    <span class="sentinel-change ${changeCls}">${pct != null ? sign + pct + '%' : '--'}</span>
                </div>`;
            }).join('');
        }
        const msg = document.getElementById('sentinel-msg');
        if (msg) {
            msg.textContent = data.message || '';
            msg.className = 'brain-msg' + (data.data?.any_alert ? ' alert' : '');
        }
    } catch (e) { console.error('Market sentinel load failed:', e); }
}

// =============================================================================
// MOOD TRACKER
// =============================================================================

let _selectedMood = null;

async function loadMoodTracker() {
    try {
        const res = await fetch(`${CONFIG.apiBase}/api/mood`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status !== 'ok') return;

        const d = data.data || {};
        const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };

        el('mood-today', d.today != null ? `${d.today}/5` : '--');
        el('mood-avg', d.seven_day_avg != null ? d.seven_day_avg.toFixed(1) : '--');
        el('mood-streak', d.streak != null ? `${d.streak} days` : '--');

        if (d.today != null) {
            _selectedMood = d.today;
            document.querySelectorAll('.mood-btn').forEach((btn, i) => {
                btn.classList.toggle('selected', i + 1 === d.today);
            });
        }

        const msg = document.getElementById('mood-msg');
        if (msg) msg.textContent = data.message || '';
    } catch (e) { console.error('Mood load failed:', e); }
}

function logMood(rating) {
    _selectedMood = rating;
    document.querySelectorAll('.mood-btn').forEach((btn, i) => {
        btn.classList.toggle('selected', i + 1 === rating);
    });
}

async function saveMood() {
    if (!_selectedMood) {
        const msg = document.getElementById('mood-msg');
        if (msg) msg.textContent = 'Pick a mood (1-5) first';
        return;
    }
    const note = document.getElementById('mood-note')?.value?.trim() || '';
    const saveBtn = document.getElementById('mood-save-btn');
    if (saveBtn) { saveBtn.textContent = '...'; saveBtn.disabled = true; }
    try {
        const res = await fetch(`${CONFIG.apiBase}/api/mood`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mood: _selectedMood, note }),
        });
        const data = await res.json();
        const msg = document.getElementById('mood-msg');
        if (msg) msg.textContent = data.saved ? 'Mood saved!' : (data.error || 'Saved');
        const noteInput = document.getElementById('mood-note');
        if (noteInput) noteInput.value = '';
        setTimeout(loadMoodTracker, 2000);
    } catch (e) {
        console.error('Mood save failed:', e);
        const msg = document.getElementById('mood-msg');
        if (msg) msg.textContent = 'Save failed — try again';
    }
    if (saveBtn) { saveBtn.textContent = 'SAVE'; saveBtn.disabled = false; }
}

// =============================================================================
// SOCIAL REPORTER BRAIN
// =============================================================================

async function loadSocialReporter() {
    try {
        const res = await fetch(`${CONFIG.apiBase}/api/social-reporter`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status !== 'ok') return;

        const d = data.data || {};
        const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
        el('social-friends', d.friend_profiles ?? '--');
        el('social-knowledge', d.social_knowledge ?? '--');

        const log = document.getElementById('social-log');
        if (log && d.recent_log?.length) {
            log.innerHTML = d.recent_log.slice(-8).reverse()
                .map(line => `<div>${escapeHtml(line)}</div>`).join('');
        }
        const msg = document.getElementById('social-msg');
        if (msg) msg.textContent = data.message || '';
    } catch (e) { console.error('Social reporter load failed:', e); }
}

// =============================================================================
// KNOWLEDGE HARVESTER BRAIN — badge on Knowledge Stars panel
// =============================================================================

async function loadKnowledgeHarvester() {
    // Count display owned by loadKnowledgeStats — live 30s Weaviate query.
    // Harvester brain kept for future status messages.
    try {
        await fetch(`${CONFIG.apiBase}/api/knowledge-harvester`);
    } catch (e) { /* non-critical */ }
}

// =============================================================================
// KNOWLEDGE STATS — live Weaviate counts, 30s refresh
// =============================================================================

async function loadKnowledgeStats() {
    try {
        const res = await fetch(`${CONFIG.apiBase}/api/knowledge-stats`);
        if (!res.ok) return;
        const data = await res.json();

        // True total — flash yellow if it just grew
        const countEl = document.getElementById('star-count');
        if (countEl && data.total != null) {
            const prev = parseInt(countEl.textContent.replace(/,/g, '')) || 0;
            const next = data.total;
            countEl.textContent = next.toLocaleString();
            if (prev > 0 && next > prev) {
                countEl.classList.add('ks-count-flash');
                setTimeout(() => countEl.classList.remove('ks-count-flash'), 900);
            }
        }

        // Last updated timestamp
        const updEl = document.getElementById('ks-last-updated');
        if (updEl && data.timestamp) {
            updEl.textContent = 'UPDATED ' + new Date(data.timestamp).toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
            }).toUpperCase();
        }

        // Per-collection breakdown chips
        const colEl = document.getElementById('ks-collections');
        if (colEl && data.collections) {
            const show = [
                ['LegacyKnowledge', 'KNOWLEDGE'],
                ['Conversation', 'CONVOS'],
                ['ExternalPerspectives', 'AI COUNCIL'],
                ['FriendProfile', 'FRIENDS'],
                ['DailyNote', 'NOTES'],
                ['SecurityLog', 'SECURITY'],
                ['PersonalDoc', 'PERSONAL'],
                ['SocialKnowledge', 'SOCIAL'],
                ['PersonalDraft', 'DRAFTS'],
            ];
            colEl.innerHTML = show.map(([col, label]) => {
                const n = data.collections[col];
                if (n == null) return '';
                return `<div class="ks-col-chip">
                    <span class="ks-col-label">${label}</span>
                    <span class="ks-col-count">${n.toLocaleString()}</span>
                </div>`;
            }).join('');
        }
    } catch (e) {
        console.error('Knowledge stats failed:', e);
    }
}

// loadWeatherBrain() is in weather.js

// =============================================================================
// SYSTEM WATCHDOG BRAIN
// =============================================================================

async function loadWatchdog() {
    try {
        const res = await fetch(`${CONFIG.apiBase}/api/watchdog`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status !== 'ok') return;

        // Update service dots in the health grid using watchdog data
        (data.services || []).forEach(svc => {
            const dotMap = {
                'ollama': 'h-ollama',
                'mega-dashboard': null,
                'angel-cloud-gateway': 'h-gateway',
                'shanebrain-discord': null,
                'shanebrain-social': null,
                'shanebrain-arcade': null,
            };
            // Also update bot-level if available
        });

        // Watchdog status message
        const msgEl = document.getElementById('watchdog-msg');
        if (msgEl) {
            msgEl.textContent = data.message || '';
            msgEl.className = 'watchdog-msg' + (data.all_ok ? '' : ' warn');
        }

        // Heal log
        const logEl = document.getElementById('heal-log');
        if (logEl && data.heal_log?.length) {
            logEl.innerHTML = data.heal_log.slice(0, 5).map(e => {
                const cls = e.event === 'auto-healed' ? 'heal-entry' : 'heal-entry failed';
                const icon = e.event === 'auto-healed' ? '✓' : '✗';
                const ts = e.ts?.split('T')[1]?.slice(0, 5) || '';
                return `<div class="${cls}">${icon} ${e.service} — ${e.event} ${ts}</div>`;
            }).join('');
        }

        // Update Sentinel crew character status based on watchdog health
        if (window.MegaCrew) {
            const status = data.all_ok ? 'active' : 'busy';
            MegaCrew.drawWithStatus('crew-watchdog-canvas', 'sentinel', status, { width: 35, height: 45, scale: 0.45 });
        }
    } catch (e) {
        console.error('Watchdog load failed:', e);
    }
}

