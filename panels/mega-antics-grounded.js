/* mega-antics.js — MEGA Crew Panel-Top Antics System v2.0
   Characters LIVE ON TOP OF PANELS like the panel edges are ground.
   They scroll with the page because they're DOM-positioned, not fixed overlays.
   Each panel gets a small antics-stage div at its top edge with a canvas inside.
   Characters fish, nap, pump iron, DJ, argue across panels, and jump between them.

   Think Minions, but they actually live on the furniture. */

const GroundedAntics = (() => {

    // ── State ──
    let running = false;
    let panels = [];          // { el, stage, canvas, ctx, width, chars: [], panelName }
    let characters = [];      // all active characters
    let frameCount = 0;
    let lastFrameTime = 0;
    let lastRotationTime = 0;
    const CHAR_HEIGHT = 38;   // characters are ~38px tall
    const STAGE_HEIGHT = 70;  // antics-stage height
    const GROUND_Y = STAGE_HEIGHT - 2; // bottom of stage = top of panel = ground
    const MAX_PER_PANEL = 2;
    const ROTATION_INTERVAL_MIN = 30000;
    const ROTATION_INTERVAL_MAX = 60000;
    let nextRotationDelay = _randBetween(ROTATION_INTERVAL_MIN, ROTATION_INTERVAL_MAX);
    const TOTAL_CHARACTERS = 8;

    // ── MegaSpeak Dictionary ──
    const MEGASPEAK_PHRASES = [
        "howdy-ay y'all-bay!",
        "well-ay butter-bay my-ay biscuit-ay!",
        "yeehaw-ay!",
        "fixin-ay to-ay!",
        "reckon-ay so-bay!",
        "dag-nabbit-ay!",
        "bless-ay yer-ay heart-ay!",
        "tarnation-ay!",
        "golly-ay gee-bay whiz-ay!",
        "lord-ay have-ay mercy-bay!",
        "aw-bay shucks-ay!",
        "hotter-ay than-bay a-ay goat-bay in-ay a-ay pepper-ay patch-bay!",
        "slicker-ay than-bay snot-bay on-ay a-ay doorknob-ay!",
        "happier-ay than-bay a-ay pig-bay in-ay mud-ay!",
        "hold-ay yer-ay horses-bay!",
        "well-ay I'll-bay be-ay!",
        "ain't-ay that-bay somethin-bay!",
        "might-ay could-bay!",
        "over-ay yonder-bay!",
        "catty-ay wampus-bay!",
        "knee-ay high-bay to-ay a-ay grasshopper-bay!",
        "finer-ay than-bay frog-bay hair-ay!",
        "HAH-ay!",
        "git-ay along-bay!",
        "dadgum-ay!",
        "heavens-ay to-ay Betsy-bay!",
        "skedaddle-ay!",
        "plumb-ay crazy-bay!",
        "fit-ay to-bay be-ay tied-ay!",
    ];

    const MEGASPEAK_BABBLE = [
        "blurba durba yeehaw",
        "skibidi bop fixin",
        "wubba lubba y'all",
        "glorpa shnorpa howdy",
        "blibble blobble dag-nab",
        "zurp flurp tarnation",
        "snickle doodle reckon",
        "bippity boppity biscuit",
        "wompus dompus shucks",
        "flimflam jibber golly",
        "zibba zabba mercy",
        "plonka bonka yonder",
        "snarfle warfle dadgum",
        "greeble freeble hooey",
        "mimble wimble lawd",
        "gloopy snoopy haw",
        "nurble burble fiddle",
        "scoodle doodle hee",
        "frizzle drizzle moo",
        "wonka bonka bzzt",
    ];

    const MEGASPEAK_EXCLAMATIONS = ["!!!", "!!", "?!", "!?!", "~!", "!!~"];

    const MEGASPEAK_ARGUE = [
        "nuh-ay uh-bay!",
        "yuh-ay huh-bay!",
        "did-ay not-bay!",
        "did-ay too-bay!",
        "take-ay that-bay back-ay!",
        "make-ay me-bay!",
        "yer-ay mama-bay!",
        "oh-ay yeah-bay?!",
        "fight-ay me-bay!",
        "says-ay who-bay?!",
        "I-ay dare-bay ya-ay!",
        "hogwash-ay!",
        "baloney-ay!",
        "poppycock-ay!",
        "malarkey-bay!",
        "WELL-AY I-BAY NEVER-AY!",
    ];

    const FISHING_CATCHES = [
        "old-ay boot-bay!", "a-ay fish-bay!!", "WHALE-AY!!", "nothin-bay...",
        "sock-ay?!", "treasure-ay!!", "dang-ay seaweed-bay!", "SHARK-AY!!!",
        "rubber-ay duck-bay!", "data-ay packet-bay!", "a-ay bug-bay! literal-ay!",
    ];

    const CHEMISTRY_RESULTS = [
        "BOOM-AY!", "eureka-bay!", "oops-ay!", "it-ay works-bay!!",
        "oh-ay no-bay!", "FIRE-AY!!", "pretty-ay colors-bay!",
    ];

    // ── Helpers ──
    function _randBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    function _randItem(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
    function _randFloat(min, max) {
        return min + Math.random() * (max - min);
    }
    function megaSpeak() {
        if (Math.random() < 0.4) return _randItem(MEGASPEAK_BABBLE) + _randItem(MEGASPEAK_EXCLAMATIONS);
        return _randItem(MEGASPEAK_PHRASES);
    }
    function megaSpeakArgue() {
        return _randItem(MEGASPEAK_ARGUE);
    }
    function _getMember(id) {
        return MegaCrew.members[id];
    }
    function _allMemberIds() {
        return Object.keys(MegaCrew.members);
    }
    function _randMemberId() {
        return _randItem(_allMemberIds());
    }

    // ── Speech Bubble Renderer ──
    function drawSpeechBubble(ctx, x, y, text, opts = {}) {
        const fontSize = opts.fontSize || 9;
        const maxWidth = opts.maxWidth || 120;
        const padding = 4;
        const tailHeight = 6;
        const alpha = opts.alpha !== undefined ? opts.alpha : 1;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${fontSize}px "Share Tech Mono", monospace`;

        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        for (const word of words) {
            const test = currentLine ? currentLine + ' ' + word : word;
            if (ctx.measureText(test).width > maxWidth - padding * 2) {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = test;
            }
        }
        if (currentLine) lines.push(currentLine);

        const lineHeight = fontSize + 2;
        const textWidth = Math.min(maxWidth, Math.max(...lines.map(l => ctx.measureText(l).width)) + padding * 2);
        const textHeight = lines.length * lineHeight + padding * 2;

        const bx = x - textWidth / 2;
        const by = y - textHeight - tailHeight;
        const radius = 5;

        // Clamp bubble inside canvas
        const clampedBx = Math.max(2, Math.min(bx, (ctx.canvas.width || 300) - textWidth - 2));

        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(clampedBx + radius, by);
        ctx.lineTo(clampedBx + textWidth - radius, by);
        ctx.arcTo(clampedBx + textWidth, by, clampedBx + textWidth, by + radius, radius);
        ctx.lineTo(clampedBx + textWidth, by + textHeight - radius);
        ctx.arcTo(clampedBx + textWidth, by + textHeight, clampedBx + textWidth - radius, by + textHeight, radius);
        ctx.lineTo(Math.min(x + 6, clampedBx + textWidth - radius), by + textHeight);
        ctx.lineTo(x, by + textHeight + tailHeight);
        ctx.lineTo(Math.max(x - 3, clampedBx + radius), by + textHeight);
        ctx.lineTo(clampedBx + radius, by + textHeight);
        ctx.arcTo(clampedBx, by + textHeight, clampedBx, by + textHeight - radius, radius);
        ctx.lineTo(clampedBx, by + radius);
        ctx.arcTo(clampedBx, by, clampedBx + radius, by, radius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#111';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], clampedBx + textWidth / 2, by + padding + i * lineHeight);
        }
        ctx.restore();
    }

    // ── Character Drawing ──
    function drawCharacter(ctx, memberId, x, y, scale, t, opts = {}) {
        const member = _getMember(memberId);
        if (!member) return;

        ctx.save();
        ctx.translate(x, y);
        if (opts.flipX) ctx.scale(-1, 1);
        if (opts.rotation) ctx.rotate(opts.rotation);
        if (opts.scaleX) ctx.scale(opts.scaleX, 1);
        if (opts.scaleY) ctx.scale(1, opts.scaleY);
        if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.ellipse(0, 15 * scale, 10 * scale, 3 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = member.bodyColor;
        ctx.shadowBlur = 4 * scale;
        MegaCrew._drawBody(ctx, member, scale, t);
        ctx.shadowBlur = 0;
        MegaCrew._drawFace(ctx, member, scale, t);
        ctx.restore();
    }

    // ── Particle Effects ──
    function drawZzz(ctx, x, y, t) {
        ctx.save();
        ctx.fillStyle = '#aaa';
        const offsets = [
            { dx: 8, dy: -10, size: 9 },
            { dx: 14, dy: -18, size: 7 },
            { dx: 18, dy: -25, size: 5 },
        ];
        for (let i = 0; i < offsets.length; i++) {
            const o = offsets[i];
            const bob = Math.sin(t * 0.04 + i * 1.5) * 2;
            ctx.globalAlpha = 0.4 + Math.sin(t * 0.03 + i) * 0.2;
            ctx.font = `${o.size}px "Share Tech Mono", monospace`;
            ctx.fillText('z', x + o.dx, y + o.dy + bob);
        }
        ctx.restore();
    }

    function drawMusicNotes(ctx, x, y, t) {
        const notes = ['\u266A', '\u266B', '\u266C'];
        ctx.save();
        ctx.font = '10px serif';
        ctx.textAlign = 'center';
        for (let i = 0; i < 3; i++) {
            const age = (t * 0.05 + i * 0.33) % 1;
            ctx.globalAlpha = 1 - age;
            ctx.fillStyle = ['#ff69b4', '#00d4ff', '#ffd700'][i];
            const nx = x + Math.sin(age * 4 + i) * 10;
            const ny = y - age * 25 - 5;
            ctx.fillText(notes[i], nx, ny);
        }
        ctx.restore();
    }

    function drawSweatDrops(ctx, x, y, t) {
        ctx.save();
        for (let i = 0; i < 3; i++) {
            const age = (t * 0.06 + i * 0.33) % 1;
            ctx.globalAlpha = (1 - age) * 0.7;
            ctx.fillStyle = '#66ccff';
            const dx = (i - 1) * 8 + Math.sin(age * 3) * 3;
            const dy = -age * 20 - 5;
            ctx.beginPath();
            ctx.arc(x + dx, y + dy, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawDust(ctx, x, y, age, maxAge) {
        const progress = age / maxAge;
        ctx.save();
        ctx.globalAlpha = (1 - progress) * 0.4;
        ctx.fillStyle = '#aaa';
        ctx.beginPath();
        ctx.arc(x, y + progress * -6, 2 + progress * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawStars(ctx, x, y, age, maxAge) {
        const progress = age / maxAge;
        ctx.save();
        ctx.globalAlpha = 1 - progress;
        ctx.fillStyle = '#ffd700';
        ctx.font = `${10 + progress * 4}px monospace`;
        ctx.textAlign = 'center';
        const starChars = ['\u2605', '\u2606', '\u2733'];
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2 + progress * 2;
            const dist = 6 + progress * 12;
            ctx.fillText(starChars[i], x + Math.cos(angle) * dist, y + Math.sin(angle) * dist);
        }
        ctx.restore();
    }

    function drawColorSmoke(ctx, x, y, t, color) {
        ctx.save();
        for (let i = 0; i < 5; i++) {
            const age = (t * 0.04 + i * 0.2) % 1;
            ctx.globalAlpha = (1 - age) * 0.5;
            ctx.fillStyle = color || ['#ff6600', '#00ff88', '#ff69b4', '#ffd700', '#00d4ff'][i];
            const dx = Math.sin(age * 6 + i * 1.3) * 12;
            const dy = -age * 30;
            const size = 3 + age * 6;
            ctx.beginPath();
            ctx.arc(x + dx, y + dy, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // =========================================================================
    // ACTIVITY DEFINITIONS
    // Each activity controls how a character behaves on a panel top.
    // =========================================================================

    // ── FISHING ──
    // Character sits on panel edge, legs dangling, fishing rod extends down.
    // Occasionally catches something and reacts.
    function activityFishing(char, ctx, t, dt) {
        const x = char.x;
        const ground = GROUND_Y;
        const member = _getMember(char.memberId);
        if (!member) return;

        // Sitting position: body slightly lower, legs dangling
        const sitY = ground - 8;
        const bobble = Math.sin(t * 0.02) * 1;

        // Draw legs dangling over edge
        ctx.save();
        ctx.strokeStyle = member.bodyColor;
        ctx.lineWidth = 3;
        const legSwing1 = Math.sin(t * 0.015) * 4;
        const legSwing2 = Math.sin(t * 0.015 + 1) * 4;
        // Left leg
        ctx.beginPath();
        ctx.moveTo(x - 5, ground);
        ctx.lineTo(x - 5 + legSwing1, ground + 12);
        ctx.stroke();
        // Right leg
        ctx.beginPath();
        ctx.moveTo(x + 5, ground);
        ctx.lineTo(x + 5 + legSwing2, ground + 12);
        ctx.stroke();
        // Feet (tiny shoes)
        ctx.fillStyle = '#333';
        ctx.fillRect(x - 7 + legSwing1, ground + 11, 4, 2);
        ctx.fillRect(x + 3 + legSwing2, ground + 11, 4, 2);
        ctx.restore();

        // Draw body sitting
        drawCharacter(ctx, char.memberId, x, sitY + bobble, 0.7, t);

        // Fishing rod
        ctx.save();
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 1.5;
        const rodTipX = x + 20;
        const rodTipY = sitY - 15 + bobble;
        // Rod from hand to tip
        ctx.beginPath();
        ctx.moveTo(x + 8, sitY + bobble);
        ctx.lineTo(rodTipX, rodTipY);
        ctx.stroke();

        // Fishing line going down
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 0.7;
        const lineWobble = Math.sin(t * 0.03) * 3;
        const lineEndY = ground + 25;
        ctx.beginPath();
        ctx.moveTo(rodTipX, rodTipY);
        ctx.quadraticCurveTo(rodTipX + lineWobble, (rodTipY + lineEndY) / 2, rodTipX + lineWobble * 0.5, lineEndY);
        ctx.stroke();

        // Bobber
        ctx.fillStyle = '#ff3333';
        ctx.beginPath();
        ctx.arc(rodTipX + lineWobble * 0.5, lineEndY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(rodTipX + lineWobble * 0.5, lineEndY - 1.5, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Catch event
        if (!char.catchTimer) char.catchTimer = _randBetween(4000, 8000);
        char.catchElapsed = (char.catchElapsed || 0) + dt;

        if (char.catchElapsed > char.catchTimer && !char.catching) {
            char.catching = true;
            char.catchPhrase = _randItem(FISHING_CATCHES);
            char.catchStart = char.activityElapsed;
        }

        if (char.catching) {
            const since = char.activityElapsed - char.catchStart;
            if (since < 1500) {
                // Pull up animation - character leans back
                const pullAngle = Math.sin(since * 0.01) * 0.15;
                // Exclamation
                ctx.save();
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('!', x, sitY - 22);
                ctx.restore();
            } else if (since < 3500) {
                drawSpeechBubble(ctx, x, sitY - 28, char.catchPhrase, {
                    alpha: since < 2000 ? 1 : Math.max(0, 1 - (since - 3000) / 500)
                });
            } else {
                char.catching = false;
                char.catchElapsed = 0;
                char.catchTimer = _randBetween(5000, 10000);
            }
        }
    }

    // ── NAPPING ──
    // Character lies on panel top, zzz floating up.
    // Occasionally rolls toward edge, wakes up startled, settles back.
    function activityNapping(char, ctx, t, dt) {
        const ground = GROUND_Y;
        const member = _getMember(char.memberId);
        if (!member) return;

        if (!char.napPhase) {
            char.napPhase = 'sleeping';
            char.rollTimer = _randBetween(5000, 9000);
            char.napElapsed = 0;
        }
        char.napElapsed += dt;

        const baseX = char.x;

        if (char.napPhase === 'sleeping') {
            // Lying down: rotated 90 degrees, gently breathing
            const breathe = Math.sin(t * 0.02) * 1.5;
            ctx.save();
            ctx.translate(baseX, ground - 6);
            ctx.rotate(Math.PI / 2 * 0.35);
            ctx.scale(0.7, 0.7 + breathe * 0.02);
            MegaCrew._drawBody(ctx, member, 0.7, t);
            MegaCrew._drawFace(ctx, member, 0.7, t);
            ctx.restore();

            // Zzz bubbles
            drawZzz(ctx, baseX + 5, ground - 14, t);

            // Tiny blanket (rectangle)
            ctx.save();
            ctx.fillStyle = member.bodyColor + '33';
            ctx.strokeStyle = member.bodyColor + '66';
            ctx.lineWidth = 0.5;
            ctx.fillRect(baseX - 10, ground - 10, 20, 8);
            ctx.strokeRect(baseX - 10, ground - 10, 20, 8);
            ctx.restore();

            if (char.napElapsed > char.rollTimer) {
                char.napPhase = 'rolling';
                char.rollStart = char.napElapsed;
                char.rollDirection = Math.random() < 0.5 ? -1 : 1;
            }
        } else if (char.napPhase === 'rolling') {
            // Rolling toward edge!
            const since = char.napElapsed - char.rollStart;
            const rollDist = Math.min(since * 0.02, 15) * char.rollDirection;

            ctx.save();
            ctx.translate(baseX + rollDist, ground - 6);
            ctx.rotate(Math.PI / 2 * 0.35 + since * 0.003 * char.rollDirection);
            MegaCrew._drawBody(ctx, member, 0.7, t);
            MegaCrew._drawFace(ctx, member, 0.7, t);
            ctx.restore();

            drawZzz(ctx, baseX + rollDist + 5, ground - 14, t);

            if (since > 1200) {
                char.napPhase = 'startled';
                char.startleStart = char.napElapsed;
            }
        } else if (char.napPhase === 'startled') {
            // WAKE UP! Jump upright
            const since = char.napElapsed - char.startleStart;
            const jumpH = since < 300 ? Math.sin((since / 300) * Math.PI) * 18 : 0;

            drawCharacter(ctx, char.memberId, baseX, ground - 14 - jumpH, 0.7, t);

            if (since < 400) {
                // Startle lines
                ctx.save();
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 1.5;
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(baseX + Math.cos(angle) * 12, ground - 20 - jumpH + Math.sin(angle) * 12);
                    ctx.lineTo(baseX + Math.cos(angle) * 18, ground - 20 - jumpH + Math.sin(angle) * 18);
                    ctx.stroke();
                }
                ctx.restore();
            }

            if (since < 2000) {
                drawSpeechBubble(ctx, baseX, ground - 36 - jumpH, 'WHOA-AY!!', {
                    alpha: since < 500 ? since / 500 : Math.max(0, 1 - (since - 1500) / 500)
                });
            }

            if (since > 2500) {
                // Settle back down
                char.napPhase = 'sleeping';
                char.napElapsed = 0;
                char.rollTimer = _randBetween(6000, 12000);
            }
        }
    }

    // ── PUMPING IRON ──
    // Comically oversized muscles, barbell overhead, sweat flying.
    // Specific to WEIGHT LOSS panel but works anywhere.
    function activityPumpingIron(char, ctx, t, dt) {
        const ground = GROUND_Y;
        const member = _getMember(char.memberId);
        if (!member) return;

        const x = char.x;

        // Lift cycle: 3 second period
        const liftCycle = (t * 0.03) % 1;
        const lifting = liftCycle < 0.5;
        const liftProgress = lifting ? liftCycle * 2 : 1 - (liftCycle - 0.5) * 2;
        const barbellY = ground - 16 - liftProgress * 24;
        const strain = liftProgress;

        // COMICALLY OVERSIZED BODY - 2x wider with bulging muscles
        ctx.save();
        ctx.translate(x, ground - 12);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.ellipse(0, 14, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // SWOLE body - wider than normal
        ctx.fillStyle = member.bodyColor;
        ctx.shadowColor = member.bodyColor;
        ctx.shadowBlur = 5;

        // Torso (extra wide)
        ctx.beginPath();
        ctx.ellipse(0, 0, 12 + strain * 2, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // LEFT BICEP (HUGE)
        const armAngle = -0.8 + liftProgress * 0.6;
        ctx.save();
        ctx.translate(-12, -4);
        ctx.rotate(armAngle);
        // Upper arm
        ctx.fillStyle = member.bodyColor;
        ctx.beginPath();
        ctx.ellipse(0, -6, 6 + strain * 3, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Bicep bulge
        ctx.beginPath();
        ctx.ellipse(-2, -8, 5 + strain * 4, 5 + strain * 2, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // RIGHT BICEP (HUGE)
        ctx.save();
        ctx.translate(12, -4);
        ctx.rotate(-armAngle);
        ctx.fillStyle = member.bodyColor;
        ctx.beginPath();
        ctx.ellipse(0, -6, 6 + strain * 3, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(2, -8, 5 + strain * 4, 5 + strain * 2, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.shadowBlur = 0;

        // Face (strained!)
        // Eyes (wide, straining)
        const eyeSize = 3 + strain;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-4, -4, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(4, -4, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        // Pupils
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(-4, -4, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(4, -4, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Straining mouth (gritted teeth)
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (lifting) {
            // Gritting
            ctx.moveTo(-4, 3);
            ctx.lineTo(4, 3);
            // Teeth lines
            for (let i = -3; i <= 3; i += 2) {
                ctx.moveTo(i, 1.5);
                ctx.lineTo(i, 4.5);
            }
        } else {
            // Grinning between reps
            ctx.arc(0, 2, 3, 0, Math.PI);
        }
        ctx.stroke();

        // Vein popping on forehead when lifting
        if (lifting && strain > 0.5) {
            ctx.strokeStyle = member.accentColor || member.bodyColor;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(-2, -10);
            ctx.lineTo(-1, -12);
            ctx.lineTo(1, -11);
            ctx.lineTo(2, -13);
            ctx.stroke();
        }

        ctx.restore();

        // BARBELL
        ctx.save();
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        // Bar
        ctx.beginPath();
        ctx.moveTo(x - 22, barbellY);
        ctx.lineTo(x + 22, barbellY);
        ctx.stroke();
        // Weights (plates)
        ctx.fillStyle = '#333';
        ctx.fillRect(x - 24, barbellY - 5, 4, 10);
        ctx.fillRect(x + 20, barbellY - 5, 4, 10);
        // Outer plates (bigger)
        ctx.fillStyle = '#222';
        ctx.fillRect(x - 28, barbellY - 7, 4, 14);
        ctx.fillRect(x + 24, barbellY - 7, 4, 14);
        ctx.restore();

        // Sweat drops flying off
        drawSweatDrops(ctx, x - 10, ground - 20, t);
        drawSweatDrops(ctx, x + 10, ground - 20, t + 50);

        // Flex phase: every 8 seconds, flex and grin
        if (!char.flexTimer) char.flexTimer = 0;
        char.flexTimer += dt;
        if (char.flexTimer > 8000 && char.flexTimer < 10000) {
            drawSpeechBubble(ctx, x, ground - 48, 'GAINS-AY!!', { fontSize: 8 });
        }
        if (char.flexTimer > 10000) char.flexTimer = 0;
    }

    // ── TREADMILL ──
    // Character runs on tiny treadmill, legs pumping, arms swinging.
    function activityTreadmill(char, ctx, t, dt) {
        const ground = GROUND_Y;
        const member = _getMember(char.memberId);
        if (!member) return;
        const x = char.x;

        // Treadmill base
        ctx.save();
        ctx.fillStyle = '#333';
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        // Base
        ctx.fillRect(x - 16, ground - 3, 32, 5);
        ctx.strokeRect(x - 16, ground - 3, 32, 5);
        // Belt stripes moving
        const beltSpeed = t * 0.15;
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 6; i++) {
            const bx = x - 14 + ((i * 6 + beltSpeed * 10) % 30);
            ctx.beginPath();
            ctx.moveTo(bx, ground - 2);
            ctx.lineTo(bx, ground + 1);
            ctx.stroke();
        }
        // Handles
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - 12, ground - 3);
        ctx.lineTo(x - 14, ground - 22);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 12, ground - 3);
        ctx.lineTo(x + 14, ground - 22);
        ctx.stroke();
        // Handle bar
        ctx.beginPath();
        ctx.moveTo(x - 14, ground - 22);
        ctx.lineTo(x + 14, ground - 22);
        ctx.stroke();
        // Display panel
        ctx.fillStyle = '#111';
        ctx.fillRect(x - 6, ground - 24, 12, 4);
        ctx.fillStyle = '#0f0';
        ctx.font = '3px monospace';
        ctx.textAlign = 'center';
        const cals = Math.floor(char.activityElapsed / 100);
        ctx.fillText(`${cals}`, x, ground - 21);
        ctx.restore();

        // Running character on treadmill
        const runBounce = Math.abs(Math.sin(t * 0.15 * 3)) * 5;
        const armSwing = Math.sin(t * 0.15 * 6) * 0.25;

        ctx.save();
        ctx.translate(x, ground - 10 - runBounce);
        ctx.rotate(armSwing * 0.08);
        MegaCrew._drawBody(ctx, member, 0.65, t * 3);
        MegaCrew._drawFace(ctx, member, 0.65, t * 3);
        ctx.restore();

        // Sweat
        drawSweatDrops(ctx, x, ground - 22, t);

        // Stumble event
        if (!char.stumbleTimer) char.stumbleTimer = _randBetween(6000, 12000);
        if (char.activityElapsed > char.stumbleTimer && !char.stumbling) {
            char.stumbling = true;
            char.stumbleStart = char.activityElapsed;
        }
        if (char.stumbling) {
            const since = char.activityElapsed - char.stumbleStart;
            if (since < 1500) {
                // Wobble and grab handles
                const wobble = Math.sin(since * 0.02) * 5;
                ctx.save();
                ctx.translate(x + wobble, ground - 10);
                ctx.rotate(wobble * 0.02);
                ctx.restore();

                if (since < 1000) {
                    drawSpeechBubble(ctx, x, ground - 40, 'WHOA-AY!', { fontSize: 8 });
                }
            } else {
                char.stumbling = false;
                char.stumbleTimer = char.activityElapsed + _randBetween(8000, 15000);
            }
        }
    }

    // ── TELESCOPE WATCH ──
    // Sentinel stands with telescope scanning horizon.
    function activityTelescope(char, ctx, t, dt) {
        const ground = GROUND_Y;
        const member = _getMember(char.memberId);
        if (!member) return;
        const x = char.x;

        // Standing character
        drawCharacter(ctx, char.memberId, x, ground - 14, 0.7, t);

        // Telescope
        ctx.save();
        const scanAngle = Math.sin(t * 0.01) * 0.4 - 0.3;
        ctx.translate(x + 8, ground - 20);
        ctx.rotate(scanAngle);
        // Telescope body
        ctx.fillStyle = '#8B7355';
        ctx.fillRect(0, -1.5, 18, 3);
        // Lens
        ctx.fillStyle = '#aaddff';
        ctx.beginPath();
        ctx.arc(18, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        // Lens glint
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(17, -1, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Tripod legs
        ctx.save();
        ctx.strokeStyle = '#8B7355';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 8, ground - 18);
        ctx.lineTo(x + 2, ground - 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 8, ground - 18);
        ctx.lineTo(x + 14, ground - 2);
        ctx.stroke();
        ctx.restore();

        // Spot something event
        if (!char.spotTimer) char.spotTimer = _randBetween(5000, 10000);
        if (char.activityElapsed > char.spotTimer && !char.spotted) {
            char.spotted = true;
            char.spotStart = char.activityElapsed;
        }
        if (char.spotted) {
            const since = char.activityElapsed - char.spotStart;
            if (since < 500) {
                // Alert ! above head
                ctx.save();
                ctx.fillStyle = '#ff3333';
                ctx.font = 'bold 12px monospace';
                ctx.textAlign = 'center';
                const bounce = Math.sin(since * 0.02) * 3;
                ctx.fillText('!', x, ground - 34 + bounce);
                ctx.restore();
            } else if (since < 2500) {
                drawSpeechBubble(ctx, x, ground - 38, 'BOGEY-AY spotted-bay!', {
                    alpha: since < 1000 ? 1 : Math.max(0, 1 - (since - 2000) / 500),
                    fontSize: 8
                });
            } else {
                char.spotted = false;
                char.spotTimer = char.activityElapsed + _randBetween(6000, 12000);
            }
        }
    }

    // ── WRITING ──
    // Scribe sits cross-legged writing furiously, crumpled papers pile up.
    function activityWriting(char, ctx, t, dt) {
        const ground = GROUND_Y;
        const member = _getMember(char.memberId);
        if (!member) return;
        const x = char.x;

        // Sitting cross-legged (lower position)
        const sitY = ground - 6;
        drawCharacter(ctx, char.memberId, x, sitY, 0.65, t);

        // Paper/book in front
        ctx.save();
        ctx.fillStyle = '#fff8e7';
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 0.5;
        // Paper
        ctx.fillRect(x + 8, sitY + 2, 10, 8);
        ctx.strokeRect(x + 8, sitY + 2, 10, 8);
        // Writing lines
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 0.3;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(x + 9, sitY + 4 + i * 1.8);
            ctx.lineTo(x + 17, sitY + 4 + i * 1.8);
            ctx.stroke();
        }
        ctx.restore();

        // Pen/pencil scratching
        const penX = x + 10 + Math.sin(t * 0.15) * 4;
        const penY = sitY + 3 + Math.abs(Math.sin(t * 0.2)) * 3;
        ctx.save();
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(penX, penY, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Crumpled papers on the ground
        if (!char.crumples) char.crumples = [];
        if (!char.crumpleTimer) char.crumpleTimer = _randBetween(3000, 6000);
        if (char.activityElapsed > char.crumpleTimer && char.crumples.length < 5) {
            char.crumples.push({
                x: x - 12 + Math.random() * 8 - 4 + char.crumples.length * 5,
                y: ground - 3 + Math.random() * 2,
                rot: Math.random() * Math.PI,
                size: 2.5 + Math.random() * 1.5,
            });
            char.crumpleTimer = char.activityElapsed + _randBetween(3000, 6000);

            // Frustrated outburst every few crumples
            if (char.crumples.length % 2 === 0) {
                char.crumpleSpeech = char.activityElapsed;
            }
        }

        // Draw crumpled papers
        ctx.save();
        ctx.fillStyle = '#e8e0d0';
        ctx.strokeStyle = '#bbb';
        ctx.lineWidth = 0.5;
        for (const c of char.crumples) {
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.rot);
            ctx.beginPath();
            // Irregular crumpled shape
            ctx.moveTo(-c.size, 0);
            ctx.lineTo(-c.size * 0.5, -c.size * 0.8);
            ctx.lineTo(c.size * 0.5, -c.size * 0.6);
            ctx.lineTo(c.size, 0);
            ctx.lineTo(c.size * 0.6, c.size * 0.7);
            ctx.lineTo(-c.size * 0.4, c.size * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();

        // Frustrated speech
        if (char.crumpleSpeech && char.activityElapsed - char.crumpleSpeech < 2000) {
            const a = Math.max(0, 1 - (char.activityElapsed - char.crumpleSpeech - 1500) / 500);
            drawSpeechBubble(ctx, x, sitY - 22, _randItem(["dag-nabbit-ay!", "no-bay good-ay!", "trash-ay!"]), {
                alpha: a, fontSize: 8
            });
        }
    }

    // ── DJ BOOTH ──
    // Echo stands behind turntables, scratching records, music notes float up.
    function activityDJ(char, ctx, t, dt) {
        const ground = GROUND_Y;
        const member = _getMember(char.memberId);
        if (!member) return;
        const x = char.x;

        // DJ table
        ctx.save();
        ctx.fillStyle = '#222';
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.fillRect(x - 18, ground - 12, 36, 14);
        ctx.strokeRect(x - 18, ground - 12, 36, 14);

        // Turntables (two circles)
        const spin1 = t * 0.08;
        const spin2 = t * 0.08 + Math.PI;
        for (const [tx, spin] of [[x - 8, spin1], [x + 8, spin2]]) {
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(tx, ground - 6, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 0.5;
            ctx.stroke();
            // Grooves
            ctx.strokeStyle = '#333';
            ctx.beginPath();
            ctx.arc(tx, ground - 6, 3, 0, Math.PI * 2);
            ctx.stroke();
            // Spinning line
            ctx.strokeStyle = member.bodyColor;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(tx, ground - 6);
            ctx.lineTo(tx + Math.cos(spin) * 5, ground - 6 + Math.sin(spin) * 5);
            ctx.stroke();
            // Center dot
            ctx.fillStyle = member.bodyColor;
            ctx.beginPath();
            ctx.arc(tx, ground - 6, 1, 0, Math.PI * 2);
            ctx.fill();
        }

        // Crossfader
        const faderPos = Math.sin(t * 0.04) * 4;
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(x - 1 + faderPos, ground - 4, 3, 2);

        ctx.restore();

        // DJ character behind table
        drawCharacter(ctx, char.memberId, x, ground - 22, 0.65, t);

        // Headphone on one ear
        ctx.save();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + 7, ground - 26, 4, -0.5, 1.2);
        ctx.stroke();
        ctx.fillStyle = '#222';
        ctx.fillRect(x + 9, ground - 28, 3, 5);
        ctx.restore();

        // Scratching hand (arm reaching to record)
        const scratchX = Math.sin(t * 0.12) * 3;
        ctx.save();
        ctx.fillStyle = member.bodyColor;
        ctx.beginPath();
        ctx.arc(x - 8 + scratchX, ground - 12, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Music notes floating up
        drawMusicNotes(ctx, x - 5, ground - 30, t);
        drawMusicNotes(ctx, x + 8, ground - 28, t + 20);

        // Occasional shoutout
        if (!char.shoutTimer) char.shoutTimer = _randBetween(4000, 8000);
        if (char.activityElapsed > char.shoutTimer) {
            char.shouting = true;
            char.shoutStart = char.activityElapsed;
            char.shoutTimer = char.activityElapsed + _randBetween(5000, 10000);
            char.shoutPhrase = _randItem([
                "DROP-AY THE-BAY BASS-AY!",
                "yeehaw-ay remix-bay!",
                "boots-ay and-bay cats-ay!",
                "UNTZ-AY UNTZ-BAY!",
            ]);
        }
        if (char.shouting) {
            const since = char.activityElapsed - char.shoutStart;
            if (since < 2500) {
                drawSpeechBubble(ctx, x, ground - 42, char.shoutPhrase, {
                    alpha: since < 500 ? since / 500 : Math.max(0, 1 - (since - 2000) / 500),
                    fontSize: 7
                });
            } else {
                char.shouting = false;
            }
        }
    }

    // ── GUARD DUTY ──
    // Arc stands at attention, marches left-right, crisp about-face.
    function activityGuardDuty(char, ctx, t, dt) {
        const ground = GROUND_Y;
        const member = _getMember(char.memberId);
        if (!member) return;

        if (!char.guardPhase) {
            char.guardPhase = 'stand';
            char.guardTimer = 0;
            char.marchX = char.x;
            char.marchDir = 1;
            char.marchOriginX = char.x;
        }
        char.guardTimer += dt;

        const panelWidth = char.panelRef ? char.panelRef.width : 200;
        const leftBound = Math.max(20, char.marchOriginX - 40);
        const rightBound = Math.min(panelWidth - 20, char.marchOriginX + 40);

        if (char.guardPhase === 'stand') {
            // Standing at attention - perfectly still, no idle anim
            drawCharacter(ctx, char.memberId, char.marchX, ground - 14, 0.7, 0); // t=0 for no idle

            if (char.guardTimer > 3000) {
                char.guardPhase = 'march';
                char.guardTimer = 0;
            }
        } else if (char.guardPhase === 'march') {
            // March left-right
            char.marchX += char.marchDir * 0.03 * dt;
            if (char.marchX > rightBound) {
                char.marchDir = -1;
                char.guardPhase = 'aboutface';
                char.guardTimer = 0;
            } else if (char.marchX < leftBound) {
                char.marchDir = 1;
                char.guardPhase = 'aboutface';
                char.guardTimer = 0;
            }

            // Marching bounce
            const marchBounce = Math.abs(Math.sin(t * 0.1)) * 3;
            drawCharacter(ctx, char.memberId, char.marchX, ground - 14 - marchBounce, 0.7, t, {
                flipX: char.marchDir === -1
            });
        } else if (char.guardPhase === 'aboutface') {
            // Crisp spin!
            const spinDuration = 300;
            const spinProgress = Math.min(1, char.guardTimer / spinDuration);
            const spinAngle = spinProgress * Math.PI * 2;

            drawCharacter(ctx, char.memberId, char.marchX, ground - 14, 0.7, t, {
                scaleX: Math.cos(spinAngle) // Creates a "turning" effect
            });

            if (char.guardTimer > spinDuration) {
                char.guardPhase = 'march';
                char.guardTimer = 0;
            }
        }

        // Occasional salute speech
        if (!char.saluteTimer) char.saluteTimer = _randBetween(8000, 15000);
        if (char.activityElapsed > char.saluteTimer) {
            char.saluting = true;
            char.saluteStart = char.activityElapsed;
            char.saluteTimer = char.activityElapsed + _randBetween(8000, 15000);
        }
        if (char.saluting) {
            const since = char.activityElapsed - char.saluteStart;
            if (since < 2000) {
                drawSpeechBubble(ctx, char.marchX, ground - 36, 'all-ay clear-bay sir-ay!', {
                    alpha: since < 500 ? since / 500 : Math.max(0, 1 - (since - 1500) / 500),
                    fontSize: 7
                });
            } else {
                char.saluting = false;
            }
        }
    }

    // ── CHEMISTRY ──
    // Mixes beakers, one explodes in colored smoke, character coughs.
    function activityChemistry(char, ctx, t, dt) {
        const ground = GROUND_Y;
        const member = _getMember(char.memberId);
        if (!member) return;
        const x = char.x;

        // Lab table
        ctx.save();
        ctx.fillStyle = '#444';
        ctx.fillRect(x - 14, ground - 6, 28, 8);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x - 14, ground - 6, 28, 8);
        ctx.restore();

        // Beakers
        const beakers = [
            { bx: x - 8, color: '#00ff88', bubbling: true },
            { bx: x, color: '#ff69b4', bubbling: false },
            { bx: x + 8, color: '#ffd700', bubbling: Math.sin(t * 0.03) > 0.5 },
        ];

        ctx.save();
        for (const b of beakers) {
            // Beaker shape
            ctx.strokeStyle = '#aaa';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(b.bx - 3, ground - 6);
            ctx.lineTo(b.bx - 2, ground - 14);
            ctx.lineTo(b.bx + 2, ground - 14);
            ctx.lineTo(b.bx + 3, ground - 6);
            ctx.stroke();
            // Liquid
            ctx.fillStyle = b.color + '99';
            ctx.fillRect(b.bx - 2.5, ground - 11, 5, 5);
            // Bubbles
            if (b.bubbling) {
                ctx.fillStyle = b.color;
                for (let i = 0; i < 2; i++) {
                    const by = ground - 10 - Math.abs(Math.sin(t * 0.05 + i * 2)) * 4;
                    ctx.beginPath();
                    ctx.arc(b.bx + (i - 0.5) * 2, by, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.restore();

        // Character behind table
        drawCharacter(ctx, char.memberId, x, ground - 18, 0.6, t);

        // Safety goggles (two circles on face area)
        ctx.save();
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(x - 3, ground - 22, 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + 3, ground - 22, 3, 0, Math.PI * 2);
        ctx.stroke();
        // Bridge
        ctx.beginPath();
        ctx.moveTo(x - 0.5, ground - 22);
        ctx.lineTo(x + 0.5, ground - 22);
        ctx.stroke();
        ctx.restore();

        // Explosion event
        if (!char.explodeTimer) char.explodeTimer = _randBetween(5000, 10000);
        if (char.activityElapsed > char.explodeTimer && !char.exploding) {
            char.exploding = true;
            char.explodeStart = char.activityElapsed;
            char.explodeColor = _randItem(['#ff6600', '#00ff88', '#ff69b4', '#ffd700', '#bc13fe']);
            char.explodePhrase = _randItem(CHEMISTRY_RESULTS);
        }
        if (char.exploding) {
            const since = char.activityElapsed - char.explodeStart;
            if (since < 500) {
                // Flash
                ctx.save();
                ctx.globalAlpha = 1 - since / 500;
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(x, ground - 12, 8 + since * 0.02, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            if (since < 2000) {
                drawColorSmoke(ctx, x, ground - 14, since * 0.05, char.explodeColor);
            }
            if (since > 300 && since < 2500) {
                // Coughing character
                drawSpeechBubble(ctx, x, ground - 42, char.explodePhrase, {
                    alpha: since < 800 ? 1 : Math.max(0, 1 - (since - 2000) / 500),
                    fontSize: 8
                });
                // Cough puffs
                ctx.save();
                ctx.fillStyle = '#aaa';
                ctx.globalAlpha = Math.max(0, 0.5 - since / 5000);
                ctx.beginPath();
                ctx.arc(x + 10, ground - 18, 2 + since * 0.003, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            if (since > 3000) {
                char.exploding = false;
                char.explodeTimer = char.activityElapsed + _randBetween(6000, 12000);
            }
        }
    }

    // ── WALKING (transition between activities) ──
    function activityWalking(char, ctx, t, dt) {
        const ground = GROUND_Y;
        const member = _getMember(char.memberId);
        if (!member) return;

        // Walk toward target
        if (char.walkTarget !== undefined) {
            const dx = char.walkTarget - char.x;
            const speed = 0.04 * dt;
            if (Math.abs(dx) < 3) {
                char.x = char.walkTarget;
                // Arrived: switch to next activity
                if (char.nextActivity) {
                    char.activity = char.nextActivity;
                    char.nextActivity = null;
                    char.activityElapsed = 0;
                    // Reset activity-specific state
                    _resetActivityState(char);
                }
                return;
            }
            char.x += Math.sign(dx) * speed;
            const flipX = dx < 0;

            const bounce = Math.abs(Math.sin(t * 0.12)) * 4;
            drawCharacter(ctx, char.memberId, char.x, ground - 14 - bounce, 0.7, t, { flipX });

            // Dust
            if (Math.random() < 0.15) {
                if (!char.dustParticles) char.dustParticles = [];
                char.dustParticles.push({
                    x: char.x + (flipX ? 6 : -6),
                    y: ground - 2,
                    age: 0, maxAge: 400
                });
            }
            if (char.dustParticles) {
                char.dustParticles.forEach(p => { p.age += dt; drawDust(ctx, p.x, p.y, p.age, p.maxAge); });
                char.dustParticles = char.dustParticles.filter(p => p.age < p.maxAge);
            }
        } else {
            drawCharacter(ctx, char.memberId, char.x, ground - 14, 0.7, t);
        }
    }

    // ── PANEL JUMPING ──
    // Character runs to edge, leaps across gap to next panel.
    // This is handled specially in the main loop since it involves two panels.
    function activityJumping(char, ctx, t, dt) {
        const ground = GROUND_Y;
        if (!char.jumpPhase) {
            char.jumpPhase = 'running';
            char.jumpTimer = 0;
            // Determine direction toward edge
            const panelWidth = char.panelRef ? char.panelRef.width : 200;
            if (char.x < panelWidth / 2) {
                char.jumpDir = -1;
                char.jumpEdge = 5;
            } else {
                char.jumpDir = 1;
                char.jumpEdge = panelWidth - 5;
            }
        }
        char.jumpTimer += dt;

        if (char.jumpPhase === 'running') {
            // Run toward edge
            char.x += char.jumpDir * 0.06 * dt;
            const bounce = Math.abs(Math.sin(t * 0.15)) * 4;
            drawCharacter(ctx, char.memberId, char.x, ground - 14 - bounce, 0.7, t, {
                flipX: char.jumpDir === -1
            });

            // Check if at edge
            if ((char.jumpDir === 1 && char.x >= char.jumpEdge) ||
                (char.jumpDir === -1 && char.x <= char.jumpEdge)) {
                char.jumpPhase = 'leaping';
                char.jumpTimer = 0;
                char.jumpStartX = char.x;
                char.jumpStartPanel = char.panelIndex;

                // Find target panel
                const nextIdx = char.jumpDir === 1 ? char.panelIndex + 1 : char.panelIndex - 1;
                if (nextIdx >= 0 && nextIdx < panels.length && _charsOnPanel(nextIdx).length < MAX_PER_PANEL) {
                    char.jumpTargetPanel = nextIdx;
                } else {
                    // Can't jump, turn around
                    char.jumpPhase = 'failed';
                    char.jumpTimer = 0;
                }
            }
        } else if (char.jumpPhase === 'leaping') {
            // Arc through the air! Character disappears from this canvas
            // and will be drawn on the jump overlay
            const jumpDuration = 600;
            const progress = Math.min(1, char.jumpTimer / jumpDuration);

            // Draw on current canvas with arc going off edge
            const arcX = char.jumpStartX + char.jumpDir * progress * 40;
            const arcY = ground - 14 - Math.sin(progress * Math.PI) * 35;

            if (progress < 0.4) {
                // Still visible on source panel
                drawCharacter(ctx, char.memberId, arcX, arcY, 0.7, t, {
                    rotation: char.jumpDir * progress * 0.5
                });
            }

            if (progress >= 1) {
                // Land on target panel
                if (char.jumpTargetPanel !== undefined) {
                    const targetPanel = panels[char.jumpTargetPanel];
                    if (targetPanel) {
                        _moveCharToPanel(char, char.jumpTargetPanel);
                        char.x = char.jumpDir === 1 ? 15 : targetPanel.width - 15;
                        char.jumpPhase = 'landing';
                        char.jumpTimer = 0;
                    } else {
                        char.jumpPhase = 'failed';
                        char.jumpTimer = 0;
                    }
                }
            }
        } else if (char.jumpPhase === 'landing') {
            // Bounce landing
            const landDuration = 400;
            const progress = Math.min(1, char.jumpTimer / landDuration);
            const squash = 1 + Math.sin(progress * Math.PI) * 0.3;

            drawCharacter(ctx, char.memberId, char.x, ground - 14, 0.7, t, {
                scaleX: 1 + (1 - squash) * 0.5,
                scaleY: squash
            });

            // Landing dust
            if (char.jumpTimer < 100) {
                for (let i = 0; i < 3; i++) {
                    drawDust(ctx, char.x + (i - 1) * 6, ground - 2, char.jumpTimer * 2, 300);
                }
            }

            if (progress >= 1) {
                drawSpeechBubble(ctx, char.x, ground - 38, _randItem(["NAILED-AY it-bay!", "yeehaw-ay!", "PARKOUR-AY!"]), {
                    fontSize: 7
                });
                // Pick a new activity on the new panel
                char.activity = _pickActivityForPanel(panels[char.panelIndex]);
                char.activityElapsed = 0;
                _resetActivityState(char);
                // Delay the speech bubble
                char.landSpeechTime = char.activityElapsed;
            }
        } else if (char.jumpPhase === 'failed') {
            // Missed! Grab edge, pull self up
            const failDuration = 1500;
            const progress = Math.min(1, char.jumpTimer / failDuration);

            if (progress < 0.4) {
                // Hanging from edge
                const hangY = ground + progress * 10;
                ctx.save();
                ctx.translate(char.x, hangY);
                // Just fingers visible
                ctx.fillStyle = _getMember(char.memberId).bodyColor;
                ctx.fillRect(-4, -2, 8, 3);
                // Eyes peeking over
                if (progress > 0.1) {
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(-2, -5, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(3, -5, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#111';
                    ctx.beginPath();
                    ctx.arc(-2, -5, 1, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(3, -5, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            } else if (progress < 0.7) {
                // Pulling self up (struggling)
                const pullUp = (progress - 0.4) / 0.3;
                drawCharacter(ctx, char.memberId, char.x, ground - pullUp * 12, 0.7, t);
                drawSpeechBubble(ctx, char.x, ground - pullUp * 12 - 25, 'hnngg-ay!', { fontSize: 7 });
            } else {
                // Back on panel, wipe brow
                drawCharacter(ctx, char.memberId, char.x, ground - 14, 0.7, t);
                if (progress < 0.9) {
                    drawSpeechBubble(ctx, char.x, ground - 36, 'whew-ay!', { fontSize: 7 });
                    drawSweatDrops(ctx, char.x, ground - 20, t);
                }
            }

            if (progress >= 1) {
                // Turn around, pick new activity
                char.activity = _pickActivityForPanel(panels[char.panelIndex]);
                char.activityElapsed = 0;
                _resetActivityState(char);
            }
        }
    }

    // ── ARGUING NEIGHBORS ──
    // Two characters on adjacent panels yell at each other.
    // This is triggered as a paired activity.
    function activityArguing(char, ctx, t, dt) {
        const ground = GROUND_Y;
        const x = char.x;

        // Character standing at panel edge, leaning toward neighbor
        const leanDir = char.argueDir || 1;
        const lean = Math.sin(t * 0.03) * 2 * leanDir;

        drawCharacter(ctx, char.memberId, x + lean, ground - 14, 0.7, t, {
            flipX: leanDir === -1
        });

        // Shake with fury
        const shake = Math.sin(char.activityElapsed * 0.05) * 1.5;

        // Angry symbols above head
        ctx.save();
        ctx.fillStyle = '#ff3333';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        const angryBob = Math.sin(t * 0.04) * 2;
        ctx.fillText('\u2620', x + shake, ground - 32 + angryBob);
        ctx.restore();

        // Speech bubble cycling
        if (!char.argueSwitch) char.argueSwitch = 0;
        char.argueSwitch += dt;
        if (char.argueSwitch > 800) {
            char.argueSwitch = 0;
            char.arguePhrase = megaSpeakArgue();
        }
        if (!char.arguePhrase) char.arguePhrase = megaSpeakArgue();

        // Only show speech for one of the pair at a time (alternate based on elapsed)
        const showSpeech = Math.floor(char.activityElapsed / 800) % 2 === (char.argueTurn || 0);
        if (showSpeech) {
            drawSpeechBubble(ctx, x + lean, ground - 38, char.arguePhrase, { fontSize: 7 });
        }

        // Storm off after 8-12 seconds
        if (char.activityElapsed > (char.argueEnd || 10000)) {
            drawSpeechBubble(ctx, x, ground - 38, 'HMPH-AY!', { fontSize: 8 });
            // Will be rotated out by the main loop
        }
    }

    // =========================================================================
    // ACTIVITY MANAGEMENT
    // =========================================================================

    const ACTIVITIES_GENERAL = ['fishing', 'napping', 'dj', 'guard', 'walking'];
    const ACTIVITIES_WEIGHT = ['pumpingIron', 'treadmill'];
    const ACTIVITIES_WATCHDOG = ['telescope'];
    const ACTIVITIES_LETTER = ['writing'];
    const ACTIVITIES_KNOWLEDGE = ['chemistry'];

    function _getPanelName(panel) {
        if (!panel || !panel.el) return '';
        const h2 = panel.el.querySelector('.panel-header h2');
        return h2 ? h2.textContent.trim().toUpperCase() : '';
    }

    function _pickActivityForPanel(panel) {
        const name = _getPanelName(panel);
        let pool = [...ACTIVITIES_GENERAL];

        if (name.includes('WEIGHT')) {
            pool = pool.concat(ACTIVITIES_WEIGHT);
            // Higher chance of fitness activities on weight panel
            if (Math.random() < 0.6) return _randItem(ACTIVITIES_WEIGHT);
        }
        if (name.includes('SYSTEM HEALTH') || name.includes('WATCHDOG') || name.includes('HEALTH')) {
            pool = pool.concat(ACTIVITIES_WATCHDOG);
            if (Math.random() < 0.5) return 'telescope';
        }
        if (name.includes('LETTER') || name.includes('DAILY')) {
            pool = pool.concat(ACTIVITIES_LETTER);
            if (Math.random() < 0.5) return 'writing';
        }
        if (name.includes('KNOWLEDGE') || name.includes('STARS')) {
            pool = pool.concat(ACTIVITIES_KNOWLEDGE);
            if (Math.random() < 0.5) return 'chemistry';
        }

        return _randItem(pool);
    }

    function _resetActivityState(char) {
        // Clear all activity-specific state
        delete char.catchTimer; delete char.catchElapsed; delete char.catching;
        delete char.catchStart; delete char.catchPhrase;
        delete char.napPhase; delete char.rollTimer; delete char.napElapsed;
        delete char.rollStart; delete char.rollDirection; delete char.startleStart;
        delete char.flexTimer;
        delete char.stumbleTimer; delete char.stumbling; delete char.stumbleStart;
        delete char.spotTimer; delete char.spotted; delete char.spotStart;
        delete char.crumples; delete char.crumpleTimer; delete char.crumpleSpeech;
        delete char.shoutTimer; delete char.shouting; delete char.shoutStart; delete char.shoutPhrase;
        delete char.guardPhase; delete char.guardTimer; delete char.marchX;
        delete char.marchDir; delete char.marchOriginX;
        delete char.explodeTimer; delete char.exploding; delete char.explodeStart;
        delete char.explodeColor; delete char.explodePhrase;
        delete char.walkTarget; delete char.nextActivity; delete char.dustParticles;
        delete char.jumpPhase; delete char.jumpTimer; delete char.jumpDir;
        delete char.jumpEdge; delete char.jumpStartX; delete char.jumpStartPanel;
        delete char.jumpTargetPanel; delete char.landSpeechTime;
        delete char.argueDir; delete char.argueTurn; delete char.argueSwitch;
        delete char.arguePhrase; delete char.argueEnd; delete char.arguePair;
    }

    const ACTIVITY_RENDERERS = {
        fishing: activityFishing,
        napping: activityNapping,
        pumpingIron: activityPumpingIron,
        treadmill: activityTreadmill,
        telescope: activityTelescope,
        writing: activityWriting,
        dj: activityDJ,
        guard: activityGuardDuty,
        chemistry: activityChemistry,
        walking: activityWalking,
        jumping: activityJumping,
        arguing: activityArguing,
    };

    // =========================================================================
    // PANEL / STAGE SETUP
    // =========================================================================

    function _setupPanels() {
        const panelEls = document.querySelectorAll('.dash-panel');
        panels = [];

        panelEls.forEach((el, idx) => {
            // Make panel position: relative if not already
            const computed = getComputedStyle(el);
            if (computed.position === 'static') {
                el.style.position = 'relative';
            }

            // Create antics stage
            const stage = document.createElement('div');
            stage.className = 'antics-stage';
            stage.style.cssText = `
                position: absolute;
                top: -${STAGE_HEIGHT}px;
                left: 0;
                right: 0;
                height: ${STAGE_HEIGHT}px;
                pointer-events: none;
                overflow: visible;
                z-index: 50;
            `;

            // Create canvas inside stage
            const canvas = document.createElement('canvas');
            canvas.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
            `;
            stage.appendChild(canvas);
            el.appendChild(stage);

            const rect = el.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = STAGE_HEIGHT;

            const panelData = {
                el,
                stage,
                canvas,
                ctx: canvas.getContext('2d'),
                width: rect.width,
                panelName: _getPanelName({ el }),
                index: idx,
                chars: [],
            };
            panels.push(panelData);
        });

        // Handle resize
        window.addEventListener('resize', _handleResize);
    }

    function _handleResize() {
        panels.forEach(p => {
            const rect = p.el.getBoundingClientRect();
            p.width = rect.width;
            p.canvas.width = rect.width;
            p.canvas.height = STAGE_HEIGHT;
        });
    }

    function _charsOnPanel(panelIndex) {
        return characters.filter(c => c.panelIndex === panelIndex);
    }

    function _moveCharToPanel(char, newPanelIndex) {
        // Remove from old panel's chars list
        if (panels[char.panelIndex]) {
            panels[char.panelIndex].chars = panels[char.panelIndex].chars.filter(c => c !== char);
        }
        char.panelIndex = newPanelIndex;
        char.panelRef = panels[newPanelIndex];
        if (panels[newPanelIndex]) {
            panels[newPanelIndex].chars.push(char);
        }
    }

    // =========================================================================
    // CHARACTER SPAWNING
    // =========================================================================

    function _spawnCharacters() {
        const memberIds = _allMemberIds();
        const count = Math.min(TOTAL_CHARACTERS, panels.length * MAX_PER_PANEL, memberIds.length + 2);

        // Shuffle panels
        const availablePanels = panels.map((_, i) => i).sort(() => Math.random() - 0.5);
        let memberPool = [...memberIds];

        for (let i = 0; i < count; i++) {
            // Pick a panel that isn't full
            let panelIdx = null;
            for (const pi of availablePanels) {
                if (_charsOnPanel(pi).length < MAX_PER_PANEL) {
                    panelIdx = pi;
                    break;
                }
            }
            if (panelIdx === null) break;

            // Rotate available panels so we spread characters
            availablePanels.push(availablePanels.shift());

            // Pick member
            if (memberPool.length === 0) memberPool = [...memberIds];
            const memberId = memberPool.splice(Math.floor(Math.random() * memberPool.length), 1)[0];

            const panel = panels[panelIdx];
            const activity = _pickActivityForPanel(panel);
            const x = _randBetween(25, Math.max(30, panel.width - 25));

            const char = {
                memberId,
                panelIndex: panelIdx,
                panelRef: panel,
                x,
                activity,
                activityElapsed: 0,
                activityDuration: _randBetween(ROTATION_INTERVAL_MIN, ROTATION_INTERVAL_MAX),
            };

            characters.push(char);
            panel.chars.push(char);
        }
    }

    // =========================================================================
    // ACTIVITY ROTATION
    // =========================================================================

    function _rotateOneCharacter() {
        if (characters.length === 0) return;

        const char = _randItem(characters);
        const roll = Math.random();

        if (roll < 0.3) {
            // Jump to another panel
            char.activity = 'jumping';
            char.activityElapsed = 0;
            _resetActivityState(char);
        } else if (roll < 0.5) {
            // Start arguing with a neighbor
            _startArgument(char);
        } else if (roll < 0.7) {
            // Walk to a new position, then do a new activity
            const panel = panels[char.panelIndex];
            if (panel) {
                char.activity = 'walking';
                char.walkTarget = _randBetween(20, Math.max(25, panel.width - 20));
                char.nextActivity = _pickActivityForPanel(panel);
                char.activityElapsed = 0;
                _resetActivityState(char);
            }
        } else {
            // Switch activity in place
            const panel = panels[char.panelIndex];
            char.activity = _pickActivityForPanel(panel);
            char.activityElapsed = 0;
            _resetActivityState(char);
        }
    }

    function _startArgument(char) {
        // Find a character on an adjacent panel
        const adjIdx = [char.panelIndex - 1, char.panelIndex + 1]
            .filter(i => i >= 0 && i < panels.length);
        let neighbor = null;
        for (const ai of adjIdx) {
            const panelChars = _charsOnPanel(ai);
            if (panelChars.length > 0) {
                neighbor = _randItem(panelChars);
                break;
            }
        }
        if (!neighbor) {
            // No neighbor, just switch activity
            char.activity = _pickActivityForPanel(panels[char.panelIndex]);
            char.activityElapsed = 0;
            _resetActivityState(char);
            return;
        }

        // Move both to their panel edges facing each other
        const charPanel = panels[char.panelIndex];
        const neighborPanel = panels[neighbor.panelIndex];

        const charOnLeft = char.panelIndex < neighbor.panelIndex;

        // Set up arguing for both
        char.activity = 'arguing';
        char.activityElapsed = 0;
        _resetActivityState(char);
        char.argueDir = charOnLeft ? 1 : -1;
        char.argueTurn = 0;
        char.x = charOnLeft ? charPanel.width - 15 : 15;
        char.argueEnd = _randBetween(8000, 12000);
        char.arguePair = neighbor;

        neighbor.activity = 'arguing';
        neighbor.activityElapsed = 0;
        _resetActivityState(neighbor);
        neighbor.argueDir = charOnLeft ? -1 : 1;
        neighbor.argueTurn = 1;
        neighbor.x = charOnLeft ? 15 : neighborPanel.width - 15;
        neighbor.argueEnd = char.argueEnd;
        neighbor.arguePair = char;
    }

    // =========================================================================
    // MAIN LOOP
    // =========================================================================

    function _loop(timestamp) {
        if (!running) return;

        if (!lastFrameTime) lastFrameTime = timestamp;
        const dt = Math.min(timestamp - lastFrameTime, 50);
        lastFrameTime = timestamp;

        // Clear all canvases
        panels.forEach(p => {
            if (p.ctx && p.canvas.width > 0) {
                p.ctx.clearRect(0, 0, p.canvas.width, p.canvas.height);
            }
        });

        // Update and render each character
        for (const char of characters) {
            char.activityElapsed += dt;

            const panel = panels[char.panelIndex];
            if (!panel || !panel.ctx) continue;

            // Clamp character position within panel
            if (char.activity !== 'jumping') {
                char.x = Math.max(5, Math.min(panel.width - 5, char.x));
            }

            // Render activity
            const renderer = ACTIVITY_RENDERERS[char.activity];
            if (renderer) {
                renderer(char, panel.ctx, frameCount, dt);
            }

            // Check if activity duration expired (excluding special activities)
            if (char.activity !== 'walking' && char.activity !== 'jumping') {
                if (char.activityElapsed > char.activityDuration) {
                    // Time to rotate
                    _rotateOneCharacter();
                    char.activityDuration = _randBetween(ROTATION_INTERVAL_MIN, ROTATION_INTERVAL_MAX);
                }
            }

            // End arguing if partner has stopped
            if (char.activity === 'arguing' && char.arguePair && char.arguePair.activity !== 'arguing') {
                char.activity = _pickActivityForPanel(panel);
                char.activityElapsed = 0;
                _resetActivityState(char);
            }
        }

        // Periodic rotation
        if (timestamp - lastRotationTime > nextRotationDelay) {
            _rotateOneCharacter();
            lastRotationTime = timestamp;
            nextRotationDelay = _randBetween(ROTATION_INTERVAL_MIN, ROTATION_INTERVAL_MAX);
        }

        frameCount++;
        requestAnimationFrame(_loop);
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    function init() {
        if (running) return;
        if (!window.MegaCrew) {
            console.warn('[GroundedAntics] MegaCrew not found, cannot initialize antics.');
            return;
        }

        _setupPanels();
        _spawnCharacters();
        running = true;
        lastRotationTime = performance.now();

        // Delay start so panels can render first
        setTimeout(() => {
            requestAnimationFrame(_loop);
        }, 3000);

        console.log(`[GroundedAntics] v2.0 — ${characters.length} characters deployed across ${panels.length} panels. They live here now. yeehaw-ay!`);
    }

    function stop() {
        running = false;
        // Remove all stages
        panels.forEach(p => {
            if (p.stage && p.stage.parentNode) {
                p.stage.parentNode.removeChild(p.stage);
            }
        });
        panels = [];
        characters = [];
        console.log('[GroundedAntics] Stopped. The crew goes silent...');
    }

    function triggerAntic(name) {
        // Legacy compat + force specific activities on random characters
        if (!characters.length) return;
        const char = _randItem(characters);
        const activityMap = {
            'fishing': 'fishing',
            'nap': 'napping',
            'pump': 'pumpingIron',
            'treadmill': 'treadmill',
            'telescope': 'telescope',
            'write': 'writing',
            'dj': 'dj',
            'guard': 'guard',
            'chemistry': 'chemistry',
            'jump': 'jumping',
            'argue': 'arguing',
        };
        const activity = activityMap[name];
        if (activity) {
            if (activity === 'arguing') {
                _startArgument(char);
            } else {
                char.activity = activity;
                char.activityElapsed = 0;
                _resetActivityState(char);
            }
            console.log(`[GroundedAntics] Triggered: ${name} on ${char.memberId}`);
        }
    }

    return { init, stop, triggerAntic };
})();

// Global init function
function initGroundedAntics() {
    GroundedAntics.init();
}

window.GroundedAntics = GroundedAntics;
