/* email.js — Focused Inbox Vue 3 Component
   Self-contained: template, state, data fetching, styles.
   Mounts into #email-panel-mount in index.html. */

const EmailPanel = {
    template: `
    <div class="ep-panel dash-panel panel-3d">
        <div class="ep-header panel-header">
            <span class="panel-status" :class="{ online: connected }"></span>
            <h2>FOCUSED INBOX</h2>
            <span class="ep-badge" v-if="unreadCount">{{ unreadFormatted }} unread</span>
            <button class="ep-refresh-btn" @click="refresh" :class="{ spinning: loading }" title="Refresh">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M23 4v6h-6M1 20v-6h6"/>
                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                </svg>
            </button>
        </div>

        <div class="ep-body panel-body">
            <!-- Loading state -->
            <div v-if="loading && !emails.length" class="ep-loading">
                <div class="ep-loading-dots">
                    <span></span><span></span><span></span>
                </div>
                <div class="ep-loading-text">Connecting to Gmail...</div>
            </div>

            <!-- Error state -->
            <div v-else-if="error" class="ep-error">
                <div class="ep-error-icon">&#9888;</div>
                <div class="ep-error-text">{{ error }}</div>
                <button class="ep-retry-btn" @click="refresh">RETRY</button>
            </div>

            <!-- Email list -->
            <div v-else class="ep-list">
                <transition-group name="ep-email" tag="div">
                    <div v-for="(em, i) in emails" :key="em.id || (em.subject + em.time + i)"
                         class="ep-item"
                         :class="{ unread: !em.read, important: em.important, expanded: expandedIndex === i }"
                         @click="toggleExpand(i)">
                        <div class="ep-item-row">
                            <span class="ep-unread-dot" v-if="!em.read"></span>
                            <span class="ep-from">{{ em.from }}</span>
                            <span class="ep-time">{{ em.date }} {{ em.time }}</span>
                        </div>
                        <div class="ep-subject">{{ em.subject }}</div>
                        <!-- Expanded body -->
                        <div v-if="expandedIndex === i" class="ep-expanded" @click.stop>
                            <div class="ep-expanded-meta">
                                <span class="ep-expanded-from">{{ em.from }}</span>
                                <span class="ep-expanded-email" v-if="em.fromEmail">&lt;{{ em.fromEmail }}&gt;</span>
                            </div>
                            <div class="ep-expanded-body">{{ em.snippet || 'No preview available' }}</div>
                            <div class="ep-expanded-actions">
                                <a v-if="em.id" :href="'https://mail.google.com/mail/u/0/#inbox/' + em.id"
                                   target="_blank" class="ep-open-btn" @click.stop>OPEN IN GMAIL</a>
                            </div>
                        </div>
                    </div>
                </transition-group>
                <div v-if="!emails.length" class="ep-empty">Inbox empty</div>
            </div>

            <!-- Bot stats footer -->
            <div class="ep-bots">
                <div class="ep-bot" :class="{ active: janitor.total > 0 }">
                    <div class="ep-bot-header">
                        <span class="ep-bot-icon">&#128465;</span>
                        <span class="ep-bot-name">JANITOR</span>
                    </div>
                    <div class="ep-bot-stat">{{ janitor.total.toLocaleString() }} cleaned</div>
                    <div class="ep-bot-meta">
                        <span v-if="janitor.lastMoved">{{ janitor.lastMoved }} moved last run</span>
                        <span class="ep-bot-ago">{{ janitor.ago }}</span>
                    </div>
                </div>
                <div class="ep-bot-divider"></div>
                <div class="ep-bot" :class="{ active: responder.total > 0 }">
                    <div class="ep-bot-header">
                        <span class="ep-bot-icon">&#9993;</span>
                        <span class="ep-bot-name">RESPONDER</span>
                    </div>
                    <div class="ep-bot-stat">{{ responder.total }} drafts</div>
                    <div class="ep-bot-meta">
                        <span v-if="responder.lastDrafted">{{ responder.lastDrafted }} drafted last run</span>
                        <span class="ep-bot-ago">{{ responder.ago }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,

    data() {
        return {
            emails: [],
            unreadCount: 0,
            connected: false,
            loading: true,
            error: null,
            expandedIndex: -1,
            janitor: { total: 0, lastMoved: 0, ago: '--' },
            responder: { total: 0, lastDrafted: 0, ago: '--' },
            refreshTimer: null,
            responderTimer: null,
        };
    },

    computed: {
        unreadFormatted() {
            if (this.unreadCount >= 10000) return Math.round(this.unreadCount / 1000) + 'k';
            if (this.unreadCount >= 1000) return (this.unreadCount / 1000).toFixed(1) + 'k';
            return this.unreadCount;
        },
    },

    methods: {
        async fetchEmails() {
            this.loading = true;
            try {
                const resp = await fetch(`${CONFIG.apiBase}/api/emails`);
                const data = await resp.json();
                this.emails = (data.emails || []).slice(0, 10);
                this.unreadCount = data.unreadCount || 0;
                this.connected = data.source === 'imap';
                this.error = null;

                // Janitor stats
                const j = data.janitor || {};
                this.janitor.total = j.janitor_total_cleaned || 0;
                this.janitor.lastMoved = j.janitor_last_moved || 0;
                this.janitor.ago = this.timeAgo(j.janitor_last_run);

                // Responder stats from same payload
                this.responder.total = j.responder_total_drafted || 0;
                this.responder.lastDrafted = j.responder_last_drafted || 0;
                this.responder.ago = this.timeAgo(j.responder_last_run);
            } catch (e) {
                this.error = 'Gmail connection failed';
                this.connected = false;
            }
            this.loading = false;
        },

        async fetchResponder() {
            try {
                const resp = await fetch(`${CONFIG.apiBase}/api/email-responder`);
                const d = await resp.json();
                this.responder.total = d.responder_total_drafted || 0;
                this.responder.lastDrafted = d.responder_last_drafted || 0;
                this.responder.ago = this.timeAgo(d.responder_last_run);
            } catch (e) { /* silent */ }
        },

        refresh() {
            this.fetchEmails();
            this.fetchResponder();
        },

        toggleExpand(i) {
            this.expandedIndex = this.expandedIndex === i ? -1 : i;
        },

        timeAgo(ts) {
            if (!ts) return '--';
            const ago = Math.round((Date.now() - new Date(ts)) / 60000);
            if (ago < 1) return 'just now';
            if (ago < 60) return `${ago}m ago`;
            if (ago < 1440) return `${Math.round(ago / 60)}h ago`;
            return `${Math.round(ago / 1440)}d ago`;
        },
    },

    mounted() {
        this.fetchEmails();
        this.fetchResponder();
        this.refreshTimer = setInterval(() => this.fetchEmails(), 120000);
        this.responderTimer = setInterval(() => this.fetchResponder(), 60000);
    },

    unmounted() {
        clearInterval(this.refreshTimer);
        clearInterval(this.responderTimer);
    },
};

// ── Mount ────────────────────────────────────────────────────────────────────
// Wait for Vue to be available (loaded via CDN in index.html)
function mountEmailPanel() {
    const target = document.getElementById('email-panel-mount');
    if (!target) return;
    if (typeof Vue === 'undefined') {
        console.warn('Vue not loaded yet, retrying...');
        setTimeout(mountEmailPanel, 100);
        return;
    }
    Vue.createApp(EmailPanel).mount(target);
}

// Auto-mount on DOMContentLoaded or immediately if already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountEmailPanel);
} else {
    mountEmailPanel();
}

// Stubs so init.js doesn't error when calling these
function loadEmails() { /* handled by Vue component */ }
function refreshEmails() { /* handled by Vue component */ }
function loadEmailResponder() { /* handled by Vue component */ }
