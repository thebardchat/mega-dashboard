/* mega-crew.js — MEGA Crew Animated Characters
   Dreamworks-style bot characters that live in dashboard panels.
   Each crew member has unique look, personality, and idle animations.
   Rendered on <canvas> elements — lightweight, GPU-accelerated. */

const MegaCrew = {
    // ── Character Definitions ──
    members: {
        arc: {
            name: 'Arc',
            role: 'Gatekeeper',
            bodyColor: '#00fff9',
            eyeColor: '#ffffff',
            accentColor: '#00aaff',
            shape: 'shield',    // wide shoulders, narrow waist
            personality: 'stern but fair',
            idleAnim: 'scan',   // eyes sweep left-right
        },
        weld: {
            name: 'Weld',
            role: 'Applier',
            bodyColor: '#39ff14',
            eyeColor: '#ffffff',
            accentColor: '#00ff88',
            shape: 'round',     // chunky, strong
            personality: 'eager worker',
            idleAnim: 'hammer', // arm swings up/down
        },
        sentinel: {
            name: 'Sentinel',
            role: 'Watchdog',
            bodyColor: '#bc13fe',
            eyeColor: '#ff00ff',
            accentColor: '#9400d3',
            shape: 'tall',      // tall and thin, big eye
            personality: 'vigilant',
            idleAnim: 'lookout', // eye grows/shrinks (scanning)
        },
        scribe: {
            name: 'Scribe',
            role: 'Logger',
            bodyColor: '#ffd700',
            eyeColor: '#ffffff',
            accentColor: '#ffaa00',
            shape: 'squat',     // short and wide, holds clipboard
            personality: 'meticulous',
            idleAnim: 'write',  // pen scratches
        },
        pulse: {
            name: 'Pulse',
            role: 'Health Monitor',
            bodyColor: '#ff3366',
            eyeColor: '#ffffff',
            accentColor: '#ff6b9d',
            shape: 'blob',      // organic, blobby, heartbeat shape
            personality: 'caring',
            idleAnim: 'heartbeat', // body pulses
        },
        echo: {
            name: 'Echo',
            role: 'Messenger',
            bodyColor: '#00d4ff',
            eyeColor: '#ffffff',
            accentColor: '#0099cc',
            shape: 'swift',     // aerodynamic, antenna
            personality: 'fast and chatty',
            idleAnim: 'bounce', // hops side to side
        },
    },

    // ── Render a character onto a canvas ──
    draw(canvasId, memberId, opts = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const member = this.members[memberId];
        if (!member) return;

        const w = canvas.width = opts.width || canvas.clientWidth || 80;
        const h = canvas.height = opts.height || canvas.clientHeight || 100;
        const scale = opts.scale || 1;
        const cx = w / 2;
        const cy = h * 0.55;

        let frame = 0;
        const animate = () => {
            ctx.clearRect(0, 0, w, h);
            frame++;
            const t = frame * 0.04;

            // Shadow
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.ellipse(cx, h * 0.88, 14 * scale, 4 * scale, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Body bounce
            const bounceY = Math.sin(t * 1.2) * 2 * scale;
            const squish = 1 + Math.sin(t * 1.2) * 0.03;

            ctx.save();
            ctx.translate(cx, cy + bounceY);
            ctx.scale(squish, 1 / squish);

            this._drawBody(ctx, member, scale, t);
            this._drawFace(ctx, member, scale, t);

            ctx.restore();

            // Name tag
            if (opts.showName !== false) {
                ctx.fillStyle = member.bodyColor;
                ctx.font = `${8 * scale}px "Share Tech Mono", monospace`;
                ctx.textAlign = 'center';
                ctx.globalAlpha = 0.7;
                ctx.fillText(member.name.toUpperCase(), cx, h * 0.96);
                ctx.globalAlpha = 1;
            }

            requestAnimationFrame(animate);
        };
        animate();
    },

    _drawBody(ctx, member, scale, t) {
        const s = scale;
        ctx.fillStyle = member.bodyColor;
        ctx.strokeStyle = member.accentColor;
        ctx.lineWidth = 1.5 * s;
        ctx.globalAlpha = 0.9;

        switch (member.shape) {
            case 'shield': {
                // ── Legs — alternating step ──
                const legStep = Math.sin(t * 2) * 2 * s;
                ctx.fillStyle = member.accentColor;
                ctx.fillRect(-7 * s, 14 * s + legStep, 5 * s, 8 * s);
                ctx.fillRect(2 * s, 14 * s - legStep, 5 * s, 8 * s);
                // Feet
                ctx.fillRect(-8 * s, 21 * s + legStep, 7 * s, 2.5 * s);
                ctx.fillRect(1 * s, 21 * s - legStep, 7 * s, 2.5 * s);
                ctx.fillStyle = member.bodyColor;

                // Wide top, narrow bottom — the gatekeeper
                ctx.beginPath();
                ctx.moveTo(-16 * s, -20 * s);
                ctx.quadraticCurveTo(-18 * s, -10 * s, -12 * s, 15 * s);
                ctx.quadraticCurveTo(0, 22 * s, 12 * s, 15 * s);
                ctx.quadraticCurveTo(18 * s, -10 * s, 16 * s, -20 * s);
                ctx.quadraticCurveTo(0, -25 * s, -16 * s, -20 * s);
                ctx.fill();
                ctx.stroke();
                // Visor line
                ctx.strokeStyle = member.accentColor + '88';
                ctx.beginPath();
                ctx.moveTo(-14 * s, -8 * s);
                ctx.lineTo(14 * s, -8 * s);
                ctx.stroke();

                // ── Shield emblem on chest ──
                ctx.strokeStyle = member.accentColor;
                ctx.lineWidth = 1.2 * s;
                ctx.beginPath();
                ctx.moveTo(0, 2 * s);
                ctx.lineTo(-5 * s, -2 * s);
                ctx.lineTo(-5 * s, -6 * s);
                ctx.quadraticCurveTo(0, -8 * s, 5 * s, -6 * s);
                ctx.lineTo(5 * s, -2 * s);
                ctx.closePath();
                ctx.stroke();

                // ── Badge/star on upper chest ──
                ctx.fillStyle = '#ffdd44';
                this._drawStar(ctx, 6 * s, -14 * s, 2.5 * s, 5);

                // ── Left arm (rests at side) ──
                ctx.fillStyle = member.bodyColor;
                ctx.save();
                ctx.translate(-16 * s, -5 * s);
                ctx.rotate(-0.3 + Math.sin(t * 0.8) * 0.1);
                ctx.fillRect(0, 0, -8 * s, 4 * s);
                // Hand (fist)
                ctx.beginPath();
                ctx.arc(-8 * s, 2 * s, 2.5 * s, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // ── Right arm — holds glowing shield ──
                ctx.fillStyle = member.bodyColor;
                ctx.save();
                ctx.translate(16 * s, -5 * s);
                ctx.rotate(0.3 - Math.sin(t * 0.8) * 0.1);
                ctx.fillRect(0, 0, 8 * s, 4 * s);
                // Hand
                ctx.beginPath();
                ctx.arc(8 * s, 2 * s, 2.5 * s, 0, Math.PI * 2);
                ctx.fill();
                // Tiny glowing shield
                const shieldGlow = 0.5 + Math.sin(t * 3) * 0.3;
                ctx.globalAlpha = shieldGlow;
                ctx.fillStyle = '#00ffff';
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 6 * s;
                ctx.beginPath();
                ctx.moveTo(10 * s, -2 * s);
                ctx.lineTo(7 * s, 1 * s);
                ctx.lineTo(7 * s, 5 * s);
                ctx.quadraticCurveTo(10 * s, 7 * s, 13 * s, 5 * s);
                ctx.lineTo(13 * s, 1 * s);
                ctx.closePath();
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 0.9;
                ctx.restore();

                ctx.strokeStyle = member.accentColor;
                break;
            }
            case 'round': {
                // ── Legs — stubby waddle ──
                const weldStep = Math.sin(t * 2.5) * 2 * s;
                ctx.fillStyle = member.accentColor;
                ctx.fillRect(-8 * s, 16 * s + weldStep, 6 * s, 7 * s);
                ctx.fillRect(2 * s, 16 * s - weldStep, 6 * s, 7 * s);
                // Feet
                ctx.fillRect(-9 * s, 22 * s + weldStep, 8 * s, 2.5 * s);
                ctx.fillRect(1 * s, 22 * s - weldStep, 8 * s, 2.5 * s);
                ctx.fillStyle = member.bodyColor;

                // Chunky ball — the worker
                const r = 18 * s;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // ── Gear/cog emblem on belly ──
                ctx.save();
                ctx.strokeStyle = member.accentColor;
                ctx.lineWidth = 1 * s;
                ctx.translate(0, 4 * s);
                ctx.rotate(t * 0.5);
                const cogR = 5 * s;
                const teeth = 6;
                ctx.beginPath();
                for (let i = 0; i < teeth; i++) {
                    const a1 = (i / teeth) * Math.PI * 2;
                    const a2 = ((i + 0.3) / teeth) * Math.PI * 2;
                    const a3 = ((i + 0.5) / teeth) * Math.PI * 2;
                    const a4 = ((i + 0.8) / teeth) * Math.PI * 2;
                    ctx.lineTo(Math.cos(a1) * cogR, Math.sin(a1) * cogR);
                    ctx.lineTo(Math.cos(a2) * (cogR + 2 * s), Math.sin(a2) * (cogR + 2 * s));
                    ctx.lineTo(Math.cos(a3) * (cogR + 2 * s), Math.sin(a3) * (cogR + 2 * s));
                    ctx.lineTo(Math.cos(a4) * cogR, Math.sin(a4) * cogR);
                }
                ctx.closePath();
                ctx.stroke();
                // Cog center
                ctx.beginPath();
                ctx.arc(0, 0, 2 * s, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();

                // ── Left arm — swings hammer ──
                const hammerSwing = Math.sin(t * 3) * 0.6;
                ctx.fillStyle = member.bodyColor;
                ctx.save();
                ctx.translate(-r, -2 * s);
                ctx.rotate(-0.5 + hammerSwing);
                // Arm
                ctx.fillRect(-10 * s, -2 * s, 10 * s, 4.5 * s);
                // Hand
                ctx.beginPath();
                ctx.arc(-10 * s, 0, 2.5 * s, 0, Math.PI * 2);
                ctx.fill();
                // Tiny hammer
                ctx.fillStyle = '#888';
                ctx.fillRect(-13 * s, -1.5 * s, 2 * s, 8 * s); // handle
                ctx.fillStyle = '#ccc';
                ctx.fillRect(-15 * s, 5 * s, 6 * s, 3.5 * s);  // head
                ctx.restore();

                // ── Right arm — holds wrench ──
                ctx.fillStyle = member.bodyColor;
                ctx.save();
                ctx.translate(r, -2 * s);
                ctx.rotate(0.4 - Math.sin(t * 1.2) * 0.15);
                // Arm
                ctx.fillRect(0, -2 * s, 10 * s, 4.5 * s);
                // Hand
                ctx.beginPath();
                ctx.arc(10 * s, 0, 2.5 * s, 0, Math.PI * 2);
                ctx.fill();
                // Tiny wrench
                ctx.strokeStyle = '#ccc';
                ctx.lineWidth = 1.5 * s;
                ctx.beginPath();
                ctx.moveTo(10 * s, 2 * s);
                ctx.lineTo(10 * s, 9 * s);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(10 * s, 10 * s, 2.5 * s, 0.5, Math.PI * 2 - 0.5);
                ctx.stroke();
                ctx.restore();

                ctx.strokeStyle = member.accentColor;
                break;
            }
            case 'tall': {
                // ── Legs — long stilts with step ──
                const sentStep = Math.sin(t * 1.8) * 1.5 * s;
                ctx.fillStyle = member.accentColor;
                ctx.fillRect(-6 * s, 18 * s + sentStep, 4 * s, 9 * s);
                ctx.fillRect(2 * s, 18 * s - sentStep, 4 * s, 9 * s);
                // Feet
                ctx.fillRect(-7 * s, 26 * s + sentStep, 6 * s, 2 * s);
                ctx.fillRect(1 * s, 26 * s - sentStep, 6 * s, 2 * s);
                ctx.fillStyle = member.bodyColor;

                // Tall capsule — the watchdog
                ctx.beginPath();
                ctx.moveTo(-8 * s, -26 * s);
                ctx.quadraticCurveTo(-10 * s, -28 * s, -10 * s, -20 * s);
                ctx.lineTo(-10 * s, 15 * s);
                ctx.quadraticCurveTo(-10 * s, 20 * s, 0, 20 * s);
                ctx.quadraticCurveTo(10 * s, 20 * s, 10 * s, 15 * s);
                ctx.lineTo(10 * s, -20 * s);
                ctx.quadraticCurveTo(10 * s, -28 * s, 8 * s, -26 * s);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Antenna
                ctx.beginPath();
                ctx.moveTo(0, -26 * s);
                ctx.lineTo(0, -34 * s);
                ctx.stroke();
                // ── Antenna tip blinks red/blue (police light) ──
                const policePhase = Math.sin(t * 6);
                ctx.fillStyle = policePhase > 0 ? '#ff0044' : '#0066ff';
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 6 * s;
                ctx.beginPath();
                ctx.arc(0, -35 * s, 2.5 * s, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.fillStyle = member.bodyColor;

                // ── Left arm (at rest) ──
                ctx.fillStyle = member.bodyColor;
                ctx.save();
                ctx.translate(-10 * s, -5 * s);
                ctx.rotate(-0.4 + Math.sin(t * 0.6) * 0.1);
                ctx.fillRect(-8 * s, -1.5 * s, 8 * s, 3.5 * s);
                ctx.beginPath();
                ctx.arc(-8 * s, 0, 2 * s, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // ── Right arm raised — holds telescope ──
                ctx.fillStyle = member.bodyColor;
                ctx.save();
                ctx.translate(10 * s, -10 * s);
                ctx.rotate(-1.0 + Math.sin(t * 0.4) * 0.15);
                // Arm going upward
                ctx.fillRect(0, -1.5 * s, 10 * s, 3.5 * s);
                // Hand
                ctx.beginPath();
                ctx.arc(10 * s, 0, 2 * s, 0, Math.PI * 2);
                ctx.fill();
                // Telescope / binoculars
                ctx.fillStyle = '#ddd';
                ctx.fillRect(8 * s, -3 * s, 6 * s, 2.5 * s);
                ctx.fillRect(8 * s, 0.5 * s, 6 * s, 2.5 * s);
                // Lens glint
                ctx.fillStyle = '#aaeeff';
                ctx.beginPath();
                ctx.arc(14 * s, -1.8 * s, 1 * s, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(14 * s, 1.8 * s, 1 * s, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                ctx.strokeStyle = member.accentColor;
                break;
            }
            case 'squat': {
                // ── Legs — short shuffle ──
                const scribeStep = Math.sin(t * 1.5) * 1.5 * s;
                ctx.fillStyle = member.accentColor;
                ctx.fillRect(-10 * s, 16 * s + scribeStep, 6 * s, 6 * s);
                ctx.fillRect(4 * s, 16 * s - scribeStep, 6 * s, 6 * s);
                // Feet
                ctx.fillRect(-11 * s, 21 * s + scribeStep, 8 * s, 2.5 * s);
                ctx.fillRect(3 * s, 21 * s - scribeStep, 8 * s, 2.5 * s);
                ctx.fillStyle = member.bodyColor;

                // Short and wide — the logger
                ctx.beginPath();
                ctx.roundRect(-16 * s, -12 * s, 32 * s, 28 * s, 8 * s);
                ctx.fill();
                ctx.stroke();

                // ── Left arm — holds clipboard ──
                ctx.fillStyle = member.bodyColor;
                ctx.save();
                ctx.translate(-16 * s, 0);
                ctx.rotate(-0.3);
                // Arm
                ctx.fillRect(-8 * s, -1.5 * s, 8 * s, 4 * s);
                // Hand
                ctx.beginPath();
                ctx.arc(-8 * s, 1 * s, 2.5 * s, 0, Math.PI * 2);
                ctx.fill();
                // Tiny clipboard
                ctx.fillStyle = '#c8a050';
                ctx.fillRect(-12 * s, -3 * s, 7 * s, 9 * s);
                ctx.fillStyle = '#fff';
                ctx.fillRect(-11 * s, -1 * s, 5 * s, 6 * s);
                // Lines on clipboard
                ctx.strokeStyle = '#999';
                ctx.lineWidth = 0.5 * s;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.moveTo(-10.5 * s, (0.5 + i * 1.5) * s);
                    ctx.lineTo(-6.5 * s, (0.5 + i * 1.5) * s);
                    ctx.stroke();
                }
                // Clip at top
                ctx.fillStyle = '#999';
                ctx.fillRect(-10 * s, -4 * s, 4 * s, 2 * s);
                ctx.restore();

                // ── Right arm — holds pen that moves ──
                ctx.fillStyle = member.bodyColor;
                ctx.save();
                ctx.translate(16 * s, -2 * s);
                const penWiggle = Math.sin(t * 5) * 0.2;
                ctx.rotate(0.3 + penWiggle);
                // Arm
                ctx.fillRect(0, -1.5 * s, 8 * s, 4 * s);
                // Hand
                ctx.beginPath();
                ctx.arc(8 * s, 1 * s, 2.5 * s, 0, Math.PI * 2);
                ctx.fill();
                // Tiny pen
                ctx.fillStyle = '#333';
                ctx.save();
                ctx.translate(8 * s, 3 * s);
                ctx.rotate(0.5);
                ctx.fillRect(0, 0, 1.5 * s, 7 * s);
                ctx.fillStyle = '#ff4444';
                ctx.fillRect(0, 0, 1.5 * s, 2 * s); // pen cap
                ctx.restore();
                ctx.restore();

                ctx.strokeStyle = member.accentColor;
                ctx.lineWidth = 1.5 * s;
                break;
            }
            case 'blob': {
                // Organic blob — the health monitor (NO LEGS — undulates)
                const pulse = 1 + Math.sin(t * 2) * 0.08;
                ctx.beginPath();
                for (let a = 0; a < Math.PI * 2; a += 0.1) {
                    const r = (16 + Math.sin(a * 3 + t) * 2 + Math.cos(a * 5 + t * 1.3) * 1.5) * s * pulse;
                    const x = Math.cos(a) * r;
                    const y = Math.sin(a) * r * 0.85;
                    if (a === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // ── EKG heartbeat line across body ──
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1 * s;
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                const ekgOffset = (t * 30) % (24 * s);
                for (let px = -12; px <= 12; px += 1) {
                    const ex = px * s;
                    let ey = 0;
                    const phase = (px + ekgOffset / s) % 12;
                    if (phase > 4 && phase < 5) ey = -4 * s;
                    else if (phase > 5 && phase < 5.5) ey = 6 * s;
                    else if (phase > 5.5 && phase < 6) ey = -3 * s;
                    if (px === -12) ctx.moveTo(ex, ey);
                    else ctx.lineTo(ex, ey);
                }
                ctx.stroke();
                ctx.globalAlpha = 0.9;

                // ── Arms out — giving a hug, pulse with heartbeat ──
                const hugPulse = 1 + Math.sin(t * 2) * 0.1;
                ctx.fillStyle = member.bodyColor;
                // Left arm — open wide
                ctx.save();
                ctx.translate(-14 * s * pulse, -2 * s);
                ctx.rotate(-0.8 - Math.sin(t * 2) * 0.15);
                ctx.beginPath();
                ctx.ellipse(0, 0, 8 * s * hugPulse, 3 * s, 0, 0, Math.PI * 2);
                ctx.fill();
                // Hand
                ctx.beginPath();
                ctx.arc(-7 * s * hugPulse, 0, 2.5 * s, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                // Right arm — open wide
                ctx.save();
                ctx.translate(14 * s * pulse, -2 * s);
                ctx.rotate(0.8 + Math.sin(t * 2) * 0.15);
                ctx.beginPath();
                ctx.ellipse(0, 0, 8 * s * hugPulse, 3 * s, 0, 0, Math.PI * 2);
                ctx.fill();
                // Hand
                ctx.beginPath();
                ctx.arc(7 * s * hugPulse, 0, 2.5 * s, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                ctx.strokeStyle = member.accentColor;
                break;
            }
            case 'swift': {
                // ── Tiny fast-moving legs ──
                const echoStep = Math.sin(t * 5) * 3 * s;
                ctx.fillStyle = member.accentColor;
                ctx.fillRect(-5 * s, 16 * s + echoStep, 4 * s, 5 * s);
                ctx.fillRect(1 * s, 16 * s - echoStep, 4 * s, 5 * s);
                // Feet (small, quick)
                ctx.fillRect(-6 * s, 20 * s + echoStep, 6 * s, 1.5 * s);
                ctx.fillRect(0, 20 * s - echoStep, 6 * s, 1.5 * s);
                ctx.fillStyle = member.bodyColor;

                // Aerodynamic — the messenger
                ctx.beginPath();
                ctx.moveTo(0, -22 * s);
                ctx.quadraticCurveTo(14 * s, -10 * s, 12 * s, 8 * s);
                ctx.quadraticCurveTo(8 * s, 18 * s, 0, 18 * s);
                ctx.quadraticCurveTo(-8 * s, 18 * s, -12 * s, 8 * s);
                ctx.quadraticCurveTo(-14 * s, -10 * s, 0, -22 * s);
                ctx.fill();
                ctx.stroke();

                // Speed lines
                const lineAlpha = (Math.sin(t * 4) + 1) * 0.3;
                ctx.globalAlpha = lineAlpha;
                ctx.strokeStyle = member.accentColor;
                ctx.setLineDash([3, 3]);
                [-5, 0, 5].forEach(offset => {
                    ctx.beginPath();
                    ctx.moveTo(-20 * s, offset * s);
                    ctx.lineTo(-28 * s, offset * s);
                    ctx.stroke();
                });
                ctx.setLineDash([]);
                ctx.globalAlpha = 0.9;

                // ── Arms swept back (running pose) ──
                ctx.fillStyle = member.bodyColor;
                // Left arm — swept back
                ctx.save();
                ctx.translate(-12 * s, 2 * s);
                ctx.rotate(-2.2 + Math.sin(t * 3) * 0.2);
                ctx.fillRect(0, -1.5 * s, 9 * s, 3.5 * s);
                ctx.beginPath();
                ctx.arc(9 * s, 0, 2 * s, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                // Right arm — swept back, holds envelope
                ctx.save();
                ctx.translate(12 * s, 0);
                ctx.rotate(2.0 - Math.sin(t * 3) * 0.2);
                ctx.fillRect(0, -1.5 * s, 9 * s, 3.5 * s);
                ctx.beginPath();
                ctx.arc(9 * s, 0, 2 * s, 0, Math.PI * 2);
                ctx.fill();
                // Tiny envelope
                ctx.fillStyle = '#fff';
                ctx.fillRect(7 * s, -4 * s, 6 * s, 4 * s);
                ctx.strokeStyle = '#aaa';
                ctx.lineWidth = 0.5 * s;
                ctx.beginPath();
                ctx.moveTo(7 * s, -4 * s);
                ctx.lineTo(10 * s, -2 * s);
                ctx.lineTo(13 * s, -4 * s);
                ctx.stroke();
                ctx.restore();

                ctx.strokeStyle = member.accentColor;
                break;
            }
        }
        ctx.globalAlpha = 1;
    },

    _drawFace(ctx, member, scale, t) {
        const s = scale;

        // ── SENTINEL has one BIG cyclops eye ──
        if (member.shape === 'tall') {
            const eyeY = -8;
            const bigEyeSize = 8;
            const lookX = Math.sin(t * 0.7) * 1.5 * s;
            const lookY = Math.cos(t * 0.5) * 0.8 * s;
            const blinkCycle = t % 8;
            const blinkScale = (blinkCycle > 7.7 && blinkCycle < 7.9) ? 0.1 : 1;
            // Scanning pulse (eye grows/shrinks)
            const scanPulse = 1 + Math.sin(t * 1.5) * 0.15;

            // One big eye
            ctx.fillStyle = member.eyeColor;
            ctx.beginPath();
            ctx.ellipse(lookX, eyeY * s + lookY, bigEyeSize * s * scanPulse, bigEyeSize * s * blinkScale * scanPulse, 0, 0, Math.PI * 2);
            ctx.fill();

            // Big pupil
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(lookX * 1.5, eyeY * s + lookY * 1.3, bigEyeSize * 0.45 * s, 0, Math.PI * 2);
            ctx.fill();

            // Inner iris ring
            ctx.strokeStyle = member.eyeColor;
            ctx.lineWidth = 0.8 * s;
            ctx.beginPath();
            ctx.arc(lookX * 1.5, eyeY * s + lookY * 1.3, bigEyeSize * 0.3 * s, 0, Math.PI * 2);
            ctx.stroke();

            // Eye highlight
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(lookX * 0.5 - 2 * s, eyeY * s - 2 * s, 1.8 * s, 0, Math.PI * 2);
            ctx.fill();

            // ── Vigilant eyebrow — single stern line above cyclops eye ──
            ctx.strokeStyle = member.accentColor;
            ctx.lineWidth = 1.5 * s;
            const browFurrow = Math.sin(t * 0.5) * 0.5 * s;
            ctx.beginPath();
            ctx.moveTo(-6 * s, (eyeY - bigEyeSize - 2) * s - browFurrow);
            ctx.lineTo(6 * s, (eyeY - bigEyeSize - 2) * s + browFurrow);
            ctx.stroke();

        } else {
            // ── Standard two-eye characters ──
            const eyeSpread = 8;
            const eyeY = member.shape === 'squat' ? -2 : -5;
            const eyeSize = 4.5;

            const lookX = Math.sin(t * 0.7) * 1.5 * s;
            const lookY = Math.cos(t * 0.5) * 0.8 * s;

            const blinkCycle = t % 8;
            const blinkScale = (blinkCycle > 7.7 && blinkCycle < 7.9) ? 0.1 : 1;

            // Left eye
            ctx.fillStyle = member.eyeColor;
            ctx.beginPath();
            ctx.ellipse(-eyeSpread * s + lookX, eyeY * s + lookY, eyeSize * s, eyeSize * s * blinkScale, 0, 0, Math.PI * 2);
            ctx.fill();

            // Right eye
            ctx.beginPath();
            ctx.ellipse(eyeSpread * s + lookX, eyeY * s + lookY, eyeSize * s, eyeSize * s * blinkScale, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pupils
            ctx.fillStyle = '#000';
            const pupilSize = eyeSize * 0.5;
            ctx.beginPath();
            ctx.arc(-eyeSpread * s + lookX * 1.5, eyeY * s + lookY * 1.3, pupilSize * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(eyeSpread * s + lookX * 1.5, eyeY * s + lookY * 1.3, pupilSize * s, 0, Math.PI * 2);
            ctx.fill();

            // Eye highlights (Dreamworks sparkle)
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(-eyeSpread * s + lookX * 0.5 - 1.5 * s, eyeY * s - 1.5 * s, 1.2 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(eyeSpread * s + lookX * 0.5 - 1.5 * s, eyeY * s - 1.5 * s, 1.2 * s, 0, Math.PI * 2);
            ctx.fill();

            // ── EYEBROWS — unique per character ──
            ctx.strokeStyle = member.accentColor;
            ctx.lineWidth = 1.3 * s;
            ctx.lineCap = 'round';
            const browY = eyeY - eyeSize - 1.5;

            if (member.personality.includes('stern')) {
                // Arc: stern angled brows (angry V shape)
                const furrow = Math.sin(t * 0.5) * 0.3 * s;
                ctx.beginPath();
                ctx.moveTo((-eyeSpread - 3) * s, (browY + 1) * s - furrow);
                ctx.lineTo((-eyeSpread + 3) * s, (browY - 1) * s);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo((eyeSpread - 3) * s, (browY - 1) * s);
                ctx.lineTo((eyeSpread + 3) * s, (browY + 1) * s - furrow);
                ctx.stroke();
            } else if (member.personality.includes('eager')) {
                // Weld: excited raised brows (high arches)
                const raise = Math.sin(t * 2) * 1 * s;
                ctx.beginPath();
                ctx.moveTo((-eyeSpread - 3) * s, (browY + 1) * s);
                ctx.quadraticCurveTo(-eyeSpread * s, (browY - 2) * s - raise, (-eyeSpread + 3) * s, (browY + 1) * s);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo((eyeSpread - 3) * s, (browY + 1) * s);
                ctx.quadraticCurveTo(eyeSpread * s, (browY - 2) * s - raise, (eyeSpread + 3) * s, (browY + 1) * s);
                ctx.stroke();
            } else if (member.personality.includes('meticulous')) {
                // Scribe: concentrated — one raised, one flat
                ctx.beginPath();
                ctx.moveTo((-eyeSpread - 3) * s, browY * s);
                ctx.lineTo((-eyeSpread + 3) * s, browY * s);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo((eyeSpread - 3) * s, (browY + 1) * s);
                ctx.quadraticCurveTo(eyeSpread * s, (browY - 2) * s, (eyeSpread + 3) * s, (browY + 1) * s);
                ctx.stroke();
            } else if (member.personality.includes('caring')) {
                // Pulse: soft curved brows
                ctx.beginPath();
                ctx.moveTo((-eyeSpread - 3) * s, (browY + 0.5) * s);
                ctx.quadraticCurveTo(-eyeSpread * s, (browY - 1) * s, (-eyeSpread + 3) * s, (browY + 0.5) * s);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo((eyeSpread - 3) * s, (browY + 0.5) * s);
                ctx.quadraticCurveTo(eyeSpread * s, (browY - 1) * s, (eyeSpread + 3) * s, (browY + 0.5) * s);
                ctx.stroke();
            } else if (member.personality.includes('chatty')) {
                // Echo: expressive — brows move a lot
                const exprL = Math.sin(t * 1.5) * 1.5 * s;
                const exprR = Math.cos(t * 1.5) * 1.5 * s;
                ctx.beginPath();
                ctx.moveTo((-eyeSpread - 3) * s, (browY + 0.5) * s - exprL);
                ctx.lineTo((-eyeSpread + 3) * s, browY * s);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo((eyeSpread - 3) * s, browY * s);
                ctx.lineTo((eyeSpread + 3) * s, (browY + 0.5) * s - exprR);
                ctx.stroke();
            }

            // ── SCRIBE: tiny glasses (two circles around eyes) ──
            if (member.shape === 'squat') {
                ctx.strokeStyle = '#ddd';
                ctx.lineWidth = 0.8 * s;
                // Left lens
                ctx.beginPath();
                ctx.arc(-eyeSpread * s, eyeY * s, (eyeSize + 1.5) * s, 0, Math.PI * 2);
                ctx.stroke();
                // Right lens
                ctx.beginPath();
                ctx.arc(eyeSpread * s, eyeY * s, (eyeSize + 1.5) * s, 0, Math.PI * 2);
                ctx.stroke();
                // Bridge
                ctx.beginPath();
                ctx.moveTo((-eyeSpread + eyeSize + 1.5) * s, eyeY * s);
                ctx.lineTo((eyeSpread - eyeSize - 1.5) * s, eyeY * s);
                ctx.stroke();
                // Temples
                ctx.beginPath();
                ctx.moveTo((-eyeSpread - eyeSize - 1.5) * s, eyeY * s);
                ctx.lineTo((-eyeSpread - eyeSize - 4) * s, (eyeY - 1) * s);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo((eyeSpread + eyeSize + 1.5) * s, eyeY * s);
                ctx.lineTo((eyeSpread + eyeSize + 4) * s, (eyeY - 1) * s);
                ctx.stroke();
            }

            // ── ECHO: headset/earpiece (arc near right eye) ──
            if (member.shape === 'swift') {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1 * s;
                // Earpiece arc
                ctx.beginPath();
                ctx.arc((eyeSpread + 3) * s, (eyeY - 1) * s, 4 * s, -0.8, 1.2);
                ctx.stroke();
                // Mic dot
                ctx.fillStyle = '#39ff14';
                ctx.beginPath();
                ctx.arc((eyeSpread + 6) * s, (eyeY + 2) * s, 1 * s, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Mouth — varies by personality
        ctx.strokeStyle = member.eyeColor;
        ctx.lineWidth = 1.2 * s;
        ctx.lineCap = 'round';
        const mouthBaseY = member.shape === 'tall' ? 1 : (member.shape === 'squat' ? 7 : 4);

        if (member.personality.includes('eager')) {
            // Weld: Happy open mouth that opens/closes when "talking"
            const talkOpen = Math.abs(Math.sin(t * 4)) * 2;
            ctx.beginPath();
            ctx.arc(0, mouthBaseY * s, (3 + talkOpen * 0.5) * s, 0.1, Math.PI - 0.1);
            ctx.stroke();
            // Tongue hint when wide open
            if (talkOpen > 1.5) {
                ctx.fillStyle = '#ff6666';
                ctx.beginPath();
                ctx.arc(0, (mouthBaseY + 1.5) * s, 1.5 * s, 0, Math.PI);
                ctx.fill();
            }
        } else if (member.personality.includes('chatty')) {
            // Echo: Animated talking mouth — alternates open/closed
            const chatPhase = Math.sin(t * 5);
            if (chatPhase > 0.3) {
                // Open mouth (talking)
                ctx.fillStyle = member.eyeColor;
                ctx.beginPath();
                ctx.ellipse(0, mouthBaseY * s, 3 * s, 2 * s * Math.abs(chatPhase), 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.ellipse(0, mouthBaseY * s, 2 * s, 1.2 * s * Math.abs(chatPhase), 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Closed smile
                ctx.beginPath();
                ctx.arc(0, (mouthBaseY - 1) * s, 3 * s, 0.2, Math.PI - 0.2);
                ctx.stroke();
            }
        } else if (member.personality.includes('stern')) {
            // Arc: Flat line with occasional smirk
            const smirk = Math.sin(t * 0.3) > 0.9 ? 1.5 : 0;
            ctx.beginPath();
            ctx.moveTo(-4 * s, mouthBaseY * s);
            ctx.quadraticCurveTo(0, (mouthBaseY + smirk) * s, 4 * s, mouthBaseY * s);
            ctx.stroke();
        } else if (member.personality.includes('vigilant')) {
            // Sentinel: Small focused "o" that occasionally whistles
            const whistlePhase = Math.sin(t * 0.8);
            if (whistlePhase > 0.7) {
                // Whistle — small "o"
                ctx.fillStyle = member.eyeColor;
                ctx.beginPath();
                ctx.arc(0, mouthBaseY * s, 2 * s, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(0, mouthBaseY * s, 1.2 * s, 0, Math.PI * 2);
                ctx.fill();
                // Musical note
                ctx.fillStyle = member.eyeColor;
                ctx.globalAlpha = 0.5;
                const noteY = mouthBaseY - 3 - Math.sin(t * 2) * 2;
                ctx.font = `${4 * s}px serif`;
                ctx.fillText('\u266a', 4 * s, noteY * s);
                ctx.globalAlpha = 1;
            } else {
                ctx.fillStyle = member.eyeColor;
                ctx.beginPath();
                ctx.arc(0, mouthBaseY * s, 1.5 * s, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (member.personality.includes('meticulous')) {
            // Scribe: Concentrated line that wiggles when writing
            const concentrate = Math.sin(t * 5) * 0.5;
            ctx.beginPath();
            ctx.moveTo(-3 * s, mouthBaseY * s);
            ctx.quadraticCurveTo(0, (mouthBaseY + concentrate) * s, 3 * s, mouthBaseY * s);
            ctx.stroke();
        } else {
            // Pulse: Warm caring smile
            ctx.beginPath();
            ctx.arc(0, (mouthBaseY - 1) * s, 3 * s, 0.2, Math.PI - 0.2);
            ctx.stroke();
            // Rosy cheeks for Pulse
            ctx.fillStyle = '#ff668855';
            ctx.beginPath();
            ctx.arc(-10 * s, (mouthBaseY - 2) * s, 2.5 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(10 * s, (mouthBaseY - 2) * s, 2.5 * s, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    // ── Helper: draw a tiny star ──
    _drawStar(ctx, cx, cy, r, points) {
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const angle = (i * Math.PI) / points - Math.PI / 2;
            const radius = i % 2 === 0 ? r : r * 0.4;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    },

    // ── Draw a crew lineup (multiple characters side by side) ──
    drawLineup(canvasId, memberIds, opts = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const w = canvas.width = opts.width || canvas.clientWidth || 400;
        const h = canvas.height = opts.height || canvas.clientHeight || 120;
        const ctx = canvas.getContext('2d');
        const count = memberIds.length;
        const spacing = w / (count + 1);
        const charScale = opts.scale || Math.min(1, spacing / 80);

        let frame = 0;
        const animate = () => {
            ctx.clearRect(0, 0, w, h);
            frame++;
            const t = frame * 0.04;

            memberIds.forEach((id, i) => {
                const member = this.members[id];
                if (!member) return;

                const cx = spacing * (i + 1);
                const cy = h * 0.5;
                const bounceY = Math.sin(t * 1.2 + i * 0.8) * 2 * charScale;
                const squish = 1 + Math.sin(t * 1.2 + i * 0.8) * 0.03;

                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.beginPath();
                ctx.ellipse(cx, h * 0.85, 12 * charScale, 3 * charScale, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.save();
                ctx.translate(cx, cy + bounceY);
                ctx.scale(squish, 1 / squish);

                // Body glow
                ctx.shadowColor = member.bodyColor;
                ctx.shadowBlur = 8 * charScale;

                this._drawBody(ctx, member, charScale, t + i * 2);
                ctx.shadowBlur = 0;
                this._drawFace(ctx, member, charScale, t + i * 0.5);

                ctx.restore();

                // Name
                ctx.fillStyle = member.bodyColor;
                ctx.font = `${7 * charScale}px "Share Tech Mono", monospace`;
                ctx.textAlign = 'center';
                ctx.globalAlpha = 0.6;
                ctx.fillText(member.name.toUpperCase(), cx, h * 0.96);
                ctx.globalAlpha = 1;
            });

            requestAnimationFrame(animate);
        };
        animate();
    },

    // ── Draw a single character with status indicator ──
    drawWithStatus(canvasId, memberId, status, opts = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width = opts.width || 60;
        const h = canvas.height = opts.height || 80;
        const member = this.members[memberId];
        if (!member) return;

        let frame = 0;
        const animate = () => {
            ctx.clearRect(0, 0, w, h);
            frame++;
            const t = frame * 0.04;
            const s = opts.scale || 0.7;

            const cx = w / 2;
            const cy = h * 0.45;
            const bounceY = Math.sin(t * 1.2) * 1.5 * s;

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.ellipse(cx, h * 0.78, 10 * s, 3 * s, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.save();
            ctx.translate(cx, cy + bounceY);

            // If sleeping (inactive), draw zzz
            if (status === 'sleeping') {
                ctx.globalAlpha = 0.4;
            }

            ctx.shadowColor = member.bodyColor;
            ctx.shadowBlur = 6 * s;
            this._drawBody(ctx, member, s, t);
            ctx.shadowBlur = 0;
            this._drawFace(ctx, member, s, t);
            ctx.globalAlpha = 1;
            ctx.restore();

            // Status dot
            const dotColor = status === 'active' ? '#39ff14' : status === 'busy' ? '#ffd700' : status === 'sleeping' ? '#666' : '#ff3366';
            ctx.fillStyle = dotColor;
            ctx.shadowColor = dotColor;
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(w - 8, 8, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Sleeping zzz
            if (status === 'sleeping') {
                const zAlpha = (Math.sin(t * 2) + 1) * 0.3 + 0.2;
                ctx.globalAlpha = zAlpha;
                ctx.fillStyle = '#888';
                ctx.font = `${8 * s}px monospace`;
                ctx.fillText('z', cx + 10, cy - 18);
                ctx.font = `${6 * s}px monospace`;
                ctx.fillText('z', cx + 16, cy - 24);
                ctx.font = `${5 * s}px monospace`;
                ctx.fillText('z', cx + 20, cy - 28);
                ctx.globalAlpha = 1;
            }

            // Name
            ctx.fillStyle = member.bodyColor;
            ctx.font = `${6 * s}px "Share Tech Mono", monospace`;
            ctx.textAlign = 'center';
            ctx.globalAlpha = 0.6;
            ctx.fillText(member.name.toUpperCase(), cx, h * 0.92);
            ctx.globalAlpha = 1;

            requestAnimationFrame(animate);
        };
        animate();
    },
};

// Make it globally accessible
window.MegaCrew = MegaCrew;
