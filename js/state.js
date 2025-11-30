// js/state.js
export const state = {
    currentUser: null,
    currentDate: new Date(),
    prayerTimes: { Subuh: '--:--', Dhuha: '--:--', Dzuhur: '--:--', Ashar: '--:--', Maghrib: '--:--', Isya: '--:--', Tahajud: '03:00' },
    lastCity: "Menunggu GPS...",
    scheduleCache: {},
    currentRecords: {}, // Tambahan: Untuk menyimpan data checklist sholat
    isNotifEnabled: localStorage.getItem('valdi_notif_enabled') === 'true' // Tambahan: Status notifikasi
};

// Helper untuk update state agar reaktif
export function setCurrentUser(user) { state.currentUser = user; }
export function setPrayerTimes(times) { state.prayerTimes = times; }

// === FUNGSI YANG SEBELUMNYA HILANG (WAJIB ADA) ===
export function setCurrentRecords(records) { state.currentRecords = records; }
export function setLastCity(city) { state.lastCity = city; }