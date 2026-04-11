/* mega-construction.js — MEGA-SHANEBRAIN humanoid construction panel */
// MEGA-SHANEBRAIN CONSTRUCTION PANEL
// =============================================================================

const MEGA = {
    svgEl: null,
    zones: {
        brain:     { cx:200, cy:72,  r:45, botR:68, pct:0, complete:false, pitchBase:660, color:'#00ffff', bots:['Sparky','Volt','Neon','Glitch'] },
        leftHand:  { cx:78,  cy:244, r:18, botR:38, pct:0, complete:false, pitchBase:440, color:'#00ffcc', bots:['Rivet','Torch','Weld']          },
        rightHand: { cx:322, cy:244, r:18, botR:38, pct:0, complete:false, pitchBase:550, color:'#00ccff', bots:['Blaze','Arc','Flux']             },
        leftFoot:  { cx:155, cy:382, r:22, botR:44, pct:0, complete:false, pitchBase:220, color:'#00ffaa', bots:['Bolt','Stomp','Grind']           },
        rightFoot: { cx:245, cy:382, r:22, botR:44, pct:0, complete:false, pitchBase:330, color:'#aaffcc', bots:['Crank','Spike','Forge']          },
    },
    bots: {},         // name → {el, x, y, zoneId, torchAngle}
    sparkTimers: [],
    audioCtx: null,
    megaActive: false,
    sessionId: 'mega-' + Date.now(),
    glitchTimeout: null,
};

function svgNs(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k, v));
    return el;
}

function initMegaPanel() {
    MEGA.svgEl = document.getElementById('mega-svg');
    if (!MEGA.svgEl) return;
    drawMegaHumanoid();
    placeAllMegaBots();
    startMegaSparks();
    scheduleBrushOff();
    updateMegaMetrics();
    setInterval(updateMegaMetrics, 30000);
    updateBotAnimationState();
    setInterval(updateBotAnimationState, 15000);
    addMegaLog('Construction started. 17 bots on site.');
}

// ── Draw humanoid skeleton ──────────────────────────────────────────────────

