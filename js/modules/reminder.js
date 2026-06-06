import { state } from '../state.js';

const REMINDER_SETTINGS_KEY = 'jurnal_reminder_settings_v1';
const NOTIFIED_PRE_KEY = 'jurnal_reminded_pre';
const NOTIFIED_MISSED_KEY = 'jurnal_reminded_missed';

const WAJIB_PRAYERS = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];

const DEFAULT_SETTINGS = {
    enabled: true,
    preReminder: 10,       // minutes before prayer time (0 = off, 5, 10, 15)
    missedReminder: true,  // remind if not checked after time passed
    perPrayer: {
        Subuh: true,
        Dzuhur: true,
        Ashar: true,
        Maghrib: true,
        Isya: true
    }
};

let reminderInterval = null;
let notifiedPreToday = new Set();
let notifiedMissedToday = new Set();
let lastResetDate = null;

export function initReminder() {
    loadNotifiedSets();
    startReminderLoop();

    // Re-start loop when returning to home
    window.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'homeView') {
            startReminderLoop();
        }
    });
}

function startReminderLoop() {
    if (reminderInterval) clearInterval(reminderInterval);
    reminderInterval = setInterval(() => {
        resetIfNewDay();
        checkPrePrayerReminder();
        checkMissedPrayerReminder();
    }, 30000); // Check every 30 seconds
}

function resetIfNewDay() {
    const today = new Date().toISOString().split('T')[0];
    if (lastResetDate !== today) {
        notifiedPreToday.clear();
        notifiedMissedToday.clear();
        lastResetDate = today;
        saveNotifiedSets();
    }
}

export function getReminderSettings() {
    try {
        const raw = localStorage.getItem(REMINDER_SETTINGS_KEY);
        if (!raw) return { ...DEFAULT_SETTINGS, perPrayer: { ...DEFAULT_SETTINGS.perPrayer } };
        const parsed = JSON.parse(raw);
        return {
            enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
            preReminder: [0, 5, 10, 15].includes(parsed.preReminder) ? parsed.preReminder : 10,
            missedReminder: typeof parsed.missedReminder === 'boolean' ? parsed.missedReminder : true,
            perPrayer: {
                Subuh: parsed.perPrayer?.Subuh !== false,
                Dzuhur: parsed.perPrayer?.Dzuhur !== false,
                Ashar: parsed.perPrayer?.Ashar !== false,
                Maghrib: parsed.perPrayer?.Maghrib !== false,
                Isya: parsed.perPrayer?.Isya !== false
            }
        };
    } catch (e) {
        return { ...DEFAULT_SETTINGS, perPrayer: { ...DEFAULT_SETTINGS.perPrayer } };
    }
}

export function saveReminderSettings(settings) {
    try {
        localStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) { }
}

function loadNotifiedSets() {
    try {
        const preRaw = localStorage.getItem(NOTIFIED_PRE_KEY);
        const missedRaw = localStorage.getItem(NOTIFIED_MISSED_KEY);
        const dateRaw = localStorage.getItem('jurnal_reminded_date');

        const today = new Date().toISOString().split('T')[0];
        if (dateRaw === today) {
            if (preRaw) notifiedPreToday = new Set(JSON.parse(preRaw));
            if (missedRaw) notifiedMissedToday = new Set(JSON.parse(missedRaw));
        }
        lastResetDate = today;
    } catch (e) { }
}

function saveNotifiedSets() {
    try {
        localStorage.setItem(NOTIFIED_PRE_KEY, JSON.stringify([...notifiedPreToday]));
        localStorage.setItem(NOTIFIED_MISSED_KEY, JSON.stringify([...notifiedMissedToday]));
        localStorage.setItem('jurnal_reminded_date', lastResetDate);
    } catch (e) { }
}

function parseTimeToMinutes(timeStr) {
    if (!timeStr || timeStr === '--:--') return null;
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
}

function getCurrentMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
}

/**
 * Check if any prayer is coming up within preReminder minutes.
 */
function checkPrePrayerReminder() {
    const settings = getReminderSettings();
    if (!settings.enabled || settings.preReminder === 0) return;
    if (Notification.permission !== 'granted') return;
    // Only check if main notification toggle is on
    const notifEnabled = localStorage.getItem('jurnal_notifications');
    if (notifEnabled === 'false') return;

    const currentMin = getCurrentMinutes();

    WAJIB_PRAYERS.forEach(name => {
        if (!settings.perPrayer[name]) return;
        if (notifiedPreToday.has(name)) return;

        const prayerTime = state.prayerTimes[name];
        const prayerMin = parseTimeToMinutes(prayerTime);
        if (prayerMin === null) return;

        const diff = prayerMin - currentMin;
        // Check if within the pre-reminder window (±1 minute tolerance for the 30s interval)
        if (diff > 0 && diff <= settings.preReminder && diff >= (settings.preReminder - 1)) {
            sendSmartNotification(
                `⏰ ${settings.preReminder} menit menuju ${name}`,
                `Persiapkan diri untuk sholat ${name} pukul ${prayerTime}. ${getLocationSuffix()}`,
                `pre-${name}`
            );
            notifiedPreToday.add(name);
            saveNotifiedSets();
        }
    });
}

/**
 * Check if any prayer time has passed but not checked in tracker.
 */
function checkMissedPrayerReminder() {
    const settings = getReminderSettings();
    if (!settings.enabled || !settings.missedReminder) return;
    if (Notification.permission !== 'granted') return;
    if (!state.currentUser) return;
    const notifEnabled = localStorage.getItem('jurnal_notifications');
    if (notifEnabled === 'false') return;

    const currentMin = getCurrentMinutes();
    const records = state.todayRecords || {};

    WAJIB_PRAYERS.forEach(name => {
        if (!settings.perPrayer[name]) return;
        if (notifiedMissedToday.has(name)) return;
        if (records[name] === true) return; // Already checked

        const prayerTime = state.prayerTimes[name];
        const prayerMin = parseTimeToMinutes(prayerTime);
        if (prayerMin === null) return;

        const elapsed = currentMin - prayerMin;
        // Remind 30 minutes after prayer time if not checked
        if (elapsed >= 30 && elapsed <= 32) {
            sendSmartNotification(
                `📋 ${name} belum tercatat`,
                `Waktu sholat ${name} sudah lewat. Apakah sudah dikerjakan? Buka Jurnal Ibadah untuk mencatat.`,
                `missed-${name}`
            );
            notifiedMissedToday.add(name);
            saveNotifiedSets();
        }
    });
}

function getLocationSuffix() {
    return state.lastCity && state.lastCity !== "Menunggu GPS..." ? `Wilayah ${state.lastCity}.` : '';
}

function sendSmartNotification(title, body, tag) {
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, {
                body: body,
                icon: './img/favicon/android-chrome-192x192.png',
                badge: './img/favicon/favicon-32x32.png',
                vibrate: [200, 100, 200],
                tag: tag,
                renotify: true
            });
        });
    }
}
