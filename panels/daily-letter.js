/* daily-letter.js — Daily Letter to My Sons */
// =============================================================================
// DAILY LETTER TO MY SONS
// =============================================================================

async function generateDailyLetter() {
    // Load preview panel on startup
    await loadLetterPreview();
}

async function loadLetterPreview() {
    try {
        const resp = await fetch(`${CONFIG.apiBase}/api/letter/today`);
        const data = await resp.json();
        const letter = data.letter;

        document.getElementById('letter-preview-date').textContent = letter.date_display || letter.date;
        document.getElementById('letter-postmark-date').textContent = letter.date_display || letter.date;
        document.getElementById('letter-preview-son').textContent = `Today's personal note → ${letter.son_display || letter.son}`;

        // Show first ~120 chars as teaser
        const snippet = (letter.text || '').replace(/\n/g, ' ').substring(0, 140) + '…';
        document.getElementById('letter-preview-snippet').textContent = snippet;

        // Load archive strip
        loadArchiveStrip();
    } catch (e) {
        const fallbackDate = new Date().toLocaleDateString('en-US', {weekday:'long',month:'long',day:'numeric',year:'numeric'});
        document.getElementById('letter-preview-date').textContent = fallbackDate;
        document.getElementById('letter-postmark-date').textContent = fallbackDate;
        document.getElementById('letter-preview-snippet').textContent = 'Click READ to generate today\'s letter';
    }
}

async function loadArchiveStrip() {
    try {
        const resp = await fetch(`${CONFIG.apiBase}/api/letter/archive`);
        const data = await resp.json();
        const strip = document.getElementById('letter-archive-strip');
        strip.innerHTML = (data.archive || []).slice(0, 10).map(l =>
            `<span class="letter-stamp" onclick="openLetterModal('${l.date}')" title="Open letter">
                ${l.date} · ${l.son_display || l.son}
            </span>`
        ).join('');
    } catch(e) {}
}

async function openLetterModal(dateKey) {
    const overlay = document.getElementById('letter-modal-overlay');
    const paper = document.getElementById('letter-paper');
    overlay.style.display = 'flex';
    paper.innerHTML = '<div class="letter-paper-loading">Pulling from the heart...</div>';

    try {
        const resp = await fetch(`${CONFIG.apiBase}/api/letter/today`);
        const data = await resp.json();
        const letter = data.letter;

        // Format the text into paragraphs
        const paras = (letter.text || '').split(/\n\n+/).filter(p => p.trim());
        const html = paras.map(p => `<p>${p.replace(/\n/g,'<br>')}</p>`).join('');

        paper.innerHTML = `
            <div class="letter-paper-date">${letter.date_display || letter.date}</div>
            <div class="letter-paper-body">${html}</div>
        `;
    } catch(e) {
        paper.innerHTML = '<div class="letter-paper-loading">Could not load letter.</div>';
    }
}

function closeLetterModal() {
    document.getElementById('letter-modal-overlay').style.display = 'none';
}

async function openArchiveModal() {
    const overlay = document.getElementById('archive-modal-overlay');
    const list = document.getElementById('archive-list');
    overlay.style.display = 'flex';
    list.innerHTML = 'Loading...';

    try {
        const resp = await fetch(`${CONFIG.apiBase}/api/letter/archive`);
        const data = await resp.json();
        const archive = data.archive || [];

        if (!archive.length) {
            list.innerHTML = '<div style="color:#666;font-style:italic">No letters yet. Read today\'s letter to generate the first one.</div>';
            return;
        }

        list.innerHTML = archive.map(l => {
            const snippet = (l.text || '').replace(/\n/g,' ').substring(0, 100) + '…';
            return `<div class="archive-entry" onclick="openLetterFromArchive('${l.date}', this)" data-letter='${JSON.stringify(l).replace(/'/g,"&#39;")}'>
                <div>
                    <span class="archive-entry-date">${l.date_display || l.date}</span>
                    <span class="archive-entry-son">Personal note → ${l.son_display || l.son}</span>
                </div>
                <div class="archive-entry-snippet">${snippet}</div>
            </div>`;
        }).join('');
    } catch(e) {
        list.innerHTML = '<div style="color:#f00">Error loading archive.</div>';
    }
}

function closeArchiveModal() {
    document.getElementById('archive-modal-overlay').style.display = 'none';
}

function openLetterFromArchive(dateKey, el) {
    const letterData = JSON.parse(el.getAttribute('data-letter'));
    closeArchiveModal();

    const overlay = document.getElementById('letter-modal-overlay');
    const paper = document.getElementById('letter-paper');
    overlay.style.display = 'flex';

    const paras = (letterData.text || '').split(/\n\n+/).filter(p => p.trim());
    const html = paras.map(p => `<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
    paper.innerHTML = `
        <div class="letter-paper-date">${letterData.date_display || letterData.date}</div>
        <div class="letter-paper-body">${html}</div>
    `;
}

