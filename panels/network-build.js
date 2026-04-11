/* network-build.js — Network status, build status, achievements */
// =============================================================================
// NETWORK STATUS, BUILD STATUS, VOICE DUMP
// =============================================================================

async function loadAchievements() {
    try {
        const resp = await fetch(`${CONFIG.apiBase}/api/achievements`);
        const data = await resp.json();
        const list = document.getElementById('achievements-list');
        if (data.achievements && data.achievements.length > 0) {
            list.innerHTML = data.achievements.map(a => `
                <div class="achievement-card ${a.locked ? 'locked' : ''}">
                    <div class="achievement-icon">${a.icon}</div>
                    <div class="achievement-title">${a.title}</div>
                    <div class="achievement-desc">${a.description}</div>
                    ${a.progress ? `<div class="achievement-progress"><div class="achievement-progress-bar" style="width:${a.progress}%"></div></div>` : ''}
                </div>
            `).join('');
        }
    } catch (e) {
        console.error('Achievements error:', e);
    }
}

async function loadNetworkStatus() {
    try {
        const resp = await fetch(`${CONFIG.apiBase}/api/network`);
        const data = await resp.json();
        const grid = document.getElementById('network-grid');
        if (data.nodes) {
            grid.innerHTML = data.nodes.map(n => `
                <div class="network-node">
                    <div class="network-node-header">
                        <span class="health-dot ${n.online ? 'online' : 'offline'}"></span>
                        <span class="network-node-name">${n.name}</span>
                    </div>
                    <div class="network-ip">${n.ip}</div>
                    ${n.online ? `<div class="network-ping">${n.latency}ms</div>` : '<div class="network-ping offline">OFFLINE</div>'}
                </div>
            `).join('');
        }
    } catch (e) {
        console.error('Network status error:', e);
    }
}

async function loadNetChat() {
    try {
        const resp = await fetch(`${CONFIG.apiBase}/api/net-chat`);
        const data = await resp.json();
        const container = document.getElementById('net-chat-messages');
        if (!container) return;
        const msgs = data.messages || [];
        container.innerHTML = msgs.slice(-20).map(m =>
            `<div class="net-chat-msg"><span class="net-chat-node">${m.node}</span> ${m.text} <span class="net-chat-time">${m.ts?.split(' ')[1] || ''}</span></div>`
        ).join('');
        container.scrollTop = container.scrollHeight;
    } catch(e) {}
}

async function sendNetChat() {
    const input = document.getElementById('net-chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    try {
        await fetch(`${CONFIG.apiBase}/api/net-chat`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ message: msg, node: 'Pi' }),
        });
        loadNetChat();
    } catch(e) {}
}

// Load chat on init and refresh
setInterval(loadNetChat, 10000);
document.addEventListener('DOMContentLoaded', loadNetChat);

async function loadBuildStatus() {
    try {
        const resp = await fetch(`${CONFIG.apiBase}/api/buildstatus`);
        const data = await resp.json();
        const feed = document.getElementById('build-feed');
        let html = '';

        // Services (systemd)
        if (data.services && data.services.length > 0) {
            html += data.services.map(s => {
                const ok = s.status === 'active';
                return `<div class="build-entry ${ok ? 'success' : 'fail'}">
                    <span class="build-dot ${ok ? 'dot-green' : 'dot-red'}"></span>
                    <span class="build-agent">${s.name}</span>
                    <span class="build-msg">${s.status}</span>
                </div>`;
            }).join('');
        }

        // Containers (Docker)
        if (data.containers && data.containers.length > 0) {
            html += data.containers.map(c => {
                const up = c.status && c.status.startsWith('Up');
                return `<div class="build-entry ${up ? 'success' : 'fail'}">
                    <span class="build-dot ${up ? 'dot-cyan' : 'dot-red'}"></span>
                    <span class="build-agent">${c.name}</span>
                    <span class="build-msg">${c.status}</span>
                </div>`;
            }).join('');
        }

        if (html) feed.innerHTML = html;
    } catch (e) {
        console.error('Build status error:', e);
    }
}

