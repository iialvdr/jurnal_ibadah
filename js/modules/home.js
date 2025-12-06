import { state, setPrayerTimes, setLastCity, setTodayRecords } from '../state.js';
import { updateProgressBar } from './tracker.js'; 
import { db } from '../config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { switchView } from '../router.js'; 

let isDarkMode = false;

export function initHome() {
    window.refreshLocation = refreshLocation;
    window.toggleDarkMode = toggleDarkMode; 
    window.continueReading = continueReading;

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
                if(toggle) toggle.checked = isDarkMode;
            }
        }
    } catch (e) { console.error("Gagal sinkronisasi tema:", e); }
}

export function updateHomeUI() {
    updateNextPrayer();
    
    if(state.currentUser) {
        loadHomeRecords(); 
        loadLastReadCard(); 
    } else {
        renderTodayPrayers();
        const c = document.getElementById('homeLastReadContainer');
        if(c) c.classList.add('hidden');
    }

    const locText = document.getElementById('homeLocationText');
    if(locText) locText.innerText = state.lastCity || "Mencari...";
    
    if(state.currentUser) {
        const hName = document.getElementById('homeUserName');
        const hPhoto = document.getElementById('homeUserPhoto');
        if(hName) hName.innerText = state.currentUser.displayName || "Hamba Allah";
        if(hPhoto) {
            const photoUrl = state.currentUser.photoURL || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(state.currentUser.displayName || 'User')}&background=10b981&color=fff`;
            hPhoto.src = photoUrl;
        }
    } else {
        const hName = document.getElementById('homeUserName');
        if(hName) hName.innerText = "Memuat...";
    }
}

async function loadLastReadCard() {
    if (!state.currentUser) return;
    const container = document.getElementById('homeLastReadContainer');
    if(!container) return;

    try {
        const docRef = doc(db, "users", state.currentUser.uid, "quran", "last_read");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            window.lastReadData = data; 
            
            container.innerHTML = `
                <div onclick="continueReading()" class="relative w-full bg-white dark:bg-slate-900 rounded-[1.8rem] p-5 border border-slate-200 dark:border-slate-800 shadow-lg cursor-pointer group hover:border-emerald-300 dark:hover:border-emerald-700 transition-all active:scale-[0.98]">
                    <div class="absolute right-0 top-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl -mr-5 -mt-5"></div>
                    <div class="flex items-center justify-between relative z-10">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-inner">
                                <i data-lucide="bookmark" class="w-6 h-6 fill-current"></i>
                            </div>
                            <div>
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Terakhir Dibaca</p>
                                <h3 class="text-lg font-black text-slate-800 dark:text-white leading-tight">QS. ${data.name}</h3>
                                <p class="text-xs font-bold text-emerald-600 dark:text-emerald-400">Ayat ${data.ayat}</p>
                            </div>
                        </div>
                        <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition">
                            <i data-lucide="chevron-right" class="w-5 h-5"></i>
                        </div>
                    </div>
                </div>
            `;
            container.classList.remove('hidden');
            if(window.lucide) lucide.createIcons({ root: container });
        } else {
            container.classList.add('hidden');
        }
    } catch(e) {
        console.error("Gagal load last read:", e);
    }
}

function continueReading() {
    if(window.lastReadData) {
        const { surah, ayat } = window.lastReadData;
        window.location.hash = 'quran'; 
        setTimeout(() => {
            if(window.openSurah) {
                window.openSurah(surah, ayat); 
            }
        }, 100);
    }
}

async function loadHomeRecords() {
    if (!state.currentUser) return;
    const offset = state.currentDate.getTimezoneOffset(); 
    const localDate = new Date(state.currentDate.getTime() - (offset*60*1000)); 
    const dateKey = localDate.toISOString().split('T')[0];

    try {
        const docSnap = await getDoc(doc(db, "users", state.currentUser.uid, "daily_records", dateKey));
        setTodayRecords(docSnap.exists() ? docSnap.data() : {});
    } catch (e) { 
        console.error(e); 
    } finally { 
        renderTodayPrayers(); 
    }
}

function renderTodayPrayers() {
    const container = document.getElementById('todayPrayerGrid');
    if(!container) return;

    const wajibPrayers = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];
    let html = '';

    wajibPrayers.forEach(name => {
        const time = state.prayerTimes[name] || '--:--';
        const isDone = state.todayRecords && state.todayRecords[name] === true;
        let cardStyle, textNameStyle, textTimeStyle, checkIconStyle;

        if (isDone) {
            cardStyle = "bg-emerald-500 border-emerald-500 shadow-md shadow-emerald-500/20";
            textNameStyle = "text-emerald-100";
            textTimeStyle = "text-white";
            checkIconStyle = '<div class="bg-white/20 rounded-full p-0.5 animate-[zoomIn_0.2s_ease-out]"><i data-lucide="check" class="w-3 h-3 text-white"></i></div>';
        } else {
            cardStyle = "bg-slate-200 dark:bg-slate-800/60 border-transparent shadow-sm hover:bg-slate-300 dark:hover:bg-slate-700 active:scale-95";
            textNameStyle = "text-slate-600 dark:text-slate-400";
            textTimeStyle = "text-slate-900 dark:text-white"; 
            checkIconStyle = '<div class="w-4 h-4 rounded-full border-2 border-slate-400/50 dark:border-slate-600"></div>';
        }
        
        html += `
            <div class="flex flex-col items-center justify-center py-2 px-1 rounded-2xl border transition-all duration-300 ${cardStyle} cursor-pointer">
                <span class="text-[10px] font-bold uppercase tracking-wide ${textNameStyle} mb-0.5">${name}</span>
                <span class="text-xs font-bold font-mono ${textTimeStyle}">${time}</span>
                <div class="h-4 flex items-center justify-center mt-1">${checkIconStyle}</div>
            </div>`;
    });

    container.innerHTML = html;
    if(window.lucide) lucide.createIcons({ root: container });
}

function refreshLocation() {
    const btn = document.getElementById('locationBtn');
    const text = document.getElementById('homeLocationText');
    const icon = document.getElementById('locIcon');

    if(text) text.innerText = "Mencari...";
    if(btn) btn.classList.add('animate-pulse');
    if(icon) {
        icon.classList.add('animate-spin'); 
        icon.classList.remove('drop-shadow-md'); 
        icon.setAttribute('data-lucide', 'loader-2');
    }
    if(window.lucide) lucide.createIcons();

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
                if(isManualRefresh) resetLocationButton();
            }, 
            () => { 
                useDefaultLocation(); 
                if(isManualRefresh) resetLocationButton();
            }
        );
    } else { 
        useDefaultLocation(); 
        if(isManualRefresh) resetLocationButton();
    }
}

function resetLocationButton() {
    const btn = document.getElementById('locationBtn');
    const icon = document.getElementById('locIcon');
    if(btn) btn.classList.remove('animate-pulse');
    if(icon) {
        icon.classList.remove('animate-spin');
        icon.classList.add('drop-shadow-md');
        icon.setAttribute('data-lucide', 'map-pin');
    }
    if(window.lucide) lucide.createIcons();
}

function useDefaultLocation() {
    if(!state.lastCity || state.lastCity === "Menunggu GPS...") {
        setLastCity("GPS Tidak Terdeteksi");
        updateHomeUI();
    }
}

async function fetchCityName(lat, lng) {
    try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=id`);
        const data = await res.json();
        const cityName = data.locality || data.city || data.principalSubdivision || "Lokasi Anda";
        
        setLastCity(cityName);
        localStorage.setItem('last_city_name', cityName);
        updateHomeUI();
        const t1 = document.getElementById('locationText');
        if(t1) t1.innerText = state.lastCity;
    } catch (e) { 
        if(!state.lastCity || state.lastCity === "Menunggu GPS...") {
            setLastCity("Lokasi Terdeteksi");
            updateHomeUI();
        }
    }
}