function drawMegaHumanoid() {
    const svg = MEGA.svgEl;
    const S = '#00ffff', sw = '1.8', fill = 'none';

    // Defs: glow filters + scanline pattern
    const defs = svgNs('defs');
    Object.keys(MEGA.zones).forEach(id => {
        const f = svgNs('filter', { id:`mgf-${id}`, x:'-80%', y:'-80%', width:'260%', height:'260%' });
        const b = svgNs('feGaussianBlur', { in:'SourceGraphic', stdDeviation:'6', result:'b' });
        const m = svgNs('feMerge');
        [svgNs('feMergeNode',{in:'b'}), svgNs('feMergeNode',{in:'SourceGraphic'})].forEach(n=>m.appendChild(n));
        f.appendChild(b); f.appendChild(m);
        defs.appendChild(f);
    });
    svg.appendChild(defs);

    // Body skeleton group
    const g = svgNs('g', { id:'mega-skeleton' });
    const line = (x1,y1,x2,y2) => g.appendChild(svgNs('line',{x1,y1,x2,y2,stroke:S,'stroke-width':sw}));

    // Head
    g.appendChild(svgNs('circle', {cx:'200',cy:'72',r:'45',stroke:S,'stroke-width':sw,fill:'rgba(0,255,255,0.04)',id:'zone-brain'}));
    // Neck
    g.appendChild(svgNs('rect', {x:'188',y:'117',width:'24',height:'22',stroke:S,'stroke-width':sw,fill}));
    // Torso
    g.appendChild(svgNs('rect', {x:'150',y:'139',width:'100',height:'105',stroke:S,'stroke-width':sw,fill:'rgba(0,255,255,0.02)',rx:'4'}));
    // Arms
    line(150,158,90,212); line(90,212,78,238);
    line(250,158,310,212); line(310,212,322,238);
    // Hands (zones)
    g.appendChild(svgNs('circle', {cx:'78',cy:'244',r:'18',stroke:S,'stroke-width':sw,fill:'rgba(0,255,255,0.04)',id:'zone-leftHand'}));
    g.appendChild(svgNs('circle', {cx:'322',cy:'244',r:'18',stroke:S,'stroke-width':sw,fill:'rgba(0,255,255,0.04)',id:'zone-rightHand'}));
    // Hips & legs
    line(175,244,225,244);
    line(185,244,168,318); line(168,318,155,374);
    line(215,244,232,318); line(232,318,245,374);
    // Feet (zones)
    g.appendChild(svgNs('ellipse', {cx:'155',cy:'382',rx:'28',ry:'12',stroke:S,'stroke-width':sw,fill:'rgba(0,255,255,0.04)',id:'zone-leftFoot'}));
    g.appendChild(svgNs('ellipse', {cx:'245',cy:'382',rx:'28',ry:'12',stroke:S,'stroke-width':sw,fill:'rgba(0,255,255,0.04)',id:'zone-rightFoot'}));

    svg.appendChild(g);

    // Zone glow overlays
    const glows = svgNs('g', {id:'mega-glows'});
    Object.entries(MEGA.zones).forEach(([id, z]) => {
        let el;
        if (id==='leftFoot'||id==='rightFoot') el = svgNs('ellipse',{cx:z.cx,cy:z.cy,rx:'28',ry:'12',fill:z.color,opacity:'0.04',id:`mglow-${id}`});
        else el = svgNs('circle',{cx:z.cx,cy:z.cy,r:z.r,fill:z.color,opacity:'0.04',id:`mglow-${id}`});
        glows.appendChild(el);
    });
    svg.appendChild(glows);

    // MEGA face (hidden until activation) — pixel art style
    const face = svgNs('g', {id:'mega-face',opacity:'0',transform:'translate(200,72)'});
    // Eye whites
    [[-16,-12],[8,-12]].forEach(([ex,ey])=>{
        face.appendChild(svgNs('rect',{x:ex,y:ey,width:'14',height:'9',fill:'#00ffff',rx:'2',class:'mega-eye'}));
        // Pupil
        face.appendChild(svgNs('rect',{x:ex+4,y:ey+2,width:'5',height:'5',fill:'#001133',rx:'1'}));
    });
    // Nose
    face.appendChild(svgNs('rect',{x:'-3',y:'3',width:'6',height:'5',fill:'rgba(0,255,255,0.5)'}));
    // Mouth (animates when talking)
    face.appendChild(svgNs('rect',{x:'-16',y:'16',width:'32',height:'6',fill:'#00ffff',rx:'3',id:'mega-mouth'}));
    // Teeth lines
    [-8,0,8].forEach(tx => face.appendChild(svgNs('line',{x1:tx,y1:16,x2:tx,y2:22,stroke:'#001133','stroke-width':'1'})));
    // Scanlines overlay
    const scanRect = svgNs('rect',{x:'-45',y:'-45',width:'90',height:'90',fill:'none',stroke:'none',id:'mega-scanlines',opacity:'0.35'});
    face.appendChild(scanRect);
    svg.appendChild(face);

    // Welding sparks layer (top)
    svg.appendChild(svgNs('g', {id:'mega-sparks'}));
}

// ── Bot placement ───────────────────────────────────────────────────────────

function placeAllMegaBots() {
    const svg = MEGA.svgEl;
    const botsG = svgNs('g', {id:'mega-bots'});

    Object.entries(MEGA.zones).forEach(([zoneId, zone]) => {
        const n = zone.bots.length;
        const startAngles = { brain:-150, leftHand:130, rightHand:50, leftFoot:200, rightFoot:340 };
        const spread =      { brain:300,  leftHand:100, rightHand:100, leftFoot:100, rightFoot:100 };

        zone.bots.forEach((name, i) => {
            const angleDeg = startAngles[zoneId] + (i / Math.max(n-1,1)) * spread[zoneId];
            const rad = angleDeg * Math.PI / 180;
            const bx = zone.cx + zone.botR * Math.cos(rad);
            const by = zone.cy + zone.botR * Math.sin(rad);
            const torchAngle = Math.atan2(zone.cy - by, zone.cx - bx);

            const el = createMegaBot(name, bx, by, torchAngle);
            botsG.appendChild(el);
            MEGA.bots[name] = { el, x:bx, y:by, zoneId, torchAngle };
        });
    });

    svg.appendChild(botsG);
}

