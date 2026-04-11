/* knowledge-stars.js — Knowledge Stars 3D constellation */
// =============================================================================
// KNOWLEDGE STARS — 3D Constellation in Panel (Enhanced Fullscreen)
// =============================================================================

// ── Knowledge Stars — mini preview init ──
function initKnowledgeStars() {
    const canvas = document.getElementById('stars-canvas');
    if (!canvas) return;
    _initStarsOnCanvas(canvas, false);
    loadKnowledgeData(canvas, false);
}

let _starsFullInited = false;
let _starsFullScene, _starsFullCamera, _starsFullRenderer, _starsFullGroup;
let _starsFullAnimating = false;
let _allKnowledge = [];

// Fullscreen-only state
let _fsConstellationLines = [];
let _fsShootingStars = [];
let _fsOrbitRings = [];
let _fsOrbitTexts = [];
let _fsStarMeshes = [];
let _fsNebulaParticles = null;
let _fsAutoOrbitAngle = 0;
let _fsDragging = false;
let _fsEntryAnimActive = false;
let _fsEntryAnimStart = 0;
let _fsHoveredStar = null;

function openKnowledgeStarsFull() {
    document.getElementById('stars-fullscreen').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    const canvas = document.getElementById('stars-canvas-fs');
    if (!_starsFullInited) {
        _starsFullInited = true;
        _initStarsOnCanvas(canvas, true);
        loadKnowledgeData(canvas, true);
    }
}

function closeKnowledgeStarsFull() {
    document.getElementById('stars-fullscreen').style.display = 'none';
    document.body.style.overflow = '';
}

