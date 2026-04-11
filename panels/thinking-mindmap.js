/* thinking-mindmap.js — Thinking Mind Map brainstorm canvas */
// =============================================================================
// THINKING MIND MAP — Interactive Brainstorm Canvas
// =============================================================================

let thinkingSvg, thinkingG, thinkingSimulation, thinkingZoom;
let thinkingNodes = [];
let thinkingLinks = [];
let thinkingNodeId = 0;

function initThinkingMindMap() {
    // Init happens when full screen opens, not on page load
}

let selectedThinkingNode = null;
let _mindmapInited = false;

function initFullScreenMindMap() {
    if (_mindmapInited) return;
    _mindmapInited = true;

    const svg = d3.select('#thinking-svg');
    const w = window.innerWidth;
    const h = window.innerHeight - 60;

    svg.attr('viewBox', [0, 0, w, h]);

    thinkingZoom = d3.zoom()
        .scaleExtent([0.2, 5])
        .on('zoom', e => thinkingG.attr('transform', e.transform));

    svg.call(thinkingZoom);
    thinkingG = svg.append('g');
    thinkingSvg = svg;
    thinkingSvg._width = w;
    thinkingSvg._height = h;

    if (thinkingNodes.length === 0) {
        thinkingNodes.push({ id: thinkingNodeId++, label: 'YOUR IDEA', x: w/2, y: h/2, r: 28, color: '#ffffff', isCenter: true });
        thinkingSimulation = d3.forceSimulation(thinkingNodes)
            .force('link', d3.forceLink(thinkingLinks).id(d => d.id).distance(130))
            .force('charge', d3.forceManyBody().strength(-280))
            .force('center', d3.forceCenter(w/2, h/2))
            .force('collision', d3.forceCollide().radius(d => d.r + 12))
            .on('tick', renderThinkingMap);
    } else {
        thinkingSimulation = d3.forceSimulation(thinkingNodes)
            .force('link', d3.forceLink(thinkingLinks).id(d => d.id).distance(130))
            .force('charge', d3.forceManyBody().strength(-280))
            .force('center', d3.forceCenter(w/2, h/2))
            .force('collision', d3.forceCollide().radius(d => d.r + 12))
            .on('tick', renderThinkingMap);
    }
    renderThinkingMap();
}

function openMindMapFull() {
    const seed = document.getElementById('thinking-input').value.trim();
    document.getElementById('mindmap-fullscreen').style.display = 'flex';
    document.body.style.overflow = 'hidden';

    _mindmapInited = false;
    thinkingG = null;
    initFullScreenMindMap();

    if (seed) {
        document.getElementById('mindmap-fs-input').value = seed;
        document.getElementById('thinking-input').value = '';
        expandMindMap(seed);
    }
}

function closeMindMapFull() {
    document.getElementById('mindmap-fullscreen').style.display = 'none';
    document.body.style.overflow = '';
    hideNodeTooltip();
}

function expandFromInput() {
    const seed = document.getElementById('mindmap-fs-input').value.trim();
    if (seed) expandMindMap(seed);
}

function renderThinkingMap() {
    if (!thinkingG) return;

    // Links
    const link = thinkingG.selectAll('.thinking-link')
        .data(thinkingLinks, d => `${d.source.id || d.source}-${d.target.id || d.target}`);

    link.enter().append('line')
        .attr('class', 'thinking-link')
        .attr('stroke', '#00fff966')
        .attr('stroke-width', 1.5)
        .merge(link)
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

    link.exit().remove();

    // Nodes
    const node = thinkingG.selectAll('.thinking-node')
        .data(thinkingNodes, d => d.id);

    const nodeEnter = node.enter().append('g')
        .attr('class', 'thinking-node')
        .call(d3.drag()
            .on('start', thinkDragStart)
            .on('drag', thinkDrag)
            .on('end', thinkDragEnd))
        .on('click', function(event, d) {
            event.stopPropagation();
            showNodeTooltip(event, d);
        });

    nodeEnter.append('circle')
        .attr('r', d => d.r)
        .attr('fill', d => d.isCenter ? 'rgba(255,255,255,0.15)' : d.color + '22')
        .attr('stroke', d => d.color)
        .attr('stroke-width', d => d.isCenter ? 2.5 : 1.5)
        .style('cursor', 'pointer');

    nodeEnter.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('fill', d => d.color)
        .attr('font-size', d => d.isCenter ? '0.6rem' : '0.52rem')
        .attr('font-family', 'Share Tech Mono')
        .style('pointer-events', 'none')
        .text(d => d.label.length > 18 ? d.label.substring(0, 18) + '…' : d.label);

    const nodeUpdate = nodeEnter.merge(node);
    nodeUpdate.attr('transform', d => `translate(${d.x},${d.y})`);

    node.exit().remove();
}

