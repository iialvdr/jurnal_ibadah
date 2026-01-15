import { state, setPrayerTimes, setLastCity, setTodayRecords } from '../state.js';
import { db } from '../config.js';
import { doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { switchView } from '../router.js';
import { APP_VERSION } from '../version.js';
import { getHijriDate } from '../utils/date-utils.js';

let isDarkMode = false;
let isNotificationActive = true; // Default aktif
let countdownInterval = null;
let unsubscribeRecords = null;
let lastNotifiedPrayer = null;

export function initHome() {
    window.refreshLocation = refreshLocation;
    window.toggleDarkMode = toggleDarkMode;
    window.toggleNotifications = toggleNotifications; 
    window.continueReading = continueReading;
    window.openFasting = () => switchView('fastingView');

    initTheme();
    initNotificationPreference(); 
    loadCachedLocation();
    getLocation();

    window.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'homeView') {
            updateHomeUI();
        }
    });

    window.addEventListener('bookmarkUpdated', () => {
        loadLastReadCard();
    });
}

export function updateHomeUI() {
    const footerVer = document.getElementById('homeFooterVersion');
    if (footerVer) footerVer.innerText = `Jurnal Ibadah App ${APP_VERSION}`;

    updateNextPrayer();
    loadFastingWidget();

    if (state.currentUser) {
        loadHomeRecords();
        loadLastReadCard();
    } else {
        renderTodayPrayers();
        const c = document.getElementById('homeLastReadContainer');
        if (c) c.classList.add('hidden');
    }

    const locText = document.getElementById('homeLocationText');
    if (locText) locText.innerText = state.lastCity || "Mencari...";

    if (state.currentUser) {
        const hName = document.getElementById('homeUserName');
        const hPhoto = document.getElementById('homeUserPhoto');
        if (hName) hName.innerText = state.currentUser.displayName || "Hamba Allah";
        if (hPhoto) {
            const photoUrl = state.currentUser.photoURL ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(state.currentUser.displayName || 'User')}&background=10b981&color=fff`;
            hPhoto.src = photoUrl;
        }
    } else {
        const hName = document.getElementById('homeUserName');
        if (hName) hName.innerText = "Memuat...";
    }
}

function loadCachedLocation() {
    const cachedCity = localStorage.getItem('last_city_name');
    const cachedLat = localStorage.getItem('last_lat');
    const cachedLng = localStorage.getItem('last_lng');
    if (cachedCity) setLastCity(cachedCity);
    if (cachedLat && cachedLng) {
        window.lastLat = parseFloat(cachedLat);
        window.lastLng = parseFloat(cachedLng);
        fetchJadwal(window.lastLat, window.lastLng);
    }
}

export async function syncThemeWithCloud() {
    if (!state.currentUser) return;
    try {
        const docRef = doc(db, "users", state.currentUser.uid, "settings", "preferences");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.theme) {
                isDarkMode = data.theme === 'dark';
                localStorage.setItem('valdi_theme', data.theme);
                applyTheme();
            }
            if (typeof data.notifications === 'boolean') {
                isNotificationActive = data.notifications;
                localStorage.setItem('jurnal_notifications', isNotificationActive);
            }
        }
    } catch (e) { console.error("Gagal sinkronisasi preferensi:", e); }
}

function loadFastingWidget() {
    const container = document.getElementById('homeFastingContainer');
    if (!container) return;

    const now = new Date();
    const currentDay = now.getDay();
    let isPastMaghrib = false;

    if (state.prayerTimes && state.prayerTimes.Maghrib && state.prayerTimes.Maghrib !== '--:--') {
        const [h, m] = state.prayerTimes.Maghrib.split(':').map(Number);
        const maghribDate = new Date();
        maghribDate.setHours(h, m, 0, 0);
        if (now >= maghribDate) isPastMaghrib = true;
    }

    let fastingTitle = "";
    let fastingDesc = "";
    let widgetLabel = ""; 

    const hToday = getHijriDate(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const hTom = getHijriDate(tomorrow);

    if (!isPastMaghrib) {
        const isSenin = currentDay === 1;
        const isKamis = currentDay === 4;
        const isAyyamulBidh = [13, 14, 15].includes(hToday.day);

        if (isSenin || isKamis || isAyyamulBidh) {
            widgetLabel = "HARI INI";
            if (isSenin) fastingTitle = "Puasa Sunnah Senin";
            else if (isKamis) fastingTitle = "Puasa Sunnah Kamis";
            else if (isAyyamulBidh) fastingTitle = "Puasa Ayyamul Bidh";
            fastingDesc = "Selamat menjalankan ibadah puasa!";
        }
    } else {
        const nextDay = tomorrow.getDay();
        const isTomSenin = nextDay === 1;
        const isTomKamis = nextDay === 4;
        const isTomAyyamul = [13, 14, 15].includes(hTom.day);

        if (isTomSenin || isTomKamis || isTomAyyamul) {
            widgetLabel = "BESOK";
            if (isTomSenin) fastingTitle = "Puasa Sunnah Senin";
            else if (isTomKamis) fastingTitle = "Puasa Sunnah Kamis";
            else if (isTomAyyamul) fastingTitle = "Puasa Ayyamul Bidh";
            fastingDesc = "Siapkan niat untuk berpuasa esok hari ya.";
        }
    }

    if (fastingTitle) {
        container.innerHTML = `
            <div onclick="vibrateSoft(); openFasting()" class="bento-card bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] flex items-center gap-4 border border-amber-100 dark:border-amber-900/40 shadow-sm relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all">
                <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100/50 dark:border-amber-800/30">
                    <i data-lucide="utensils-crossed" class="w-6 h-6"></i>
                </div>
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-0.5">
                        <span class="text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest">${widgetLabel}</span>
                        <span class="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800"></span>
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sunnah</span>
                    </div>
                    <h4 class="font-bold text-slate-800 dark:text-white text-base leading-tight">${fastingTitle}</h4>
                    <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">${fastingDesc}</p>
                </div>
                <div class="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 group-hover:text-amber-500 transition-colors">
                    <i data-lucide="chevron-right" class="w-4 h-4"></i>
                </div>
            </div>
        `;
        container.classList.remove('hidden');
        if (window.lucide) lucide.createIcons({ root: container });
    } else {
        container.classList.add('hidden');
    }
}

async function loadLastReadCard() {
    if (!state.currentUser) return;
    const container = document.getElementById('homeLastReadContainer');
    if (!container) return;
    try {
        const docRef = doc(db, "users", state.currentUser.uid, "quran", "last_read");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            window.lastReadData = data;
            container.innerHTML = `
                <div onclick="continueReading()" class="bento-card relative w-full bg-white dark:bg-slate-900 rounded-[2rem] p-5 cursor-pointer group hover:border-emerald-300 dark:hover:border-emerald-700 transition-all border border-white dark:border-slate-800 shadow-sm">
                    <div class="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl -mr-5 -mt-5"></div>
                    <div class="flex items-center justify-between relative z-10">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-sm border border-emerald-100 dark:border-emerald-800">
                                <i data-lucide="bookmark" class="w-6 h-6 fill-current"></i>
                            </div>
                            <div>
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Lanjutkan</p>
                                <h3 class="text-lg font-black text-slate-800 dark:text-white leading-tight">QS. ${data.name}</h3>
                                <p class="text-xs font-bold text-emerald-600 dark:text-emerald-400">Ayat ${data.ayat}</p>
                            </div>
                        </div>
                        <div class="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:bg-white dark:group-hover:bg-slate-700 transition">
                            <i data-lucide="arrow-right" class="w-5 h-5"></i>
                        </div>
                    </div>
                </div>`;
            container.classList.remove('hidden');
            if (window.lucide) lucide.createIcons({ root: container });
        } else {
            container.classList.add('hidden');
        }
    } catch (e) { console.error("Gagal load last read:", e); }
}

function continueReading() {
    if (window.lastReadData) {
        const { surah, ayat } = window.lastReadData;
        if (typeof openQuran === 'function') openQuran();
        setTimeout(() => { if (typeof openSurah === 'function') openSurah(surah, ayat); }, 500);
    }
}

function loadHomeRecords() {
    if (!state.currentUser) return;
    const dateKey = new Date(state.currentDate.getTime() - (state.currentDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    if (unsubscribeRecords) unsubscribeRecords();
    unsubscribeRecords = onSnapshot(doc(db, "users", state.currentUser.uid, "daily_records", dateKey), (docSnap) => {
        setTodayRecords(docSnap.exists() ? docSnap.data() : {});
        renderTodayPrayers();
    });
}

function renderTodayPrayers() {
    const container = document.getElementById('todayPrayerGrid');
    if (!container) return;
    const wajibPrayers = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];
    let html = '';
    wajibPrayers.forEach((name) => {
        const time = state.prayerTimes[name] || '--:--';
        const isDone = state.todayRecords && state.todayRecords[name] === true;
        let cardStyle = isDone ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" : "bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-700 shadow-sm";
        let textNameStyle = isDone ? "text-emerald-50 font-bold" : "text-slate-400 dark:text-slate-500 font-bold";
        let textTimeStyle = isDone ? "text-white" : "text-slate-800 dark:text-white";
        html += `
            <div class="flex flex-col items-center justify-center py-2 px-0.5 rounded-2xl border ${cardStyle} transition-all duration-300">
                <span class="text-[8.5px] md:text-[11px] leading-none tracking-tighter ${textNameStyle}">${name}</span>
                <span class="text-[11px] md:text-sm font-black font-mono ${textTimeStyle} mt-1">${time}</span>
            </div>`;
    });
    container.innerHTML = html;
}

function refreshLocation() {
    const icon = document.getElementById('locIcon');
    if (icon) icon.classList.add('animate-spin');
    setTimeout(() => { getLocation(true); }, 500);
}

function getLocation(isManualRefresh = false) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            window.lastLat = pos.coords.latitude;
            window.lastLng = pos.coords.longitude;
            localStorage.setItem('last_lat', window.lastLat);
            localStorage.setItem('last_lng', window.lastLng);
            fetchJadwal(window.lastLat, window.lastLng);
            fetchCityName(window.lastLat, window.lastLng);
            if (isManualRefresh) resetLocationButton();
        }, () => {
            useDefaultLocation();
            if (isManualRefresh) resetLocationButton();
        });
    }
}

function resetLocationButton() {
    const icon = document.getElementById('locIcon');
    if (icon) icon.classList.remove('animate-spin');
}

function useDefaultLocation() {
    if (!state.lastCity) setLastCity("Lokasi Belum Diatur");
    updateHomeUI();
}

async function fetchCityName(lat, lng) {
    try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=id`);
        const data = await res.json();
        const cityName = data.locality || data.city || "Lokasi Anda";
        setLastCity(cityName);
        localStorage.setItem('last_city_name', cityName);
        updateHomeUI();
    } catch (e) { console.error(e); }
}

