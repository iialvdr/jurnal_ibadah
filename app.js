import { profileViewHTML } from './view_profile.js';
import { loginViewHTML } from './view_login.js';
import { tasbihViewHTML } from './view_tasbih.js';
import { homeViewHTML } from './view_home.js';
import { qiblaViewHTML } from './view_qibla.js'; // <--- TAMBAHAN BARU

const appContainer = document.getElementById('appContainer');
if(appContainer) {
    appContainer.insertAdjacentHTML('beforeend', profileViewHTML);
    appContainer.insertAdjacentHTML('afterbegin', loginViewHTML);
    appContainer.insertAdjacentHTML('beforeend', tasbihViewHTML);
    appContainer.insertAdjacentHTML('beforeend', qiblaViewHTML); // <--- TAMBAHAN BARU (Inject Kiblat)
    appContainer.insertAdjacentHTML('afterbegin', homeViewHTML);
}

// --- FIREBASE CONFIG ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDX2VOndgMEIHOGnRA2O1dDa1AKmNV3H08",
    authDomain: "jurnalibadah.firebaseapp.com",
    projectId: "jurnalibadah",
    storageBucket: "jurnalibadah.firebasestorage.app",
    messagingSenderId: "142461877640",
    appId: "1:142461877640:web:0ac0b0353bde1f32ac0e3d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// --- GLOBALS ---
let currentUser = null;
let currentDate = new Date();
let currentRecords = {}; 
let prayerTimes = { Subuh: '--:--', Dhuha: '--:--', Dzuhur: '--:--', Ashar: '--:--', Maghrib: '--:--', Isya: '--:--', Tahajud: '03:00' };
window.scheduleCache = {};
window.lastCity = "Menunggu GPS...";
let isDarkMode = localStorage.getItem('valdi_theme') === 'dark';
let myChart = null;

const DEFAULT_COORDS = { lat: -6.4025, lng: 106.7942 };
const PRAYER_CONFIG = [
    { id: 'Subuh', type: 'wajib', icon: 'sunrise' },
    { id: 'Dhuha', type: 'sunnah', icon: 'sun' },
    { id: 'Dzuhur', type: 'wajib', icon: 'sun' },
    { id: 'Ashar', type: 'wajib', icon: 'sun' },
    { id: 'Maghrib', type: 'wajib', icon: 'sunset' },
    { id: 'Isya', type: 'wajib', icon: 'moon' },
    { id: 'Tahajud', type: 'sunnah', icon: 'star' }
];

// --- DOM ELEMENTS ---
const appHeader = document.getElementById('appHeader');
const mainContent = document.getElementById('mainContent');

// --- HELPER: RESET TAMPILAN (PENTING!) ---
// Fungsi ini menutup SEMUA tampilan agar tidak bertumpuk
function hideAllViews() {
    const views = [
        document.getElementById('homeView'),
        document.getElementById('profileView'),
        document.getElementById('tasbihView'),
        document.getElementById('qiblaView'), // <--- TAMBAHAN BARU
        document.getElementById('appHeader'),
        document.getElementById('mainContent')
    ];
    views.forEach(el => { if(el) el.classList.add('hidden-force'); });
}

// --- NAVIGATION LOGIC (DIPERBAIKI) ---

