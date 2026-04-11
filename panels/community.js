/* community.js — Community Hub Panel (Vue 3)
   Discord widget, GitHub activity + heatmap, Ko-fi support.
   Mounts into #community-panel-mount in index.html. */

const CommunityPanel = {
    template: `
    <div class="cm-panel dash-panel panel-3d panel-xtall">
        <div class="cm-header panel-header">
            <span class="panel-status" :class="{ online: loaded }"></span>
            <h2>COMMUNITY HUB</h2>
            <span class="cm-badge" v-if="discord.onlineCount">{{ discord.onlineCount }} ONLINE</span>
        </div>

        <div class="cm-body panel-body">
            <!-- Discord Section -->
            <div class="cm-section">
                <div class="cm-section-label">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="#7289da"><path d="M20.317 4.37a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.618-1.25.077.077 0 00-.079-.037A19.74 19.74 0 003.677 4.37a.07.07 0 00-.032.028C.533 9.046-.32 13.58.099 18.057a.08.08 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.11 13.11 0 01-1.872-.892.077.077 0 01-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 01.078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.099.246.198.373.292a.077.077 0 01-.006.127 12.3 12.3 0 01-1.873.892.076.076 0 00-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 00.084.028 19.84 19.84 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 00-.031-.03z"/></svg>
                    <span>DISCORD</span>
                    <span class="cm-section-line"></span>
                </div>
                <div class="cm-discord">
                    <div class="cm-discord-header">
                        <span class="cm-server-name">{{ discord.name }}</span>
                        <div class="cm-discord-counts">
                            <span class="cm-online"><span class="cm-online-dot"></span>{{ discord.onlineCount }}</span>
                            <span class="cm-member-count">{{ discord.memberCount }} total</span>
                        </div>
                    </div>
                    <div class="cm-discord-members" v-if="discord.members.length">
                        <div v-for="m in discord.members.slice(0, 8)" :key="m.id" class="cm-member">
                            <img v-if="m.avatar" :src="m.avatar" class="cm-avatar" :alt="m.username">
                            <span v-else class="cm-avatar cm-avatar-placeholder">{{ m.username.charAt(0).toUpperCase() }}</span>
                            <span class="cm-member-name">{{ m.username }}</span>
                            <span class="cm-member-status" :class="m.status"></span>
                        </div>
                    </div>
                    <a href="https://discord.gg/qST3UfFAr9" target="_blank" class="cm-join-btn">
                        <span>JOIN SERVER</span>
                        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
                    </a>
                </div>
            </div>

            <!-- GitHub Section -->
            <div class="cm-section">
                <div class="cm-section-label">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="var(--neon-green)"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                    <span>GITHUB</span>
                    <span class="cm-section-line"></span>
                </div>
                <div class="cm-github">
                    <div class="cm-gh-stats">
                        <div class="cm-gh-stat">
                            <span class="cm-gh-num">{{ github.publicRepos }}</span>
                            <span class="cm-gh-label">REPOS</span>
                        </div>
                        <div class="cm-gh-stat">
                            <span class="cm-gh-num">{{ github.followers }}</span>
                            <span class="cm-gh-label">FOLLOWERS</span>
                        </div>
                        <div class="cm-gh-stat">
                            <span class="cm-gh-num">{{ github.totalStars }}</span>
                            <span class="cm-gh-label">STARS</span>
                        </div>
                        <div class="cm-gh-stat" v-if="github.streak > 0">
                            <span class="cm-gh-num cm-streak">{{ github.streak }}d</span>
                            <span class="cm-gh-label">STREAK</span>
                        </div>
                    </div>

                    <!-- Contribution heatmap -->
                    <div class="cm-heatmap" v-if="github.heatmap.length">
                        <div class="cm-heatmap-label">LAST 7 WEEKS</div>
                        <div class="cm-heatmap-grid">
                            <div v-for="(week, wi) in github.heatmapWeeks" :key="wi" class="cm-heatmap-col">
                                <div v-for="(day, di) in week" :key="di"
                                     class="cm-heatmap-cell"
                                     :class="'level-' + day.level"
                                     :title="day.date + ': ' + day.count + ' events'">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Recent activity -->
                    <div class="cm-gh-recent" v-if="github.recentEvents.length">
                        <div v-for="(ev, i) in github.recentEvents" :key="i" class="cm-gh-event">
                            <span class="cm-gh-event-icon" :class="ev.type">{{ ev.icon }}</span>
                            <span class="cm-gh-event-text">{{ ev.text }}</span>
                            <span class="cm-gh-event-time">{{ ev.ago }}</span>
                        </div>
                    </div>
                    <a href="https://github.com/thebardchat" target="_blank" class="cm-gh-btn">
                        <span>VIEW PROFILE</span>
                        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
                    </a>
                </div>
            </div>

            <!-- Ko-fi + Hub row -->
            <div class="cm-bottom-row">
                <a href="https://ko-fi.com/shanebrain" target="_blank" class="cm-kofi-btn">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311z"/></svg>
                    SUPPORT
                </a>
                <a href="https://thebardchat.github.io" target="_blank" class="cm-hub-btn">
                    <span class="cm-hub-pulse"></span>
                    THEBARDCHAT.GITHUB.IO
                </a>
            </div>
        </div>
    </div>
    `,

    data() {
        return {
            loaded: false,
            discord: {
                name: 'ShaneBrainLegacy',
                memberCount: 0,
                onlineCount: 0,
                members: [],
            },
            github: {
                publicRepos: 0,
                followers: 0,
                totalStars: 0,
                streak: 0,
                recentEvents: [],
                heatmap: [],
            },
            refreshTimer: null,
        };
    },

    computed: {
        heatmapWeeks() {
            // Organize heatmap into 7 columns (weeks), 7 rows (days)
            const weeks = [];
            for (let i = 0; i < this.github.heatmap.length; i += 7) {
                weeks.push(this.github.heatmap.slice(i, i + 7));
            }
            return weeks;
        },
    },

    methods: {
        async fetchDiscord() {
            try {
                const resp = await fetch('https://discord.com/api/guilds/1396952052772638720/widget.json');
                if (!resp.ok) throw new Error('Widget disabled');
                const data = await resp.json();
                this.discord.name = data.name || 'ShaneBrainLegacy';
                this.discord.onlineCount = data.presence_count || 0;
                this.discord.members = (data.members || []).map(m => ({
                    id: m.id,
                    username: m.username || 'Unknown',
                    status: m.status || 'offline',
                    avatar: m.avatar_url || null,
                }));
                // Widget doesn't give total — try invite too
                if (!this.discord.memberCount) {
                    const inv = await fetch('https://discord.com/api/invites/qST3UfFAr9?with_counts=true');
                    const invData = await inv.json();
                    this.discord.memberCount = invData.approximate_member_count || 0;
                    if (!this.discord.onlineCount) {
                        this.discord.onlineCount = invData.approximate_presence_count || 0;
                    }
                }
            } catch (e) {
                try {
                    const resp = await fetch('https://discord.com/api/invites/qST3UfFAr9?with_counts=true');
                    const data = await resp.json();
                    this.discord.name = data.guild?.name || 'ShaneBrainLegacy';
                    this.discord.memberCount = data.approximate_member_count || 0;
                    this.discord.onlineCount = data.approximate_presence_count || 0;
                } catch (e2) {
                    console.warn('Discord fetch failed:', e2);
                }
            }
        },

        async fetchGitHub() {
            try {
                // User profile
                const userResp = await fetch('https://api.github.com/users/thebardchat');
                const user = await userResp.json();
                this.github.publicRepos = user.public_repos || 0;
                this.github.followers = user.followers || 0;

                // Stars count
                const reposResp = await fetch('https://api.github.com/users/thebardchat/repos?per_page=100&sort=updated');
                const repos = await reposResp.json();
                if (Array.isArray(repos)) {
                    this.github.totalStars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
                }

                // Events — for activity feed + heatmap
                const eventsResp = await fetch('https://api.github.com/users/thebardchat/events/public?per_page=100');
                const events = await eventsResp.json();
                if (Array.isArray(events)) {
                    this.github.recentEvents = events.slice(0, 5).map(ev => this.formatEvent(ev));
                    this.buildHeatmap(events);
                }
            } catch (e) {
                console.warn('GitHub fetch failed:', e);
            }
        },

        buildHeatmap(events) {
            // Build a 49-day (7 weeks) heatmap from events
            const dayMap = {};
            const now = new Date();
            // Initialize 49 days
            for (let i = 48; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const key = d.toISOString().slice(0, 10);
                dayMap[key] = 0;
            }
            // Count events per day
            for (const ev of events) {
                const key = ev.created_at?.slice(0, 10);
                if (key in dayMap) dayMap[key]++;
            }
            // Convert to array with levels
            const days = Object.entries(dayMap).map(([date, count]) => {
                let level = 0;
                if (count >= 1) level = 1;
                if (count >= 3) level = 2;
                if (count >= 6) level = 3;
                if (count >= 10) level = 4;
                return { date, count, level };
            });
            this.github.heatmap = days;

            // Calculate streak (consecutive days with activity from today backwards)
            let streak = 0;
            for (let i = days.length - 1; i >= 0; i--) {
                if (days[i].count > 0) streak++;
                else break;
            }
            this.github.streak = streak;
        },

        formatEvent(ev) {
            const ago = this.timeAgo(new Date(ev.created_at));
            const repo = (ev.repo?.name || '').replace('thebardchat/', '');
            switch (ev.type) {
                case 'PushEvent': {
                    const msg = ev.payload?.commits?.[0]?.message?.split('\n')[0] || '';
                    return { icon: '\u25B6', type: 'push', text: repo + ': ' + (msg.length > 38 ? msg.slice(0, 38) + '\u2026' : msg), ago };
                }
                case 'CreateEvent':
                    return { icon: '+', type: 'create', text: 'Created ' + (ev.payload?.ref_type || '') + ' in ' + repo, ago };
                case 'WatchEvent':
                    return { icon: '\u2605', type: 'star', text: 'Starred ' + repo, ago };
                case 'IssuesEvent':
                    return { icon: '\u25CB', type: 'issue', text: ev.payload?.action + ' issue in ' + repo, ago };
                case 'PullRequestEvent':
                    return { icon: '\u21C4', type: 'pr', text: ev.payload?.action + ' PR in ' + repo, ago };
                case 'ForkEvent':
                    return { icon: '\u2442', type: 'fork', text: 'Forked ' + repo, ago };
                default:
                    return { icon: '\u00B7', type: 'other', text: ev.type.replace('Event', '') + ' on ' + repo, ago };
            }
        },

        timeAgo(date) {
            const seconds = Math.floor((new Date() - date) / 1000);
            if (seconds < 60) return 'now';
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return minutes + 'm';
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return hours + 'h';
            const days = Math.floor(hours / 24);
            return days + 'd';
        },

        async refresh() {
            await Promise.all([this.fetchDiscord(), this.fetchGitHub()]);
            this.loaded = true;
        },
    },

    mounted() {
        this.refresh();
        this.refreshTimer = setInterval(() => this.refresh(), 300000);
    },

    unmounted() {
        clearInterval(this.refreshTimer);
    },
};

// ── Mount ────────────────────────────────────────────────────────────────────
function mountCommunityPanel() {
    const target = document.getElementById('community-panel-mount');
    if (!target) return;
    if (typeof Vue === 'undefined') { setTimeout(mountCommunityPanel, 100); return; }
    Vue.createApp(CommunityPanel).mount(target);
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountCommunityPanel);
} else {
    mountCommunityPanel();
}