async function fetchJadwal(lat, lng) {
    if (typeof adhan === 'undefined') return;
    const coordinates = new adhan.Coordinates(lat, lng);
    const date = state.currentDate;
    const params = adhan.CalculationMethod.Singapore();
    const prayerTimes = new adhan.PrayerTimes(coordinates, date, params);
    const timeFormat = (t) => t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
    
    const times = {
        Subuh: timeFormat(prayerTimes.fajr),
        Dzuhur: timeFormat(prayerTimes.dhuhr),
        Ashar: timeFormat(prayerTimes.asr),
        Maghrib: timeFormat(prayerTimes.maghrib),
        Isya: timeFormat(prayerTimes.isha)
    };
    
    setPrayerTimes(times);

    const hEl = document.getElementById('hijriDisplay');
    if (hEl) hEl.innerText = getHijriDate(date).full;
    updateNextPrayer();
    renderTodayPrayers();
    loadFastingWidget();
}

function updateNextPrayer() {
    const nameEl = document.getElementById('nextPrayerName');
    const timeEl = document.getElementById('nextPrayerTime');
    if (!nameEl || !timeEl) return;
    const now = new Date();
    const curTime = now.getHours() * 60 + now.getMinutes();
    let nextP = null;
    const timesToCheck = [
        { name: 'Subuh', time: state.prayerTimes.Subuh },
        { name: 'Dzuhur', time: state.prayerTimes.Dzuhur },
        { name: 'Ashar', time: state.prayerTimes.Ashar },
        { name: 'Maghrib', time: state.prayerTimes.Maghrib },
        { name: 'Isya', time: state.prayerTimes.Isya }
    ];
    for (let p of timesToCheck) {
        if (!p.time) continue;
        const [h, m] = p.time.split(':').map(Number);
        if (h * 60 + m > curTime) { nextP = p; break; }
    }
    if (!nextP) nextP = { name: 'Subuh', time: state.prayerTimes.Subuh };
    nameEl.innerText = nextP.name;
    timeEl.innerText = nextP.time;
    startCountdown(nextP.time);
}