function createMegaBot(name, x, y, torchAngle) {
    const g = svgNs('g', {
        id: `mbot-${name}`,
        transform: `translate(${x.toFixed(1)},${y.toFixed(1)})`,
        style: 'cursor:pointer',
        class: 'mega-bot'
    });

    const title = svgNs('title');
    title.textContent = name;
    g.appendChild(title);

    // Sway animation
    const sway = svgNs('animateTransform', {
        attributeName: 'transform', type: 'rotate',
        from: `-4 0 5`, to: `4 0 5`,
        dur: (1.5 + Math.random() * 1.5).toFixed(1) + 's',
        repeatCount: 'indefinite', additive: 'sum',
        begin: (-Math.random() * 2).toFixed(1) + 's',
    });
    g.appendChild(sway);

    // Halo glow (pulsing ring — animates with zone activity)
    const halo = svgNs('circle', { cx:'0', cy:'-3', r:'12', fill:'none',
        stroke:'#00ffff', 'stroke-width':'1.2', opacity:'0', id:`mhalo-${name}`,
        class:'mega-halo' });
    const haloAnim = svgNs('animate', { attributeName:'r',
        values:'10;16;10', dur: (2 + Math.random()).toFixed(1)+'s',
        repeatCount:'indefinite' });
    const haloFade = svgNs('animate', { attributeName:'opacity',
        values:'0.6;0;0.6', dur: (2 + Math.random()).toFixed(1)+'s',
        repeatCount:'indefinite' });
    halo.appendChild(haloAnim);
    halo.appendChild(haloFade);
    g.appendChild(halo);

    // Body (minion capsule shape)
    g.appendChild(svgNs('ellipse', { cx:'0', cy:'3', rx:'6', ry:'8',
        fill:'#1a3388', stroke:'#4488ff', 'stroke-width':'0.8', id:`mbody-${name}` }));
    // Overalls stripe
    g.appendChild(svgNs('rect', { x:'-6', y:'1', width:'12', height:'4',
        fill:'#4400aa', opacity:'0.6' }));
    // Head
    g.appendChild(svgNs('circle', { cx:'0', cy:'-8', r:'6',
        fill:'#2255dd', stroke:'#77aaff', 'stroke-width':'0.7', id:`mhead-${name}` }));
    // Goggles (minion eyes)
    g.appendChild(svgNs('ellipse', { cx:'-2.5', cy:'-8.5', rx:'2.2', ry:'2.2',
        fill:'#ccddff', stroke:'#00ffff', 'stroke-width':'0.5', id:`meye1-${name}` }));
    g.appendChild(svgNs('circle', { cx:'-2.5', cy:'-8.5', r:'1',
        fill:'#0000ff', id:`mpupil1-${name}` }));
    g.appendChild(svgNs('ellipse', { cx:'2.5', cy:'-8.5', rx:'2.2', ry:'2.2',
        fill:'#ccddff', stroke:'#00ffff', 'stroke-width':'0.5', id:`meye2-${name}` }));
    g.appendChild(svgNs('circle', { cx:'2.5', cy:'-8.5', r:'1',
        fill:'#0000ff', id:`mpupil2-${name}` }));
    // Goggle strap
    g.appendChild(svgNs('line', { x1:'-4.8', y1:'-8.5', x2:'4.8', y2:'-8.5',
        stroke:'#888', 'stroke-width':'0.8' }));

    // Torch arm
    const armLen = 14;
    const tx = (3 + Math.cos(torchAngle) * armLen).toFixed(1);
    const ty = (Math.sin(torchAngle) * armLen).toFixed(1);
    g.appendChild(svgNs('line', { x1:'3', y1:'0', x2: tx, y2: ty,
        stroke:'#999', 'stroke-width':'1.8', 'stroke-linecap':'round' }));
    // Torch body (cylinder)
    g.appendChild(svgNs('rect', { x:(parseFloat(tx)-2.5).toFixed(1),
        y:(parseFloat(ty)-5).toFixed(1), width:'5', height:'8',
        fill:'#444', stroke:'#777', 'stroke-width':'0.5', rx:'1.5' }));

    // Flame outer (animated)
    const flameOuter = svgNs('ellipse', {
        cx: tx, cy: (parseFloat(ty) - 8).toFixed(1),
        rx:'4', ry:'6', fill:'#ff6600',
        id: `mflame-${name}`, class:'mega-flame'
    });
    const flameAnimOp = svgNs('animate', {
        attributeName:'opacity',
        values:'0.9;0.6;1.0;0.7;0.9',
        dur: (0.12 + Math.random()*0.08).toFixed(3)+'s',
        repeatCount:'indefinite'
    });
    const flameAnimRy = svgNs('animate', {
        attributeName:'ry',
        values:'5;7;5;6;5',
        dur: (0.15 + Math.random()*0.1).toFixed(3)+'s',
        repeatCount:'indefinite'
    });
    flameOuter.appendChild(flameAnimOp);
    flameOuter.appendChild(flameAnimRy);
    g.appendChild(flameOuter);

    // Flame inner (hot core)
    const flameInner = svgNs('ellipse', {
        cx: tx, cy: (parseFloat(ty) - 7).toFixed(1),
        rx:'2', ry:'3.5', fill:'#ffee00', opacity:'0.9',
        id: `mflame-inner-${name}`
    });
    const innerAnim = svgNs('animate', {
        attributeName:'ry',
        values:'3;4.5;3;3.8;3',
        dur: (0.11 + Math.random()*0.08).toFixed(3)+'s',
        repeatCount:'indefinite'
    });
    flameInner.appendChild(innerAnim);
    g.appendChild(flameInner);

    // Name label (small, above head)
    const nameLabel = svgNs('text', {
        x:'0', y:'-17', 'text-anchor':'middle',
        'font-family':'Share Tech Mono, monospace',
        'font-size':'3.5', fill:'rgba(0,255,255,0.7)',
        'pointer-events':'none', id:`mname-${name}`
    });
    nameLabel.textContent = name.toUpperCase();
    g.appendChild(nameLabel);

    // Action text (what bot is doing)
    const actionLabel = svgNs('text', {
        x:'0', y:'18', 'text-anchor':'middle',
        'font-family':'Share Tech Mono, monospace',
        'font-size':'2.8', fill:'rgba(255,255,100,0.55)',
        'pointer-events':'none', id:`maction-${name}`
    });
    actionLabel.textContent = 'init...';
    g.appendChild(actionLabel);

    return g;
}

