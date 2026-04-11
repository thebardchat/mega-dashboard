/* ecosystem-3d.js — Immersive 3D Force-Directed Ecosystem */
// =============================================================================
// QUANTUM ECOSYSTEM — Fullscreen 3D Force-Directed Graph
// =============================================================================

let _eco3dScene, _eco3dCamera, _eco3dRenderer, _eco3dGroup;
let _eco3dFsScene, _eco3dFsCamera, _eco3dFsRenderer, _eco3dFsGroup;
let _eco3dNodeMeshes = [];
let _eco3dFsNodeMeshes = [];
let _eco3dFullOpen = false;
let _eco3dFilter = 'all';
let _eco3dFsInited = false;
let _eco3dEdgeParticles = null;
let _eco3dFsEdgeParticles = null;
let _eco3dLinkPositions = [];
let _eco3dFsLinkPositions = [];
let _eco3dSelectedNode = null;

// Color palette by service type
const ECO_COLORS = {
    core:     0x00fff9,  // cyan
    ai:       0x00e5ff,  // cyan/bright
    db:       0xbc13fe,  // purple
    ui:       0x39ff14,  // green
    social:   0xff00ff,  // magenta
    external: 0xffd700,  // gold
    gateway:  0xff6a00,  // orange
};

// Service ecosystem data
function _getEcoServiceData() {
    const nodes = [
        { id: 'core',        label: 'SHANEBRAIN\nCORE',    type: 'core',     r: 2.0, port: '---',   desc: 'Central AI orchestrator — the brain of everything', status: 'ACTIVE' },
        { id: 'weaviate',    label: 'WEAVIATE',            type: 'db',       r: 1.3, port: '8080',  desc: 'Vector DB — 17 collections, 251+ objects, RAG + memory', status: 'ACTIVE' },
        { id: 'ollama',      label: 'OLLAMA\nCLUSTER',     type: 'ai',       r: 1.4, port: '11435', desc: '4-node cluster — Pi5 + Pulsar + Bullfrog + Jaxton', status: 'ACTIVE' },
        { id: 'mcp',         label: 'MCP\nSERVER',         type: 'ai',       r: 1.1, port: '8100',  desc: '42 tools across 26 groups — HTTP + streamable-http', status: 'ACTIVE' },
        { id: 'dashboard',   label: 'MEGA\nDASHBOARD',     type: 'ui',       r: 1.1, port: '8300',  desc: 'This dashboard — 3D command center', status: 'ACTIVE' },
        { id: 'discord',     label: 'DISCORD\nBOT',        type: 'social',   r: 1.0, port: '---',   desc: 'ShaneBrain Discord v5.4 — RAG + learning + harvesting', status: 'ACTIVE' },
        { id: 'angel',       label: 'ANGEL CLOUD\nGATEWAY',type: 'gateway',  r: 1.1, port: '4200',  desc: 'FastAPI front door — registration, chat, leaderboard', status: 'ACTIVE' },
        { id: 'openwebui',   label: 'OPEN\nWEBUI',         type: 'ui',       r: 0.9, port: '3000',  desc: 'Chat interface for local LLMs', status: 'ACTIVE' },
        { id: 'buddy',       label: 'BUDDY\nCLAUDE',       type: 'ai',       r: 0.9, port: '8008',  desc: '12hr Claude/Gemini dialogue engine via llama3.2:1b', status: 'ACTIVE' },
        { id: 'social',      label: 'SOCIAL\nBOT',         type: 'social',   r: 0.9, port: '---',   desc: 'Facebook bot — posting, comments, friend profiling', status: 'ACTIVE' },
        { id: 'mega-crew',   label: 'MEGA CREW\nArc/Weld/Sentinel', type: 'ai', r: 1.2, port: '---', desc: '17 Docker bots — self-modifying AI crew', status: 'ACTIVE' },
        { id: 'github',      label: 'GITHUB',              type: 'external', r: 0.85, port: '---',  desc: '15+ repos — shanebrain-core, angel-cloud, pulsar, etc.', status: 'EXTERNAL' },
    ];

    const links = [
        // Core connections
        { source: 'core', target: 'weaviate',  strength: 0.9 },
        { source: 'core', target: 'ollama',    strength: 0.9 },
        { source: 'core', target: 'mcp',       strength: 0.85 },
        { source: 'core', target: 'dashboard', strength: 0.7 },
        { source: 'core', target: 'discord',   strength: 0.8 },
        { source: 'core', target: 'angel',     strength: 0.7 },
        { source: 'core', target: 'buddy',     strength: 0.65 },
        { source: 'core', target: 'social',    strength: 0.6 },
        { source: 'core', target: 'mega-crew', strength: 0.85 },
        { source: 'core', target: 'github',    strength: 0.5 },
        // Cross-connections
        { source: 'discord',  target: 'mcp',       strength: 0.6 },
        { source: 'angel',    target: 'weaviate',   strength: 0.6 },
        { source: 'openwebui',target: 'ollama',     strength: 0.8 },
        { source: 'buddy',    target: 'ollama',     strength: 0.7 },
        { source: 'social',   target: 'discord',    strength: 0.5 },
        { source: 'mcp',      target: 'weaviate',   strength: 0.7 },
        { source: 'mcp',      target: 'ollama',     strength: 0.7 },
        { source: 'mega-crew', target: 'ollama',    strength: 0.6 },
        { source: 'mega-crew', target: 'weaviate',  strength: 0.5 },
        { source: 'dashboard', target: 'weaviate',  strength: 0.5 },
    ];

    return { nodes, links };
}

