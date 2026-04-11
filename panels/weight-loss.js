/* weight-loss.js — Weight Loss panel + chart */
// =============================================================================
// WEIGHT LOSS PANEL
// =============================================================================

async function loadWeightLoss() {
    try {
        const [weightRes, coachRes] = await Promise.all([
            fetch(`${CONFIG.apiBase}/api/weight`),
            fetch(`${CONFIG.apiBase}/api/weight-coach`),
        ]);
        const weightData = await weightRes.json();
        const coachData  = coachRes.ok ? await coachRes.json() : null;
        renderWeightPanel(weightData, coachData);
    } catch (e) {
        console.error('Weight load failed:', e);
    }
}

function renderWeightPanel(data, coachData) {
    const entries = data.entries || [];
    const startWeight = data.start_weight || 382;

    if (entries.length === 0) return;

    const current = entries[entries.length - 1].weight;
    const lost = +(startWeight - current).toFixed(1);

    document.getElementById('weight-start').textContent = `${startWeight} lbs`;
    document.getElementById('weight-current').textContent = `${current} lbs`;
    document.getElementById('weight-lost').textContent = lost > 0 ? `-${lost} lbs` : `${lost} lbs`;

    renderWeightChart(entries, startWeight);

    // Coach brain output
    if (coachData && coachData.status === 'ok') {
        const msg = document.getElementById('weight-coach-msg');
        if (msg) msg.textContent = coachData.message || '';

        const proj = coachData.data?.projected_goal_date;
        const projBox = document.getElementById('weight-projection');
        const projVal = document.getElementById('weight-proj-val');
        if (projBox && projVal && proj) {
            projVal.textContent = `200 lbs by ${proj}`;
            projBox.style.display = 'flex';
        }
    }
}

function renderWeightChart(entries, startWeight) {
    const svg = d3.select('#weight-chart');
    svg.selectAll('*').remove();

    const container = document.getElementById('weight-chart');
    const W = container.clientWidth || 300;
    const H = 160;
    const margin = { top: 10, right: 16, bottom: 30, left: 42 };
    const width = W - margin.left - margin.right;
    const height = H - margin.top - margin.bottom;

    svg.attr('width', W).attr('height', H);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const weights = entries.map(e => e.weight);
    const minW = Math.min(...weights) - 5;
    const maxW = startWeight + 2;

    const x = d3.scalePoint()
        .domain(entries.map((_, i) => i))
        .range([0, width])
        .padding(0.5);

    const y = d3.scaleLinear()
        .domain([minW, maxW])
        .range([height, 0]);

    // Grid lines
    g.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(4).tickSize(-width).tickFormat(d => `${d}`))
        .call(ax => ax.select('.domain').remove())
        .call(ax => ax.selectAll('.tick line').attr('stroke', 'rgba(0,255,255,0.1)').attr('stroke-dasharray', '3 3'));

    // X axis — show date labels (just month/day)
    const xLabels = entries.map(e => {
        const d = new Date(e.date + 'T00:00:00');
        return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    g.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(i => xLabels[i]))
        .call(ax => ax.select('.domain').remove());

    // Line
    const line = d3.line()
        .x((d, i) => x(i))
        .y(d => y(d.weight))
        .curve(d3.curveMonotoneX);

    g.append('path')
        .datum(entries)
        .attr('fill', 'none')
        .attr('stroke', 'var(--neon-cyan)')
        .attr('stroke-width', 2)
        .attr('d', line);

    // Dots
    g.selectAll('.dot')
        .data(entries)
        .enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('cx', (d, i) => x(i))
        .attr('cy', d => y(d.weight))
        .attr('r', 4)
        .attr('fill', 'var(--neon-cyan)')
        .attr('stroke', '#0a0a0f')
        .attr('stroke-width', 1.5)
        .append('title')
        .text(d => `${d.date}: ${d.weight} lbs`);

    // Start weight reference line
    g.append('line')
        .attr('class', 'goal-line')
        .attr('x1', 0).attr('x2', width)
        .attr('y1', y(startWeight)).attr('y2', y(startWeight));

    // Start weight label
    g.append('text')
        .attr('x', width - 2)
        .attr('y', y(startWeight) - 3)
        .attr('text-anchor', 'end')
        .attr('fill', 'rgba(255,100,100,0.8)')
        .attr('font-size', '8px')
        .attr('font-family', 'Share Tech Mono')
        .text(`START ${startWeight}`);
}

async function logWeight() {
    const input = document.getElementById('weight-input');
    const weight = parseFloat(input.value);
    if (!weight || weight < 100 || weight > 500) {
        input.style.borderColor = '#ff4444';
        setTimeout(() => input.style.borderColor = '', 1500);
        return;
    }
    try {
        const res = await fetch(`${CONFIG.apiBase}/api/weight`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weight }),
        });
        const data = await res.json();
        input.value = '';
        renderWeightPanel(data, null);
        // Brain will pick up the new entry within 5 min — poll sooner
        setTimeout(loadWeightLoss, 8000);
    } catch (e) {
        console.error('Weight log failed:', e);
    }
}