// ── Spark emitter ───────────────────────────────────────────────────────────

function startMegaSparks() {
    Object.entries(MEGA.bots).forEach(([name, bot]) => {
        const interval = 250 + Math.random()*600;
        const t = setInterval(() => {
            const zone = MEGA.zones[bot.zoneId];
            if (!zone || zone.pct < 3) return;
            // Scale spark count to zone activity: 1 spark normally, 2-3 when zone is hot
            const count = zone.pct >= 80 ? 3 : zone.pct >= 40 ? 2 : 1;
            for (let i = 0; i < count; i++) emitMegaSpark(bot, zone.pct);
        }, interval);
        MEGA.sparkTimers.push(t);
    });
}

function emitMegaSpark(bot, pct = 50) {
    const sparksG = document.getElementById('mega-sparks');
    if (!sparksG) return;
    const armLen = 13;
    const tx = bot.x + 3 + Math.cos(bot.torchAngle)*armLen;
    const ty = bot.y + Math.sin(bot.torchAngle)*armLen - 6;

    const particles = pct >= 60 ? 3 : 2;
    const colors = pct >= 80 ? ['#ffcc00','#ff8800','#ffffff'] : ['#ffcc00','#ff8800'];
    for (let i = 0; i < particles; i++) {
        const r = (0.8 + (pct/100)*0.9).toFixed(1);
        const fill = colors[Math.floor(Math.random()*colors.length)];
        const s = svgNs('circle',{cx:tx,cy:ty,r,fill,opacity:'1'});
        sparksG.appendChild(s);
        const spread = 12 + (pct/100)*16;
        const dx = (Math.random()-0.5)*spread*1.8;
        const dy = -Math.random()*spread-4;
        let frame=0, total=14+Math.floor(Math.random()*8);
        const animate = ()=>{
            frame++;
            const p = frame/total;
            s.setAttribute('cx', tx + dx*p);
            s.setAttribute('cy', ty + dy*p + 12*p*p);
            s.setAttribute('opacity', (1-p).toFixed(2));
            if(frame<total) requestAnimationFrame(animate); else s.remove();
        };
        requestAnimationFrame(animate);
    }
}

// ── Weld commit burst ────────────────────────────────────────────────────────

