import { state, setPrayerTimes, setLastCity, setTodayRecords } from '../state.js'; // [UPDATED] Import setTodayRecords
// [UPDATED] Hapus loadRecordsFromCloud dari import tracker
import { updateProgressBar } from './tracker.js'; 
import { db } from '../config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let isDarkMode = false;

export function initHome() {
    window.refreshLocation = refreshLocation;
    window.toggleDarkMode = toggleDarkMode; 

    initTheme();
    getLocation();

    window.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'homeView') {
            updateHomeUI();
        }
    });
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
    
    // [LOGIKA BARU] Load data khusus Home (Hari Ini)
    if(state.currentUser) {
        loadHomeRecords(); // Panggil fungsi fetching khusus Home
    } else {
        renderTodayPrayers();
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

// [BARU] Fungsi Fetch Data Khusus Home (Selalu Hari Ini)
async function loadHomeRecords() {
    if (!state.currentUser) return;
    
    // Format tanggal hari ini (currentDate)
    const offset = state.currentDate.getTimezoneOffset(); 
    const localDate = new Date(state.currentDate.getTime() - (offset*60*1000)); 
    const dateKey = localDate.toISOString().split('T')[0];

    try {
        const docSnap = await getDoc(doc(db, "users", state.currentUser.uid, "daily_records", dateKey));
        // Simpan ke state.todayRecords (Bukan currentRecords punya tracker)
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
        
        // [UPDATED] Baca dari state.todayRecords
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
    setLastCity("GPS Tidak Terdeteksi");
    updateHomeUI();
}

async function fetchCityName(lat, lng) {
    try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=id`);
        const data = await res.json();
        setLastCity(data.locality || data.city || data.principalSubdivision || "Lokasi Anda");
        updateHomeUI();
        const t1 = document.getElementById('locationText');
        if(t1) t1.innerText = state.lastCity;
    } catch (e) { 
        setLastCity("Lokasi Terdeteksi");
        updateHomeUI();
    }
}

async function fetchJadwal(lat, lng) {
    const m = state.currentDate.getMonth() + 1;
    const y = state.currentDate.getFullYear();
    const cacheKey = `sch_${y}_${m}_${lat.toFixed(1)}_${lng.toFixed(1)}`;
    let monthData = state.scheduleCache[cacheKey];
    
    if (!monthData) {
        try {
            const res = await fetch(`https://api.aladhan.com/v1/calendar?latitude=${lat}&longitude=${lng}&method=20&month=${m}&year=${y}`);
            const result = await res.json();
            if (result.data) { monthData = result.data; state.scheduleCache[cacheKey] = monthData; }
        } catch (e) { console.error(e); }
    }
    
    if (monthData) {
        const dayData = monthData[state.currentDate.getDate() - 1]; 
        if (dayData) {
            const t = dayData.timings;
            const clean = (s) => s ? s.split(' ')[0] : '--:--';
            const newTimes = { Subuh: clean(t.Fajr), Dzuhur: clean(t.Dhuhr), Ashar: clean(t.Asr), Maghrib: clean(t.Maghrib), Isya: clean(t.Isha), Tahajud: '03:00', Dhuha: '--:--' };
            
            if (t.Sunrise) {
                const [sh, sm] = clean(t.Sunrise).split(':').map(Number);
                const dhuha = new Date(); dhuha.setHours(sh, sm + 20);
                newTimes.Dhuha = dhuha.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit', hour12:false}).replace('.',':');
            }
            
            setPrayerTimes(newTimes);
            
            if (dayData.date.hijri) {
                const hStr = `${dayData.date.hijri.day} ${dayData.date.hijri.month.en} ${dayData.date.hijri.year} H`;
                const hEl = document.getElementById('hijriDisplay');
                if(hEl) hEl.innerText = hStr;
            }
        }
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