function _initStarsOnCanvas(canvas, isFull) {
    const w = isFull ? window.innerWidth : canvas.clientWidth;
    const h = isFull ? (window.innerHeight - 56) : canvas.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 500);
    camera.position.z = isFull ? 12 : 6;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const group = new THREE.Group();
    scene.add(group);

    if (isFull) {
        _starsFullScene = scene; _starsFullCamera = camera;
        _starsFullRenderer = renderer; _starsFullGroup = group;
        starsScene = scene; starsCamera = camera;
        starsRenderer = renderer; starsGroup = group;

        // === NEBULA BACKGROUND ===
        _buildNebula(scene);

    } else {
        starsScene = scene; starsCamera = camera;
        starsRenderer = renderer; starsGroup = group;
    }

    // Drag rotation
    let isDragging = false, prevX = 0, prevY = 0;
    canvas.addEventListener('mousedown', e => { isDragging = true; _fsDragging = true; prevX = e.clientX; prevY = e.clientY; });
    canvas.addEventListener('mouseup', () => { isDragging = false; _fsDragging = false; });
    canvas.addEventListener('mouseleave', () => { isDragging = false; _fsDragging = false; });
    canvas.addEventListener('mousemove', e => {
        if (isDragging) {
            group.rotation.y += (e.clientX - prevX) * 0.005;
            group.rotation.x += (e.clientY - prevY) * 0.005;
            prevX = e.clientX; prevY = e.clientY;
        }
        if (isFull) _handleStarHover(e, canvas, camera, group);
    });
    canvas.addEventListener('click', e => {
        if (isFull) _handleStarClick(e, canvas, camera, group);
    });
    // Scroll to zoom
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        camera.position.z = Math.max(2, Math.min(25, camera.position.z + e.deltaY * 0.01));
    }, { passive: false });

    // Resize handler for fullscreen
    if (isFull) {
        window.addEventListener('resize', () => {
            const nw = window.innerWidth;
            const nh = window.innerHeight - 56;
            camera.aspect = nw / nh;
            camera.updateProjectionMatrix();
            renderer.setSize(nw, nh);
        });
    }

    function animate() {
        requestAnimationFrame(animate);
        const t = Date.now() * 0.001; // seconds

        if (isFull) {
            // === SMOOTH CAMERA AUTO-ORBIT (when not dragging) ===
            if (!_fsDragging) {
                _fsAutoOrbitAngle += 0.0012;
                const orbitRadius = camera.position.z;
                camera.position.x = Math.sin(_fsAutoOrbitAngle) * orbitRadius * 0.3;
                camera.position.y = Math.cos(_fsAutoOrbitAngle * 0.7) * orbitRadius * 0.1;
                camera.lookAt(0, 0, 0);
            }

            // === PULSING / TWINKLING STARS ===
            _fsStarMeshes.forEach((star, i) => {
                const rate = 0.5 + (i % 7) * 0.3;
                const phase = i * 1.7;
                const pulse = 0.7 + Math.sin(t * rate + phase) * 0.25;
                star.material.opacity = pulse;
                const scaleBase = star.userData._baseScale || 1;
                const s = scaleBase * (0.85 + Math.sin(t * rate * 0.8 + phase) * 0.2);
                star.scale.set(s, s, s);
            });

            // === ENTRY ANIMATION ===
            if (_fsEntryAnimActive) {
                const elapsed = (Date.now() - _fsEntryAnimStart) / 1000;
                const duration = 2.5;
                if (elapsed < duration) {
                    _fsStarMeshes.forEach((star) => {
                        const delay = star.userData._entryDelay || 0;
                        const prog = Math.max(0, Math.min(1, (elapsed - delay) / (duration - delay * 0.5)));
                        const eased = 1 - Math.pow(1 - prog, 3); // ease out cubic
                        const target = star.userData._targetPos;
                        if (target) {
                            star.position.x = target.x * eased + star.userData._startPos.x * (1 - eased);
                            star.position.y = target.y * eased + star.userData._startPos.y * (1 - eased);
                            star.position.z = target.z * eased + star.userData._startPos.z * (1 - eased);
                        }
                    });
                } else {
                    _fsEntryAnimActive = false;
                    _fsStarMeshes.forEach(star => {
                        const target = star.userData._targetPos;
                        if (target) star.position.set(target.x, target.y, target.z);
                    });
                }
            }

            // === CONSTELLATION LINES (fade over time) ===
            _fsConstellationLines.forEach((lineObj, idx) => {
                const age = t - lineObj.createdAt;
                if (age > 2.0) {
                    group.remove(lineObj.line);
                    if (lineObj.line.geometry) lineObj.line.geometry.dispose();
                    if (lineObj.line.material) lineObj.line.material.dispose();
                    _fsConstellationLines.splice(idx, 1);
                } else {
                    const fade = age < 0.3 ? age / 0.3 : (age > 1.5 ? (2.0 - age) / 0.5 : 1.0);
                    lineObj.line.material.opacity = 0.35 * fade;
                }
            });

            // === SHOOTING STARS ===
            _updateShootingStars(scene, t);

            // === NEBULA DRIFT ===
            if (_fsNebulaParticles) {
                _fsNebulaParticles.rotation.y += 0.0002;
                _fsNebulaParticles.rotation.x += 0.00008;
                _fsNebulaParticles.material.opacity = 0.15 + Math.sin(t * 0.15) * 0.04;
            }

            // === ORBIT TEXT ROTATION ===
            _fsOrbitTexts.forEach((textObj, i) => {
                const speed = 0.15 + i * 0.05;
                const angle = t * speed + i * (Math.PI * 2 / _fsOrbitTexts.length);
                const r = textObj.radius;
                textObj.sprite.position.x = Math.cos(angle) * r;
                textObj.sprite.position.z = Math.sin(angle) * r;
                textObj.sprite.position.y = Math.sin(t * 0.3 + i) * 0.15;
            });
        }

        // Non-isFull: simple rotation
        if (!isFull && !isDragging) group.rotation.y += 0.0015;

        const tPulse = Date.now() * 0.002;
        // Pulse brain sprite
        const brain = group.getObjectByName('brain-pulse');
        if (brain) {
            const baseScale = isFull ? 2.8 * 1.8 : 2.8 * 0.9;
            const pulseAmp = isFull ? 0.12 : 0.05;
            const s = baseScale * (1 + Math.sin(tPulse) * pulseAmp);
            brain.scale.set(s, s, 1);
            brain.material.opacity = isFull ? (0.9 + Math.sin(tPulse * 1.3) * 0.1) : (0.85 + Math.sin(tPulse) * 0.1);
        }
        // Pulse halo
        const halo = group.getObjectByName('brain-halo');
        if (halo) {
            halo.material.opacity = isFull ? (0.08 + Math.sin(tPulse * 0.7) * 0.06) : (0.04 + Math.sin(tPulse * 0.7) * 0.03);
            halo.rotation.z += isFull ? 0.004 : 0.002;
            if (isFull) {
                const hs = 1 + Math.sin(tPulse * 0.5) * 0.08;
                halo.scale.set(hs, hs, 1);
            }
        }
        // Drift particles
        const particles = group.getObjectByName('brain-particles');
        if (particles) {
            particles.rotation.y += 0.003;
            particles.rotation.x += 0.001;
        }
        renderer.render(scene, camera);
    }
    animate();
}

