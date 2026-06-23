// src/modules/reminder.js
const REMINDER_SETTINGS_KEY = 'jurnal_reminder_settings_v1';
const NOTIFIED_PRE_KEY = 'jurnal_reminded_pre';
const NOTIFIED_MISSED_KEY = 'jurnal_reminded_missed';

const DEFAULT_SETTINGS = {
    enabled: true,
    preReminder: 10,
    missedReminder: true,
    perPrayer: { Subuh: true, Dzuhur: true, Ashar: true, Maghrib: true, Isya: true }
};

let notifiedPreToday = new Set();
let notifiedMissedToday = new Set();
let lastResetDate = null;
let reminderInterval = null;

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
    } catch {
        return { ...DEFAULT_SETTINGS, perPrayer: { ...DEFAULT_SETTINGS.perPrayer } };
    }
}

export function saveReminderSettings(settings) {
    try { localStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings)); } catch { }
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

function resetIfNewDay() {
    const today = new Date().toISOString().split('T')[0];
    if (lastResetDate !== today) {
        notifiedPreToday.clear();
        notifiedMissedToday.clear();
        lastResetDate = today;
    }
}

function sendNotification(title, body, tag) {
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, {
                body, icon: '/img/favicon/android-chrome-192x192.png',
                badge: '/img/favicon/favicon-32x32.png',
                vibrate: [200, 100, 200], tag, renotify: true
            });
        });
    }
}

export function startReminderLoop(getPrayerTimes, getTodayRecords, getLastCity) {
    if (reminderInterval) clearInterval(reminderInterval);
    loadNotifiedSets();

    reminderInterval = setInterval(() => {
        resetIfNewDay();
        checkPrePrayerReminder(getPrayerTimes, getLastCity);
        checkMissedPrayerReminder(getPrayerTimes, getTodayRecords);
    }, 30000);
}

export function stopReminderLoop() {
    if (reminderInterval) { clearInterval(reminderInterval); reminderInterval = null; }
}

function loadNotifiedSets() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const dateRaw = localStorage.getItem('jurnal_reminded_date');
        if (dateRaw === today) {
            const pre = localStorage.getItem(NOTIFIED_PRE_KEY);
            const missed = localStorage.getItem(NOTIFIED_MISSED_KEY);
            if (pre) notifiedPreToday = new Set(JSON.parse(pre));
            if (missed) notifiedMissedToday = new Set(JSON.parse(missed));
        }
        lastResetDate = today;
    } catch { }
}

function saveNotifiedSets() {
    try {
        localStorage.setItem(NOTIFIED_PRE_KEY, JSON.stringify([...notifiedPreToday]));
        localStorage.setItem(NOTIFIED_MISSED_KEY, JSON.stringify([...notifiedMissedToday]));
        localStorage.setItem('jurnal_reminded_date', lastResetDate);
    } catch { }
}

function checkPrePrayerReminder(getPrayerTimes, getLastCity) {
    const settings = getReminderSettings();
    if (!settings.enabled || settings.preReminder === 0) return;
    if (Notification.permission !== 'granted') return;
    if (localStorage.getItem('jurnal_notifications') === 'false') return;

    const prayerTimes = getPrayerTimes?.() || {};
    const currentMin = getCurrentMinutes();
    const city = getLastCity?.() || '';

    ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'].forEach(name => {
        if (!settings.perPrayer[name] || notifiedPreToday.has(name)) return;
        const prayerMin = parseTimeToMinutes(prayerTimes[name]);
        if (prayerMin === null) return;
        const diff = prayerMin - currentMin;
        if (diff > 0 && diff <= settings.preReminder && diff >= (settings.preReminder - 1)) {
            sendNotification(
                `⏰ ${settings.preReminder} menit menuju ${name}`,
                `Persiapkan diri untuk sholat ${name} pukul ${prayerTimes[name]}. ${city ? `Wilayah ${city}.` : ''}`,
                `pre-${name}`
            );
            notifiedPreToday.add(name);
            saveNotifiedSets();
        }
    });
}

function checkMissedPrayerReminder(getPrayerTimes, getTodayRecords) {
    const settings = getReminderSettings();
    if (!settings.enabled || !settings.missedReminder) return;
    if (Notification.permission !== 'granted') return;
    if (localStorage.getItem('jurnal_notifications') === 'false') return;

    const prayerTimes = getPrayerTimes?.() || {};
    const records = getTodayRecords?.() || {};
    const currentMin = getCurrentMinutes();

    ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'].forEach(name => {
        if (!settings.perPrayer[name] || notifiedMissedToday.has(name) || records[name] === true) return;
        const prayerMin = parseTimeToMinutes(prayerTimes[name]);
        if (prayerMin === null) return;
        const elapsed = currentMin - prayerMin;
        if (elapsed >= 30 && elapsed <= 32) {
            sendNotification(
                `📋 ${name} belum tercatat`,
                `Waktu sholat ${name} sudah lewat. Apakah sudah dikerjakan? Buka Jurnal Ibadah untuk mencatat.`,
                `missed-${name}`
            );
            notifiedMissedToday.add(name);
            saveNotifiedSets();
        }
    });
}