// 1. Buka Home (Dashboard)
window.goHome = () => {
    hideAllViews(); // Reset dulu
    
    const homeView = document.getElementById('homeView');
    if(homeView) homeView.classList.remove('hidden-force');
    
    // Update Info
    updateNextPrayer();
    const locText = document.getElementById('homeLocationText');
    if(locText) locText.innerText = window.lastCity || "Mencari...";
    
    if(currentUser) {
        const hName = document.getElementById('homeUserName');
        const hPhoto = document.getElementById('homeUserPhoto');
        if(hName) hName.innerText = currentUser.displayName || "Hamba Allah";
        if(hPhoto) hPhoto.src = currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}`;
    }
    if(window.lucide) lucide.createIcons();
};

// 2. Buka Tracker (Jurnal Harian)
window.openTracker = () => {
    hideAllViews(); // Reset dulu
    
    if(appHeader) appHeader.classList.remove('hidden-force');
    if(mainContent) mainContent.classList.remove('hidden-force');
    if(window.lucide) lucide.createIcons();
};

// 3. Buka Profile
window.openProfile = () => {
    if(!currentUser) return;
    hideAllViews(); // Reset dulu

    const profileView = document.getElementById('profileView');
    if(profileView) profileView.classList.remove('hidden-force');

    // Populate Data
    const setSafeText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };
    const imgEl = document.getElementById('profilePhotoLarge');
    if(imgEl) imgEl.src = currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}`;
    
    setSafeText('profileNameLarge', currentUser.displayName);
    setSafeText('profileEmail', currentUser.email);
    
    const joinDateObj = new Date(currentUser.metadata.creationTime);
    setSafeText('joinDate', joinDateObj.toLocaleDateString('id-ID'));
    setSafeText('lastLocation', window.lastCity || "Lokasi belum terdeteksi");

    const diffTime = Math.abs(new Date() - joinDateObj);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    setSafeText('statDays', `${diffDays} Hari`);

    let wajibDoneCount = 0;
    PRAYER_CONFIG.forEach(p => { if(p.type === 'wajib' && currentRecords[p.id]) wajibDoneCount++; });
    setSafeText('statToday', `${wajibDoneCount}/5`);

    setTimeout(() => loadChartData(7), 100); 
    if(window.lucide) lucide.createIcons();
};

window.closeProfile = () => {
    window.goHome(); // Balik ke Home
};

// 4. Buka Tasbih
let tasbihCount = 0;
let tasbihTarget = 33;
let isVibroOn = true;

window.openTasbih = () => {
    hideAllViews(); // Reset dulu
    const tasbihView = document.getElementById('tasbihView');
    if(tasbihView) tasbihView.classList.remove('hidden-force');
    if(window.lucide) lucide.createIcons();
};

window.closeTasbih = () => {
    window.goHome(); // Balik ke Home
};

// --- AUTH ---
const googleLoginBtn = document.getElementById('googleLoginBtn');
if(googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        document.getElementById('loginStatus').classList.remove('hidden');
        try { await signInWithPopup(auth, provider); } 
        catch (error) { console.error(error); document.getElementById('loginStatus').classList.add('hidden'); }
    });
}

onAuthStateChanged(auth, async (user) => {
    const splash = document.getElementById('splashScreen');
    const loginOverlay = document.getElementById('loginOverlay');

    if (user) {
        currentUser = user;
        if(loginOverlay) loginOverlay.classList.add('hidden-force');
        initApp(); // Init akan memanggil goHome() otomatis
    } else {
        currentUser = null;
        if(loginOverlay) loginOverlay.classList.remove('hidden-force');
        hideAllViews(); // Sembunyikan semua kalau logout
    }

    if(splash) {
        setTimeout(() => {
            splash.classList.add('opacity-0');
            setTimeout(() => splash.classList.add('hidden-force'), 500);
        }, 500);
    }
});

// --- CHART ---
window.loadChartData = async (days) => {
    if(!currentUser) return;
    // Update Tombol UI
    const btn7 = document.getElementById('btn7Days');
    const btn14 = document.getElementById('btn14Days');
    if(btn7 && btn14) {
        const activeClass = "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm";
        const inactiveClass = "text-slate-500 hover:text-emerald-600";
        // Reset base class dulu
        btn7.className = "px-2 py-1 text-[10px] rounded-md font-medium transition " + (days===7 ? activeClass : inactiveClass);
        btn14.className = "px-2 py-1 text-[10px] rounded-md font-medium transition " + (days===14 ? activeClass : inactiveClass);
    }

    const labels = [];
    const dataPoints = [];
    const fetchPromises = [];

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = formatDateKey(d);
        labels.push(d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        fetchPromises.push(getDoc(doc(db, "users", currentUser.uid, "daily_records", dateKey)));
    }

    try {
        const snapshots = await Promise.all(fetchPromises);
        snapshots.forEach(snap => {
            if(snap.exists()) {
                const data = snap.data();
                let count = 0;
                PRAYER_CONFIG.forEach(p => { if(p.type === 'wajib' && data[p.id] === true) count++; });
                dataPoints.push(count);
            } else { dataPoints.push(0); }
        });
        renderChart(labels, dataPoints);
    } catch (e) { console.error("Gagal load chart:", e); }
};

