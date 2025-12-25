import { state, setPrayerTimes, setLastCity, setTodayRecords } from '../state.js';
import { db } from '../config.js';
import { doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { switchView } from '../router.js';
import { APP_VERSION } from '../version.js';

let isDarkMode = false;
let countdownInterval = null;
let unsubscribeRecords = null;

export function initHome() {
    window.refreshLocation = refreshLocation;
    window.toggleDarkMode = toggleDarkMode;
    window.continueReading = continueReading;
    window.openFasting = () => switchView('fastingView');

    initTheme();
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
                const toggle = document.getElementById('darkModeToggleProfile');
                if (toggle) toggle.checked = isDarkMode;
            }
        }
    } catch (e) { console.error("Gagal sinkronisasi tema:", e); }
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
    let showWidget = false;
    let widgetLabel = "Hari Ini";

    if (!isPastMaghrib) {
        const h = calculateHijri(now, -1);
        const isSenin = currentDay === 1;
        const isKamis = currentDay === 4;
        const isAyyamulBidh = [13, 14, 15].includes(h.day);

        if (isSenin) { fastingTitle = "Puasa Senin"; fastingDesc = "Sunnah Senin-Kamis"; showWidget = true; }
        else if (isKamis) { fastingTitle = "Puasa Kamis"; fastingDesc = "Sunnah Senin-Kamis"; showWidget = true; }
        else if (isAyyamulBidh) { fastingTitle = "Ayyamul Bidh"; fastingDesc = `Tanggal ${h.day} Hijriyah`; showWidget = true; }
    } else {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextDay = tomorrow.getDay();
        const hTom = calculateHijri(tomorrow, -1);

        const isTomSenin = nextDay === 1;
        const isTomKamis = nextDay === 4;
        const isTomAyyamul = [13, 14, 15].includes(hTom.day);

        if (isTomSenin) { fastingTitle = "Puasa Senin"; fastingDesc = "Insya Allah Besok"; widgetLabel = "Besok"; showWidget = true; }
        else if (isTomKamis) { fastingTitle = "Puasa Kamis"; fastingDesc = "Insya Allah Besok"; widgetLabel = "Besok"; showWidget = true; }
        else if (isTomAyyamul) { fastingTitle = "Ayyamul Bidh"; fastingDesc = `Besok Tanggal ${hTom.day}`; widgetLabel = "Besok"; showWidget = true; }
    }

    if (showWidget) {
        container.innerHTML = `
            <div onclick="vibrateSoft(); openFasting()" class="cursor-pointer bento-card bg-white dark:bg-slate-900 p-4 rounded-[2rem] flex items-center justify-between border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all group shadow-sm">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <i data-lucide="utensils-crossed" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide group-hover:text-emerald-600 transition-colors">${widgetLabel}</h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">${fastingTitle} - ${fastingDesc}</p>
                    </div>
                </div>
                <div class="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-colors">
                    <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">Sunnah</span>
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
                <div onclick="continueReading()" class="bento-card relative w-full bg-white dark:bg-slate-900 rounded-[2rem] p-5 cursor-pointer group hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
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
                </div>
            `;
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
        if (window.openQuran) {
            window.openQuran();
        } else {
            window.location.href = '/quran';
        }
        setTimeout(() => {
            if (window.openSurah) {
                window.openSurah(surah, ayat);
            }
        }, 500);
    }
}

function loadHomeRecords() {
    if (!state.currentUser) return;
    const offset = state.currentDate.getTimezoneOffset();
    const localDate = new Date(state.currentDate.getTime() - (offset * 60 * 1000));
    const dateKey = localDate.toISOString().split('T')[0];

    if (unsubscribeRecords) { unsubscribeRecords(); unsubscribeRecords = null; }

    try {
        unsubscribeRecords = onSnapshot(doc(db, "users", state.currentUser.uid, "daily_records", dateKey), (docSnap) => {
            setTodayRecords(docSnap.exists() ? docSnap.data() : {});
            renderTodayPrayers();
        }, (error) => console.error("Gagal sync realtime:", error));
    } catch (e) {
        console.error("Error setting up snapshot listener:", e);
        renderTodayPrayers();
    }
}