// ── 3D positions via force-directed layout (simple simulation) ──
function _computeEcoPositions(data, spread) {
    // Initial positions in a sphere layout
    const positions = {};
    const N = data.nodes.length;

    // Place core at center, others in golden spiral sphere
    data.nodes.forEach((node, i) => {
        if (node.id === 'core') {
            positions[node.id] = { x: 0, y: 0, z: 0 };
        } else {
            const phi = Math.acos(1 - 2 * (i + 0.5) / N);
            const theta = Math.PI * (1 + Math.sqrt(5)) * i;
            positions[node.id] = {
                x: Math.sin(phi) * Math.cos(theta) * spread,
                y: Math.cos(phi) * spread * 0.7,
                z: Math.sin(phi) * Math.sin(theta) * spread,
            };
        }
    });

    // Simple force-directed iterations
    const nodeMap = {};
    data.nodes.forEach(n => nodeMap[n.id] = n);

    for (let iter = 0; iter < 80; iter++) {
        const forces = {};
        data.nodes.forEach(n => forces[n.id] = { x: 0, y: 0, z: 0 });

        // Repulsion between all pairs
        for (let i = 0; i < N; i++) {
            for (let j = i + 1; j < N; j++) {
                const a = data.nodes[i].id, b = data.nodes[j].id;
                const dx = positions[a].x - positions[b].x;
                const dy = positions[a].y - positions[b].y;
                const dz = positions[a].z - positions[b].z;
                const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) + 0.01;
                const repForce = 8 / (dist * dist);
                const fx = (dx / dist) * repForce;
                const fy = (dy / dist) * repForce;
                const fz = (dz / dist) * repForce;
                forces[a].x += fx; forces[a].y += fy; forces[a].z += fz;
                forces[b].x -= fx; forces[b].y -= fy; forces[b].z -= fz;
            }
        }

        // Attraction along links
        data.links.forEach(link => {
            const s = link.source, t = link.target;
            const dx = positions[t].x - positions[s].x;
            const dy = positions[t].y - positions[s].y;
            const dz = positions[t].z - positions[s].z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) + 0.01;
            const idealDist = spread * 0.5 / (link.strength || 0.5);
            const attForce = (dist - idealDist) * 0.02 * (link.strength || 0.3);
            const fx = (dx / dist) * attForce;
            const fy = (dy / dist) * attForce;
            const fz = (dz / dist) * attForce;
            forces[s].x += fx; forces[s].y += fy; forces[s].z += fz;
            forces[t].x -= fx; forces[t].y -= fy; forces[t].z -= fz;
        });

        // Center gravity
        data.nodes.forEach(n => {
            const p = positions[n.id];
            forces[n.id].x -= p.x * 0.01;
            forces[n.id].y -= p.y * 0.01;
            forces[n.id].z -= p.z * 0.01;
        });

        // Apply forces (core stays at center)
        const cooling = 1 - iter / 80;
        data.nodes.forEach(n => {
            if (n.id === 'core') return;
            const p = positions[n.id];
            const f = forces[n.id];
            p.x += f.x * 0.3 * cooling;
            p.y += f.y * 0.3 * cooling;
            p.z += f.z * 0.3 * cooling;
        });
    }

    return positions;
}

