/* clock-sobriety.js — Clock, date, sobriety counter */
// =============================================================================
// CLOCK, DATE, SOBRIETY
// =============================================================================

function initClock() {
    function tick() {
        const now = new Date();
        document.getElementById('clock').textContent = now.toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
        });
        document.getElementById('date').textContent = now.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        }).toUpperCase();
    }
    tick();
    setInterval(tick, 1000);
}

function initSobriety() {
    function update() {
        const now = new Date();
        const diff = now - CONFIG.sobrietyDate;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        document.getElementById('sobriety-count').textContent = `${days} DAYS`;
    }
    update();
    setInterval(update, 60000);
}

function updateUptime() {
    const elapsed = Date.now() - startTime;
    const h = Math.floor(elapsed / 3600000);
    const m = Math.floor((elapsed % 3600000) / 60000);
    const s = Math.floor((elapsed % 60000) / 1000);
    const el = document.getElementById('h-uptime');
    if (el) el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

