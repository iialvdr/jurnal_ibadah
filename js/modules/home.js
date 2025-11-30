import { state, setPrayerTimes, setLastCity } from '../state.js';
import { updateProgressBar, loadRecordsFromCloud } from './tracker.js'; // [UPDATE] Import loadRecordsFromCloud
import { db } from '../config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Variable state untuk tema
let isDarkMode = false;

export function initHome() {
    window.refreshLocation = refreshLocation;
    window.toggleNotification = toggleNotification;
    window.toggleDarkMode = toggleDarkMode;

    initTheme();
    updateDateUI();
    startPrayerCheckTimer();
    checkNotificationStatus();
    
    // Auto get location on init
    getLocation();

    window.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'homeView') {
            updateHomeUI();
        }
    });
}

export function updateHomeUI() {
    updateNextPrayer();
    
    // Render awal (agar tidak kosong saat loading)
    renderTodayPrayers(); 

    // [UPDATE] Fetch data ceklis terbaru, lalu render ulang agar warnanya update
    if(state.currentUser) {
        loadRecordsFromCloud().then(() => {
            renderTodayPrayers();
        });
    }

    const locText = document.getElementById('homeLocationText');
    if(locText) locText.innerText = state.lastCity || "Mencari...";
    
    if(state.currentUser) {
        const hName = document.getElementById('homeUserName');
        const hPhoto = document.getElementById('homeUserPhoto');
        
        // Update Nama
        if(hName) hName.innerText = state.currentUser.displayName || "Hamba Allah";
        
        // Update Foto
        if(hPhoto) {
            const photoUrl = state.currentUser.photoURL || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(state.currentUser.displayName || 'User')}&background=10b981&color=fff`;
            hPhoto.src = photoUrl;
        }
    } else {
        const hName = document.getElementById('homeUserName');
        if(hName) hName.innerText = "Memuat...";
    }

    checkNotificationStatus();
}

// [UPDATE] Fungsi render dengan logika warna ceklis
function renderTodayPrayers() {
    const container = document.getElementById('todayPrayerGrid');
    if(!container) return;

    // Daftar sholat wajib
    const wajibPrayers = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];
    let html = '';

    wajibPrayers.forEach(name => {
        const time = state.prayerTimes[name] || '--:--';
        
        // Cek apakah sholat ini sudah diceklis di tracker
        // Kita akses state.currentRecords yang sudah di-load oleh loadRecordsFromCloud
        const isDone = state.currentRecords && state.currentRecords[name] === true;
        
        // Tentukan Styling berdasarkan status isDone
        let cardStyle, textNameStyle, textTimeStyle;

        if (isDone) {
            // STYLE: SUDAH DIKERJAKAN (Hijau Emerald & Teks Putih)
            cardStyle = "bg-emerald-500 border-emerald-500 shadow-md shadow-emerald-500/20";
            textNameStyle = "text-emerald-100"; // Agak transparan dikit
            textTimeStyle = "text-white";         // Putih tegas
        } else {
            // STYLE: BELUM DIKERJAKAN (Putih/Dark Default)
            cardStyle = "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/30 shadow-sm";
            textNameStyle = "text-slate-400 dark:text-slate-500";
            textTimeStyle = "text-slate-800 dark:text-white";
        }
        
        html += `
            <div class="flex flex-col items-center justify-center py-3 px-1 rounded-2xl border transition-all duration-300 ${cardStyle}">
                <div class="flex items-center gap-1 mb-1">
                    ${isDone ? '<i data-lucide="check" class="w-3 h-3 text-white"></i>' : ''}
                    <span class="text-[10px] font-bold uppercase tracking-wide ${textNameStyle}">${name}</span>
                </div>
                <span class="text-xs font-bold font-mono ${textTimeStyle}">${time}</span>
            </div>
        `;
    });

    container.innerHTML = html;
    
    // Refresh icon check jika ada
    if(window.lucide) lucide.createIcons({ root: container });
}

function refreshLocation() {
    const btn = document.getElementById('locationBtn');
    const text = document.getElementById('homeLocationText');
    const icon = document.getElementById('locIcon');

    if(text) text.innerText = "Mencari...";
    if(btn) btn.classList.add('animate-pulse');
    if(icon) {
        icon.classList.add('animate-spin', 'text-emerald-500'); 
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
        icon.classList.remove('animate-spin', 'text-emerald-500');
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
                const hEl = document.getElementById('hijriDisplay');
                if(hEl) hEl.innerText = `${dayData.date.hijri.day} ${dayData.date.hijri.month.en} ${dayData.date.hijri.year} H`;
            }
        }
    }
    
    updateNextPrayer();
    renderTodayPrayers(); // Update grid saat data jadwal baru masuk
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

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('valdi_theme', isDarkMode ? 'dark' : 'light');
    applyTheme();
}

export function updateDateUI() {
    const elDate = document.getElementById('dateDisplay');
    if(elDate) elDate.innerText = state.currentDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
    const isToday = state.currentDate.getDate() === new Date().getDate() && state.currentDate.getMonth() === new Date().getMonth();
    const resetBtn = document.getElementById('resetDateBtn');
    if(resetBtn) isToday ? resetBtn.classList.add('hidden') : resetBtn.classList.remove('hidden');
}

async function toggleNotification() {
    if (!("Notification" in window)) { alert("Browser tidak support notifikasi."); return; }
    
    if (state.isNotifEnabled) {
        state.isNotifEnabled = false;
        localStorage.setItem('valdi_notif_enabled', 'false');
    } else {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            state.isNotifEnabled = true;
            localStorage.setItem('valdi_notif_enabled', 'true');
            new Notification("Jurnal Ibadah", { body: "Notifikasi aktif!", icon: "assets/logo.png" });
        }
    }
    checkNotificationStatus();
}

function checkNotificationStatus() {
    const btn = document.getElementById('notifBtn');
    if(!btn) return;
    
    if(state.isNotifEnabled && Notification.permission === 'granted') {
        btn.innerHTML = `<i data-lucide="bell-ring" class="w-5 h-5 text-emerald-600 dark:text-emerald-400"></i>`;
    } else {
        btn.innerHTML = `<i data-lucide="bell-off" class="w-5 h-5 text-slate-500"></i>`;
    }
    if(window.lucide) lucide.createIcons();
}

function startPrayerCheckTimer() {
    setInterval(() => {
        if (!state.isNotifEnabled) return;
        const now = new Date();
        const cur = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        for (const [name, time] of Object.entries(state.prayerTimes)) {
            if (time === cur) {
                 new Notification(`Waktunya Sholat ${name}`, { body: "Mari tunaikan sholat.", icon: "assets/logo.png" });
            }
        }
    }, 60000);
}