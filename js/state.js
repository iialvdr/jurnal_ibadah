// js/state.js
export const state = {
    currentUser: null,
    currentDate: new Date(), // Khusus Home (Selalu Hari Ini)
    trackerDate: new Date(), // [BARU] Khusus Tracker (Bisa ganti-ganti)
    prayerTimes: { Subuh: '--:--', Dhuha: '--:--', Dzuhur: '--:--', Ashar: '--:--', Maghrib: '--:--', Isya: '--:--', Tahajud: '03:00' },
    lastCity: "Menunggu GPS...",
    scheduleCache: {},
    currentRecords: {},
    isNotifEnabled: localStorage.getItem('valdi_notif_enabled') === 'true'
};

export function setCurrentUser(user) { state.currentUser = user; }
export function setPrayerTimes(times) { state.prayerTimes = times; }
export function setCurrentRecords(records) { state.currentRecords = records; }
export function setLastCity(city) { state.lastCity = city; }