import { state, setPrayerTimes, setLastCity, setTodayRecords } from '../state.js';
import { db } from '../config.js';
import { doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { switchView } from '../router.js';
import { APP_VERSION } from '../version.js';
import { getHijriDate } from '../utils/date-utils.js';
import { getFastingInfo } from './fasting.js';
import { syncPushSubscription } from './push.js';
import { initStreak, calculateStreak, renderStreakWidget } from './streak.js';
import { initReminder } from './reminder.js';

const THEME_KEY = 'valdi_theme';
const THEME_MODE_DARK = 'dark';
const THEME_MODE_LIGHT = 'light';
const THEME_MODE_SYSTEM = 'system';
let themeMode = THEME_MODE_SYSTEM;
let isDarkMode = false;
let isNotificationActive = true; 
let countdownInterval = null;
let unsubscribeRecords = null;
let lastNotifiedPrayer = null;
let systemThemeQuery = null;
let hasSystemThemeListener = false;

export function initHome() {
    window.refreshLocation = refreshLocation;
    window.toggleDarkMode = toggleDarkMode;
    window.setThemeMode = setThemeMode;
    window.getThemeMode = getThemeMode;
    window.toggleNotifications = toggleNotifications; 
    window.continueReading = continueReading;
    window.openFasting = () => switchView('fastingView');
    window.openHadith = () => switchView('hadithView');
    window.openFaq = () => switchView('faqView');

    window.toggleHadith = () => {
        const content = document.getElementById('hadithContent');
        const btn = document.getElementById('hadithToggleBtn');
        const fade = document.getElementById('hadithFade');
        const arab = document.getElementById('hadithArabContent');
        
        if (content.classList.contains('line-clamp-3')) {
            content.classList.remove('line-clamp-3');
            if (arab) arab.classList.remove('hidden');
            btn.innerHTML = `Sembunyikan <i data-lucide="chevron-up" class="w-3 h-3"></i>`;
            if (fade) fade.classList.add('hidden');
        } else {
            content.classList.add('line-clamp-3');
            if (arab) arab.classList.add('hidden');
            btn.innerHTML = `Selengkapnya <i data-lucide="chevron-down" class="w-3 h-3"></i>`;
            if (fade) fade.classList.remove('hidden');
        }
        if (window.lucide) lucide.createIcons({ root: btn });
    };

    initTheme();
    initNotificationPreference(); 
    initStreak();
    initReminder();
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

function formatHadithText(text) {
    if (!text) return "";
    return text.replace(/\[([^\]]+)\]/g, '<b class="text-emerald-700 dark:text-emerald-400 font-bold">$1</b>');
}

export function updateHomeUI() {
    const footerVer = document.getElementById('homeFooterVersion');
    if (footerVer) footerVer.innerText = `Jurnal Ibadah App ${APP_VERSION}`;

    updateNextPrayer();
    loadFastingWidget();
    loadDailyHadith(); 

    if (state.currentUser) {
        loadHomeRecords();
        loadLastReadCard();
        renderStreakWidget('homeStreakContainer');
        // Calculate streak in background (non-blocking)
        calculateStreak().then(() => {
            renderStreakWidget('homeStreakContainer');
        }).catch(e => console.warn('Streak calc error:', e));
    } else {
        renderTodayPrayers();
        const c = document.getElementById('homeLastReadContainer');
        if (c) c.classList.add('hidden');
        const s = document.getElementById('homeStreakContainer');
        if (s) s.classList.add('hidden');
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

async function loadDailyHadith() {
    const container = document.getElementById('homeHadithContainer');
    if (!container) return;

    const today = new Date().toISOString().split('T')[0];
    const cached = localStorage.getItem('daily_hadith_v3');
    const cachedDate = localStorage.getItem('daily_had_date');

    if (cached && cachedDate === today) {
        renderHadithCard(JSON.parse(cached));
        return;
    }

    container.innerHTML = `
        <div class="bento-card bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-white dark:border-slate-800 animate-pulse">
            <div class="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded-full mb-3"></div>
            <div class="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full mb-2"></div>
        </div>
    `;

    try {
        const narrators = ['bukhari', 'muslim', 'abu-daud', 'tirmidzi', 'nasai', 'ibnu-majah', 'ahmad', 'darimi', 'malik'];
        const randomNarrator = narrators[Math.floor(Math.random() * narrators.length)];
        const randomNum = Math.floor(Math.random() * 20) + 1;
        const response = await fetch(`https://api.hadith.gading.dev/books/${randomNarrator}/${randomNum}`);
        const result = await response.json();

        if (result.code === 200 && result.data && result.data.contents) {
            const hadithData = {
                name: result.data.name,
                number: result.data.contents.number,
                arab: result.data.contents.arab,
                text: result.data.contents.id 
            };
            
            localStorage.setItem('daily_hadith_v3', JSON.stringify(hadithData));
            localStorage.setItem('daily_had_date', today);
            renderHadithCard(hadithData);
        }
    } catch (error) {
        console.error("Gagal memuat hadits:", error);
        container.innerHTML = `
            <div class="bento-card bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-white dark:border-slate-800 text-center">
                <p class="text-[11px] font-bold text-slate-500 mb-3">Hadits hari ini gagal dimuat.</p>
                <button onclick="vibrateSoft(); loadDailyHadith()" class="px-3 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition">Coba Lagi</button>
            </div>`;
        container.classList.remove('hidden');
    }
}

function renderHadithCard(data) {
    const container = document.getElementById('homeHadithContainer');
    if (!container) return;

    const isLong = data.text.length > 150;
    const formattedText = formatHadithText(data.text);

    container.innerHTML = `
        <div class="bento-card bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2rem] relative overflow-hidden shadow-sm transition-all duration-500">
            <div class="absolute -right-6 -top-6 opacity-[0.05] pointer-events-none">
                <i data-lucide="quote" class="w-32 h-32 text-emerald-600"></i>
            </div>
            
            <div class="relative z-10">
                <div class="flex items-center gap-2.5 mb-4">
                    <div class="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <i data-lucide="book-open-check" class="w-4 h-4"></i>
                    </div>
                    <div>
                        <span class="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Hadits Hari Ini</span>
                        <p class="text-[9px] font-bold text-slate-400 leading-none mt-0.5">${data.name} • No. ${data.number}</p>
                    </div>
                </div>

                <div id="hadithArabContent" class="hidden mb-4 text-right" dir="rtl">
                    <p class="font-quran text-xl text-slate-800 dark:text-white leading-[2.5]">${data.arab}</p>
                </div>

                <div class="relative">
                    <p id="hadithContent" class="text-[13px] md:text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed transition-all duration-500 ${isLong ? 'line-clamp-3' : ''}">
                        "${formattedText}"
                    </p>
                    
                </div>

                ${isLong ? `
                <button id="hadithToggleBtn" onclick="vibrateSoft(); toggleHadith()" class="mt-4 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 hover:opacity-70 transition-all">
                    Selengkapnya
                    <i data-lucide="chevron-down" class="w-3 h-3"></i>
                </button>
                ` : ''}
            </div>
        </div>
    `;
    
    container.classList.remove('hidden');
    if (window.lucide) lucide.createIcons({ root: container });
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
                themeMode = normalizeThemeMode(data.theme);
                localStorage.setItem(THEME_KEY, themeMode);
                applyTheme();
            }
            if (typeof data.notifications === 'boolean') {
                isNotificationActive = data.notifications;
                localStorage.setItem('jurnal_notifications', isNotificationActive);
            }
        }
        await syncPushSubscription(state.currentUser, isNotificationActive);
    } catch (e) { console.error("Gagal sinkronisasi preferensi:", e); }
}