// === FUNGSI UTAMA (READ-ONLY TAPI TETAP BERWARNA SAAT HOVER) ===
function renderTodayPrayers() {
    const container = document.getElementById('todayPrayerGrid');
    if (!container) return;

    const wajibPrayers = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];
    let html = '';

    wajibPrayers.forEach(name => {
        const time = state.prayerTimes[name] || '--:--';
        const isDone = state.todayRecords && state.todayRecords[name] === true;
        let cardStyle, textNameStyle, textTimeStyle, checkIconStyle;

        if (isDone) {
            // === SUDAH DICEKLIS ===
            // 1. Base: Hijau Solid (!bg-emerald-500)
            // 2. Hover: Hijau Tua Solid (!bg-emerald-600) <-- EFEK HOVER TETAP ADA
            cardStyle = "!bg-emerald-500 hover:!bg-emerald-600 !border-emerald-500 shadow-md ring-1 ring-emerald-400 transition-colors duration-200 group";

            textNameStyle = "!text-white font-bold";
            textTimeStyle = "!text-white";

            // Icon Check
            checkIconStyle = '<div class="bg-white rounded-full p-1 animate-[zoomIn_0.2s_ease-out] shadow-sm"><i data-lucide="check" class="w-3 h-3 text-emerald-600 font-bold"></i></div>';
        } else {
            // === BELUM DICEKLIS ===
            // 1. Desktop Hover: Hijau Muda Solid (!bg-emerald-50) <-- EFEK HOVER TETAP ADA
            // 2. Dark Hover: Hijau Tua Solid (!bg-emerald-950)
            cardStyle = "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 md:border-emerald-300 md:dark:border-slate-700 hover:!bg-emerald-50 dark:hover:!bg-emerald-950 hover:!border-emerald-500 dark:hover:!border-emerald-500 shadow-sm transition-colors duration-200 group";

            textNameStyle = "text-slate-500 dark:text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 font-bold";
            textTimeStyle = "text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-slate-100";

            // Lingkaran Kosong
            checkIconStyle = '<div class="w-5 h-5 rounded-full bg-slate-50 border-2 border-slate-300 dark:border-slate-600 dark:bg-slate-800 group-hover:border-emerald-500 group-hover:bg-white transition-colors"></div>';
        }

        // PERUBAHAN: Hapus "onclick" dan ganti "cursor-pointer" jadi "cursor-default"
        html += `
            <div class="flex flex-col items-center justify-center py-3 px-1 rounded-2xl border ${cardStyle} cursor-default select-none">
                <span class="text-[9px] font-bold uppercase tracking-widest ${textNameStyle} mb-1">${name}</span>
                <span class="text-xs font-black font-mono ${textTimeStyle}">${time}</span>
                <div class="mt-2 group-hover:scale-110 transition-transform">${checkIconStyle}</div>
            </div>`;
    });

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons({ root: container });
}

function refreshLocation() {
    const btn = document.getElementById('locationBtn');
    const text = document.getElementById('homeLocationText');
    const icon = document.getElementById('locIcon');

    if (text) text.innerText = "Mencari...";
    if (btn) btn.classList.add('animate-pulse');
    if (icon) {
        icon.classList.add('animate-spin');
        icon.classList.remove('drop-shadow-md');
        icon.setAttribute('data-lucide', 'loader-2');
    }
    if (window.lucide) lucide.createIcons();
    setTimeout(() => { getLocation(true); }, 500);
}

function getLocation(isManualRefresh = false) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                window.lastLat = pos.coords.latitude;
                window.lastLng = pos.coords.longitude;
                localStorage.setItem('last_lat', window.lastLat);
                localStorage.setItem('last_lng', window.lastLng);
                fetchJadwal(window.lastLat, window.lastLng);
                fetchCityName(window.lastLat, window.lastLng);
                if (isManualRefresh) resetLocationButton();
            },
            () => {
                useDefaultLocation();
                if (isManualRefresh) resetLocationButton();
            }
        );
    } else {
        useDefaultLocation();
        if (isManualRefresh) resetLocationButton();
    }
}