// [FUNGSI UTAMA] Menghitung Waktu Sholat Secara Offline
async function fetchJadwal(lat, lng) {
    if (typeof adhan === 'undefined') {
        console.error("Library Adhan.js belum siap, mencoba lagi...");
        setTimeout(() => fetchJadwal(lat, lng), 500); // Coba lagi jika script belum load
        return;
    }

    const coordinates = new adhan.Coordinates(lat, lng);
    const date = state.currentDate;
    
    // Konfigurasi mirip Kemenag RI / Singapura (Standard Asia Tenggara)
    const params = adhan.CalculationMethod.Singapore();
    params.madhab = adhan.Madhab.Shafi;
    params.fajrAngle = 20;
    params.ishaAngle = 18;
    
    const prayerTimes = new adhan.PrayerTimes(coordinates, date, params);
    
    const timeFormat = (t) => {
        return t.toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
        }).replace('.', ':');
    };

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
    
    try {
        const hijriDate = new Intl.DateTimeFormat('id-ID-u-ca-islamic', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);
        
        const hEl = document.getElementById('hijriDisplay');
        if(hEl) hEl.innerText = hijriDate.replace(' AH', ' H');
    } catch (e) {
        console.error("Gagal format Hijriah:", e);
    }
    
    updateNextPrayer();
    renderTodayPrayers();
    window.dispatchEvent(new Event('prayerTimesUpdated'));
}

