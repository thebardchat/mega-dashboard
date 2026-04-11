/* voice-dump.js — Voice Dump noir pipeline */
// =============================================================================
// VOICE DUMP — Full Noir Pipeline: Record → Transcribe → Shape → Save
// =============================================================================

let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let _voiceCurrentRaw = '';
let _voiceCurrentShaped = '';

function _vpStage(active, done = []) {
    const stages = ['record','transcribe','shape','save'];
    stages.forEach(s => {
        const el = document.getElementById(`vps-${s}`);
        if (!el) return;
        el.className = 'vp-stage';
        if (s === active) el.classList.add('running');
        else if (done.includes(s)) el.classList.add('done');
    });
}

function _vpDone(stages) {
    stages.forEach(s => {
        const el = document.getElementById(`vps-${s}`);
        if (el) { el.className = 'vp-stage done'; }
    });
}

function toggleVoiceRecord() {
    const btn = document.getElementById('voice-record-btn');
    const shapeBtn = document.getElementById('voice-shape-btn');
    const transcription = document.getElementById('voice-transcription');
    const noirOut = document.getElementById('voice-noir-output');

    if (!isRecording) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            recordedChunks = [];

            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };

            mediaRecorder.onstop = async () => {
                btn.innerHTML = '&#9679; RECORD';
                btn.classList.remove('recording');
                isRecording = false;
                _vpStage('transcribe', ['record']);

                transcription.innerHTML = '<span class="voice-placeholder" style="color:#f39c12">Transcribing via Whisper...</span>';
                shapeBtn.disabled = true;

                const blob = new Blob(recordedChunks, { type: 'audio/webm' });
                const formData = new FormData();
                formData.append('audio', blob, 'voice.webm');

                try {
                    const resp = await fetch(`${CONFIG.apiBase}/api/transcribe`, { method: 'POST', body: formData });
                    const data = await resp.json();
                    const text = data.transcript || data.error || 'No transcript returned';
                    _voiceCurrentRaw = text;
                    transcription.textContent = text;
                    _vpDone(['record','transcribe']);
                    _vpStage('shape', ['record','transcribe']);
                    // Auto-highlight shape stage
                    const shapeEl = document.getElementById('vps-shape');
                    if (shapeEl) { shapeEl.className = 'vp-stage active'; }
                    shapeBtn.disabled = false;
                } catch (e) {
                    transcription.textContent = 'Transcription failed: ' + e.message;
                    _vpStage('record', []);
                }
                stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorder.start(500); // collect chunks every 500ms
            btn.innerHTML = '&#9632; STOP';
            btn.classList.add('recording');
            isRecording = true;
            _voiceCurrentRaw = '';
            _voiceCurrentShaped = '';
            shapeBtn.disabled = true;
            document.getElementById('voice-save-btn').disabled = true;
            noirOut.innerHTML = '<span style="color:#444;font-style:normal">Shaped noir prose will appear here...</span>';
            transcription.innerHTML = '<span class="voice-placeholder recording">Recording... speak now</span>';
            _vpStage('record', []);
        }).catch(e => {
            transcription.textContent = 'Microphone access denied: ' + e.message;
        });
    } else {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
    }
}

async function shapeToNoir() {
    const raw = _voiceCurrentRaw || document.getElementById('voice-transcription').textContent.trim();
    if (!raw || raw.startsWith('Press RECORD') || raw.startsWith('Transcription')) return;

    const shapeBtn = document.getElementById('voice-shape-btn');
    const noirOut = document.getElementById('voice-noir-output');
    const saveBtn = document.getElementById('voice-save-btn');

    shapeBtn.disabled = true;
    shapeBtn.textContent = '…SHAPING';
    _vpStage('shape', ['record','transcribe']);
    noirOut.innerHTML = '<span style="color:#9b59b6;font-style:normal;animation:pulse 1s infinite">Shaping into noir prose...</span>';

    try {
        const resp = await fetch(`${CONFIG.apiBase}/api/noir/shape`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: raw }),
        });
        const data = await resp.json();
        if (data.shaped) {
            _voiceCurrentShaped = data.shaped;
            noirOut.innerHTML = data.shaped.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
            _vpDone(['record','transcribe','shape']);
            const saveEl = document.getElementById('vps-save');
            if (saveEl) { saveEl.className = 'vp-stage active'; }
            saveBtn.disabled = false;
        } else {
            noirOut.textContent = 'Shape failed: ' + (data.error || 'unknown error');
        }
    } catch (e) {
        noirOut.textContent = 'Shape error: ' + e.message;
    }
    shapeBtn.innerHTML = '&#10022; SHAPE';
    shapeBtn.disabled = false;
}

