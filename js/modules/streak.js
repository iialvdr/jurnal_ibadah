import { state } from '../state.js';
import { db } from '../config.js';
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const STREAK_CACHE_KEY = 'jurnal_streak_v1';
const WAJIB_PRAYERS = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];

const BADGES = [
    { threshold: 3,   emoji: '🔥', label: 'Awal yang Baik',      color: 'from-orange-400 to-red-500',    bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800/40', text: 'text-orange-600 dark:text-orange-400' },
    { threshold: 7,   emoji: '⭐', label: 'Pekan Istiqomah',     color: 'from-yellow-400 to-amber-500',   bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800/40', text: 'text-yellow-600 dark:text-yellow-400' },
    { threshold: 14,  emoji: '🏅', label: 'Dua Pekan Solid',     color: 'from-emerald-400 to-teal-500',   bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/40', text: 'text-emerald-600 dark:text-emerald-400' },
    { threshold: 30,  emoji: '💎', label: 'Sebulan Sempurna',    color: 'from-blue-400 to-indigo-500',    bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800/40', text: 'text-blue-600 dark:text-blue-400' },
    { threshold: 60,  emoji: '🌟', label: 'Dua Bulan Konsisten', color: 'from-violet-400 to-purple-500',  bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800/40', text: 'text-violet-600 dark:text-violet-400' },
    { threshold: 100, emoji: '🏆', label: 'Centurion',           color: 'from-amber-400 to-orange-500',   bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/40', text: 'text-amber-600 dark:text-amber-400' },
    { threshold: 365, emoji: '👑', label: 'Setahun Istiqomah',   color: 'from-yellow-300 to-yellow-500',  bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800/40', text: 'text-yellow-600 dark:text-yellow-400' }
];

let streakData = { current: 0, longest: 0, lastPerfectDate: null };

function formatDateKey(date) {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60000));
    return localDate.toISOString().split('T')[0];
}

function isPerfectDay(record) {
    if (!record) return false;
    return WAJIB_PRAYERS.every(p => record[p] === true);
}

function getCachedStreak() {
    try {
        const raw = localStorage.getItem(STREAK_CACHE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) { return null; }
}

function cacheStreak(data) {
    try {
        localStorage.setItem(STREAK_CACHE_KEY, JSON.stringify(data));
    } catch (e) { }
}

/**
 * Calculate streak by querying daily_records backwards from today.
 * Looks back up to 400 days to find the current streak.
 */
export async function calculateStreak() {
    if (!state.currentUser) return streakData;

    // Try loading from Firestore cache first
    try {
        const statsRef = doc(db, "users", state.currentUser.uid, "stats", "streak");
        const statsSnap = await getDoc(statsRef);
        if (statsSnap.exists()) {
            const cached = statsSnap.data();
            streakData = {
                current: cached.current || 0,
                longest: cached.longest || 0,
                lastPerfectDate: cached.lastPerfectDate || null
            };
        }
    } catch (e) { console.warn("Streak cache load error:", e); }

    // Now recalculate from actual records
    const today = new Date();
    const todayKey = formatDateKey(today);
    let currentStreak = 0;
    let checkDate = new Date(today);

    // Check today first
    const todayRecord = await getRecordForDate(todayKey);
    const todayPerfect = isPerfectDay(todayRecord);

    if (todayPerfect) {
        currentStreak = 1;
        checkDate.setDate(checkDate.getDate() - 1);
    } else {
        // If today isn't perfect yet, check from yesterday
        checkDate.setDate(checkDate.getDate() - 1);
    }

    // Go backwards, max 400 days
    for (let i = 0; i < 400; i++) {
        const dateKey = formatDateKey(checkDate);
        const record = await getRecordForDate(dateKey);
        if (isPerfectDay(record)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    const oldStreak = streakData.current;
    streakData.current = currentStreak;
    streakData.longest = Math.max(streakData.longest, currentStreak);
    streakData.lastPerfectDate = todayPerfect ? todayKey : (currentStreak > 0 ? formatDateKey(new Date(today.getTime() - 86400000)) : null);

    // Save to cache
    cacheStreak(streakData);

    // Save to Firestore
    try {
        const statsRef = doc(db, "users", state.currentUser.uid, "stats", "streak");
        await setDoc(statsRef, {
            current: streakData.current,
            longest: streakData.longest,
            lastPerfectDate: streakData.lastPerfectDate,
            updatedAt: new Date()
        }, { merge: true });
    } catch (e) { console.warn("Streak save error:", e); }

    // Check for new milestone
    checkMilestone(oldStreak, currentStreak);

    return streakData;
}

async function getRecordForDate(dateKey) {
    if (!state.currentUser) return null;
    try {
        const docSnap = await getDoc(doc(db, "users", state.currentUser.uid, "daily_records", dateKey));
        return docSnap.exists() ? docSnap.data() : null;
    } catch (e) { return null; }
}

/**
 * Quick update after a prayer toggle — avoids full recalculation.
 */
export async function updateStreak() {
    if (!state.currentUser) return;

    const todayKey = formatDateKey(new Date());
    const todayRecord = state.currentRecords || {};
    const todayPerfect = isPerfectDay(todayRecord);

    if (todayPerfect) {
        // If today just became perfect, recalculate from scratch
        await calculateStreak();
    } else {
        // If not perfect, streak from today is broken — check if yesterday was part of streak
        const cached = getCachedStreak();
        if (cached && cached.lastPerfectDate === todayKey) {
            // Today was perfect before but now isn't — need full recalc
            await calculateStreak();
        }
    }

    // Re-render widgets
    renderStreakWidget('homeStreakContainer');
}

export function getStreakData() {
    const cached = getCachedStreak();
    if (cached) {
        streakData = cached;
    }
    return { ...streakData };
}

export function getEarnedBadges(streak) {
    return BADGES.filter(b => streak >= b.threshold);
}

export function getNextBadge(streak) {
    return BADGES.find(b => streak < b.threshold) || null;
}

export function getAllBadges() {
    return [...BADGES];
}

function checkMilestone(oldStreak, newStreak) {
    if (newStreak <= oldStreak) return;

    const newlyEarned = BADGES.find(b => newStreak >= b.threshold && oldStreak < b.threshold);
    if (newlyEarned) {
        // Delay slightly so UI updates first
        setTimeout(() => showCelebration(newlyEarned), 600);
    }
}

export function showCelebration(badge) {
    // Remove any existing celebration
    const existing = document.getElementById('streakCelebration');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'streakCelebration';
    overlay.className = 'fixed inset-0 z-[300] flex items-center justify-center p-6';
    overlay.innerHTML = `
        <div class="absolute inset-0 bg-slate-950/70 backdrop-blur-md celebration-backdrop-enter"></div>
        <div class="confetti-container"></div>
        <div class="relative z-10 w-full max-w-[320px] bg-white dark:bg-slate-950 rounded-[3rem] p-8 text-center shadow-2xl border border-white/10 dark:border-slate-800 celebration-card-enter">
            <div class="relative">
                <div class="absolute inset-0 flex items-center justify-center">
                    <div class="w-24 h-24 bg-gradient-to-br ${badge.color} rounded-full opacity-20 animate-ping"></div>
                </div>
                <div class="relative z-10 text-6xl mb-4 celebration-emoji">${badge.emoji}</div>
            </div>
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 mb-4">
                <span class="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Pencapaian Baru!</span>
            </div>
            <h3 class="text-xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">${badge.label}</h3>
            <p class="text-xs text-slate-500 mb-6 leading-relaxed">Alhamdulillah! Kamu sudah konsisten <span class="font-bold text-emerald-600 dark:text-emerald-400">${badge.threshold} hari</span> berturut-turut menjalankan 5 sholat wajib.</p>
            <button onclick="this.closest('#streakCelebration').remove()" class="w-full py-4 rounded-2xl bg-gradient-to-r ${badge.color} text-white font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                Masya Allah! ✨
            </button>
        </div>
    `;

    document.body.appendChild(overlay);

    // Spawn confetti particles
    spawnConfetti(overlay.querySelector('.confetti-container'));

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
        if (overlay.isConnected) {
            overlay.classList.add('celebration-exit');
            setTimeout(() => overlay.remove(), 400);
        }
    }, 8000);
}

function spawnConfetti(container) {
    if (!container) return;
    const colors = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];
    const shapes = ['●', '■', '▲', '★', '♦'];

    for (let i = 0; i < 40; i++) {
        const particle = document.createElement('div');
        const color = colors[Math.floor(Math.random() * colors.length)];
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        const left = Math.random() * 100;
        const delay = Math.random() * 0.8;
        const duration = 2 + Math.random() * 2;
        const size = 8 + Math.random() * 8;

        particle.className = 'confetti-particle';
        particle.textContent = shape;
        particle.style.cssText = `
            position: absolute;
            left: ${left}%;
            top: -10%;
            font-size: ${size}px;
            color: ${color};
            animation: confettiFall ${duration}s ease-in ${delay}s forwards;
            pointer-events: none;
            z-index: 5;
        `;
        container.appendChild(particle);
    }
}

/**
 * Update the navbar streak badge in the home view.
 */
export function updateNavStreakBadge() {
    const badge = document.getElementById('navStreakBadge');
    const countEl = document.getElementById('navStreakCount');
    const emojiEl = document.getElementById('navStreakEmoji');
    if (!badge || !countEl || !emojiEl) return;

    const data = getStreakData();

    if (data.current <= 0) {
        badge.classList.remove('flex');
        badge.classList.add('hidden');
        return;
    }

    // Pick emoji based on streak level
    const earned = getEarnedBadges(data.current);
    const lastBadge = earned.length > 0 ? earned[earned.length - 1] : null;
    emojiEl.textContent = lastBadge ? lastBadge.emoji : '🔥';

    // Pick color classes based on streak
    badge.className = 'flex items-center gap-1 px-2.5 py-1 rounded-full border transition-all duration-300 ';
    if (data.current >= 30) {
        badge.className += 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40';
        countEl.className = 'text-[11px] font-black text-blue-600 dark:text-blue-400 tabular-nums';
    } else if (data.current >= 14) {
        badge.className += 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40';
        countEl.className = 'text-[11px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums';
    } else if (data.current >= 7) {
        badge.className += 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/40';
        countEl.className = 'text-[11px] font-black text-yellow-600 dark:text-yellow-400 tabular-nums';
    } else {
        badge.className += 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40';
        countEl.className = 'text-[11px] font-black text-orange-600 dark:text-orange-400 tabular-nums';
    }

    countEl.textContent = data.current;
}

/**
 * Render streak widget HTML — used in Home and Profile.
 */
export function renderStreakWidget(containerId) {
    // Always update the navbar badge when this is called from the home view
    updateNavStreakBadge();

    const container = document.getElementById(containerId);
    if (!container) return;

    const data = getStreakData();
    const earned = getEarnedBadges(data.current);
    const next = getNextBadge(data.current);
    const lastBadge = earned.length > 0 ? earned[earned.length - 1] : null;

    // Calculate progress to next badge
    let progressPct = 0;
    let progressLabel = '';
    if (next) {
        const prevThreshold = lastBadge ? lastBadge.threshold : 0;
        const range = next.threshold - prevThreshold;
        const progress = data.current - prevThreshold;
        progressPct = Math.min(Math.round((progress / range) * 100), 100);
        progressLabel = `${data.current}/${next.threshold} hari`;
    } else {
        progressPct = 100;
        progressLabel = `${data.current} hari 🎉`;
    }

    const fireColor = data.current >= 7 ? 'text-orange-500' : (data.current >= 3 ? 'text-amber-500' : 'text-slate-400');
    const fireAnim = data.current > 0 ? 'streak-fire' : '';

    // homeStreakContainer is hidden — only used for profile or other views
    if (containerId !== 'homeStreakContainer') {
        container.innerHTML = `
            <div class="bento-card bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-white dark:border-slate-800 shadow-sm relative overflow-hidden">

                <div class="relative z-10">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-3">
                            <div>
                                <div class="flex items-baseline gap-1.5">
                                    <span class="text-2xl font-black text-slate-800 dark:text-white tabular-nums streak-count">${data.current}</span>
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hari</span>
                                </div>
                                <p class="text-[9px] font-bold ${fireColor} uppercase tracking-[0.15em]">Streak Istiqomah</p>
                            </div>
                        </div>
                        ${lastBadge ? `
                        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full ${lastBadge.bg} ${lastBadge.border} border">
                            <span class="text-sm">${lastBadge.emoji}</span>
                            <span class="text-[8px] font-black ${lastBadge.text} uppercase tracking-wider hidden sm:inline">${lastBadge.label}</span>
                        </div>
                        ` : ''}
                    </div>

                    ${next ? `
                    <div class="mt-2">
                        <div class="flex items-center justify-between mb-1.5">
                            <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Menuju ${next.emoji} ${next.label}</span>
                            <span class="text-[9px] font-black text-slate-500 tabular-nums">${progressLabel}</span>
                        </div>
                        <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div class="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(249,115,22,0.3)]" style="width: ${progressPct}%"></div>
                        </div>
                    </div>
                    ` : `
                    <div class="mt-2 text-center">
                        <span class="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Semua badge terkumpul! 🎉</span>
                    </div>
                    `}

                    ${data.longest > data.current && data.current > 0 ? `
                    <div class="mt-3 flex items-center gap-1.5">
                        <i data-lucide="trophy" class="w-3 h-3 text-amber-400"></i>
                        <span class="text-[9px] font-bold text-slate-400">Rekor: <span class="text-amber-500 font-black">${data.longest} hari</span></span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        container.classList.remove('hidden');
        if (window.lucide) lucide.createIcons({ root: container });
    }
}

/**
 * Render badge grid for Profile page.
 */
export function renderBadgeGrid(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const data = getStreakData();
    const earned = getEarnedBadges(data.current);

    let html = '';
    BADGES.forEach(badge => {
        const isEarned = data.current >= badge.threshold;
        const earnedClass = isEarned
            ? `${badge.bg} ${badge.border} border`
            : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 opacity-40 grayscale';

        html += `
        <div class="badge-item-responsive p-3 rounded-2xl flex flex-col items-center justify-start gap-2 text-center transition-all duration-300 ${earnedClass} ${isEarned ? 'badge-earned' : ''} snap-center">
            <span class="text-2xl ${isEarned ? '' : 'opacity-30'}">${badge.emoji}</span>
            <div>
                <p class="text-[9px] font-black ${isEarned ? badge.text : 'text-slate-400'} uppercase tracking-wider leading-tight">${badge.label}</p>
                <p class="text-[8px] font-bold text-slate-400 mt-0.5">${badge.threshold} hari</p>
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

export function initStreak() {
    // Load cached data immediately for instant display
    const cached = getCachedStreak();
    if (cached) {
        streakData = cached;
    }
    // Update navbar badge right away from cache
    updateNavStreakBadge();
}