function loadFastingWidget() {
    const container = document.getElementById('homeFastingContainer');
    if (!container) return;

    const now = new Date();
    let displayDate = new Date(now);
    let isBesok = false;

    if (state.prayerTimes && state.prayerTimes.Maghrib && state.prayerTimes.Maghrib !== '--:--') {
        const [h, m] = state.prayerTimes.Maghrib.split(':').map(Number);
        const maghribDate = new Date(now);
        maghribDate.setHours(h, m, 0, 0);
        if (now >= maghribDate) {
            isBesok = true;
            displayDate.setDate(displayDate.getDate() + 1);
        }
    }

    const hijri = getHijriDate(displayDate);
    const info = getFastingInfo(displayDate, hijri);
    if (!info) {
        container.classList.add('hidden');
        return;
    }

    const labelDate = isBesok ? "BESOK" : "HARI INI";
    const isWajib = info.category === "wajib";
    const isHaram = info.category === "haram";
    const fastingDesc = isBesok
        ? (isHaram ? "Hindari puasa pada hari ini." : "Siapkan niat untuk berpuasa esok hari ya.")
        : (isHaram ? "Puasa tidak diperbolehkan pada hari ini." : "Semangat menjalankan ibadah puasa!");
    const cardTone = isHaram ? 'border-rose-200 dark:border-rose-900/40' : 'border-amber-100 dark:border-amber-900/40';
    const badgeTone = isHaram ? 'text-rose-600 dark:text-rose-500 bg-rose-500/10' : 'text-amber-600 dark:text-amber-500 bg-amber-500/10';
    const iconTone = isHaram ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/30' : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30';
    const labelType = isHaram ? 'Haram' : (isWajib ? 'Wajib' : 'Sunnah');
    const iconName = isHaram ? 'ban' : (isWajib ? 'sun' : 'utensils-crossed');

    container.innerHTML = `
        <div onclick="vibrateSoft(); openFasting()" class="bento-card bg-white dark:bg-slate-900 p-5 rounded-[2rem] flex items-center gap-4 border ${cardTone} shadow-sm relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all w-full">
            <div class="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/5 rounded-full blur-3xl"></div>
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${iconTone}">
                <i data-lucide="${iconName}" class="w-6 h-6"></i>
            </div>
            <div class="flex-1 relative z-10">
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${badgeTone}">${labelDate}</span>
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${labelType}</span>
                </div>
                <h4 class="text-base font-black text-slate-800 dark:text-white leading-tight">${info.type}</h4>
                <p class="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1">${hijri.full} - ${fastingDesc}</p>
            </div>
            ${isHaram ? '' : '<i data-lucide="chevron-right" class="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors"></i>'}
        </div>
    `;
    container.classList.remove('hidden');
    if (window.lucide) lucide.createIcons({ root: container });
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
    const prayers = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];
    const timesToCheck = prayers.map(p => ({ name: p, time: state.prayerTimes[p] }));

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
                icon: './img/favicon/android-chrome-192x192.png',
                badge: './img/favicon/favicon-32x32.png',
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
    themeMode = normalizeThemeMode(localStorage.getItem(THEME_KEY));
    localStorage.setItem(THEME_KEY, themeMode);
    attachSystemThemeListener();
    applyTheme();
}

