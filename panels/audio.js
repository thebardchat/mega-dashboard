/* audio.js — Brown Noise + Jazz Radio */
// =============================================================================
// AUDIO — Brown Noise (Web Audio API) + Jazz Radio (SomaFM)
// =============================================================================

function toggleBrownNoise() {
    if (brownNoisePlaying) {
        stopBrownNoise();
    } else {
        startBrownNoise();
    }
}

function startBrownNoise() {
    if (!brownNoiseCtx) {
        brownNoiseCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Create brown noise via ScriptProcessor
    const bufferSize = 4096;
    brownNoiseNode = brownNoiseCtx.createScriptProcessor(bufferSize, 1, 1);
    brownNoiseGain = brownNoiseCtx.createGain();
    brownNoiseGain.gain.value = globalVolume;

    let lastOut = 0;
    brownNoiseNode.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + (0.02 * white)) / 1.02;
            output[i] = lastOut * 3.5; // Amplify
        }
    };

    brownNoiseNode.connect(brownNoiseGain);
    brownNoiseGain.connect(brownNoiseCtx.destination);

    brownNoisePlaying = true;
    document.getElementById('btn-brown').classList.add('active');
}

function stopBrownNoise() {
    if (brownNoiseNode) {
        brownNoiseNode.disconnect();
        brownNoiseNode = null;
    }
    if (brownNoiseGain) {
        brownNoiseGain.disconnect();
        brownNoiseGain = null;
    }
    brownNoisePlaying = false;
    document.getElementById('btn-brown').classList.remove('active');
}

function toggleJazz() {
    if (jazzPlaying) {
        stopJazz();
    } else {
        startJazz();
    }
}

function startJazz() {
    if (!jazzAudio) {
        jazzAudio = new Audio(CONFIG.jazzStreamUrl);
        jazzAudio.crossOrigin = 'anonymous';
    }
    jazzAudio.volume = globalVolume;
    jazzAudio.play().catch(e => console.error('Jazz stream error:', e));
    jazzPlaying = true;
    document.getElementById('btn-jazz').classList.add('active');
}

function stopJazz() {
    if (jazzAudio) {
        jazzAudio.pause();
        jazzAudio.currentTime = 0;
    }
    jazzPlaying = false;
    document.getElementById('btn-jazz').classList.remove('active');
}

function setVolume(val) {
    globalVolume = val / 100;
    if (brownNoiseGain) brownNoiseGain.gain.value = globalVolume;
    if (jazzAudio) jazzAudio.volume = globalVolume;
}

