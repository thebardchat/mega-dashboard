/* init.js — DOMContentLoaded bootstrap */

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initMatrixRain();
    initClock();
    initSobriety();
    initSelfTalk();
    init3DBackground();
    initEco3D(document.getElementById('eco3d-canvas'), false);
    initKnowledgeStars();
    loadKnowledgeStats();
    setInterval(loadKnowledgeStats, 30000);

    loadWeather();
    loadTickers();
    loadHealth();
    loadLogisticsProducts();
    loadCalendar();
    loadEmails();
    loadEmailResponder();
    loadNetworkStatus();
    loadBuildStatus();
    generateDailyLetter();
    loadChatHistory();
    initMegaPanel();
    loadWeightLoss();
    loadBots();
    loadWatchdog();
    loadCluster();
    loadBookProgress();
    loadMarketSentinel();
    loadMoodTracker();
    loadKnowledgeHarvester();
    loadWeatherBrain();
    loadMegaBrain();
    loadVoiceDumpStats();

    // MEGA Crew — characters now rendered as PNG images in HTML (crew-art/*.png)
    // Canvas rendering replaced with CSS-animated PNG avatars
    // Antics still use MegaCrew if available
    if (window.MegaAntics) {
        initMegaAntics();
    }
    if (window.GroundedAntics) {
        initGroundedAntics();
    }

    setInterval(loadMegaBrain, 30000);  // MEGA-SHANEBRAIN panel — refresh every 30s
    setInterval(loadWatchdog, 30000);
    setInterval(loadCluster, 60000);
    setInterval(loadBookProgress, 900000);
    setInterval(loadMarketSentinel, 60000);
    setInterval(loadMoodTracker, 120000);
    setInterval(loadKnowledgeHarvester, 600000);
    setInterval(loadWeatherBrain, 900000);

    // Refresh intervals
    setInterval(loadWeather, CONFIG.weatherRefresh);
    setInterval(loadTickers, CONFIG.tickerRefresh);
    setInterval(loadCalendar, 300000); // refresh calendar every 5 min
    setInterval(loadEmails, 120000); // refresh emails every 2 min
    setInterval(loadEmailResponder, 60000); // responder state every 1 min
    setInterval(loadHealth, CONFIG.healthRefresh);
    setInterval(rotateSelfTalk, CONFIG.selfTalkInterval);
    setInterval(updateUptime, 1000);
    setInterval(loadNetworkStatus, 60000); // network every 60s
    setInterval(loadBuildStatus, 30000); // build status every 30s
    setInterval(loadSystemTicker, 30000); // system ticker every 30s

    // Track mouse for 3D effects
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    });
});