function resetLocationButton() {
    const btn = document.getElementById('locationBtn');
    const icon = document.getElementById('locIcon');
    if (btn) btn.classList.remove('animate-pulse');
    if (icon) {
        icon.classList.remove('animate-spin');
        icon.classList.add('drop-shadow-md');
        icon.setAttribute('data-lucide', 'map-pin');
    }
    if (window.lucide) lucide.createIcons();
}

function useDefaultLocation() {
    if (!state.lastCity || state.lastCity === "Menunggu GPS...") {
        setLastCity("GPS Tidak Terdeteksi");
        updateHomeUI();
    }
}

async function fetchCityName(lat, lng) {
    try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=id`);
        const data = await res.json();
        const cityName = data.locality || data.city || "Lokasi Anda";
        setLastCity(cityName);
        localStorage.setItem('last_city_name', cityName);
        updateHomeUI();
    } catch (e) {
        if (!state.lastCity || state.lastCity === "Menunggu GPS...") {
            setLastCity("Lokasi Terdeteksi");
            updateHomeUI();
        }
    }
}

async function fetchJadwal(lat, lng) {
    if (typeof adhan === 'undefined') {
        console.error("Library Adhan.js belum siap, mencoba lagi...");
        setTimeout(() => fetchJadwal(lat, lng), 500);
        return;
    }
    const coordinates = new adhan.Coordinates(lat, lng);
    const date = state.currentDate;
    const params = adhan.CalculationMethod.Singapore();
    params.madhab = adhan.Madhab.Shafi;
    params.fajrAngle = 20;
    params.ishaAngle = 18;
    const prayerTimes = new adhan.PrayerTimes(coordinates, date, params);
    const timeFormat = (t) => t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
    const dhuhaTime = new Date(prayerTimes.sunrise.getTime() + (20 * 60000));
    const newTimes = {
        Subuh: timeFormat(prayerTimes.fajr),
        Dhuha: timeFormat(dhuhaTime),
        Dzuhur: timeFormat(prayerTimes.dhuhr),
        Ashar: timeFormat(prayerTimes.asr),
        Maghrib: timeFormat(prayerTimes.maghrib),
        Isya: timeFormat(prayerTimes.isha),
        Tahajud: '03:00'
    };
    setPrayerTimes(newTimes);
    const hEl = document.getElementById('hijriDisplay');
    if (hEl) hEl.innerText = getHijriDate(date, -1);
    updateNextPrayer();
    renderTodayPrayers();
    loadFastingWidget();
    window.dispatchEvent(new Event('prayerTimesUpdated'));
}

export function calculateHijri(date, adjustment = 0) {
    let d = new Date(date);
    d.setDate(d.getDate() + adjustment);
    let day = d.getDate();
    let month = d.getMonth();
    let year = d.getFullYear();
    let m = month + 1;
    let y = year;
    if (m < 3) { y -= 1; m += 12; }
    let a = Math.floor(y / 100);
    let b = 2 - a + Math.floor(a / 4);
    if (y < 1583) b = 0;
    if (y == 1582) { if (m > 10) b = -10; if (m == 10) { b = 0; if (day > 4) b = -10; } }
    let jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524;
    let b0 = 0;
    if (jd > 2299160) { let a = Math.floor((jd - 1867216.25) / 36524.25); b0 = 1 + a - Math.floor(a / 4); }
    let bb = jd + b0 + 1524;
    let cc = Math.floor((bb - 122.1) / 365.25);
    let dd = Math.floor(365.25 * cc);
    let ee = Math.floor((bb - dd) / 30.6001);
    day = (bb - dd) - Math.floor(30.6001 * ee);
    month = ee - 1;
    if (ee > 13) { cc += 1; month = ee - 13; }
    year = cc - 4716;
    let iyear = 10631.0 / 30.0;
    let epochastro = 1948084;
    let shift1 = 8.01 / 60.0;
    let z = jd - epochastro;
    let cyc = Math.floor(z / 10631.0);
    z = z - 10631.0 * cyc;
    let j = Math.floor((z - shift1) / iyear);
    let iy = 30 * cyc + j;
    z = z - Math.floor(j * iyear + shift1);
    let im = Math.floor((z + 28.5001) / 29.5);
    if (im == 13) im = 12;
    let id = z - Math.floor(29.5001 * im - 29);
    return { day: id, month: im - 1, year: iy };
}

function getHijriDate(date, adjustment = 0) {
    const h = calculateHijri(date, adjustment);
    const iMonthNames = ["Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir", "Jumadil Awal", "Jumadil Akhir", "Rajab", "Sya'ban", "Ramadhan", "Syawal", "Dzulkaidah", "Dzulhijjah"];
    return `${h.day} ${iMonthNames[h.month]} ${h.year} H`;
}

function updateNextPrayer() {
    const nameEl = document.getElementById('nextPrayerName');
    const timeEl = document.getElementById('nextPrayerTime');
    if (!nameEl || !timeEl) return;
    const now = new Date();
    const curTime = now.getHours() * 60 + now.getMinutes();
    let nextP = null;
    let minDiff = 9999;
    const timesToCheck = [
        { name: 'Subuh', time: state.prayerTimes.Subuh },
        { name: 'Dzuhur', time: state.prayerTimes.Dzuhur },
        { name: 'Ashar', time: state.prayerTimes.Ashar },
        { name: 'Maghrib', time: state.prayerTimes.Maghrib },
        { name: 'Isya', time: state.prayerTimes.Isya }
    ];
    for (let p of timesToCheck) {
        if (!p.time || p.time === '--:--') continue;
        const [h, m] = p.time.split(':').map(Number);
        const pTime = h * 60 + m;
        if (pTime > curTime && (pTime - curTime) < minDiff) { minDiff = pTime - curTime; nextP = p; }
    }
    if (!nextP) nextP = { name: 'Subuh', time: state.prayerTimes.Subuh || "Besok" };
    nameEl.innerText = nextP.name;
    timeEl.innerText = nextP.time;
    startCountdown(nextP.time);
}

function startCountdown(targetTimeStr) {
    if (countdownInterval) clearInterval(countdownInterval);
    const countEl = document.getElementById('countdownTimer');
    if (!countEl || !targetTimeStr || targetTimeStr === '--:--') return;
    const [h, m] = targetTimeStr.split(':').map(Number);
    function tick() {
        const now = new Date();
        let target = new Date();
        target.setHours(h, m, 0, 0);
        if (target < now) target.setDate(target.getDate() + 1);
        const diff = target - now;
        if (diff <= 0) {
            countEl.innerText = "Waktunya Sholat!";
            setTimeout(() => { fetchJadwal(window.lastLat, window.lastLng); }, 2000);
            return;
        }
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        countEl.innerText = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    tick();
    countdownInterval = setInterval(tick, 1000);
}

function initTheme() {
    isDarkMode = localStorage.getItem('valdi_theme') === 'dark';
    applyTheme();
}

function applyTheme() {
    const html = document.documentElement;
    const btns = document.querySelectorAll('button[onclick="toggleDarkMode()"]');
    if (isDarkMode) {
        html.classList.add('dark');
        btns.forEach(btn => btn.innerHTML = `<i data-lucide="sun" class="w-4 h-4 text-yellow-300"></i>`);
    } else {
        html.classList.remove('dark');
        btns.forEach(btn => btn.innerHTML = `<i data-lucide="moon" class="w-4 h-4 text-slate-600"></i>`);
    }
    if (window.lucide) lucide.createIcons();
}

async function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    const themeStr = isDarkMode ? 'dark' : 'light';
    localStorage.setItem('valdi_theme', themeStr);
    applyTheme();
    if (state.currentUser) {
        try {
            await setDoc(doc(db, "users", state.currentUser.uid, "settings", "preferences"), { theme: themeStr }, { merge: true });
        } catch (e) { console.error(e); }
    }
}