function triggerWeldBurst() {
    const bot = MEGA.bots['Weld'];
    if (!bot) return;
    for (let i = 0; i < 20; i++) {
        setTimeout(() => emitMegaSpark(bot, 100), i * 55);
    }
    const glow = document.getElementById('mglow-leftHand');
    if (glow) {
        const orig = glow.getAttribute('opacity') || '0.04';
        glow.setAttribute('opacity', '0.65');
        setTimeout(() => glow.setAttribute('opacity', orig), 900);
    }
    addMegaLog('Weld committed a new instruction update!');
}

// ── Bot animation state (status, action text, halo, eyes) ───────────────────

async function updateBotAnimationState() {
    try {
        const mb = await fetch(`${CONFIG.apiBase}/api/mega-brain`)
            .then(r => r.ok ? r.json() : null).catch(() => null);
        if (!mb?.bots) return;

        // Detect new Weld commit
        const weldLog = mb.weld_log || [];
        const latestWeld = weldLog[0]?.timestamp || '';
        if (latestWeld && latestWeld !== (window._lastWeldTs || '')) {
            window._lastWeldTs = latestWeld;
            triggerWeldBurst();
        }

        mb.bots.forEach(bot => {
            const name = bot.name;
            const status = (bot.status || 'UNKNOWN').toUpperCase();
            const action = bot.last_action || '';

            // Action text label
            const actionEl = document.getElementById(`maction-${name}`);
            if (actionEl && action) {
                actionEl.textContent = action.length > 22 ? action.slice(0, 20) + '…' : action;
            }

            // Colors by status
            const halo   = document.getElementById(`mhalo-${name}`);
            const eye1   = document.getElementById(`meye1-${name}`);
            const eye2   = document.getElementById(`meye2-${name}`);
            const pupil1 = document.getElementById(`mpupil1-${name}`);
            const pupil2 = document.getElementById(`mpupil2-${name}`);

            if (status === 'ACTIVE') {
                if (halo)   { halo.setAttribute('stroke', '#00ffff');   halo.setAttribute('opacity', '0.85'); }
                if (eye1)   eye1.setAttribute('stroke', '#00ffff');
                if (eye2)   eye2.setAttribute('stroke', '#00ffff');
                if (pupil1) pupil1.setAttribute('fill', '#0044ff');
                if (pupil2) pupil2.setAttribute('fill', '#0044ff');
            } else if (status === 'ERROR') {
                if (halo)   { halo.setAttribute('stroke', '#ff3300');   halo.setAttribute('opacity', '0.75'); }
                if (eye1)   eye1.setAttribute('stroke', '#ff3300');
                if (eye2)   eye2.setAttribute('stroke', '#ff3300');
                if (pupil1) pupil1.setAttribute('fill', '#ff0000');
                if (pupil2) pupil2.setAttribute('fill', '#ff0000');
            } else if (status === 'IDLE' || status === 'SLEEPING' || status === 'NOT_STARTED') {
                if (halo)   { halo.setAttribute('stroke', '#004466');   halo.setAttribute('opacity', '0.15'); }
                if (eye1)   eye1.setAttribute('stroke', '#005577');
                if (eye2)   eye2.setAttribute('stroke', '#005577');
                if (pupil1) pupil1.setAttribute('fill', '#001144');
                if (pupil2) pupil2.setAttribute('fill', '#001144');
            } else {
                if (halo)   { halo.setAttribute('stroke', '#00aacc');   halo.setAttribute('opacity', '0.35'); }
            }
        });
    } catch(e) { console.error('updateBotAnimationState:', e); }
}

// ── Zone progress & glow ────────────────────────────────────────────────────

function setZoneProgress(zoneId, pct) {
    const zone = MEGA.zones[zoneId];
    if (!zone) return;
    const was = zone.complete;
    zone.pct = Math.min(100, Math.max(0, pct));
    const frac = zone.pct / 100;

    // Glow intensity
    const glow = document.getElementById(`mglow-${zoneId}`);
    if (glow) glow.setAttribute('opacity', (0.04 + frac*0.38).toFixed(2));

    // Zone stroke brightness
    const zEl = document.getElementById(`zone-${zoneId}`);
    if (zEl) {
        zEl.setAttribute('stroke-opacity', (0.35 + frac*0.65).toFixed(2));
        zEl.setAttribute('stroke-width', (1.8 + frac*3.2).toFixed(1));
    }

    // Progress bar
    const bar = document.getElementById(`zone-bar-${zoneId}`);
    if (bar) { bar.style.width = zone.pct+'%'; if(zone.pct>=100) bar.classList.add('complete'); }
    const pctEl = document.getElementById(`zone-pct-${zoneId}`);
    if (pctEl) pctEl.textContent = Math.round(zone.pct)+'%';

    // Completion
    if (zone.pct >= 100 && !was) {
        zone.complete = true;
        setTimeout(()=>triggerZoneComplete(zoneId), 400);
    }

    // Overall %
    const overall = Math.round(Object.values(MEGA.zones).reduce((s,z)=>s+z.pct,0)/5);
    const overallEl = document.getElementById('mega-overall-pct');
    if (overallEl && !MEGA.megaActive) overallEl.textContent = `${overall}% COMPLETE · 16 BOTS WORKING`;

    // Check all zones done
    if (!MEGA.megaActive && Object.values(MEGA.zones).every(z=>z.complete)) {
        setTimeout(activateMega, 2500);
    }
}

