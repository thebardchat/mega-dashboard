/* health.js — System health dots + stats */
// =============================================================================
// SYSTEM HEALTH
// =============================================================================

async function loadHealth() {
    try {
        const resp = await fetch(`${CONFIG.apiBase}/api/health`);
        const data = await resp.json();

        setHealthDot('h-ollama', data.ollama);
        setHealthDot('h-weaviate', data.weaviate);
        setHealthDot('h-mcp', data.mcp);
        setHealthDot('h-gateway', data.gateway);

        if (data.model) document.getElementById('h-model').textContent = data.model;
        if (data.knowledge) document.getElementById('h-knowledge').textContent = `${data.knowledge} chunks`;
        if (data.memories) document.getElementById('h-memories').textContent = `${data.memories}`;

    } catch (e) {
        console.error('Health check error:', e);
    }
}

function setHealthDot(id, status) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'health-dot ' + (status ? 'online' : 'offline');
}

