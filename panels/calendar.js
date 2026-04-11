/* calendar.js — Google Calendar Vue 3 Component
   Week view with timeline, countdown, click-to-expand.
   Mounts into #calendar-panel-mount in index.html. */

const CalendarPanel = {
    template: `
    <div class="cp-panel dash-panel panel-3d">
        <div class="cp-header panel-header">
            <span class="panel-status" :class="{ online: connected }"></span>
            <h2>COMMAND CALENDAR</h2>
            <span class="cp-badge" v-if="events.length">{{ events.length }}</span>
            <button class="cp-refresh-btn" @click="refresh" :class="{ spinning: loading }" title="Refresh">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M23 4v6h-6M1 20v-6h6"/>
                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                </svg>
            </button>
        </div>

        <div class="cp-body panel-body">
            <!-- Loading -->
            <div v-if="loading && !events.length" class="cp-loading">
                <div class="ep-loading-dots"><span></span><span></span><span></span></div>
                <div class="cp-loading-text">Syncing Google Calendar...</div>
            </div>

            <!-- Not connected -->
            <div v-else-if="!connected && !events.length" class="cp-disconnected">
                <div class="cp-disc-icon">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                </div>
                <div class="cp-disc-text">{{ message || 'Calendar not connected' }}</div>
            </div>

            <!-- Connected with events -->
            <template v-else>
                <!-- Next event countdown -->
                <div v-if="nextEvent" class="cp-next">
                    <div class="cp-next-label">NEXT UP</div>
                    <div class="cp-next-title">{{ nextEvent.title }}</div>
                    <div class="cp-next-meta">
                        <span class="cp-next-when">{{ nextEvent.day }} {{ nextEvent.time }}</span>
                        <span class="cp-next-countdown" v-if="countdown">{{ countdown }}</span>
                    </div>
                    <div class="cp-next-bar">
                        <div class="cp-next-bar-fill" :style="{ width: countdownPct + '%' }"></div>
                    </div>
                </div>

                <!-- Week strip -->
                <div class="cp-week-strip">
                    <div v-for="d in weekDays" :key="d.key"
                         class="cp-week-day"
                         :class="{ active: d.isToday, 'has-events': d.count > 0 }">
                        <span class="cp-week-name">{{ d.name }}</span>
                        <span class="cp-week-num">{{ d.num }}</span>
                        <span class="cp-week-dots">
                            <span v-for="n in Math.min(d.count, 3)" :key="n" class="cp-week-dot"></span>
                        </span>
                    </div>
                </div>

                <!-- Event timeline -->
                <div class="cp-timeline">
                    <div v-for="(dayGroup, dayLabel) in groupedEvents" :key="dayLabel" class="cp-day-group">
                        <div class="cp-day-header" :class="{ 'cp-today': dayLabel === 'TODAY' }">
                            <span class="cp-day-marker"></span>
                            <span class="cp-day-name">{{ dayLabel }}</span>
                            <span class="cp-day-line"></span>
                        </div>
                        <div v-for="(ev, i) in dayGroup" :key="ev.title + ev.time + i"
                             class="cp-event"
                             :class="{ expanded: expandedKey === dayLabel + i, 'all-day': ev.allDay }"
                             @click="toggleExpand(dayLabel + i)">
                            <div class="cp-event-pip"></div>
                            <div class="cp-event-content">
                                <div class="cp-event-row">
                                    <span class="cp-event-time">{{ ev.time || 'ALL DAY' }}</span>
                                    <span class="cp-event-title">{{ ev.title }}</span>
                                </div>
                                <div v-if="expandedKey === dayLabel + i" class="cp-expanded" @click.stop>
                                    <div v-if="ev.location" class="cp-detail">
                                        <span class="cp-detail-icon">&#9906;</span>
                                        <span class="cp-detail-val">{{ ev.location }}</span>
                                    </div>
                                    <div v-if="ev.description" class="cp-detail">
                                        <span class="cp-detail-icon">&#9998;</span>
                                        <span class="cp-detail-val cp-desc">{{ ev.description }}</span>
                                    </div>
                                    <div class="cp-expanded-actions">
                                        <a v-if="ev.link" :href="ev.link" target="_blank"
                                           class="cp-open-btn" @click.stop>OPEN IN GOOGLE</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Empty state -->
                <div v-if="!events.length" class="cp-clear">
                    <div class="cp-clear-icon">&#10003;</div>
                    <div class="cp-clear-text">WEEK CLEAR</div>
                    <div class="cp-clear-sub">No events scheduled</div>
                </div>
            </template>
        </div>
    </div>
    `,

    data() {
        return {
            events: [],
            connected: false,
            loading: true,
            message: '',
            expandedKey: null,
            countdown: '',
            countdownPct: 100,
            refreshTimer: null,
            countdownTimer: null,
        };
    },

    computed: {
        groupedEvents() {
            const groups = {};
            for (const ev of this.events) {
                const label = this.dayLabel(ev);
                if (!groups[label]) groups[label] = [];
                groups[label].push(ev);
            }
            return groups;
        },

        nextEvent() {
            return this.events.length ? this.events[0] : null;
        },

        weekDays() {
            const days = [];
            const now = new Date();
            for (let i = 0; i < 7; i++) {
                const d = new Date(now);
                d.setDate(d.getDate() + i);
                const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const count = this.events.filter(ev => ev.date === dateStr).length;
                days.push({
                    key: i,
                    name: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
                    num: d.getDate(),
                    isToday: i === 0,
                    count,
                });
            }
            return days;
        },
    },

    methods: {
        async fetchEvents() {
            this.loading = true;
            try {
                const resp = await fetch(CONFIG.apiBase + '/api/calendar');
                const data = await resp.json();
                this.events = data.events || [];
                this.connected = data.source && data.source.startsWith('google');
                this.message = data.message || '';
                this.updateCountdown();
                this.updateGlanceStrip();
            } catch (e) {
                this.connected = false;
                this.message = 'Calendar connection failed';
            }
            this.loading = false;
        },

        updateGlanceStrip() {
            const row = document.getElementById('calendar-row');
            if (!row) return;
            if (!this.events.length) {
                row.innerHTML = '<span class="cal-event" style="color:var(--neon-green)">WEEK CLEAR</span>';
                return;
            }
            row.innerHTML = this.events.slice(0, 3).map(ev => {
                const time = ev.time ? '<span style="color:var(--neon-cyan)">' + ev.time + '</span> ' : '';
                const day = ev.day ? '<span style="color:var(--neon-yellow)">' + ev.day + '</span> ' : '';
                return '<span class="cal-event">' + day + time + this.escapeHtml(ev.title) + '</span>';
            }).join('');
        },

        updateCountdown() {
            if (!this.nextEvent) { this.countdown = ''; return; }
            const ev = this.nextEvent;
            const now = new Date();
            const year = now.getFullYear();
            // Parse "Apr 10" + "9:00 PM" into a Date
            const dateStr = ev.date + ', ' + year + ' ' + (ev.time || '12:00 PM');
            const target = new Date(dateStr);
            if (isNaN(target.getTime())) { this.countdown = ''; return; }

            const diff = target - now;
            if (diff <= 0) { this.countdown = 'NOW'; this.countdownPct = 0; return; }

            const hrs = Math.floor(diff / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            if (hrs > 24) {
                const days = Math.floor(hrs / 24);
                this.countdown = days + 'd ' + (hrs % 24) + 'h';
            } else if (hrs > 0) {
                this.countdown = hrs + 'h ' + mins + 'm';
            } else {
                this.countdown = mins + 'm';
            }
            // Bar: 24h = 100%, 0 = 0%
            this.countdownPct = Math.max(0, Math.min(100, (diff / 86400000) * 100));
        },

        dayLabel(ev) {
            if (!ev.date) return 'UNDATED';
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const todayStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const tomorrowStr = tomorrow.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            if (ev.date === todayStr) return 'TODAY';
            if (ev.date === tomorrowStr) return 'TOMORROW';
            return ev.day ? ev.day.toUpperCase() + ' · ' + ev.date.toUpperCase() : ev.date.toUpperCase();
        },

        toggleExpand(key) {
            this.expandedKey = this.expandedKey === key ? null : key;
        },

        refresh() { this.fetchEvents(); },

        escapeHtml(text) {
            const d = document.createElement('div');
            d.textContent = text;
            return d.innerHTML;
        },
    },

    mounted() {
        this.fetchEvents();
        this.refreshTimer = setInterval(() => this.fetchEvents(), 300000);
        this.countdownTimer = setInterval(() => this.updateCountdown(), 60000);
    },

    unmounted() {
        clearInterval(this.refreshTimer);
        clearInterval(this.countdownTimer);
    },
};

// ── Mount ────────────────────────────────────────────────────────────────────
function mountCalendarPanel() {
    const target = document.getElementById('calendar-panel-mount');
    if (!target) return;
    if (typeof Vue === 'undefined') { setTimeout(mountCalendarPanel, 100); return; }
    Vue.createApp(CalendarPanel).mount(target);
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountCalendarPanel);
} else {
    mountCalendarPanel();
}

function loadCalendar() { /* handled by Vue component */ }