// ── Data fetch → zone percentages ──────────────────────────────────────────

async function updateMegaMetrics() {
    // Max bots per zone (must match MEGA.zones definitions above)
    const ZONE_MAX = { brain:4, leftHand:3, rightHand:4, leftFoot:3, rightFoot:3 };
    try {
        const mb = await fetch(`${CONFIG.apiBase}/api/mega-brain`)
            .then(r => r.ok ? r.json() : null).catch(() => null);

        if (mb?.zone_activity && Object.keys(mb.zone_activity).length > 0) {
            // Drive zone progress from real bot activity counts (0–maxBots = 0–100%)
            Object.entries(ZONE_MAX).forEach(([zoneId, maxBots]) => {
                const active = mb.zone_activity[zoneId] || 0;
                setZoneProgress(zoneId, (active / maxBots) * 100);
            });
        } else {
            // Fallback: watchdog service health drives zone brightness
            const wd = await fetch(`${CONFIG.apiBase}/api/watchdog`)
                .then(r => r.ok ? r.json() : null).catch(() => null);
            if (wd?.services) {
                const frac = wd.services.filter(s => ['active','healed'].includes(s.status)).length
                             / Math.max(wd.services.length, 1);
                Object.keys(ZONE_MAX).forEach(zoneId => setZoneProgress(zoneId, frac * 75));
            }
        }
    } catch(e) { console.error('MEGA metrics:', e); }
}

// ── Zone completion — THE CHAOS ─────────────────────────────────────────────

function triggerZoneComplete(zoneId) {
    const zone = MEGA.zones[zoneId];
    playMegaChime(zone.pitchBase);

    // Lock zone to green
    const glow = document.getElementById(`mglow-${zoneId}`);
    if (glow) { glow.setAttribute('fill','#00ff88'); glow.setAttribute('opacity','0.3'); }
    const zEl = document.getElementById(`zone-${zoneId}`);
    if (zEl) { zEl.setAttribute('stroke','#00ff88'); }

    addMegaLog(`✓ ${zoneId} crew locked. ${zone.bots.join(', ')} GOING WILD.`);

    // Each bot does something chaotic
    zone.bots.forEach((name, i) => {
        const bot = MEGA.bots[name];
        if (!bot) return;
        setTimeout(()=> miniOnChaos(bot, i), i*180 + Math.random()*200);
    });
}

function miniOnChaos(bot, seed) {
    const el = bot.el;
    const {x, y} = bot;
    const behaviors = [chaosJump, chaosCircle, chaosBump, chaosSpin];
    behaviors[seed % 4](el, x, y, ()=>{
        // Restore after chaos
        el.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
    });
}

function chaosJump(el, x, y, done) {
    let j=0;
    const jump = ()=>{
        el.setAttribute('transform', `translate(${x},${y-20}) scale(1.3)`);
        setTimeout(()=>{ el.setAttribute('transform',`translate(${x},${y})`); if(++j<5) setTimeout(jump,250); else done(); },180);
    };
    jump();
}

function chaosCircle(el, x, y, done) {
    let a=0;
    const t = setInterval(()=>{
        a+=25;
        const rx=x+Math.cos(a*Math.PI/180)*14, ry=y+Math.sin(a*Math.PI/180)*14;
        el.setAttribute('transform',`translate(${rx.toFixed(1)},${ry.toFixed(1)})`);
        if(a>=360){ clearInterval(t); done(); }
    }, 60);
}

