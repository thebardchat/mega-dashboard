/* tickers.js — NYSE + System ticker strips */
// =============================================================================
// NYSE TICKER
// =============================================================================

async function loadTickers() {
    try {
        const resp = await fetch(`${CONFIG.apiBase}/api/tickers`);
        const data = await resp.json();
        if (data.error) throw new Error(data.error);
        buildTickerStrip(data);
    } catch (e) {
        console.error('Ticker error:', e);
        buildTickerStrip({});
    }
}

function buildTickerStrip(data) {
    const strip1 = document.getElementById('ticker-strip');
    const strip2 = document.getElementById('ticker-strip-2');

    const sep = '<span class="ticker-sep">|</span>';
    const bigSep = '<span class="ticker-sep">◆</span>';

    function stockItem(sym, price, change, pct) {
        const dir = change >= 0 ? 'up' : 'down';
        const arrow = change >= 0 ? '▲' : '▼';
        return `<span class="ticker-item">
            <span class="ticker-symbol">${sym}</span>
            <span class="ticker-price">${price}</span>
            <span class="ticker-change ${dir}">${arrow}${Math.abs(pct).toFixed ? Math.abs(pct).toFixed(2) : pct}%</span>
        </span>`;
    }

    function textItem(label, value, cls) {
        return `<span class="ticker-item">
            <span class="ticker-symbol">${label}</span>
            <span class="ticker-change ${cls || ''}">${value}</span>
        </span>`;
    }

    function quoteItem(text) {
        return `<span class="ticker-item ticker-quote"><span class="ticker-quote-text">${text}</span></span>`;
    }

    // ── TICKER 1: Markets + Tech Stocks + Breaking News ──
    let t1 = [];

    // Tech stocks
    const tech = (data.tech || []).filter(t => t.price != null);
    if (tech.length) {
        t1.push(textItem('── TECH', '', 'up'));
        tech.forEach(t => t1.push(stockItem(t.symbol, '$'+Number(t.price).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}), t.change, parseFloat(t.pct))));
    }

    // Crypto
    const crypto = (data.crypto || []).filter(t => t.price != null);
    if (crypto.length) {
        t1.push(textItem('── CRYPTO', '', 'up'));
        crypto.forEach(t => t1.push(stockItem(t.symbol, '$'+Number(t.price).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}), t.change, parseFloat(t.pct))));
    }

    // Breaking news
    const news = [...(data.news || []), ...(data.tech_news || []), ...(data.ai_news || [])];
    if (news.length) {
        t1.push(textItem('── BREAKING', '', 'up'));
        news.forEach(n => t1.push(quoteItem('📰 ' + n)));
    }

    // Sports scores
    const sports = data.sports || [];
    if (sports.length) {
        t1.push(textItem('── SCORES', '', 'up'));
        sports.forEach(s => t1.push(quoteItem('🏆 ' + s)));
    }

    const content1 = t1.join(sep);
    strip1.innerHTML = content1 + bigSep + content1;

    // ── TICKER 2: Weather Forecast + Shane Quotes + Jeff Quotes + System ──
    let t2 = [];

    // 10-day forecast
    const forecast = data.forecast_ticker || [];
    if (forecast.length) {
        t2.push(textItem('── FORECAST', '', 'up'));
        forecast.forEach(f => t2.push(quoteItem('🌡 ' + f)));
    }

    // Shane quotes
    const shaneQuotes = data.shane_quotes || [];
    if (shaneQuotes.length) {
        t2.push(textItem('── SHANE', '', 'up'));
        shaneQuotes.forEach(q => t2.push(quoteItem('"' + q + '"')));
    }

    // Jeff Hollingshead quotes
    const jeffQuotes = data.jeff_quotes || [];
    if (jeffQuotes.length) {
        t2.push(textItem('── SRM', '', 'up'));
        jeffQuotes.forEach(q => t2.push(quoteItem(q)));
    }

    // System status
    t2.push(textItem('── SYSTEM', '', 'up'));
    t2.push(textItem('SHANEBRAIN', 'ONLINE', 'up'));
    t2.push(textItem('WEAVIATE', 'ACTIVE', 'up'));
    t2.push(textItem('HAIKU', 'ONLINE', 'up'));
    const sob = document.getElementById('sobriety-count');
    if (sob) t2.push(textItem('SOBER', sob.textContent || '---', 'up'));

    const content2 = t2.join(sep);
    strip2.innerHTML = content2 + bigSep + content2;

    // Strip 1 (markets/news) scrolls faster, Strip 2 (quotes/forecast) scrolls slower
    requestAnimationFrame(() => {
        const w1 = strip1.scrollWidth / 2;
        strip1.style.animationDuration = `${Math.max(30, w1 / 80)}s`;
    });
    requestAnimationFrame(() => {
        const w2 = strip2.scrollWidth / 2;
        strip2.style.animationDuration = `${Math.max(60, w2 / 35)}s`;
    });
}


// =============================================================================
// SECOND TICKER — Crypto + System Status
// =============================================================================

async function loadSystemTicker() {
    // Now handled by loadTickers() — both strips built together
    loadTickers();
}
