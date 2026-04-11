/* ecosystem-mindmap.js — Ecosystem D3 force-directed graph */
// =============================================================================
// ECOSYSTEM MIND MAP — Full Interactive D3.js Force-Directed Graph
// =============================================================================

let mmSvg, mmSimulation, mmZoom, mmG;

const MM_COLORS = {
    core:     '#00fff9',  // cyan
    bots:     '#ff00ff',  // magenta
    services: '#39ff14',  // green
    repos:    '#ffd700',  // gold
    data:     '#bc13fe',  // purple
    family:   '#ff2a6d',  // pink
    hardware: '#ff6a00',  // orange
    external: '#00aaff',  // blue
};

// Live system state cache — updated every 15s
let _mmLiveState = { services: {}, bots: {}, cluster: {}, knowledge: 0, mega_iq: 0 };
let _mmPulseNodes = new Set(); // nodes that fired recently

async function refreshMindmapLiveState() {
    try {
        const [health, brain, cluster] = await Promise.all([
            fetch(`${CONFIG.apiBase}/api/health`).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch(`${CONFIG.apiBase}/api/mega-brain`).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch(`${CONFIG.apiBase}/api/cluster`).then(r => r.ok ? r.json() : null).catch(() => null),
        ]);

        if (health?.services) {
            health.services.forEach(s => { _mmLiveState.services[s.name] = s.status; });
        }
        if (brain?.bots) {
            brain.bots.forEach(b => { _mmLiveState.bots[b.name] = b.status; });
            _mmLiveState.mega_iq  = brain.mega_iq || 0;
            _mmLiveState.training = brain.training_count || 0;
            _mmLiveState.memory   = brain.memory_count || 0;
            // Mark zone nodes as firing based on zone_activity
            const za = brain.zone_activity || {};
            Object.entries(za).forEach(([z, count]) => { if (count > 0) _mmPulseNodes.add('mega-' + z); });
        }
        if (cluster?.data?.nodes) {
            cluster.data.nodes.forEach(n => { _mmLiveState.cluster[n.name] = n.online; });
        }
        // Push pulses to the mindmap
        if (mmG) pulseMindmapNodes();
    } catch (e) { /* silent */ }
}

function pulseMindmapNodes() {
    _mmPulseNodes.forEach(id => {
        mmG?.selectAll('.mm-node').filter(d => d.id === id)
            .select('circle:first-child')
            .transition().duration(400)
            .attr('r', d => d.r + 14).attr('stroke-opacity', 0.9)
            .transition().duration(600)
            .attr('r', d => d.r + 4).attr('stroke-opacity', 0.2);
    });
    _mmPulseNodes.clear();
}

function getMindmapNodeState(id) {
    // Returns: 'hot' | 'active' | 'idle' | 'offline'
    const svc = _mmLiveState.services;
    const bots = _mmLiveState.bots;
    const cluster = _mmLiveState.cluster;
    const map = {
        'ollama': svc['ollama'] === 'active' ? 'active' : 'idle',
        'weaviate': svc['weaviate'] === 'ok' || svc['weaviate'] === 'active' ? 'active' : 'idle',
        'gateway': svc['angel-cloud-gateway'] === 'active' ? 'active' : 'idle',
        'mcpserver': svc['shanebrain-mcp'] === 'active' ? 'active' : 'idle',
        'dashboard': 'active', // we're running
        'discordbot': svc['shanebrain-discord'] === 'active' ? 'hot' : 'idle',
        'socialbot': svc['shanebrain-social'] === 'active' ? 'active' : 'idle',
        'arcadebot': svc['shanebrain-arcade'] === 'active' ? 'active' : 'idle',
        'pulsar00100': cluster['Pulsar00100'] ? 'active' : 'offline',
        'bullfrog': cluster['Bullfrog-Max-R2D2'] ? 'active' : 'offline',
        'jaxton': cluster['Jaxton-Laptop'] ? 'active' : 'offline',
        'mega-brain': Object.values(bots).filter(s => s === 'ACTIVE').length > 12 ? 'hot' : 'active',
        'mega-brain-zone': 'active',
        'memory': _mmLiveState.memory > 10 ? 'active' : 'idle',
        'training': _mmLiveState.training > 6 ? 'active' : 'idle',
    };
    return map[id] || 'idle';
}

