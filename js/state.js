// js/state.js
export const state = {
    currentUser: null,
    currentDate: new Date(), // KHUSUS HOME (Selalu Hari Ini)
    trackerDate: new Date(), // KHUSUS TRACKER (Bisa berubah-ubah)
    prayerTimes: { Subuh: '--:--', Dhuha: '--:--', Dzuhur: '--:--', Ashar: '--:--', Maghrib: '--:--', Isya: '--:--', Tahajud: '03:00' },
    lastCity: "Menunggu GPS...",
    scheduleCache: {},
    
    currentRecords: {}, // Data untuk Tracker
    todayRecords: {},   // [BARU] Data khusus untuk Home (agar tidak tertukar)
    
    isNotifEnabled: false
};

export function setCurrentUser(user) { state.currentUser = user; }
export function setPrayerTimes(times) { state.prayerTimes = times; }
export function setCurrentRecords(records) { state.currentRecords = records; }
export function setTodayRecords(records) { state.todayRecords = records; } // [BARU] Setter khusus Home
export function setLastCity(city) { state.lastCity = city; }