function renderChart(labels, data) {
    const ctx = document.getElementById('activityChart');
    if(!ctx) return;
    if(myChart) myChart.destroy();
    
    const isDark = document.documentElement.classList.contains('dark');
    const colorLine = '#10b981';
    
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sholat Wajib', data: data, borderColor: colorLine,
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                    gradient.addColorStop(0, "rgba(16, 185, 129, 0.4)");
                    gradient.addColorStop(1, "rgba(16, 185, 129, 0)");
                    return gradient;
                },
                borderWidth: 3, tension: 0.4, pointBackgroundColor: '#ffffff', pointBorderColor: colorLine, fill: true
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, max: 5, ticks: { stepSize: 1, color: isDark ? '#94a3b8' : '#64748b' }, grid: { display: false } },
                x: { ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { size: 9 } }, grid: { display: false } }
            }
        }
    });
}

// --- LOGIC TASBIH ---
window.countTasbih = () => {
    tasbihCount++;
    const countEl = document.getElementById('tasbihCount');
    if(countEl) countEl.innerText = tasbihCount;
    if(isVibroOn && navigator.vibrate) {
        if(tasbihTarget > 0 && tasbihCount % tasbihTarget === 0) navigator.vibrate([50, 50, 50]);
        else navigator.vibrate(15);
    }
};

window.resetTasbih = () => {
    tasbihCount = 0;
    document.getElementById('tasbihCount').innerText = '0';
    if(navigator.vibrate) navigator.vibrate(30);
};

window.setTasbihTarget = (target) => {
    tasbihTarget = target;
    document.getElementById('tasbihTargetDisplay').innerText = target === 0 ? "Target: ∞" : `Target: ${target}`;
    const btn33 = document.getElementById('btnTarget33');
    const btn100 = document.getElementById('btnTarget100');
    const btnInf = document.getElementById('btnTargetInf');
    // Update class active/inactive
    [btn33, btn100, btnInf].forEach(btn => {
        if(!btn) return;
        btn.className = "px-4 py-2 text-xs font-bold rounded-lg transition text-slate-500 dark:text-slate-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30";
    });
    
    const activeClass = "px-4 py-2 text-xs font-bold rounded-lg transition bg-emerald-500 text-white shadow-md";
    if(target === 33 && btn33) btn33.className = activeClass;
    if(target === 100 && btn100) btn100.className = activeClass;
    if(target === 0 && btnInf) btnInf.className = activeClass;
    
    resetTasbih();
};

window.toggleVibro = () => {
    isVibroOn = !isVibroOn;
    const btn = document.getElementById('vibroBtn').firstElementChild;
    const txt = document.getElementById('vibroText');
    if(isVibroOn) {
        btn.classList.add('bg-emerald-100/80', 'text-emerald-600');
        btn.classList.remove('bg-slate-200', 'text-slate-500');
        txt.innerText = "Getar On";
    } else {
        btn.classList.remove('bg-emerald-100/80', 'text-emerald-600');
        btn.classList.add('bg-slate-200', 'dark:bg-slate-700', 'text-slate-500');
        txt.innerText = "Getar Off";
    }
};

// --- APP FUNCTIONS ---
function formatDateKey(date) {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset*60*1000));
    return localDate.toISOString().split('T')[0];
}

async function loadRecordsFromCloud() {
    if (!currentUser) return;
    const dateKey = formatDateKey(currentDate);
    try {
        const docSnap = await getDoc(doc(db, "users", currentUser.uid, "daily_records", dateKey));
        currentRecords = docSnap.exists() ? docSnap.data() : {};
    } catch (e) { console.error(e); } 
    finally { renderPrayers(); }
}

async function saveToFirestoreOnly(prayerId, status) {
    if (!currentUser) return;
    const dateKey = formatDateKey(currentDate);
    try { await setDoc(doc(db, "users", currentUser.uid, "daily_records", dateKey), { [prayerId]: status, last_updated: new Date() }, { merge: true }); } catch (e) { console.error("Error saving:", e); }
}

function initApp() {
    initTheme();
    updateDateUI();
    getLocation();
    window.goHome(); // Start at Home
}

window.changeDate = (days) => {
    currentRecords = {}; 
    currentDate.setDate(currentDate.getDate() + days);
    updateDateUI();
    if (window.lastLat) fetchJadwal(window.lastLat, window.lastLng);
    loadRecordsFromCloud();
};