// ── Nebula background (matches Knowledge Stars) ──
function _addNebulaBackground(scene, isFull) {
    // Deep space star field
    const starCount = isFull ? 2000 : 400;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
        starPos[i*3]   = (Math.random() - 0.5) * 200;
        starPos[i*3+1] = (Math.random() - 0.5) * 200;
        starPos[i*3+2] = (Math.random() - 0.5) * 200;
        // Vary star colors: white, pale blue, pale cyan
        const colorChoice = Math.random();
        if (colorChoice < 0.5) { starColors[i*3] = 0.8; starColors[i*3+1] = 0.85; starColors[i*3+2] = 1.0; }
        else if (colorChoice < 0.8) { starColors[i*3] = 0.4; starColors[i*3+1] = 0.9; starColors[i*3+2] = 1.0; }
        else { starColors[i*3] = 0.9; starColors[i*3+1] = 0.7; starColors[i*3+2] = 1.0; }
        starSizes[i] = Math.random() * 0.15 + 0.03;
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
        size: 0.12, vertexColors: true, transparent: true, opacity: 0.6, sizeAttenuation: true
    });
    const stars = new THREE.Points(starGeo, starMat);
    stars.name = 'nebula-stars';
    scene.add(stars);

    // Nebula clouds (large transparent spheres with additive blending)
    const nebulaColors = [0x1a0033, 0x000d33, 0x001a1a, 0x0d001a, 0x001122];
    for (let i = 0; i < (isFull ? 8 : 3); i++) {
        const nGeo = new THREE.SphereGeometry(15 + Math.random() * 30, 16, 16);
        const nMat = new THREE.MeshBasicMaterial({
            color: nebulaColors[i % nebulaColors.length],
            transparent: true,
            opacity: 0.06 + Math.random() * 0.04,
            side: THREE.BackSide,
        });
        const cloud = new THREE.Mesh(nGeo, nMat);
        cloud.position.set(
            (Math.random() - 0.5) * 40,
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 40
        );
        cloud.name = 'nebula-cloud-' + i;
        scene.add(cloud);
    }

    return stars;
}

// ── Build glowing node spheres ──
function _buildEco3DServiceNodes(group, data, positions, isFull) {
    const meshes = [];

    data.nodes.forEach((node, i) => {
        const color = ECO_COLORS[node.type] || 0xffffff;
        const size = node.r * (isFull ? 0.65 : 0.4);
        const pos = positions[node.id];

        // Inner bright sphere
        const geo = new THREE.SphereGeometry(size, 24, 20);
        const mat = new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.92
        });
        const mesh = new THREE.Mesh(geo, mat);

        // Start at center for entry animation
        if (isFull) {
            mesh.position.set(0, 0, 0);
            mesh.userData._targetPos = { x: pos.x, y: pos.y, z: pos.z };
            mesh.userData._entryProgress = 0;
        } else {
            mesh.position.set(pos.x, pos.y, pos.z);
        }
        mesh.userData = { ...node, index: i, _targetPos: mesh.userData._targetPos, _entryProgress: mesh.userData._entryProgress || 1 };

        // Outer glow shell
        const glowGeo = new THREE.SphereGeometry(size * 2.2, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.1
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.name = 'glow';
        mesh.add(glow);

        // Second outer glow (bigger, fainter)
        const glow2Geo = new THREE.SphereGeometry(size * 3.5, 12, 12);
        const glow2Mat = new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.04
        });
        const glow2 = new THREE.Mesh(glow2Geo, glow2Mat);
        glow2.name = 'glow2';
        mesh.add(glow2);

        // Label sprite
        const labelText = node.label.replace(/\n/g, ' ');
        const label = _makeEcoLabel(labelText, color, isFull ? 1.0 : 0.7);
        label.position.set(0, size * 2.8 + (isFull ? 0.6 : 0.3), 0);
        label.scale.set(isFull ? 3.5 : 2.0, isFull ? 0.7 : 0.4, 1);
        mesh.add(label);

        // Port badge (fullscreen only)
        if (isFull && node.port !== '---') {
            const portLabel = _makeEcoLabel(':' + node.port, 0x888888, 0.6);
            portLabel.position.set(0, size * 2.8 + (isFull ? 1.4 : 0.8), 0);
            portLabel.scale.set(2.0, 0.4, 1);
            mesh.add(portLabel);
        }

        group.add(mesh);
        meshes.push(mesh);
    });

    return meshes;
}