function getMindmapData() {
    const nodes = [
        // ── CORE HUB ──
        { id: 'shanebrain', label: 'SHANEBRAIN', group: 'core', r: 28, desc: 'Central AI orchestrator — the brain of everything', icon: '🧠' },

        // ── HARDWARE ──
        { id: 'pi5', label: 'Pi 5', group: 'hardware', r: 22, desc: 'Raspberry Pi 5, 16GB RAM, Pironman 5-MAX case' },
        { id: 'raid', label: 'RAID 1\n2x2TB NVMe', group: 'hardware', r: 16, desc: 'Dual WD Blue SN5000 NVMe in RAID 1 at /mnt/shanebrain-raid/' },
        { id: 'ext8tb', label: '8TB External', group: 'hardware', r: 14, desc: 'Angel Cloud backup at /media/shane/ANGEL_CLOUD (NTFS)' },
        { id: 'tailscale', label: 'TAILSCALE', group: 'hardware', r: 14, desc: 'VPN mesh — 100.67.120.6' },

        // ── SERVICES (Running on Pi) ──
        { id: 'ollama', label: 'OLLAMA', group: 'services', r: 20, desc: 'Local LLM engine — port 11434. Models: shanebrain-3b, llama3.2:3b, nomic-embed-text' },
        { id: 'weaviate', label: 'WEAVIATE', group: 'services', r: 20, desc: 'Vector DB — port 8080/50051. 17 collections, 251 objects, RAG + memory' },
        { id: 'openwebui', label: 'OPEN\nWEBUI', group: 'services', r: 15, desc: 'Chat interface — port 3000' },
        { id: 'portainer', label: 'PORTAINER', group: 'services', r: 13, desc: 'Docker management — port 9000' },
        { id: 'mcpserver', label: 'MCP\nSERVER', group: 'services', r: 16, desc: 'ShaneBrain MCP v2.2 — port 8100, 42 tools via HTTP' },
        { id: 'gateway', label: 'ANGEL CLOUD\nGATEWAY', group: 'services', r: 18, desc: 'FastAPI — port 4200. Registration, login, angel progression, leaderboard' },
        { id: 'dashboard', label: 'MEGA\nDASHBOARD', group: 'services', r: 16, desc: 'This dashboard — port 8300. 3D command center' },
        { id: 'glances', label: 'GLANCES', group: 'services', r: 12, desc: 'System monitor — port 61208' },

        // ── BOTS & AGENTS ──
        { id: 'discordbot', label: 'DISCORD\nBOT', group: 'bots', r: 17, desc: 'ShaneBrain Discord v5.4 — RAG + learning + Weaviate harvesting' },
        { id: 'arcadebot', label: 'ANGEL\nARCADE', group: 'bots', r: 15, desc: 'Discord economy/casino bot — revenue generation' },
        { id: 'socialbot', label: 'SOCIAL\nBOT', group: 'bots', r: 15, desc: 'Facebook bot — posting, comment harvesting, friend profiling' },
        { id: 'claudecode', label: 'CLAUDE\nCODE', group: 'bots', r: 16, desc: 'Dev partner — building this entire ecosystem right now' },
        { id: 'pulsar', label: 'PULSAR\nSENTINEL', group: 'bots', r: 16, desc: 'Post-quantum security framework with full UI' },
        { id: 'githubpoller', label: 'GITHUB\nPOLLER', group: 'bots', r: 13, desc: 'Polls GitHub commits/PRs every 15 min, awards points' },
        { id: 'buddyclaude', label: 'BUDDY\nCLAUDE', group: 'bots', r: 14, desc: '12hr Claude↔Gemini dialogue engine — port 8008' },
        { id: 'megacrew', label: 'MEGA\nCREW', group: 'bots', r: 18, desc: '17 self-evolving bots — Arc, Weld, Sentinel + 14 more' },
        { id: 'alerter', label: 'SHANEBRAIN\nALERTER', group: 'bots', r: 14, desc: 'Discord DM alerts, 5 AM briefing, weekly Sunday report' },

        // ── DATA & COLLECTIONS ──
        { id: 'legacyknowledge', label: 'Legacy\nKnowledge', group: 'data', r: 14, desc: '210+ objects — the core knowledge base' },
        { id: 'conversations', label: 'Conversations', group: 'data', r: 13, desc: '61 objects — chat history with context' },
        { id: 'friendprofiles', label: 'Friend\nProfiles', group: 'data', r: 12, desc: '5 profiles — living relationship data' },
        { id: 'ragmd', label: 'RAG.md', group: 'data', r: 14, desc: 'Source of truth — who Shane is, personality, knowledge' },
        { id: 'constitution', label: 'CONSTITUTION', group: 'data', r: 15, desc: 'Single source of truth governing every project and decision' },

        // ── REPOSITORIES ──
        { id: 'repo-core', label: 'shanebrain-core', group: 'repos', r: 14, desc: 'Central repo — AI, bots, gateway, social' },
        { id: 'repo-pulsar', label: 'pulsar_sentinel', group: 'repos', r: 12, desc: 'Post-quantum security framework' },
        { id: 'repo-loudon', label: 'loudon-desarro', group: 'repos', r: 12, desc: '50,000 SF athletic complex 3D viz' },
        { id: 'repo-trainer', label: 'AI-Trainer-MAX', group: 'repos', r: 12, desc: 'Modular AI training — 19 modules, 3 phases' },
        { id: 'repo-halo', label: 'HaloFinance', group: 'repos', r: 12, desc: 'Financial tools and tracking' },
        { id: 'repo-angel', label: 'angel-cloud', group: 'repos', r: 12, desc: 'Angel Cloud frontend' },
        { id: 'repo-roblox', label: 'angel-cloud\n-roblox', group: 'repos', r: 11, desc: 'Angel Cloud Roblox integration' },
        { id: 'repo-n8n', label: 'N8N', group: 'repos', r: 11, desc: 'Workflow automation' },
        { id: 'repo-trojan', label: 'TrojanHorse\nArena', group: 'repos', r: 11, desc: 'Competitive AI arena' },
        { id: 'repo-book', label: 'Book Launch\nPlaybook', group: 'repos', r: 11, desc: 'Book launch strategy' },
        { id: 'repo-noir', label: 'Noir Detective', group: 'repos', r: 11, desc: 'Creative writing process' },
        { id: 'repo-thoughttree', label: 'Thought Tree', group: 'repos', r: 11, desc: 'Idea mapping system' },
        { id: 'repo-sbmgmt', label: 'SB-Mgmt-OS', group: 'repos', r: 12, desc: 'ShaneBrain management operating system' },
        { id: 'repo-index', label: 'Index', group: 'repos', r: 10, desc: 'Master repo index' },
        { id: 'repo-gemini', label: 'Gemini\nSidekick', group: 'repos', r: 11, desc: 'Gemini integration' },
        { id: 'repo-bgkpjr', label: 'BGKPJR\nSims', group: 'repos', r: 11, desc: 'Core simulations' },

        // ── FAMILY / MISSION ──
        { id: 'family', label: 'FAMILY', group: 'family', r: 20, desc: 'The mission: digital legacy for every family' },
        { id: 'srm', label: 'SRM\nDISPATCH', group: 'family', r: 16, desc: 'Day job — dump truck dispatch, Meridianville AL' },
        { id: 'sobriety', label: 'SOBRIETY', group: 'family', r: 15, desc: 'Since Nov 27, 2023 — every day is a victory' },
        { id: 'mission800m', label: '800M\nUSERS', group: 'family', r: 17, desc: '800 million Windows users losing security updates — ShaneBrain proves affordable local AI works' },
        { id: 'angelecosystem', label: 'ANGEL\nECOSYSTEM', group: 'family', r: 16, desc: 'Mental wellness + security + digital legacy for every family' },
    ];

    const links = [
        // Core connections
        { source: 'shanebrain', target: 'pi5', strength: 1 },
        { source: 'pi5', target: 'raid', strength: 0.8 },
        { source: 'pi5', target: 'ext8tb', strength: 0.5 },
        { source: 'pi5', target: 'tailscale', strength: 0.6 },

        // Services to Pi
        { source: 'pi5', target: 'ollama', strength: 0.8 },
        { source: 'pi5', target: 'weaviate', strength: 0.8 },
        { source: 'pi5', target: 'openwebui', strength: 0.6 },
        { source: 'pi5', target: 'portainer', strength: 0.5 },
        { source: 'pi5', target: 'mcpserver', strength: 0.7 },
        { source: 'pi5', target: 'gateway', strength: 0.7 },
        { source: 'pi5', target: 'dashboard', strength: 0.6 },
        { source: 'pi5', target: 'glances', strength: 0.4 },

        // ShaneBrain hub connections
        { source: 'shanebrain', target: 'ollama', strength: 0.9 },
        { source: 'shanebrain', target: 'weaviate', strength: 0.9 },
        { source: 'shanebrain', target: 'mcpserver', strength: 0.8 },
        { source: 'shanebrain', target: 'ragmd', strength: 0.9 },
        { source: 'shanebrain', target: 'constitution', strength: 0.8 },
        { source: 'shanebrain', target: 'dashboard', strength: 0.7 },

        // Bots to ShaneBrain
        { source: 'shanebrain', target: 'discordbot', strength: 0.8 },
        { source: 'shanebrain', target: 'arcadebot', strength: 0.6 },
        { source: 'shanebrain', target: 'socialbot', strength: 0.7 },
        { source: 'shanebrain', target: 'claudecode', strength: 0.7 },
        { source: 'shanebrain', target: 'pulsar', strength: 0.6 },

        // Bot-service connections
        { source: 'discordbot', target: 'weaviate', strength: 0.7 },
        { source: 'discordbot', target: 'ollama', strength: 0.7 },
        { source: 'socialbot', target: 'weaviate', strength: 0.6 },
        { source: 'arcadebot', target: 'weaviate', strength: 0.5 },
        { source: 'openwebui', target: 'ollama', strength: 0.8 },
        { source: 'mcpserver', target: 'weaviate', strength: 0.8 },
        { source: 'mcpserver', target: 'ollama', strength: 0.7 },
        { source: 'gateway', target: 'weaviate', strength: 0.6 },
        { source: 'gateway', target: 'githubpoller', strength: 0.5 },
        { source: 'dashboard', target: 'ollama', strength: 0.6 },
        { source: 'dashboard', target: 'weaviate', strength: 0.6 },

        // Data to weaviate
        { source: 'weaviate', target: 'legacyknowledge', strength: 0.7 },
        { source: 'weaviate', target: 'conversations', strength: 0.7 },
        { source: 'weaviate', target: 'friendprofiles', strength: 0.6 },
        { source: 'raid', target: 'ragmd', strength: 0.5 },

        // Repos to projects
        { source: 'repo-core', target: 'shanebrain', strength: 0.6 },
        { source: 'repo-pulsar', target: 'pulsar', strength: 0.6 },
        { source: 'repo-trainer', target: 'shanebrain', strength: 0.4 },
        { source: 'repo-angel', target: 'gateway', strength: 0.5 },
        { source: 'repo-halo', target: 'shanebrain', strength: 0.3 },
        { source: 'repo-sbmgmt', target: 'shanebrain', strength: 0.4 },
        { source: 'repo-roblox', target: 'repo-angel', strength: 0.4 },

        // Family connections
        { source: 'shanebrain', target: 'family', strength: 0.8 },
        { source: 'family', target: 'sobriety', strength: 0.7 },
        { source: 'shanebrain', target: 'srm', strength: 0.5 },
        { source: 'family', target: 'mission800m', strength: 0.6 },
        { source: 'mission800m', target: 'angelecosystem', strength: 0.7 },
        { source: 'angelecosystem', target: 'gateway', strength: 0.5 },

        // Constitution governs all
        { source: 'constitution', target: 'repo-core', strength: 0.3 },
        { source: 'constitution', target: 'repo-pulsar', strength: 0.3 },
        { source: 'constitution', target: 'repo-trainer', strength: 0.3 },

        // New bots
        { source: 'shanebrain', target: 'megacrew', strength: 0.9 },
        { source: 'megacrew', target: 'weaviate', strength: 0.8 },
        { source: 'megacrew', target: 'ollama', strength: 0.7 },
        { source: 'shanebrain', target: 'buddyclaude', strength: 0.6 },
        { source: 'buddyclaude', target: 'ollama', strength: 0.7 },
        { source: 'shanebrain', target: 'alerter', strength: 0.7 },
        { source: 'alerter', target: 'discordbot', strength: 0.6 },
    ];

    return { nodes, links };
}