window.resetToToday = () => {
    currentRecords = {}; 
    currentDate = new Date();
    updateDateUI();
    if (window.lastLat) fetchJadwal(window.lastLat, window.lastLng);
    loadRecordsFromCloud();
};

function updateDateUI() {
    document.getElementById('dateDisplay').innerText = currentDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const isToday = currentDate.getDate() === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();
    const resetBtn = document.getElementById('resetDateBtn');
    isToday ? resetBtn.classList.add('hidden') : resetBtn.classList.remove('hidden');
}

window.toggleDarkMode = () => {
    isDarkMode = !isDarkMode;
    localStorage.setItem('valdi_theme', isDarkMode ? 'dark' : 'light');
    initTheme();
};

function initTheme() {
    const html = document.documentElement;
    // Update tombol di Desktop & Mobile
    const btns = document.querySelectorAll('button[onclick="toggleDarkMode()"]');
    
    if(isDarkMode) {
        html.classList.add('dark');
        btns.forEach(btn => {
            // Cek jika tombol ikon saja (header) atau tombol menu (list)
            if(btn.querySelector('i')) {
               const icon = btn.querySelector('i');
               // Ganti icon jadi sun
               icon.setAttribute('data-lucide', 'sun');
               icon.classList.add('text-yellow-300');
            }
        });
    } else {
        html.classList.remove('dark');
        btns.forEach(btn => {
            if(btn.querySelector('i')) {
               const icon = btn.querySelector('i');
               // Ganti icon jadi moon
               icon.setAttribute('data-lucide', 'moon');
               icon.classList.remove('text-yellow-300');
            }
        });
    }
    if(window.lucide) lucide.createIcons();
}

window.getLocation = () => {
    const btnText = document.getElementById('locationText');
    const homeLoc = document.getElementById('homeLocationText');
    if(btnText) btnText.innerText = "Mencari...";
    if(homeLoc) homeLoc.innerText = "Mencari...";
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                window.lastLat = pos.coords.latitude;
                window.lastLng = pos.coords.longitude;
                fetchJadwal(window.lastLat, window.lastLng);
                fetchCityName(window.lastLat, window.lastLng);
            }, 
            () => { useDefaultLocation(); }
        );
    } else { useDefaultLocation(); }
}

function useDefaultLocation() {
    window.lastLat = DEFAULT_COORDS.lat;
    window.lastLng = DEFAULT_COORDS.lng;
    window.lastCity = "Depok (Default)";
    const btnText = document.getElementById('locationText');
    const homeLoc = document.getElementById('homeLocationText');
    if(btnText) btnText.innerText = window.lastCity;
    if(homeLoc) homeLoc.innerText = window.lastCity;
    fetchJadwal(window.lastLat, window.lastLng);
}

