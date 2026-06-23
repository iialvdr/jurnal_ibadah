// src/modules/streak.js
import { db } from '@/config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const STREAK_CACHE_KEY = 'jurnal_streak_v1';
const WAJIB_PRAYERS = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];

export const BADGES = [
    { threshold: 3,   emoji: '🔥', label: 'Awal yang Baik',      color: 'from-orange-400 to-red-500',    bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800/40', text: 'text-orange-600 dark:text-orange-400' },
    { threshold: 7,   emoji: '⭐', label: 'Pekan Istiqomah',     color: 'from-yellow-400 to-amber-500',   bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800/40', text: 'text-yellow-600 dark:text-yellow-400' },
    { threshold: 14,  emoji: '🏅', label: 'Dua Pekan Solid',     color: 'from-emerald-400 to-teal-500',   bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/40', text: 'text-emerald-600 dark:text-emerald-400' },
    { threshold: 30,  emoji: '💎', label: 'Sebulan Sempurna',    color: 'from-blue-400 to-indigo-500',    bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800/40', text: 'text-blue-600 dark:text-blue-400' },
    { threshold: 60,  emoji: '🌟', label: 'Dua Bulan Konsisten', color: 'from-violet-400 to-purple-500',  bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800/40', text: 'text-violet-600 dark:text-violet-400' },
    { threshold: 100, emoji: '🏆', label: 'Centurion',           color: 'from-amber-400 to-orange-500',   bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/40', text: 'text-amber-600 dark:text-amber-400' },
    { threshold: 365, emoji: '👑', label: 'Setahun Istiqomah',   color: 'from-yellow-300 to-yellow-500',  bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800/40', text: 'text-yellow-600 dark:text-yellow-400' }
];

function formatDateKey(date) {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60000));
    return localDate.toISOString().split('T')[0];
}

function isPerfectDay(record) {
    if (!record) return false;
    return WAJIB_PRAYERS.every(p => record[p] === true);
}

export function getCachedStreak() {
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

export function getStreakData() {
    const cached = getCachedStreak();
    return cached || { current: 0, longest: 0, lastPerfectDate: null };
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

async function getRecordForDate(uid, dateKey) {
    try {
        const docSnap = await getDoc(doc(db, "users", uid, "daily_records", dateKey));
        return docSnap.exists() ? docSnap.data() : null;
    } catch (e) { return null; }
}

export async function calculateStreak(uid) {
    if (!uid) return getStreakData();

    let streakData = { current: 0, longest: 0, lastPerfectDate: null };

    try {
        const statsRef = doc(db, "users", uid, "stats", "streak");
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

    const today = new Date();
    const todayKey = formatDateKey(today);
    let currentStreak = 0;
    let checkDate = new Date(today);

    const todayRecord = await getRecordForDate(uid, todayKey);
    const todayPerfect = isPerfectDay(todayRecord);

    if (todayPerfect) {
        currentStreak = 1;
        checkDate.setDate(checkDate.getDate() - 1);
    } else {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    for (let i = 0; i < 400; i++) {
        const dateKey = formatDateKey(checkDate);
        const record = await getRecordForDate(uid, dateKey);
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

    cacheStreak(streakData);

    try {
        const statsRef = doc(db, "users", uid, "stats", "streak");
        await setDoc(statsRef, {
            current: streakData.current,
            longest: streakData.longest,
            lastPerfectDate: streakData.lastPerfectDate,
            updatedAt: new Date()
        }, { merge: true });
    } catch (e) { console.warn("Streak save error:", e); }

    checkMilestone(oldStreak, currentStreak);

    return streakData;
}

export async function updateStreak(uid, currentRecords) {
    if (!uid) return;

    const todayKey = formatDateKey(new Date());
    const todayPerfect = isPerfectDay(currentRecords || {});

    if (todayPerfect) {
        await calculateStreak(uid);
    } else {
        const cached = getCachedStreak();
        if (cached && cached.lastPerfectDate === todayKey) {
            await calculateStreak(uid);
        }
    }
}

function checkMilestone(oldStreak, newStreak) {
    if (newStreak <= oldStreak) return;
    const newlyEarned = BADGES.find(b => newStreak >= b.threshold && oldStreak < b.threshold);
    if (newlyEarned) {
        setTimeout(() => showCelebration(newlyEarned), 600);
    }
}

export function showCelebration(badge) {
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
    spawnConfetti(overlay.querySelector('.confetti-container'));

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

        particle.textContent = shape;
        particle.style.cssText = `
            position: absolute; left: ${left}%; top: -10%;
            font-size: ${size}px; color: ${color};
            animation: confettiFall ${duration}s ease-in ${delay}s forwards;
            pointer-events: none; z-index: 5;
        `;
        container.appendChild(particle);
    }
}