function chaosBump(el, x, y, done) {
    const fx=x+(Math.random()-0.5)*40, fy=y-22;
    el.setAttribute('transform',`translate(${fx.toFixed(1)},${fy.toFixed(1)}) rotate(60,${fx},${fy})`);
    setTimeout(()=>{ el.setAttribute('transform',`translate(${fx.toFixed(1)},${fy+32})`); setTimeout(done,600); },400);
}

function chaosSpin(el, x, y, done) {
    let r=0;
    const t = setInterval(()=>{
        r+=40;
        el.setAttribute('transform',`translate(${x},${y}) rotate(${r},${x},${y})`);
        if(r>=720){ clearInterval(t); done(); }
    },50);
}

// ── Chime — like sunlight breaking through ──────────────────────────────────

function playMegaChime(baseFreq) {
    try {
        if (!MEGA.audioCtx) MEGA.audioCtx = new (window.AudioContext||window.webkitAudioContext)();
        const ctx = MEGA.audioCtx;
        const now = ctx.currentTime;
        const freqs = [baseFreq, baseFreq*2, baseFreq*4, baseFreq*3];
        const gains = [0.28, 0.20, 0.14, 0.10];
        const decays = [4.5, 3.5, 2.5, 2.0];

        freqs.forEach((f, i)=>{
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = i===3 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(f, now);
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(gains[i], now+0.03+i*0.04);
            g.gain.exponentialRampToValueAtTime(0.0001, now+decays[i]);
            osc.connect(g); g.connect(ctx.destination);
            osc.start(now+i*0.05);
            osc.stop(now+decays[i]+0.1);
        });
    } catch(e) { console.error('Chime:', e); }
}

function playMegaFullCascade() {
    const zones = ['leftFoot','rightFoot','leftHand','rightHand','brain'];
    zones.forEach((z,i)=> setTimeout(()=>playMegaChime(MEGA.zones[z].pitchBase), i*320));
    // Final shimmer
    setTimeout(()=>{
        const ctx = MEGA.audioCtx;
        if (!ctx) return;
        const now = ctx.currentTime;
        [1320,1760,2200].forEach((f,i)=>{
            const osc=ctx.createOscillator(), g=ctx.createGain();
            osc.type='sine'; osc.frequency.value=f;
            g.gain.setValueAtTime(0,now); g.gain.linearRampToValueAtTime(0.08,now+0.1); g.gain.exponentialRampToValueAtTime(0.0001,now+5);
            osc.connect(g); g.connect(ctx.destination);
            osc.start(now+i*0.1); osc.stop(now+6);
        });
    }, 2200);
}

// ── Brush-off system ────────────────────────────────────────────────────────

function scheduleBrushOff() {
    const delay = 20000 + Math.random()*22000;
    setTimeout(()=>{ executeBrushOff(); scheduleBrushOff(); }, delay);
}

function executeBrushOff() {
    const names = Object.keys(MEGA.bots);
    const victim = names[Math.floor(Math.random()*names.length)];
    const bot = MEGA.bots[victim];
    if (!bot) return;

    const {el, x, y} = bot;
    const dir = x < 200 ? -1 : 1;
    const fx = x + dir*(35+Math.random()*25);
    const fy = y - 18;

    // Arm swipe on figure (brief)
    const armEl = document.getElementById(dir<0 ? 'zone-leftHand' : 'zone-rightHand');
    if (armEl) { armEl.setAttribute('stroke','#ffffff'); setTimeout(()=>armEl.setAttribute('stroke','#00ffff'),400); }

    // Bot flies
    el.setAttribute('transform', `translate(${fx.toFixed(1)},${fy.toFixed(1)}) rotate(${dir*80},${fx},${fy})`);
    setTimeout(()=>el.setAttribute('transform',`translate(${fx.toFixed(1)},${(fy+28).toFixed(1)})`), 320);
    setTimeout(()=>el.setAttribute('transform',`translate(${fx.toFixed(1)},${(fy+28).toFixed(1)})`), 700);
    setTimeout(()=>el.setAttribute('transform',`translate(${x.toFixed(1)},${y.toFixed(1)})`), 1600);

    addMegaLog(`${victim} got brushed off. Back in 3...2...1.`);
}

// ── MEGA activation ─────────────────────────────────────────────────────────