async function fetchCityName(lat, lng) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`);
        const data = await res.json();
        window.lastCity = data.address.city || data.address.town || "Indonesia"; 
        const btnText = document.getElementById('locationText');
        const homeLoc = document.getElementById('homeLocationText');
        if(btnText) btnText.innerText = window.lastCity;
        if(homeLoc) homeLoc.innerText = window.lastCity;
    } catch (e) { document.getElementById('locationText').innerText = "Lokasi Aktif"; }
}

// Logic Update Next Prayer
function updateNextPrayer() {
    const nameEl = document.getElementById('nextPrayerName');
    const timeEl = document.getElementById('nextPrayerTime');
    if(!nameEl || !timeEl) return;

    const now = new Date();
    const curTime = now.getHours() * 60 + now.getMinutes();
    
    let nextP = null;
    let minDiff = 9999;

    const timesToCheck = [
        { name: 'Subuh', time: prayerTimes.Subuh },
        { name: 'Dzuhur', time: prayerTimes.Dzuhur },
        { name: 'Ashar', time: prayerTimes.Ashar },
        { name: 'Maghrib', time: prayerTimes.Maghrib },
        { name: 'Isya', time: prayerTimes.Isya }
    ];

    for(let p of timesToCheck) {
        if(p.time === '--:--') continue;
        const [h, m] = p.time.split(':').map(Number);
        const pTime = h * 60 + m;
        if (pTime > curTime && (pTime - curTime) < minDiff) {
            minDiff = pTime - curTime;
            nextP = p;
        }
    }

    if(nextP) {
        nameEl.innerText = nextP.name;
        timeEl.innerText = nextP.time;
    } else {
        nameEl.innerText = "Subuh";
        timeEl.innerText = prayerTimes.Subuh || "Besok";
    }
}

async function fetchJadwal(lat, lng) {
    const m = currentDate.getMonth() + 1;
    const y = currentDate.getFullYear();
    const cacheKey = `sch_${y}_${m}_${lat.toFixed(1)}_${lng.toFixed(1)}`;
    let monthData = window.scheduleCache[cacheKey];

    if (!monthData) {
        try {
            const res = await fetch(`https://api.aladhan.com/v1/calendar?latitude=${lat}&longitude=${lng}&method=20&month=${m}&year=${y}`);
            const result = await res.json();
            if (result.data) {
                monthData = result.data;
                window.scheduleCache[cacheKey] = monthData;
            }
        } catch (e) { console.error(e); }
    }

    if (monthData) {
        const dayData = monthData[currentDate.getDate() - 1]; 
        if (dayData) {
            const t = dayData.timings;
            const clean = (s) => s.split(' ')[0];
            prayerTimes = { Subuh: clean(t.Fajr), Dzuhur: clean(t.Dhuhr), Ashar: clean(t.Asr), Maghrib: clean(t.Maghrib), Isya: clean(t.Isha), Tahajud: '03:00', Dhuha: '--:--' };
            
            if (t.Sunrise) {
                const [sh, sm] = clean(t.Sunrise).split(':').map(Number);
                const dhuha = new Date(); dhuha.setHours(sh, sm + 20);
                prayerTimes.Dhuha = dhuha.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit', hour12:false}).replace('.',':');
            }
            if (dayData.date.hijri) {
                const hEl = document.getElementById('hijriDisplay');
                if(hEl) hEl.innerText = `${dayData.date.hijri.day} ${dayData.date.hijri.month.en} ${dayData.date.hijri.year} H`;
            }
        }
    }
    renderPrayers(); 
    updateNextPrayer();
    loadRecordsFromCloud();
}

window.togglePrayer = (id, locked) => {
    if (locked) return;
    const newState = !currentRecords[id];
    currentRecords[id] = newState;
    animatePrayerItem(id, newState);
    updateProgressBar();
    saveToFirestoreOnly(id, newState);
};

function animatePrayerItem(id, isDone) {
    const card = document.getElementById(`card-${id}`);
    const title = document.getElementById(`title-${id}`);
    const iconBox = document.getElementById(`iconbox-${id}`);
    const checkBtn = document.getElementById(`checkbtn-${id}`);
    if(!card) return;

    card.classList.add('scale-[0.98]');
    setTimeout(() => card.classList.remove('scale-[0.98]'), 150);

    if (isDone) {
        card.classList.remove('border-white/40', 'dark:border-slate-700/40', 'hover:border-emerald-300');
        card.classList.add('border-emerald-500/50', 'bg-emerald-50/60', 'dark:bg-emerald-900/20');
        title.classList.add('text-emerald-700', 'line-through', 'decoration-emerald-500/50');
        title.classList.remove('dark:text-slate-200');
        iconBox.classList.remove('text-slate-400');
        iconBox.classList.add('text-emerald-600', 'dark:text-emerald-400');
        checkBtn.innerHTML = `<div class="bg-emerald-500 text-white rounded-lg p-1 animate-[zoomIn_0.3s_ease-out]"><i data-lucide="check" class="w-4 h-4"></i></div>`;
    } else {
        card.classList.add('border-white/40', 'dark:border-slate-700/40', 'hover:border-emerald-300');
        card.classList.remove('border-emerald-500/50', 'bg-emerald-50/60', 'dark:bg-emerald-900/20');
        title.classList.remove('text-emerald-700', 'line-through', 'decoration-emerald-500/50');
        title.classList.add('dark:text-slate-200');
        iconBox.classList.add('text-slate-400');
        iconBox.classList.remove('text-emerald-600', 'dark:text-emerald-400');
        checkBtn.innerHTML = `<div class="border-2 border-slate-200 dark:border-slate-600 rounded-lg w-6 h-6 transition-colors hover:border-emerald-400"></div>`;
    }
    if(window.lucide) lucide.createIcons();
}