// ── Text sprite helper ──
function _makeEcoLabel(text, hexColor, scale) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const r = (hexColor >> 16) & 0xff;
    const g = (hexColor >> 8) & 0xff;
    const b = hexColor & 0xff;

    // Glow behind text
    ctx.shadowColor = `rgba(${r},${g},${b},0.6)`;
    ctx.shadowBlur = 8;
    ctx.fillStyle = `rgba(${r},${g},${b},0.95)`;
    ctx.font = 'bold 20px Share Tech Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, 256, 38);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85 * (scale || 1) });
    return new THREE.Sprite(mat);
}

// ── Build glowing edge lines ──
function _buildEcoEdges(group, data, nodeMeshes, isFull) {
    const nodeMap = {};
    data.nodes.forEach((n, i) => nodeMap[n.id] = i);

    const positions = [];
    const colors = [];

    data.links.forEach(link => {
        const si = nodeMap[link.source];
        const ti = nodeMap[link.target];
        if (si === undefined || ti === undefined) return;

        const sm = nodeMeshes[si];
        const tm = nodeMeshes[ti];
        if (!sm || !tm) return;

        // Use target positions for fullscreen (nodes start at center)
        const sp = isFull ? (sm.userData._targetPos || sm.position) : sm.position;
        const tp = isFull ? (tm.userData._targetPos || tm.position) : tm.position;

        positions.push(sp.x, sp.y, sp.z);
        positions.push(tp.x, tp.y, tp.z);

        const c = new THREE.Color(ECO_COLORS[data.nodes[si]?.type] || 0x00fff9);
        const strength = link.strength || 0.3;
        colors.push(c.r, c.g, c.b);
        colors.push(c.r * 0.4, c.g * 0.4, c.b * 0.4);
    });

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const lineMat = new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: isFull ? 0.35 : 0.25
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    lines.name = 'eco-links';
    group.add(lines);

    return { lines, positions };
}

// ── Flowing particles along edges (data flow visualization) ──
function _buildEdgeParticles(group, linkPositions, isFull) {
    const particleCount = isFull ? 500 : 100;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    const pCol = new Float32Array(particleCount * 3);
    const pSizes = new Float32Array(particleCount);
    const numLinks = linkPositions.length / 6;

    // Each particle tracks which link it's on and its progress
    const particleData = [];

    for (let i = 0; i < particleCount; i++) {
        const li = Math.floor(Math.random() * numLinks);
        const t = Math.random();
        const base = li * 6;
        particleData.push({ linkIndex: li, t: t, speed: 0.002 + Math.random() * 0.006, base: base });

        if (base + 5 < linkPositions.length) {
            pPos[i*3]   = linkPositions[base]   + (linkPositions[base+3] - linkPositions[base])   * t;
            pPos[i*3+1] = linkPositions[base+1] + (linkPositions[base+4] - linkPositions[base+1]) * t;
            pPos[i*3+2] = linkPositions[base+2] + (linkPositions[base+5] - linkPositions[base+2]) * t;
        }

        // Color: bright cyan with some variation
        const hue = Math.random();
        if (hue < 0.5) { pCol[i*3] = 0; pCol[i*3+1] = 1; pCol[i*3+2] = 0.98; }
        else if (hue < 0.75) { pCol[i*3] = 0.7; pCol[i*3+1] = 0; pCol[i*3+2] = 1; }
        else { pCol[i*3] = 1; pCol[i*3+1] = 0.8; pCol[i*3+2] = 0; }

        pSizes[i] = isFull ? 0.08 : 0.05;
    }

    pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.Float32BufferAttribute(pCol, 3));
    const pMat = new THREE.PointsMaterial({
        size: isFull ? 0.1 : 0.06, vertexColors: true, transparent: true, opacity: 0.7, sizeAttenuation: true
    });
    const particles = new THREE.Points(pGeo, pMat);
    particles.name = 'edge-particles';
    group.add(particles);

    return { particles, particleData, linkPositions };
}