function checkPrayerNotification() {
    if (Notification.permission !== 'granted' || !isNotificationActive) return;

    const now = new Date();
    const currentTimeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
    
    const prayers = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];
    
    prayers.forEach(name => {
        const prayerTime = state.prayerTimes[name];
        if (prayerTime === currentTimeStr && lastNotifiedPrayer !== name) {
            sendLocalNotification(`Waktu Sholat ${name}`, `Panggilan sholat ${name} telah tiba untuk wilayah ${state.lastCity}.`);
            lastNotifiedPrayer = name;
        }
    });

    if (currentTimeStr === "00:00") lastNotifiedPrayer = null;
}

function sendLocalNotification(title, body) {
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, {
                body: body,
                icon: './assets/favicon/android-chrome-192x192.png',
                badge: './assets/favicon/favicon-32x32.png',
                vibrate: [200, 100, 200],
                tag: 'prayer-reminder',
                renotify: true
            });
        });
    }
}

function startCountdown(targetTimeStr) {
    if (countdownInterval) clearInterval(countdownInterval);
    const countEl = document.getElementById('countdownTimer');
    const [h, m] = targetTimeStr.split(':').map(Number);
    countdownInterval = setInterval(() => {
        const now = new Date();
        let target = new Date();
        target.setHours(h, m, 0, 0);
        if (target < now) target.setDate(target.getDate() + 1);
        const diff = target - now;
        const hh = Math.floor(diff / 3600000);
        const mm = Math.floor((diff % 3600000) / 60000);
        const ss = Math.floor((diff % 60000) / 1000);
        if (countEl) countEl.innerText = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
        
        checkPrayerNotification();
    }, 1000);
}