function showNodeTooltip(event, d) {
    const tooltip = document.getElementById('mindmap-node-tooltip');
    const labelEl = document.getElementById('tooltip-label');
    const expandBtn = document.getElementById('tooltip-expand-btn');

    labelEl.textContent = d.label;
    tooltip.style.display = 'flex';
    tooltip.style.left = Math.min(event.clientX + 12, window.innerWidth - 280) + 'px';
    tooltip.style.top = Math.min(event.clientY - 10, window.innerHeight - 80) + 'px';

    expandBtn.onclick = () => {
        hideNodeTooltip();
        document.getElementById('mindmap-fs-input').value = d.label;
        expandMindMap(d.label, d.id);
    };
}

function hideNodeTooltip() {
    document.getElementById('mindmap-node-tooltip').style.display = 'none';
}

async function expandMindMap(seedOverride, parentNodeId) {
    const input = document.getElementById('mindmap-fs-input') || document.getElementById('thinking-input');
    const seed = seedOverride || input.value.trim();
    if (!seed) return;

    const status = document.getElementById('mindmap-fs-status') || document.getElementById('mindmap-status');
    status.textContent = '⟳ AI expanding...';
    if (input && !seedOverride) input.value = '';

    // Fresh map — clear everything
    if (!parentNodeId) {
        thinkingNodes = [];
        thinkingLinks = [];
        thinkingNodeId = 0;
        selectedThinkingNode = null;
        if (thinkingG) thinkingG.selectAll('*').remove();
    }

    try {
        const resp = await fetch(`${CONFIG.apiBase}/api/mindmap/expand`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seed }),
        });
        const tree = await resp.json();
        if (tree.error) throw new Error(tree.error);

        const w = thinkingSvg._width || window.innerWidth;
        const h = thinkingSvg._height || window.innerHeight - 60;

        // Find parent node position (for expansion) or use center
        let anchorNode = null;
        if (parentNodeId !== undefined) {
            anchorNode = thinkingNodes.find(n => n.id === parentNodeId);
        }
        const cx = anchorNode ? anchorNode.x : w / 2;
        const cy = anchorNode ? anchorNode.y : h / 2;

        // Center/anchor node
        let centerNode;
        if (!parentNodeId) {
            centerNode = { id: thinkingNodeId++, label: tree.center, x: cx, y: cy, r: 32, color: '#ffffff', isCenter: true };
            thinkingNodes.push(centerNode);
        } else {
            centerNode = anchorNode; // expand FROM the clicked node
        }

        // Branches
        const branches = tree.branches || [];
        const angleOffset = Math.random() * Math.PI; // vary so expansions don't overlap
        branches.forEach((branch, bi) => {
            const angle = angleOffset + (bi / branches.length) * 2 * Math.PI;
            const dist = parentNodeId ? 140 : 170;
            const bx = cx + Math.cos(angle) * dist;
            const by = cy + Math.sin(angle) * dist;
            const branchNode = { id: thinkingNodeId++, label: branch.label, x: bx, y: by, r: 20, color: branch.color || '#00fff9' };
            thinkingNodes.push(branchNode);
            thinkingLinks.push({ source: centerNode.id, target: branchNode.id });

            (branch.children || []).forEach((child, ci) => {
                const spread = ((ci - (branch.children.length - 1) / 2) / branch.children.length) * 1.1;
                const childAngle = angle + spread;
                const childNode = {
                    id: thinkingNodeId++,
                    label: child.label,
                    x: bx + Math.cos(childAngle) * 110,
                    y: by + Math.sin(childAngle) * 110,
                    r: 13,
                    color: branch.color || '#00fff9'
                };
                thinkingNodes.push(childNode);
                thinkingLinks.push({ source: branchNode.id, target: childNode.id });
            });
        });

        updateThinkingSimulation();
        status.textContent = `✓ ${thinkingNodes.length} nodes · saved`;
        status.style.color = '#39ff14';

        // Hints
        const hints = tree.weaviate_hints || [];
        const hintsEl = document.getElementById('mindmap-hints');
        if (hints.length) {
            hintsEl.innerHTML = '<span style="color:#888;font-size:0.65rem">FROM YOUR KNOWLEDGE: </span>' +
                hints.map(h => `<span class="mindmap-hint-chip" onclick="expandMindMap('${h.substring(0,40).replace(/'/g,'').replace(/"/g,'')}')">
                    ${h.substring(0,55)}${h.length>55?'…':''}</span>`).join('');
        } else {
            hintsEl.innerHTML = '';
        }

        setTimeout(() => { status.textContent = ''; }, 4000);

    } catch(e) {
        status.textContent = '✗ ' + e.message;
        status.style.color = '#ff2a6d';
    }
}