function updateProgressBar() {
    let wT = 0, wD = 0;
    PRAYER_CONFIG.forEach(p => { if(p.type === 'wajib') { wT++; if(currentRecords[p.id]) wD++; } });
    const pct = wT === 0 ? 0 : Math.round((wD/wT)*100);
    document.getElementById('progressText').innerText = pct + '%';
    const pb = document.getElementById('progressBar');
    if(pb) { pb.style.width = pct + '%'; pb.className = `h-full rounded-full transition-all duration-1000 ease-out ${pct === 100 ? 'bg-yellow-400 shadow-[0_0_10px_#facc15]' : 'bg-emerald-300'}`; }
    
    const msg = document.getElementById("congratsMessage");
    const isSubuhLocked = checkTimeAvailability(prayerTimes.Subuh).locked;
    if (wD === wT && wT > 0 && !isSubuhLocked) {
        if (!msg) document.getElementById('prayerList').insertAdjacentHTML('beforeend', `<div id="congratsMessage" class="mt-6 p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl text-center shadow-lg animate-[slideUp_0.5s_ease-out]"><p class="font-bold">✨ Alhamdulillah Sempurna! ✨</p><p class="text-xs opacity-90">Pertahankan terus ya, Valdi!</p></div>`);
    } else { if (msg) msg.remove(); }
}

function checkTimeAvailability(timeStr) {
    const now = new Date();
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const checkDate = new Date(currentDate); checkDate.setHours(0,0,0,0);
    if (checkDate > todayStart) return { locked: true, reason: 'Belum waktunya' };
    if (checkDate < todayStart) return { locked: false };
    if (timeStr === '--:--') return { locked: true, reason: 'Loading...' };
    const [h, m] = timeStr.split(':').map(Number);
    const pTime = new Date(); pTime.setHours(h, m, 0);
    return now >= pTime ? { locked: false } : { locked: true, reason: 'Belum masuk waktu' };
}

function renderPrayers() {
    const container = document.getElementById('prayerList');
    if(!container) return;
    let html = '';
    PRAYER_CONFIG.forEach((p) => {
        const isDone = currentRecords[p.id] || false;
        const time = prayerTimes[p.id];
        const status = checkTimeAvailability(time);
        
        let wrapperClass = status.locked 
            ? 'bg-slate-100/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/30 opacity-60 cursor-not-allowed grayscale backdrop-blur-sm' 
            : (isDone 
                ? 'cursor-pointer bg-emerald-50/60 dark:bg-emerald-900/20 border-emerald-500/50 shadow-md backdrop-blur-sm' 
                : 'cursor-pointer bg-white/60 dark:bg-slate-800/60 border-white/40 dark:border-slate-700/40 hover:border-emerald-300 hover:shadow-md backdrop-blur-sm');

        let iconColor = isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400';
        let titleStyle = isDone ? 'text-emerald-700 line-through decoration-emerald-500/50' : 'dark:text-slate-200';
        let checkIcon = isDone 
            ? `<div class="bg-emerald-500 text-white rounded-lg p-1"><i data-lucide="check" class="w-4 h-4"></i></div>`
            : (status.locked ? `<i data-lucide="lock" class="w-4 h-4 text-slate-300"></i>` : `<div class="border-2 border-slate-200 dark:border-slate-600 rounded-lg w-6 h-6 transition-colors hover:border-emerald-400"></div>`);

        html += `<div id="card-${p.id}" onclick="togglePrayer('${p.id}', ${status.locked})" class="flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 mb-3 ${wrapperClass}"><div class="flex items-center gap-4"><div id="iconbox-${p.id}" class="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 ${iconColor}"><i data-lucide="${p.icon}" class="w-5 h-5"></i></div><div><h3 id="title-${p.id}" class="font-bold text-base transition-all duration-200 ${titleStyle}">${p.id}</h3><div class="flex items-center gap-2 text-xs mt-1"><span class="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">${time}</span><span class="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${p.type === 'wajib' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">${p.type}</span>${status.locked && status.reason ? `<span class="text-red-400 italic">${status.reason}</span>` : ''}</div></div></div><div id="checkbtn-${p.id}">${checkIcon}</div></div>`;
    });
    container.innerHTML = html;
    if(window.lucide) lucide.createIcons();
    updateProgressBar();
}