function updateNextPrayer() {
    const nameEl = document.getElementById('nextPrayerName');
    const timeEl = document.getElementById('nextPrayerTime');
    if(!nameEl || !timeEl) return;
    
    const now = new Date();
    const curTime = now.getHours() * 60 + now.getMinutes();
    let nextP = null;
    let minDiff = 9999;
    
    const timesToCheck = [ { name: 'Subuh', time: state.prayerTimes.Subuh }, { name: 'Dzuhur', time: state.prayerTimes.Dzuhur }, { name: 'Ashar', time: state.prayerTimes.Ashar }, { name: 'Maghrib', time: state.prayerTimes.Maghrib }, { name: 'Isya', time: state.prayerTimes.Isya } ];
    
    for(let p of timesToCheck) {
        if(!p.time || p.time === '--:--') continue;
        const parts = p.time.split(':');
        const [h, m] = parts.map(Number);
        const pTime = h * 60 + m;
        if (pTime > curTime && (pTime - curTime) < minDiff) { minDiff = pTime - curTime; nextP = p; }
    }
    
    if(nextP) { nameEl.innerText = nextP.name; timeEl.innerText = nextP.time; } 
    else { nameEl.innerText = "Subuh"; timeEl.innerText = state.prayerTimes.Subuh || "Besok"; }
}

function initTheme() {
    isDarkMode = localStorage.getItem('valdi_theme') === 'dark';
    applyTheme();
}

function applyTheme() {
    const html = document.documentElement;
    const btns = document.querySelectorAll('button[onclick="toggleDarkMode()"]');
    
    if(isDarkMode) {
        html.classList.add('dark');
        btns.forEach(btn => { btn.innerHTML = `<i data-lucide="sun" class="w-5 h-5 text-yellow-300"></i>`; });
    } else {
        html.classList.remove('dark');
        btns.forEach(btn => { btn.innerHTML = `<i data-lucide="moon" class="w-5 h-5"></i>`; });
    }
    if(window.lucide) lucide.createIcons();
}

async function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    const themeStr = isDarkMode ? 'dark' : 'light';
    localStorage.setItem('valdi_theme', themeStr);
    applyTheme();
    if(state.currentUser) {
        try {
            await setDoc(doc(db, "users", state.currentUser.uid, "settings", "preferences"), {
                theme: themeStr
            }, { merge: true });
        } catch(e) { console.error(e); }
    }
}