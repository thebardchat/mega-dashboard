/* weather.js — Weather panel */
// =============================================================================
// WEATHER
// =============================================================================

async function loadWeather() {
    try {
        const resp = await fetch(`${CONFIG.apiBase}/api/weather`);
        const data = await resp.json();

        if (data.error) throw new Error(data.error);

        const cur = data.current;
        const fc = data.forecast || [];

        // Top bar current
        document.getElementById('weather-current').textContent =
            `${cur.temp}°F ${cur.description}`;

        // Top bar forecast
        const forecastRow = document.getElementById('forecast-row');
        forecastRow.innerHTML = fc.slice(0, 3).map(f =>
            `<span class="forecast-day">${f.day}: <span class="fc-temp">${f.high}°</span>${f.icon}</span>`
        ).join('');

        // Weather panel detail
        document.getElementById('weather-temp-big').textContent = `${cur.temp}°`;
        document.getElementById('weather-desc').textContent = cur.description;
        document.getElementById('weather-humidity').textContent = `Humidity: ${cur.humidity || '--'}%`;
        document.getElementById('weather-wind').textContent = `Wind: ${cur.wind || '--'}`;
        document.getElementById('weather-status').classList.add('online');

        // Forecast cards — 5 days for truck/concrete planning
        const fcDetail = document.getElementById('weather-forecast-detail');
        fcDetail.innerHTML = fc.slice(0, 5).map(f => `
            <div class="forecast-card">
                <div class="fc-day">${f.day}</div>
                <div class="fc-icon">${f.icon || ''}</div>
                <div class="fc-temps">
                    <span class="fc-hi">${f.high}°</span> / <span class="fc-lo">${f.low}°</span>
                </div>
                <div class="fc-rain" style="font-size:0.6rem;color:#5bc4f5">🌧 ${f.rain || '0%'}</div>
                <div style="font-size:0.6rem;color:var(--text-secondary)">${f.description}</div>
            </div>
        `).join('');

    } catch (e) {
        console.error('Weather error:', e);
        document.getElementById('weather-current').textContent = 'Weather unavailable';
        document.getElementById('weather-status').classList.add('error');
    }
}


// =============================================================================
// WEATHER BRAIN — severe alert overlay on weather panel
// =============================================================================

async function loadWeatherBrain() {
    try {
        const res = await fetch(`${CONFIG.apiBase}/api/weather-brain`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status !== 'ok') return;

        // Show alert banner if severe
        if (data.data?.severe_alert && data.data?.alert_text) {
            let alertEl = document.getElementById('weather-brain-alert');
            if (!alertEl) {
                alertEl = document.createElement('div');
                alertEl.id = 'weather-brain-alert';
                alertEl.className = 'weather-brain-alert';
                const weatherPanel = document.getElementById('weather-detail');
                if (weatherPanel) weatherPanel.prepend(alertEl);
            }
            alertEl.textContent = '⚠ ' + data.data.alert_text;
        } else {
            const alertEl = document.getElementById('weather-brain-alert');
            if (alertEl) alertEl.remove();
        }
    } catch (e) { console.error('Weather brain load failed:', e); }
}