async function saveNoirPiece() {
    const shaped = _voiceCurrentShaped;
    const raw = _voiceCurrentRaw;
    if (!shaped) return;

    const saveBtn = document.getElementById('voice-save-btn');
    const orderHint = document.getElementById('voice-order-hint').value;
    saveBtn.textContent = 'SAVING...';
    saveBtn.disabled = true;

    try {
        const resp = await fetch(`${CONFIG.apiBase}/api/noir/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shaped, raw, order_hint: orderHint }),
        });
        const data = await resp.json();
        if (data.saved) {
            _vpDone(['record','transcribe','shape','save']);
            saveBtn.textContent = '✓ SAVED';
            setTimeout(() => {
                saveBtn.textContent = 'SAVE';
                saveBtn.disabled = false;
                // Reset pipeline
                _vpStage('record', []);
                const recEl = document.getElementById('vps-record');
                if (recEl) recEl.className = 'vp-stage active';
            }, 2500);
        } else {
            saveBtn.textContent = 'SAVE';
            saveBtn.disabled = false;
        }
    } catch (e) {
        saveBtn.textContent = 'SAVE';
        saveBtn.disabled = false;
        console.error('Save noir error:', e);
    }
}

// NOIR PIECES MODAL
function openNoirPiecesModal() {
    document.getElementById('noir-pieces-overlay').style.display = 'flex';
    loadNoirPieces();
}
function closeNoirPiecesModal() {
    document.getElementById('noir-pieces-overlay').style.display = 'none';
}

async function loadNoirPieces() {
    const list = document.getElementById('noir-pieces-list');
    list.innerHTML = '<div style="color:#555;font-size:12px;padding:20px">Loading pieces...</div>';
    try {
        const resp = await fetch(`${CONFIG.apiBase}/api/noir/pieces`);
        const data = await resp.json();
        const pieces = data.pieces || [];
        if (!pieces.length) {
            list.innerHTML = '<div style="color:#555;font-size:12px;padding:20px;text-align:center">No pieces saved yet.<br>Record a voice dump, shape it, and save it.</div>';
            return;
        }
        list.innerHTML = pieces.map((p, i) => {
            const d = new Date(p.timestamp);
            const ts = d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) + ' ' + d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
            const preview = (p.shaped || '').substring(0, 180) + ((p.shaped || '').length > 180 ? '…' : '');
            const orderLabel = p.order_hint ? `#${p.order_hint}` : `—`;
            return `<div class="noir-piece-card" onclick="toggleNoirPiece(this)" data-id="${p.id}">
                <div class="noir-piece-num">
                    <span>PIECE ${orderLabel}</span>
                    <span class="noir-piece-timestamp">${ts}</span>
                </div>
                <div class="noir-piece-preview">${preview}</div>
                <div class="noir-piece-full">
                    <div style="font-size:12px;color:#d8c8e8;line-height:1.8;white-space:pre-wrap">${p.shaped || ''}</div>
                    ${p.raw ? `<div class="noir-piece-raw"><strong style="color:#666">RAW:</strong> ${(p.raw||'').substring(0,300)}${(p.raw||'').length>300?'…':''}</div>` : ''}
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        list.innerHTML = '<div style="color:#e74c3c;font-size:12px;padding:20px">Error loading pieces: ' + e.message + '</div>';
    }
}

function toggleNoirPiece(card) {
    const full = card.querySelector('.noir-piece-full');
    if (!full) return;
    const isOpen = full.classList.contains('open');
    // Close all others
    document.querySelectorAll('.noir-piece-full.open').forEach(el => {
        el.classList.remove('open');
        el.closest('.noir-piece-card').classList.remove('expanded');
    });
    if (!isOpen) {
        full.classList.add('open');
        card.classList.add('expanded');
    }
}