// === NEBULA BACKGROUND ===
function _buildNebula(scene) {
    const nebulaCount = 1200;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(nebulaCount * 3);
    const colors = new Float32Array(nebulaCount * 3);
    const nebulaColors = [
        [0.45, 0.0, 0.65],  // purple
        [0.0, 0.55, 0.65],  // cyan
        [0.6, 0.0, 0.5],    // magenta
        [0.1, 0.2, 0.5],    // deep blue
        [0.3, 0.0, 0.6],    // violet
    ];
    for (let i = 0; i < nebulaCount; i++) {
        // Distribute in a large shell behind the stars
        const r = 30 + Math.random() * 70;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
        const c = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
        colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
        size: 1.8,
        vertexColors: true,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
    _fsNebulaParticles = new THREE.Points(geo, mat);
    _fsNebulaParticles.name = 'nebula';
    scene.add(_fsNebulaParticles);
}

// === SHOOTING STARS ===
let _fsNextShootTime = 0;
function _updateShootingStars(scene, t) {
    // Spawn new shooting star every 5-10 seconds
    if (t > _fsNextShootTime) {
        _fsNextShootTime = t + 5 + Math.random() * 5;
        _spawnShootingStar(scene, t);
    }
    // Update existing
    _fsShootingStars.forEach((ss, idx) => {
        const age = t - ss.spawnTime;
        const lifetime = ss.lifetime;
        if (age > lifetime) {
            scene.remove(ss.mesh);
            if (ss.mesh.geometry) ss.mesh.geometry.dispose();
            if (ss.mesh.material) ss.mesh.material.dispose();
            if (ss.trail) {
                scene.remove(ss.trail);
                if (ss.trail.geometry) ss.trail.geometry.dispose();
                if (ss.trail.material) ss.trail.material.dispose();
            }
            _fsShootingStars.splice(idx, 1);
        } else {
            const prog = age / lifetime;
            const pos = ss.start.clone().lerp(ss.end, prog);
            ss.mesh.position.copy(pos);
            ss.mesh.material.opacity = prog < 0.1 ? prog * 10 : (prog > 0.7 ? (1 - prog) / 0.3 : 1.0);
            // Update trail
            if (ss.trail) {
                const trailPositions = ss.trail.geometry.attributes.position.array;
                const trailLen = 8;
                for (let ti = trailLen - 1; ti > 0; ti--) {
                    trailPositions[ti * 3] = trailPositions[(ti - 1) * 3];
                    trailPositions[ti * 3 + 1] = trailPositions[(ti - 1) * 3 + 1];
                    trailPositions[ti * 3 + 2] = trailPositions[(ti - 1) * 3 + 2];
                }
                trailPositions[0] = pos.x;
                trailPositions[1] = pos.y;
                trailPositions[2] = pos.z;
                ss.trail.geometry.attributes.position.needsUpdate = true;
                ss.trail.material.opacity = ss.mesh.material.opacity * 0.4;
            }
        }
    });
}

function _spawnShootingStar(scene, t) {
    // Random start/end on the periphery
    const r = 15;
    const startTheta = Math.random() * Math.PI * 2;
    const startPhi = Math.random() * Math.PI;
    const start = new THREE.Vector3(
        r * Math.sin(startPhi) * Math.cos(startTheta),
        r * Math.sin(startPhi) * Math.sin(startTheta),
        r * Math.cos(startPhi)
    );
    const endTheta = startTheta + (0.5 + Math.random()) * (Math.random() > 0.5 ? 1 : -1);
    const endPhi = startPhi + (0.3 + Math.random() * 0.5) * (Math.random() > 0.5 ? 1 : -1);
    const end = new THREE.Vector3(
        r * Math.sin(endPhi) * Math.cos(endTheta),
        r * Math.sin(endPhi) * Math.sin(endTheta),
        r * Math.cos(endPhi)
    );

    const colors = [0x00fff9, 0xff00ff, 0xbc13fe, 0xffd700];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const geo = new THREE.SphereGeometry(0.06, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(start);
    scene.add(mesh);

    // Trail line
    const trailLen = 8;
    const trailPositions = new Float32Array(trailLen * 3);
    for (let i = 0; i < trailLen * 3; i++) trailPositions[i] = start.toArray()[i % 3];
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.Float32BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });
    const trail = new THREE.Line(trailGeo, trailMat);
    scene.add(trail);

    _fsShootingStars.push({ mesh, trail, start, end, spawnTime: t, lifetime: 0.8 + Math.random() * 0.6 });
}

