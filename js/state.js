export const state = {
    currentUser: null,
    currentDate: new Date(), 
    trackerDate: new Date(), 
    prayerTimes: { Subuh: '--:--', Dhuha: '--:--', Dzuhur: '--:--', Ashar: '--:--', Maghrib: '--:--', Isya: '--:--', Tahajud: '03:00' },
    lastCity: "Menunggu GPS...",
    
    currentRecords: {}, 
    todayRecords: {},   
    
    isNotifEnabled: false
};

export function setCurrentUser(user) { state.currentUser = user; }
export function setPrayerTimes(times) { state.prayerTimes = times; }
export function setCurrentRecords(records) { state.currentRecords = records; }
export function setTodayRecords(records) { state.todayRecords = records; } 
export function setLastCity(city) { state.lastCity = city; }