function initNotificationPreference() {
    const saved = localStorage.getItem('jurnal_notifications');
    if (saved !== null) {
        isNotificationActive = saved === 'true';
    }
}

function applyTheme() {
    isDarkMode = getResolvedDarkMode();
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    if (window.lucide) lucide.createIcons();
}

function normalizeThemeMode(rawMode) {
    if (rawMode === THEME_MODE_DARK || rawMode === THEME_MODE_LIGHT || rawMode === THEME_MODE_SYSTEM) {
        return rawMode;
    }
    return THEME_MODE_SYSTEM;
}

function getResolvedDarkMode() {
    if (themeMode === THEME_MODE_DARK) return true;
    if (themeMode === THEME_MODE_LIGHT) return false;
    if (window.matchMedia) return window.matchMedia('(prefers-color-scheme: dark)').matches;
    return false;
}

function attachSystemThemeListener() {
    if (hasSystemThemeListener || !window.matchMedia) return;
    systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemThemeChange = () => {
        if (themeMode === THEME_MODE_SYSTEM) applyTheme();
    };
    if (typeof systemThemeQuery.addEventListener === 'function') {
        systemThemeQuery.addEventListener('change', onSystemThemeChange);
    } else if (typeof systemThemeQuery.addListener === 'function') {
        systemThemeQuery.addListener(onSystemThemeChange);
    }
    hasSystemThemeListener = true;
}

export function getThemeMode() {
    return themeMode;
}

export async function setThemeMode(mode, options = {}) {
    const normalizedMode = normalizeThemeMode(mode);
    const withAnimation = options.withAnimation !== false;
    const persistCloud = options.persistCloud !== false;

    const root = document.documentElement;
    const body = document.body;

    if (withAnimation) {
        root.classList.add('theme-transition');
        if (body) body.classList.add('theme-flash');
    }

    themeMode = normalizedMode;
    localStorage.setItem(THEME_KEY, themeMode);
    applyTheme();

    if (withAnimation) {
        setTimeout(() => {
            root.classList.remove('theme-transition');
            if (body) body.classList.remove('theme-flash');
        }, 600);
    }

    if (persistCloud && state.currentUser) {
        try {
            const docRef = doc(db, "users", state.currentUser.uid, "settings", "preferences");
            await setDoc(docRef, { theme: themeMode }, { merge: true });
        } catch (e) { console.error("Gagal menyimpan tema:", e); }
    }

    return themeMode;
}

export async function toggleDarkMode() {
    const nextMode = isDarkMode ? THEME_MODE_LIGHT : THEME_MODE_DARK;
    return setThemeMode(nextMode);
}

export async function toggleNotifications() {
    isNotificationActive = !isNotificationActive;
    localStorage.setItem('jurnal_notifications', isNotificationActive);
    
    if (isNotificationActive && Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            isNotificationActive = false;
            localStorage.setItem('jurnal_notifications', false);
            if (typeof window.showAppToast === 'function') {
                window.showAppToast("Izin notifikasi diblokir browser", "error");
            } else {
                alert("Izin notifikasi diblokir oleh browser.");
            }
        }
    }

    if (state.currentUser) {
        try {
            const docRef = doc(db, "users", state.currentUser.uid, "settings", "preferences");
            await setDoc(docRef, { notifications: isNotificationActive }, { merge: true });
            await syncPushSubscription(state.currentUser, isNotificationActive);
        } catch (error) { console.error("Gagal simpan preferensi:", error); }
    }

    if (typeof window.showAppToast === 'function') {
        window.showAppToast(isNotificationActive ? "Notifikasi diaktifkan" : "Notifikasi dimatikan", "info");
    }

    return isNotificationActive;
}