// === CONSTELLATION LINES (on hover) ===
function _drawConstellationLines(star, group, t) {
    // Remove old constellation lines
    _fsConstellationLines.forEach(lineObj => {
        group.remove(lineObj.line);
        if (lineObj.line.geometry) lineObj.line.geometry.dispose();
        if (lineObj.line.material) lineObj.line.material.dispose();
    });
    _fsConstellationLines = [];

    if (!star) return;

    // Find nearest 4 neighbors
    const pos = star.position;
    const neighbors = _fsStarMeshes
        .filter(s => s !== star)
        .map(s => ({ star: s, dist: pos.distanceTo(s.position) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 4);

    const color = star.userData.color || 0x00fff9;
    neighbors.forEach(n => {
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array([
            pos.x, pos.y, pos.z,
            n.star.position.x, n.star.position.y, n.star.position.z
        ]);
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const mat = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending,
            linewidth: 1,
        });
        const line = new THREE.Line(geo, mat);
        group.add(line);
        _fsConstellationLines.push({ line, createdAt: t });
    });
}

// === ORBIT RINGS ===
function _buildOrbitRings(group, objects, radius) {
    _fsOrbitRings = [];
    const categories = {};
    objects.forEach(obj => {
        const cat = obj.category || 'general';
        if (!categories[cat]) categories[cat] = 0;
        categories[cat]++;
    });

    const catKeys = Object.keys(categories).sort((a, b) => categories[b] - categories[a]).slice(0, 6);
    catKeys.forEach((cat, i) => {
        const color = getCategoryColor(cat);
        const ringRadius = radius * (0.6 + i * 0.15);
        const ringGeo = new THREE.RingGeometry(ringRadius - 0.01, ringRadius + 0.01, 128);
        const ringMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.06,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        // Tilt each ring differently
        ring.rotation.x = Math.PI / 2 + (i * 0.2 - 0.3);
        ring.rotation.z = i * 0.3;
        group.add(ring);
        _fsOrbitRings.push(ring);
    });
}

// === ORBITING STAT TEXT ===
function _buildOrbitingText(group, stats) {
    _fsOrbitTexts = [];
    const texts = [
        stats.totalObjects + ' OBJECTS',
        stats.totalCollections + ' COLLECTIONS',
        'WEAVIATE RAG',
        'KNOWLEDGE GRAPH',
    ];
    const textColors = [0x00fff9, 0xff00ff, 0xbc13fe, 0x39ff14];
    texts.forEach((text, i) => {
        const sprite = _makeTextSprite(text, textColors[i % textColors.length]);
        sprite.scale.set(1.6, 0.3, 1);
        const r = 2.0 + i * 0.25;
        sprite.position.set(r, 0, 0);
        group.add(sprite);
        _fsOrbitTexts.push({ sprite, radius: r });
    });
}