// --- QIBLA LOGIC (REVISED) ---
const KAABA_COORDS = { lat: 21.422487, lng: 39.826206 };
let qiblaAngleGlobal = 0;

window.openQibla = () => {
    hideAllViews();
    const qiblaView = document.getElementById('qiblaView');
    if(qiblaView) qiblaView.classList.remove('hidden-force');
    
    if(window.lastLat && window.lastLng) {
        calculateQibla(window.lastLat, window.lastLng);
    }
    
    startCompass();
    
    // Cek Izin iOS (Wajib klik tombol)
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        document.getElementById('compassPermissionBtn').classList.remove('hidden');
    }
    
    // Tampilkan peringatan kalibrasi sebentar
    const calib = document.getElementById('calibrationWarning');
    if(calib) {
        calib.classList.remove('hidden');
        setTimeout(() => calib.classList.add('hidden'), 8000);
    }
    
    if(window.lucide) lucide.createIcons();
};

window.closeQibla = () => {
    stopCompass();
    window.goHome();
};

window.requestCompassPermission = async () => {
    try {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === 'granted') {
            document.getElementById('compassPermissionBtn').classList.add('hidden');
            startCompass();
        } else { alert('Izin kompas ditolak.'); }
    } catch (e) { console.error(e); }
};

function calculateQibla(lat, lng) {
    const PI = Math.PI;
    const lat1 = lat * (PI/180);
    const lng1 = lng * (PI/180);
    const lat2 = KAABA_COORDS.lat * (PI/180);
    const lng2 = KAABA_COORDS.lng * (PI/180);

    const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
    let qiblaAngle = Math.atan2(y, x);
    qiblaAngle = (qiblaAngle * 180 / PI + 360) % 360; 
    qiblaAngleGlobal = qiblaAngle;

    document.getElementById('qiblaDegree').innerText = `${Math.round(qiblaAngle)}°`;

    // Putar Jarum Kiblat pada Piringan
    // Jarum ini fix di piringan sesuai sudut geografis. 
    // Nanti piringannya yang diputar sensor.
    const pointer = document.getElementById('qiblaPointer');
    if(pointer) pointer.style.transform = `rotate(${qiblaAngle}deg)`;
    
    // Hitung Jarak
    const R = 6371; 
    const dLat = lat2 - lat1;
    const dLon = lng2 - lng1;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    document.getElementById('qiblaDistance').innerText = `${Math.round(d).toLocaleString('id-ID')} km`;
}

// --- LOGIKA SENSOR KOMPAS (DIPERBAIKI) ---
function startCompass() {
    // Coba event Absolute (Android Modern) dulu
    if ('ondeviceorientationabsolute' in window) {
        window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    } else if (window.DeviceOrientationEvent) {
        // Fallback ke event biasa (iOS / Android Lama)
        window.addEventListener('deviceorientation', handleOrientation, true);
    }
}

function stopCompass() {
    if ('ondeviceorientationabsolute' in window) {
        window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
    }
    window.removeEventListener('deviceorientation', handleOrientation, true);
}

function handleOrientation(event) {
    let heading = null;
    
    // 1. Coba baca Absolute (Android)
    if (event.absolute && event.alpha !== null) {
        // Alpha di Android = 0 saat Utara? Tidak selalu.
        // Rumus umum: 360 - alpha
        heading = 360 - event.alpha;
    } 
    // 2. Coba baca iOS Webkit
    else if (event.webkitCompassHeading) {
        heading = event.webkitCompassHeading;
    } 
    // 3. Fallback biasa
    else if (event.alpha !== null) {
        heading = 360 - event.alpha; 
    }

    if (heading !== null) {
        // Normalisasi Heading 0-360
        heading = (heading + 360) % 360; 

        // Update Text Debugging
        const headText = document.getElementById('compassHeading');
        if(headText) headText.innerText = `${Math.round(heading)}°`;

        // Putar Piringan Kompas
        // Piringan berputar BERLAWANAN arah hadap HP agar "U" selalu menunjuk Utara Bumi.
        const disc = document.getElementById('compassDisc');
        if(disc) {
            requestAnimationFrame(() => {
                disc.style.transform = `rotate(${-heading}deg)`;
            });
        }
    }
}

initTheme();