function activateMega() {
    if (MEGA.megaActive) return;
    MEGA.megaActive = true;

    playMegaFullCascade();

    // Reveal face
    const face = document.getElementById('mega-face');
    if (face) {
        let op=0;
        const fadeIn = setInterval(()=>{
            op = Math.min(1, op+0.05);
            face.setAttribute('opacity', op.toFixed(2));
            if (op>=1) { clearInterval(fadeIn); startMegaGlitchCycle(); }
        }, 60);
    }

    // Title + subtitle
    const t = document.getElementById('mega-panel-title');
    if (t) t.textContent = 'MEGA-SHANEBRAIN';
    const s = document.getElementById('mega-overall-pct');
    if (s) s.textContent = '100% · ONLINE · TALK TO ME';

    // SVG glow
    MEGA.svgEl?.classList.add('activated');

    // Show chat
    const chatSec = document.getElementById('mega-chat-section');
    if (chatSec) chatSec.style.display = 'flex';

    // Start mouth idle
    setInterval(megaMouthIdle, 3500+Math.random()*3000);

    addMegaLog('⚡ MEGA-SHANEBRAIN IS ALIVE. Say something.');
}

function megaMouthIdle() {
    const m = document.getElementById('mega-mouth');
    if (!m) return;
    m.setAttribute('height','3');
    setTimeout(()=>m.setAttribute('height','8'), 250);
    setTimeout(()=>m.setAttribute('height','2'), 500);
    setTimeout(()=>m.setAttribute('height','6'), 750);
}

function startMegaGlitchCycle() {
    const glitch = ()=>{
        const face = document.getElementById('mega-face');
        if (!face) return;
        face.setAttribute('class','mega-face-glitch');
        setTimeout(()=>face.removeAttribute('class'), 220);
        MEGA.glitchTimeout = setTimeout(glitch, 4000+Math.random()*9000);
    };
    MEGA.glitchTimeout = setTimeout(glitch, 3000);
}

// ── Log helper ──────────────────────────────────────────────────────────────

function addMegaLog(msg) {
    const log = document.getElementById('mega-log');
    if (!log) return;
    const div = document.createElement('div');
    div.className = 'mega-log-line';
    const ts = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    div.textContent = `[${ts}] ${msg}`;
    log.insertBefore(div, log.firstChild);
    while (log.children.length > 10) log.removeChild(log.lastChild);
}

// ── Chat interface ───────────────────────────────────────────────────────────

async function sendMegaMessage() {
    const input  = document.getElementById('mega-chat-input');
    const output = document.getElementById('mega-chat-output');
    if (!input || !output) return;
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';

    const userDiv = document.createElement('div');
    userDiv.className = 'mega-chat-line user';
    userDiv.textContent = '> ' + msg;
    output.appendChild(userDiv);

    const typingDiv = document.createElement('div');
    typingDiv.className = 'mega-chat-line typing';
    typingDiv.id = 'mega-typing';
    typingDiv.textContent = 'MEGA: . . .';
    output.appendChild(typingDiv);
    output.scrollTop = output.scrollHeight;

    const mouth = document.getElementById('mega-mouth');
    if (mouth) mouth.setAttribute('height','14');

    try {
        const res = await fetch(`${CONFIG.apiBase}/api/mega/chat`, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ message:msg, session_id:MEGA.sessionId }),
        });
        const data = await res.json();

        document.getElementById('mega-typing')?.remove();
        if (mouth) mouth.setAttribute('height','8');

        const respText = data.response || (data.model_loading ? 'M-m-my brain is still loading. One minute.' : '[signal lost]');
        const megaDiv = document.createElement('div');
        megaDiv.className = 'mega-chat-line mega';
        megaDiv.textContent = 'MEGA: ';
        output.appendChild(megaDiv);

        let i=0;
        const type = setInterval(()=>{
            megaDiv.textContent = 'MEGA: '+respText.slice(0,i++);
            output.scrollTop = output.scrollHeight;
            if(mouth && i%8===0) mouth.setAttribute('height', (4+Math.random()*10).toFixed(0));
            if(i>respText.length){ clearInterval(type); if(mouth) mouth.setAttribute('height','4'); }
        }, 22);
    } catch(e) {
        document.getElementById('mega-typing')?.remove();
        if (mouth) mouth.setAttribute('height','4');
        const err = document.createElement('div');
        err.className='mega-chat-line mega'; err.textContent='MEGA: [signal lost]';
        output.appendChild(err);
    }
}