async function loadKnowledgeData(canvas, isFull) {
    try {
        const resp = await fetch(`${CONFIG.apiBase}/api/knowledge/all`);
        const data = await resp.json();
        const objects = data.objects || [];

        _allKnowledge = objects;

        const group = isFull ? _starsFullGroup : starsGroup;
        if (!group) return;

        knowledgeStars = objects;
        const total = objects.length;
        const radius = isFull ? 5.5 : 2.8;

        // === BRAIN FACE CENTER ===
        _buildBrainFace(group, isFull);

        // === STARS (Fibonacci sphere) ===
        const starMeshes = [];
        _fsStarMeshes = [];
        objects.forEach((obj, i) => {
            const category = obj.category || 'general';
            const color = getCategoryColor(category);

            const phi = Math.acos(1 - 2 * (i + 0.5) / total);
            const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);

            const starSize = isFull ? 0.065 : 0.05;
            const geo = new THREE.SphereGeometry(starSize, 8, 8);
            const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, blending: isFull ? THREE.AdditiveBlending : THREE.NormalBlending });
            const star = new THREE.Mesh(geo, mat);

            // Entry animation: start from far away, animate to target
            if (isFull) {
                const dist = Math.sqrt(x * x + y * y + z * z);
                const spawnDir = new THREE.Vector3(x, y, z).normalize();
                const startDist = 25 + Math.random() * 15;
                star.userData._targetPos = { x, y, z };
                star.userData._startPos = { x: spawnDir.x * startDist, y: spawnDir.y * startDist, z: spawnDir.z * startDist };
                star.userData._entryDelay = (dist / radius) * 0.6;
                star.userData._baseScale = 1;
                star.position.set(spawnDir.x * startDist, spawnDir.y * startDist, spawnDir.z * startDist);
            } else {
                star.position.set(x, y, z);
            }

            star.userData.title = obj.title;
            star.userData.category = category;
            star.userData.content = obj.content;
            star.userData.index = i;
            star.userData.color = color;
            group.add(star);
            starMeshes.push(star);
            if (isFull) _fsStarMeshes.push(star);

            // Glow (bigger in fullscreen)
            const glowSize = isFull ? starSize * 3.5 : starSize * 2.2;
            const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: isFull ? 0.18 : 0.12, blending: isFull ? THREE.AdditiveBlending : THREE.NormalBlending });
            const glow = new THREE.Mesh(new THREE.SphereGeometry(glowSize, 4, 4), glowMat);
            star.add(glow);

            // Label (only in full screen, every 3rd star)
            if (isFull && i % 3 === 0) {
                const label = _makeTextSprite(obj.title.substring(0, 22), color);
                label.position.set(x * 1.18, y * 1.18, z * 1.18);
                label.userData._labelTarget = { x: x * 1.18, y: y * 1.18, z: z * 1.18 };
                group.add(label);
            }
        });

        // === LINES FROM CENTER TO EACH STAR ===
        const linePositions = [];
        starMeshes.forEach(star => {
            const tgt = star.userData._targetPos || star.position;
            linePositions.push(0, 0, 0);
            linePositions.push(tgt.x || star.position.x, tgt.y || star.position.y, tgt.z || star.position.z);
        });
        const lineGeo = new THREE.BufferGeometry();
        lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        const lineMat = new THREE.LineBasicMaterial({ color: 0x00fff9, transparent: true, opacity: 0.03 });
        group.add(new THREE.LineSegments(lineGeo, lineMat));

        // === FULLSCREEN EXTRAS ===
        if (isFull) {
            // Trigger entry animation
            _fsEntryAnimActive = true;
            _fsEntryAnimStart = Date.now();

            // Category orbit rings
            _buildOrbitRings(group, objects, radius);

            // Collect stats for orbiting text
            const catSet = new Set();
            objects.forEach(obj => catSet.add(obj.category || 'general'));
            _buildOrbitingText(group, { totalObjects: total + '+', totalCollections: catSet.size });

            document.getElementById('stars-fs-status').textContent = `${total} knowledge objects`;
        }

    } catch(e) {
        console.error('Knowledge stars error:', e);
    }
}

