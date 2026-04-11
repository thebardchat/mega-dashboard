/* chat.js — AI Chat via Ollama */
// =============================================================================
// AI CHAT (ShaneBrain via Ollama)
// =============================================================================

function handleChatKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat();
    }
}

async function sendChat() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    input.value = '';
    addChatMessage(msg, 'user-message', 'USER');

    // Show thinking
    const thinkingEl = addChatMessage('Processing...', 'ai-message loading', 'SHANEBRAIN');

    try {
        const resp = await fetch(`${CONFIG.apiBase}/api/mega/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: msg,
                history: conversationHistory.slice(-20),
                session_id: SESSION_ID,
            }),
        });

        const data = await resp.json();
        thinkingEl.remove();

        if (data.response) {
            addChatMessage(data.response, 'ai-message', 'SHANEBRAIN');
            conversationHistory.push({ role: 'user', content: msg });
            conversationHistory.push({ role: 'assistant', content: data.response });
            // Weaviate save now handled server-side
        } else {
            addChatMessage('No response from model.', 'system-message', 'SYSTEM');
        }
    } catch (e) {
        thinkingEl.remove();
        addChatMessage('Connection error: ' + e.message, 'system-message', 'SYSTEM');
    }
}

function addChatMessage(text, cls, sender) {
    const win = document.getElementById('chat-window');
    const div = document.createElement('div');
    div.className = `message ${cls}`;
    div.innerHTML = `<span class="msg-sender">${sender}</span><span class="msg-text">${formatContent(text)}</span>`;
    win.appendChild(div);
    win.scrollTop = win.scrollHeight;
    return div;
}

function formatContent(content) {
    return content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}

async function saveChatToWeaviate(msg, response) {
    // Now handled server-side via /api/chat — this function kept as no-op for compatibility
}

async function loadChatHistory() {
    try {
        const resp = await fetch(`${CONFIG.apiBase}/api/mega/chat/history`);
        const data = await resp.json();
        const history = data.history || [];
        if (history.length === 0) return;

        const win = document.getElementById('chat-window');
        const divider = document.createElement('div');
        divider.className = 'message system-message';
        divider.innerHTML = '<span class="msg-sender">SYSTEM</span><span class="msg-text">— Recent memory loaded from Weaviate —</span>';
        win.appendChild(divider);

        // Seed conversationHistory for context (last 10 turns)
        history.slice(-10).forEach(t => {
            const role = t.role === 'assistant' ? 'assistant' : 'user';
            conversationHistory.push({ role, content: t.message || '' });
        });

        // Show last 5 in the chat window so Shane sees what was recent
        history.slice(-5).forEach(t => {
            const isUser = t.role === 'user';
            addChatMessage(
                t.message || '',
                isUser ? 'user-message faded' : 'ai-message faded',
                isUser ? 'YOU (prev)' : 'SHANEBRAIN (prev)'
            );
        });
        win.scrollTop = win.scrollHeight;
    } catch (e) {
        console.error('Failed to load chat history:', e);
    }
}

