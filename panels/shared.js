/* shared.js — Shared config, state, utilities */
/* =============================================================================
   SHANEBRAIN MEGA DASHBOARD — Application Logic
   3D Command Center with Knowledge Stars, Tickers, Weather, Audio
   ============================================================================= */

// ─── Configuration ───────────────────────────────────────────────────────────
const HOST = window.location.hostname || 'localhost';
const PORT = window.location.port || '8300';
const BASE = `http://${HOST}:${PORT}`;
const CONFIG = {
    ollamaUrl: `http://${HOST}:11434`,
    weaviateUrl: `http://${HOST}:8080`,
    apiBase: BASE,
    model: 'shanebrain-3b',
    systemPrompt: `You are ShaneBrain - Shane Brazelton's personal AI assistant.
Be direct, no fluff. Lead with solutions. Keep responses short and actionable.
Never say "Certainly!" or "I'd be happy to help!" - just help.`,
    sobrietyDate: new Date('2023-11-27'),
    jazzStreamUrl: 'https://ice2.somafm.com/illstreet-128-mp3',
    selfTalkInterval: 30000,  // rotate every 30s
    weatherRefresh: 900000,   // 15 min
    tickerRefresh: 60000,     // 60s
    healthRefresh: 30000,     // 30s
};

// ─── State ───────────────────────────────────────────────────────────────────
const SESSION_ID = 'dashboard-' + Date.now();
let conversationHistory = [];
let startTime = Date.now();
let brownNoiseCtx = null;
let brownNoiseNode = null;
let brownNoiseGain = null;
let brownNoisePlaying = false;
let jazzAudio = null;
let jazzPlaying = false;
let globalVolume = 0.3;
let knowledgeStars = [];
let starsScene, starsCamera, starsRenderer, starsGroup;
let mouseX = 0, mouseY = 0;

// ─── Self-Talk Affirmations ──────────────────────────────────────────────────
const AFFIRMATIONS = [
    { text: "You are capable and strong.", category: "strength" },
    { text: "Your family is your greatest achievement.", category: "family" },
    { text: "Every sober day is a victory.", category: "sobriety" },
    { text: "You build things that matter.", category: "purpose" },
    { text: "Your kids are watching — lead by example.", category: "family" },
    { text: "Progress, not perfection.", category: "growth" },
    { text: "You are the architect of your future.", category: "purpose" },
    { text: "Rest is not weakness. It is strategy.", category: "strength" },
    { text: "The hard days make the good days sweeter.", category: "resilience" },
    { text: "You chose this path. You can walk it.", category: "sobriety" },
    { text: "What you build today, your children inherit tomorrow.", category: "legacy" },
    { text: "You are not behind. You are exactly where you need to be.", category: "peace" },
    { text: "Discipline is love in action.", category: "strength" },
    { text: "You have survived every hard day so far.", category: "resilience" },
    { text: "Your work ethic is your superpower.", category: "purpose" },
    { text: "The Pi is running. The bots are online. You built this.", category: "pride" },
    { text: "Be the dad you needed.", category: "family" },
    { text: "Clarity over chaos. Always.", category: "peace" },
    { text: "You are worth the effort.", category: "self-worth" },
    { text: "Stay the course. The compound effect is real.", category: "growth" },
    { text: "Your sobriety gave your family their father back.", category: "sobriety" },
    { text: "Small consistent actions beat big sporadic ones.", category: "growth" },
    { text: "You don't need permission to be great.", category: "strength" },
    { text: "The system works because you show up.", category: "purpose" },
];

// ─── Shared Utilities ───────────────────────────────────────────────────────

function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function setHtml(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = val;
}