// ── Node info panel (on click) ──
function _showNodeInfo(nodeData) {
    const panel = document.getElementById('eco3d-info-panel');
    if (!panel) return;

    const hex = '#' + (ECO_COLORS[nodeData.type] || 0xffffff).toString(16).padStart(6, '0');
    const statusColor = nodeData.status === 'ACTIVE' ? '#39ff14' : nodeData.status === 'EXTERNAL' ? '#ffd700' : '#ff2a6d';

    panel.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <div style="width:12px;height:12px;border-radius:50%;background:${hex};box-shadow:0 0 12px ${hex}"></div>
            <div style="color:${hex};font-family:Orbitron,sans-serif;font-size:0.9rem;letter-spacing:2px">${(nodeData.label || '').replace(/\n/g, ' ')}</div>
        </div>
        <div style="color:#aaa;font-size:0.7rem;margin-bottom:6px">${nodeData.desc || ''}</div>
        <div style="display:flex;gap:16px;margin-top:8px">
            <div style="color:#666;font-size:0.6rem">TYPE <span style="color:${hex};margin-left:4px">${(nodeData.type || '').toUpperCase()}</span></div>
            <div style="color:#666;font-size:0.6rem">PORT <span style="color:#fff;margin-left:4px">${nodeData.port || '---'}</span></div>
            <div style="color:#666;font-size:0.6rem">STATUS <span style="color:${statusColor};margin-left:4px">${nodeData.status || '---'}</span></div>
        </div>
    `;
    panel.style.display = 'block';
    panel.style.borderColor = hex;
    panel.style.boxShadow = `0 0 20px ${hex}33, inset 0 0 30px ${hex}11`;

    // Auto-hide after 6 seconds
    clearTimeout(panel._hideTimer);
    panel._hideTimer = setTimeout(() => { panel.style.display = 'none'; }, 6000);
}

// ── Main init ──
function initEco3D(canvas, isFull) {
    if (!canvas) return;

    const w = isFull ? window.innerWidth : canvas.clientWidth || 600;
    const h = isFull ? (window.innerHeight - 56) : (canvas.clientHeight || 350);

    const scene = new THREE.Scene();
    if (isFull) {
        scene.background = new THREE.Color(0x030308);
    }
    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 500);
    camera.position.set(0, 0, isFull ? 26 : 18);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: !isFull, antialias: true });
    if (!isFull) renderer.setClearColor(0x000000, 0);
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const group = new THREE.Group();
    scene.add(group);

    // Nebula background
    const bgStars = _addNebulaBackground(scene, isFull);

    // Compute force-directed positions
    const data = _getEcoServiceData();
    const spread = isFull ? 10 : 7;
    const positions = _computeEcoPositions(data, spread);

    // Build scene
    const nodeMeshes = _buildEco3DServiceNodes(group, data, positions, isFull);
    const { lines, positions: linkPos } = _buildEcoEdges(group, data, nodeMeshes, isFull);
    const edgeParticleSystem = _buildEdgeParticles(group, linkPos, isFull);

    if (isFull) {
        _eco3dFsScene = scene; _eco3dFsCamera = camera;
        _eco3dFsRenderer = renderer; _eco3dFsGroup = group;
        _eco3dFsNodeMeshes = nodeMeshes;
        _eco3dFsEdgeParticles = edgeParticleSystem;
        _eco3dFsLinkPositions = linkPos;
    } else {
        _eco3dScene = scene; _eco3dCamera = camera;
        _eco3dRenderer = renderer; _eco3dGroup = group;
        _eco3dNodeMeshes = nodeMeshes;
        _eco3dEdgeParticles = edgeParticleSystem;
        _eco3dLinkPositions = linkPos;
    }

    // Legend
    const legend = document.getElementById('mindmap-legend');
    if (legend && !isFull) {
        const groups = [
            { key: 'core', label: 'CORE' }, { key: 'ai', label: 'AI' },
            { key: 'db', label: 'DATA' }, { key: 'ui', label: 'UI' },
            { key: 'social', label: 'SOCIAL' }, { key: 'gateway', label: 'GATEWAY' },
            { key: 'external', label: 'EXTERNAL' },
        ];
        legend.innerHTML = groups.map(g => {
            const hex = '#' + ECO_COLORS[g.key].toString(16).padStart(6, '0');
            return `<div class="legend-item"><span class="legend-dot" style="background:${hex};box-shadow:0 0 6px ${hex}"></span>${g.label}</div>`;
        }).join('');
    }

    // ── Interaction ──
    let isDragging = false, prevX = 0, prevY = 0;
    let autoRotateSpeed = 0.0015;
    let lastInteraction = 0;

    canvas.addEventListener('mousedown', e => {
        isDragging = true; prevX = e.clientX; prevY = e.clientY;
        lastInteraction = Date.now();
    });
    canvas.addEventListener('mouseup', () => isDragging = false);
    canvas.addEventListener('mouseleave', () => isDragging = false);
    canvas.addEventListener('mousemove', e => {
        if (isDragging) {
            group.rotation.y += (e.clientX - prevX) * 0.005;
            group.rotation.x += (e.clientY - prevY) * 0.005;
            group.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, group.rotation.x));
            prevX = e.clientX; prevY = e.clientY;
            lastInteraction = Date.now();
        }
        if (isFull) _eco3dHandleHover(e, canvas, camera, nodeMeshes);
    });

    // Click for node info (fullscreen)
    if (isFull) {
        canvas.addEventListener('click', e => {
            const rect = canvas.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(nodeMeshes, false);
            if (intersects.length > 0) {
                _showNodeInfo(intersects[0].object.userData);
                _eco3dSelectedNode = intersects[0].object;
            } else {
                const panel = document.getElementById('eco3d-info-panel');
                if (panel) panel.style.display = 'none';
                _eco3dSelectedNode = null;
            }
        });
    }

    // Scroll to zoom
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        camera.position.z = Math.max(5, Math.min(60, camera.position.z + e.deltaY * 0.03));
        lastInteraction = Date.now();
    }, { passive: false });

    // Touch
    let lastTouchDist = 0;
    canvas.addEventListener('touchstart', e => {
        if (e.touches.length === 1) { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }
        if (e.touches.length === 2) { lastTouchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }
        lastInteraction = Date.now();
    });
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        if (e.touches.length === 1 && isDragging) {
            group.rotation.y += (e.touches[0].clientX - prevX) * 0.005;
            group.rotation.x += (e.touches[0].clientY - prevY) * 0.005;
            group.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, group.rotation.x));
            prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
        }
        if (e.touches.length === 2) {
            const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            camera.position.z = Math.max(5, Math.min(60, camera.position.z - (dist - lastTouchDist) * 0.05));
            lastTouchDist = dist;
        }
        lastInteraction = Date.now();
    }, { passive: false });
    canvas.addEventListener('touchend', () => isDragging = false);

    // ── Animation Loop ──
    let entryDone = !isFull;
    const entryStart = Date.now();

    function animate() {
        requestAnimationFrame(animate);
        const t = Date.now() * 0.001;
        const elapsed = (Date.now() - entryStart) / 1000;

        // Entry animation — nodes fly outward from center
        if (isFull && !entryDone) {
            let allDone = true;
            nodeMeshes.forEach((mesh) => {
                const target = mesh.userData._targetPos;
                if (!target) return;
                const progress = Math.min(1, elapsed / 2.0); // 2 second animation
                const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

                mesh.position.x = target.x * eased;
                mesh.position.y = target.y * eased;
                mesh.position.z = target.z * eased;

                if (progress < 1) allDone = false;
            });

            // Update edge positions during entry
            if (!allDone) {
                const nodeMap = {};
                data.nodes.forEach((n, i) => nodeMap[n.id] = i);
                const edgePositions = lines.geometry.attributes.position.array;
                let pi = 0;
                data.links.forEach(link => {
                    const si = nodeMap[link.source];
                    const ti = nodeMap[link.target];
                    if (si === undefined || ti === undefined) return;
                    const sm = nodeMeshes[si];
                    const tm = nodeMeshes[ti];
                    edgePositions[pi]   = sm.position.x; edgePositions[pi+1] = sm.position.y; edgePositions[pi+2] = sm.position.z;
                    edgePositions[pi+3] = tm.position.x; edgePositions[pi+4] = tm.position.y; edgePositions[pi+5] = tm.position.z;
                    pi += 6;
                });
                lines.geometry.attributes.position.needsUpdate = true;
            }

            if (allDone) entryDone = true;
        }

        // Smooth auto-rotation when not interacting
        const timeSinceInteraction = (Date.now() - lastInteraction) / 1000;
        if (!isDragging && timeSinceInteraction > 2) {
            const rotFade = Math.min(1, (timeSinceInteraction - 2) / 2);
            group.rotation.y += autoRotateSpeed * rotFade;
        }

        // Background nebula rotation
        bgStars.rotation.y -= 0.0002;
        bgStars.rotation.x += 0.00005;

        // Pulse core node
        nodeMeshes.forEach((mesh, i) => {
            if (mesh.userData.id === 'core') {
                const s = 1 + Math.sin(t * 1.5) * 0.12;
                mesh.scale.set(s, s, s);
            }
            // Glow pulse
            const glow = mesh.getObjectByName('glow');
            if (glow) glow.material.opacity = 0.08 + Math.sin(t * 1.2 + i * 0.7) * 0.06;
            const glow2 = mesh.getObjectByName('glow2');
            if (glow2) glow2.material.opacity = 0.03 + Math.sin(t * 0.8 + i * 1.1) * 0.02;

            // Selected node highlight
            if (isFull && _eco3dSelectedNode === mesh) {
                const pulse = 1 + Math.sin(t * 3) * 0.08;
                mesh.scale.set(pulse, pulse, pulse);
            }
        });

        // Animate flowing particles along edges
        const eps = isFull ? edgeParticleSystem : edgeParticleSystem;
        if (eps && eps.particleData && entryDone) {
            const posArr = eps.particles.geometry.attributes.position.array;
            const lp = eps.linkPositions;
            const numLinks = lp.length / 6;

            eps.particleData.forEach((pd, i) => {
                pd.t += pd.speed;
                if (pd.t > 1) {
                    pd.t = 0;
                    pd.linkIndex = Math.floor(Math.random() * numLinks);
                    pd.base = pd.linkIndex * 6;
                }
                const base = pd.base;
                if (base + 5 < lp.length) {
                    // During entry, use current node positions for particle paths
                    posArr[i*3]   = lp[base]   + (lp[base+3] - lp[base])   * pd.t;
                    posArr[i*3+1] = lp[base+1] + (lp[base+4] - lp[base+1]) * pd.t;
                    posArr[i*3+2] = lp[base+2] + (lp[base+5] - lp[base+2]) * pd.t;
                    // Slight drift for organic feel
                    posArr[i*3]   += Math.sin(t * 3 + i) * 0.05;
                    posArr[i*3+1] += Math.cos(t * 2 + i * 0.7) * 0.05;
                }
            });
            eps.particles.geometry.attributes.position.needsUpdate = true;
        }

        // Nebula cloud gentle drift
        scene.children.forEach(child => {
            if (child.name && child.name.startsWith('nebula-cloud-')) {
                const idx = parseInt(child.name.split('-')[2]);
                child.position.x += Math.sin(t * 0.1 + idx * 2) * 0.003;
                child.position.y += Math.cos(t * 0.08 + idx) * 0.002;
            }
        });

        renderer.render(scene, camera);
    }
    animate();

    // Resize handler
    if (isFull) {
        const onResize = () => {
            const nw = window.innerWidth;
            const nh = window.innerHeight - 56;
            camera.aspect = nw / nh;
            camera.updateProjectionMatrix();
            renderer.setSize(nw, nh);
        };
        window.addEventListener('resize', onResize);
    }
}

// ── Hover tooltip ──
function _eco3dHandleHover(e, canvas, camera, nodeMeshes) {
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(nodeMeshes, false);

    const tooltip = document.getElementById('eco3d-tooltip');
    if (intersects.length > 0) {
        const d = intersects[0].object.userData;
        canvas.style.cursor = 'pointer';
        tooltip.style.display = 'block';
        tooltip.style.left = (e.clientX + 16) + 'px';
        tooltip.style.top = (e.clientY - 10) + 'px';
        const hex = '#' + (ECO_COLORS[d.type] || 0xffffff).toString(16).padStart(6, '0');
        const statusColor = d.status === 'ACTIVE' ? '#39ff14' : d.status === 'EXTERNAL' ? '#ffd700' : '#ff2a6d';
        tooltip.innerHTML = `
            <div style="color:${hex};font-family:Orbitron;font-size:0.8rem;margin-bottom:4px;letter-spacing:1px">${(d.label||'').replace(/\n/g,' ')}</div>
            <div style="color:#aaa;font-size:0.65rem">${d.desc || ''}</div>
            <div style="display:flex;gap:12px;margin-top:6px;font-size:0.55rem">
                <span style="color:#666">PORT <span style="color:#fff">${d.port || '---'}</span></span>
                <span style="color:#666">STATUS <span style="color:${statusColor}">${d.status || '---'}</span></span>
            </div>
            <div style="color:#444;margin-top:4px;font-size:0.5rem">Click for details</div>
        `;
    } else {
        canvas.style.cursor = 'grab';
        tooltip.style.display = 'none';
    }
}

// ── Fullscreen open/close ──
function openEco3DFull() {
    const overlay = document.getElementById('eco3d-fullscreen');
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    _eco3dFullOpen = true;

    if (!_eco3dFsInited) {
        _eco3dFsInited = true;
        const canvas = document.getElementById('eco3d-canvas-fs');
        initEco3D(canvas, true);
    }
}

function closeEco3DFull() {
    document.getElementById('eco3d-fullscreen').style.display = 'none';
    document.body.style.overflow = '';
    _eco3dFullOpen = false;
    _eco3dSelectedNode = null;
    const panel = document.getElementById('eco3d-info-panel');
    if (panel) panel.style.display = 'none';
}

// ── Filter by type ──
function filterEco3D(type) {
    _eco3dFilter = type;
    const meshes = _eco3dFullOpen ? _eco3dFsNodeMeshes : _eco3dNodeMeshes;
    meshes.forEach(m => {
        if (type === 'all' || m.userData.type === type) {
            m.visible = true;
        } else {
            m.visible = false;
        }
    });
    const g = _eco3dFullOpen ? _eco3dFsGroup : _eco3dGroup;
    const links = g?.getObjectByName('eco-links');
    if (links) links.material.opacity = type === 'all' ? 0.35 : 0.1;
    const particles = g?.getObjectByName('edge-particles');
    if (particles) particles.material.opacity = type === 'all' ? 0.7 : 0.2;
}

// ── ESC key handler ──
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (_eco3dFullOpen) closeEco3DFull();
        if (document.getElementById('stars-fullscreen')?.style.display !== 'none') closeKnowledgeStarsFull();
        if (document.getElementById('mindmap-fullscreen')?.style.display !== 'none') closeMindMapFull();
    }
});