function initTheme() {
    isDarkMode = localStorage.getItem('valdi_theme') === 'dark';
    applyTheme();
}

function initNotificationPreference() {
    const saved = localStorage.getItem('jurnal_notifications');
    if (saved !== null) {
        isNotificationActive = saved === 'true';
    }
}

function applyTheme() {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    if (window.lucide) lucide.createIcons();
}

export async function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('valdi_theme', isDarkMode ? 'dark' : 'light');
    applyTheme();
    if (state.currentUser) {
        try {
            const docRef = doc(db, "users", state.currentUser.uid, "settings", "preferences");
            await setDoc(docRef, { theme: isDarkMode ? 'dark' : 'light' }, { merge: true });
        } catch (e) { console.error("Gagal menyimpan tema:", e); }
    }
}

export async function toggleNotifications() {
    isNotificationActive = !isNotificationActive;
    localStorage.setItem('jurnal_notifications', isNotificationActive);
    
    if (isNotificationActive && Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            isNotificationActive = false;
            localStorage.setItem('jurnal_notifications', false);
            alert("Izin notifikasi diblokir oleh browser.");
        }
    }

    if (state.currentUser) {
        try {
            const docRef = doc(db, "users", state.currentUser.uid, "settings", "preferences");
            await setDoc(docRef, { notifications: isNotificationActive }, { merge: true });
        } catch (error) { console.error("Gagal simpan preferensi:", error); }
    }

    return isNotificationActive;
}