function addThinkingNode() { addManualNode(); }

function addManualNode() {
    const input = document.getElementById('mindmap-fs-input') || document.getElementById('thinking-input');
    const text = input.value.trim();
    if (!text) return;

    const colors = ['#00fff9', '#ff00ff', '#39ff14', '#ffd700', '#ff2a6d', '#bc13fe', '#ff6a00'];
    const color = colors[thinkingNodeId % colors.length];
    const w = thinkingSvg._width || 800;
    const h = thinkingSvg._height || 600;

    const newNode = {
        id: thinkingNodeId++,
        label: text,
        x: w / 2 + (Math.random() - 0.5) * 300,
        y: h / 2 + (Math.random() - 0.5) * 300,
        r: Math.min(20, 12 + text.length * 0.3),
        color: color,
    };

    thinkingNodes.push(newNode);
    if (thinkingNodes.length > 1) {
        thinkingLinks.push({ source: thinkingNodes[thinkingNodes.length - 2].id, target: newNode.id });
    }
    input.value = '';
    updateThinkingSimulation();
}

async function openMindMapHistory() {
    const overlay = document.getElementById('mindmap-history-overlay');
    const list = document.getElementById('mindmap-history-list');
    overlay.style.display = 'flex';
    list.innerHTML = 'Loading...';

    try {
        const resp = await fetch(`${CONFIG.apiBase}/api/mindmap/history`);
        const data = await resp.json();
        const maps = data.maps || [];

        if (!maps.length) {
            list.innerHTML = '<div style="color:#666;font-style:italic">No saved mind maps yet. Expand your first idea!</div>';
            return;
        }

        list.innerHTML = maps.map(m => `
            <div class="archive-entry" onclick="loadMindMapFromHistory('${m.id}', this)" data-nodes='${m.nodes.replace(/'/g,"&#39;")}'>
                <div><span class="archive-entry-date">${m.title}</span></div>
                <div class="archive-entry-snippet">${m.created_at ? m.created_at.substring(0,10) : ''}</div>
            </div>`).join('');
    } catch(e) {
        list.innerHTML = '<div style="color:#f00">Error loading history.</div>';
    }
}

function closeMindMapHistory() {
    document.getElementById('mindmap-history-overlay').style.display = 'none';
}

function loadMindMapFromHistory(id, el) {
    closeMindMapHistory();
    const nodesJson = el.getAttribute('data-nodes');
    try {
        const tree = JSON.parse(nodesJson);
        document.getElementById('thinking-input').value = tree.center || '';
        expandMindMap();
    } catch(e) {}
}

function updateThinkingSimulation() {
    thinkingSimulation.nodes(thinkingNodes);
    thinkingSimulation.force('link').links(thinkingLinks);
    thinkingSimulation.alpha(0.5).restart();
}

function clearThinkingMap() {
    thinkingNodes = [];
    thinkingLinks = [];
    thinkingNodeId = 0;
    selectedThinkingNode = null;
    hideNodeTooltip();
    if (thinkingG) thinkingG.selectAll('*').remove();
    if (document.getElementById('mindmap-hints')) document.getElementById('mindmap-hints').innerHTML = '';
    if (thinkingSimulation) {
        thinkingSimulation.nodes(thinkingNodes);
        thinkingSimulation.force('link').links(thinkingLinks);
        thinkingSimulation.alpha(0).stop();
    }
}

function thinkDragStart(event, d) {
    if (!event.active) thinkingSimulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function thinkDrag(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function thinkDragEnd(event, d) {
    if (!event.active) thinkingSimulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

