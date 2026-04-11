/* bots-agents.js — Bots & Agents panel */
// =============================================================================
// BOTS & AGENTS PANEL
// =============================================================================

let _botsData = null;
let _buildServices = {};

async function loadBots() {
    try {
        const res = await fetch(`${CONFIG.apiBase}/api/bots`);
        _botsData = await res.json();
        renderBots();
    } catch (e) {
        console.error('Bots load failed:', e);
    }
}

function renderBots() {
    if (!_botsData) return;
    const list = document.getElementById('bot-list');
    if (!list) return;

    list.innerHTML = _botsData.bots.map(bot => {
        const online = bot.service ? (_buildServices[bot.service] === 'active') : true;
        const dotClass = online ? 'online' : '';
        const thoughts = bot.thoughts || [];
        const thoughtsHtml = thoughts.length
            ? thoughts.slice(-10).reverse().map(t => {
                const ts = t.ts ? t.ts.split('T')[1]?.slice(0,5) + ' ' + t.ts.split('T')[0]?.slice(5) : '';
                return `<li><span class="thought-ts">${ts}</span><span>${escapeHtml(t.text)}</span></li>`;
              }).join('')
            : '<li style="color:rgba(255,255,255,0.3);font-style:italic">No thoughts yet</li>';

        return `
        <div class="bot-card" id="botcard-${bot.id}" onclick="toggleBotCard('${bot.id}')">
            <div class="bot-card-header">
                <span class="health-dot ${dotClass}"></span>
                <span class="bot-card-name">${bot.name}</span>
                <span class="bot-card-toggle">&#9660;</span>
            </div>
            <div class="bot-card-body">
                <div class="bot-job-text">${escapeHtml(bot.job)}</div>
                <div class="bot-thoughts-label">THOUGHTS / TASKS</div>
                <ul class="bot-thought-list" id="thoughts-${bot.id}">${thoughtsHtml}</ul>
                <div class="bot-thought-input-row" onclick="event.stopPropagation()">
                    <input class="bot-thought-input" id="thought-input-${bot.id}"
                        placeholder="Add a thought or task..."
                        onkeydown="if(event.key==='Enter')addBotThought('${bot.id}')">
                    <button class="action-btn-sm" onclick="addBotThought('${bot.id}')">ADD</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function toggleBotCard(botId) {
    const card = document.getElementById(`botcard-${botId}`);
    if (!card) return;
    card.classList.toggle('expanded');
}

async function addBotThought(botId) {
    const input = document.getElementById(`thought-input-${botId}`);
    const thought = input?.value?.trim();
    if (!thought) return;
    try {
        const res = await fetch(`${CONFIG.apiBase}/api/bots`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bot_id: botId, thought }),
        });
        _botsData = await res.json();
        input.value = '';
        renderBots();
        // Re-expand the card after re-render
        const card = document.getElementById(`botcard-${botId}`);
        if (card) card.classList.add('expanded');
    } catch (e) {
        console.error('Add thought failed:', e);
    }
}

// escapeHtml moved to shared.js