function _buildBrainFace(group, isFull) {
    const scale = isFull ? 1.8 : 0.9;

    // === MAIN BRAIN ===
    const brainTex = new THREE.TextureLoader().load('brain-glow.webp');
    const brainMat = new THREE.SpriteMaterial({ map: brainTex, transparent: true, opacity: 0.92, depthWrite: false, blending: isFull ? THREE.AdditiveBlending : THREE.NormalBlending });
    const brainSprite = new THREE.Sprite(brainMat);
    brainSprite.scale.set(2.8 * scale, 2.8 * scale, 1);
    brainSprite.name = 'brain-pulse';
    group.add(brainSprite);

    // === OUTER GLOW HALO ===
    const haloGeo = new THREE.RingGeometry(1.2 * scale, 1.6 * scale, 64);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0x00fff9, transparent: true, opacity: isFull ? 0.1 : 0.06, side: THREE.DoubleSide, blending: isFull ? THREE.AdditiveBlending : THREE.NormalBlending });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.name = 'brain-halo';
    group.add(halo);

    // === SECOND HALO (fullscreen only) — magenta outer ring ===
    if (isFull) {
        const halo2Geo = new THREE.RingGeometry(1.7 * scale, 1.9 * scale, 64);
        const halo2Mat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.05, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
        const halo2 = new THREE.Mesh(halo2Geo, halo2Mat);
        halo2.name = 'brain-halo2';
        group.add(halo2);
    }

    // === PARTICLE CLOUD ===
    const particleCount = isFull ? 350 : 60;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sparkColors = [
        [0, 1, 0.98],    // cyan
        [0.74, 0.08, 1],  // purple
        [1, 0, 1],        // magenta
        [0.22, 1, 0.08],  // green
    ];
    for (let i = 0; i < particleCount; i++) {
        const r = (0.8 + Math.random() * 1.2) * scale;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
        const c = sparkColors[Math.floor(Math.random() * sparkColors.length)];
        colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
    }
    particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const particleMat = new THREE.PointsMaterial({
        size: isFull ? 0.05 : 0.025,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: isFull ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    particles.name = 'brain-particles';
    group.add(particles);
}

function _makeTextSprite(text, hexColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const r = (hexColor >> 16) & 0xff;
    const g = (hexColor >> 8) & 0xff;
    const b = hexColor & 0xff;
    // Text shadow glow
    ctx.shadowColor = `rgba(${r},${g},${b},0.7)`;
    ctx.shadowBlur = 8;
    ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
    ctx.font = '16px Share Tech Mono, monospace';
    ctx.fillText(text, 8, 40);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.7 });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.2, 0.22, 1);
    return sprite;
}

const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();

function _getStarAtMouse(e, canvas, camera, group) {
    const rect = canvas.getBoundingClientRect();
    _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    _raycaster.setFromCamera(_mouse, camera);
    const meshes = group.children.filter(c => c.isMesh && c.userData.title);
    const hits = _raycaster.intersectObjects(meshes);
    return hits.length ? hits[0].object : null;
}

function _handleStarHover(e, canvas, camera, group) {
    const star = _getStarAtMouse(e, canvas, camera, group);
    const tooltip = document.getElementById('star-tooltip');
    const t = Date.now() * 0.001;

    // Constellation lines on hover
    if (star !== _fsHoveredStar) {
        _fsHoveredStar = star;
        _drawConstellationLines(star, group, t);
    }

    if (star) {
        canvas.style.cursor = 'pointer';
        tooltip.style.display = 'block';
        tooltip.style.left = (e.clientX + 14) + 'px';
        tooltip.style.top = (e.clientY - 10) + 'px';
        tooltip.innerHTML = `<div style="color:#00fff9;margin-bottom:4px;font-weight:bold">${star.userData.title}</div>
            <div style="color:#bc13fe;font-size:0.65rem">${star.userData.category}</div>
            ${star.userData.content ? `<div style="color:#ccc;margin-top:6px;font-size:0.68rem">${star.userData.content.substring(0,120)}...</div>` : ''}`;
    } else {
        canvas.style.cursor = 'grab';
        tooltip.style.display = 'none';
    }
}

function _handleStarClick(e, canvas, camera, group) {
    const star = _getStarAtMouse(e, canvas, camera, group);
    if (star) {
        document.getElementById('star-search-fs').value = star.userData.title;
        searchStars(star.userData.title);
    }
}

function getCategoryColor(category) {
    const map = {
        'technical': 0x00fff9,
        'tech': 0x00fff9,
        'personal': 0xff00ff,
        'family': 0xff00ff,
        'business': 0xffd700,
        'finance': 0xffd700,
        'health': 0x39ff14,
        'wellness': 0x39ff14,
        'security': 0xbc13fe,
        'general': 0x00aaff,
    };
    const key = Object.keys(map).find(k => category.toLowerCase().includes(k));
    return map[key] || 0x00aaff;
}

function searchStars(query) {
    const group = _starsFullGroup || starsGroup;
    if (!group) return;
    const q = (query || '').toLowerCase().trim();

    group.children.forEach(obj => {
        if (!obj.userData || !obj.userData.title) return;
        const match = !q || obj.userData.title.toLowerCase().includes(q) || (obj.userData.content || '').toLowerCase().includes(q);
        if (obj.material) {
            obj.material.opacity = match ? 0.9 : 0.05;
            const s = match && q ? 2.2 : 1;
            obj.scale.set(s, s, s);
        }
    });
}
