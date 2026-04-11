/* self-talk.js — Self-talk affirmations rotator */
// =============================================================================
// SELF-TALK
// =============================================================================

let selfTalkIndex = Math.floor(Math.random() * AFFIRMATIONS.length);

function initSelfTalk() {
    rotateSelfTalk();
}

function rotateSelfTalk() {
    selfTalkIndex = (selfTalkIndex + 1) % AFFIRMATIONS.length;
    const el = document.getElementById('self-talk');
    const a = AFFIRMATIONS[selfTalkIndex];
    if (el) {
        const textEl = el.querySelector('.self-talk-text');
        textEl.style.opacity = '0';
        setTimeout(() => {
            textEl.textContent = `"${a.text}"`;
            textEl.style.opacity = '1';
        }, 300);
    }
}

