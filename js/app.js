// ==========================================
// 1. IMPORT & INJECT VIEWS
// ==========================================
import { profileViewHTML } from './views/view_profile.js';
import { loginViewHTML } from './views/view_login.js';
import { tasbihViewHTML } from './views/view_tasbih.js';
import { homeViewHTML } from './views/view_home.js';
import { qiblaViewHTML } from './views/view_qibla.js';
import { trackerViewHTML } from './views/view_tracker.js';
import { quranViewHTML } from './views/view_quran.js';

// Inject HTML ke dalam Container utama
const appContainer = document.getElementById('appContainer');
if(appContainer) {
    appContainer.innerHTML = ""; // Bersihkan container biar bersih
    // Urutan inject (Paling bawah = Paling atas tumpukan z-index)
    appContainer.insertAdjacentHTML('beforeend', profileViewHTML);
    appContainer.insertAdjacentHTML('afterbegin', loginViewHTML);
    appContainer.insertAdjacentHTML('beforeend', tasbihViewHTML);
    appContainer.insertAdjacentHTML('beforeend', qiblaViewHTML);
    appContainer.insertAdjacentHTML('beforeend', trackerViewHTML);
    appContainer.insertAdjacentHTML('afterbegin', homeViewHTML);
    appContainer.insertAdjacentHTML('beforeend', quranViewHTML);
}

// ==========================================
// 2. FIREBASE CONFIGURATION
// ==========================================
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

// ==========================================
// 3. GLOBAL VARIABLES
// ==========================================
let currentUser = null;
let currentDate = new Date();
let currentRecords = {}; 
let prayerTimes = { Subuh: '--:--', Dhuha: '--:--', Dzuhur: '--:--', Ashar: '--:--', Maghrib: '--:--', Isya: '--:--', Tahajud: '03:00' };
window.scheduleCache = {};
window.lastCity = "Menunggu GPS...";
let isDarkMode = localStorage.getItem('valdi_theme') === 'dark';
let myChart = null;

const DEFAULT_COORDS = { lat: -6.4025, lng: 106.7942 }; // Depok
const PRAYER_CONFIG = [
    { id: 'Subuh', type: 'wajib', icon: 'sunrise' },
    { id: 'Dhuha', type: 'sunnah', icon: 'sun' },
    { id: 'Dzuhur', type: 'wajib', icon: 'sun' },
    { id: 'Ashar', type: 'wajib', icon: 'sun' },
    { id: 'Maghrib', type: 'wajib', icon: 'sunset' },
    { id: 'Isya', type: 'wajib', icon: 'moon' },
    { id: 'Tahajud', type: 'sunnah', icon: 'star' }
];

// ==========================================
// 4. NAVIGATION SYSTEM
// ==========================================

function hideAllViews() {
    const views = ['homeView', 'trackerView', 'profileView', 'tasbihView', 'qiblaView', 'quranView'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden-force');
    });
}

// HELPER: Update Data Tampilan Home
function updateHomeUI() {
    // 1. Update Widget Sholat
    updateNextPrayer();
    
    // 2. Update Lokasi
    const locText = document.getElementById('homeLocationText');
    if(locText) locText.innerText = window.lastCity || "Mencari...";
    
    // 3. Update Profil User
    if(currentUser) {
        const hName = document.getElementById('homeUserName');
        const hPhoto = document.getElementById('homeUserPhoto');
        
        if(hName) hName.innerText = currentUser.displayName || "Hamba Allah";
        if(hPhoto) {
            hPhoto.src = currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'User')}&background=10b981&color=fff`;
        }
    }
}

window.goHome = () => {
    hideAllViews();
    const homeView = document.getElementById('homeView');
    if(homeView) homeView.classList.remove('hidden-force');
    
    // Panggil fungsi update setiap kali masuk Home
    updateHomeUI();
    if(window.lucide) lucide.createIcons();
};

window.openTracker = () => {
    if (!currentUser) return;
    
    hideAllViews();
    const trackerView = document.getElementById('trackerView');
    
    if(trackerView) {
        trackerView.classList.remove('hidden-force');
        
        // PENTING: Panggil renderPrayers() SETELAH view aktif
        // Gunakan requestAnimationFrame agar DOM siap dulu
        requestAnimationFrame(() => {
            renderPrayers();
        });
    }
    
    if(window.lucide) lucide.createIcons();
};

window.openProfile = () => {
    if(!currentUser) return;
    hideAllViews();
    const profileView = document.getElementById('profileView');
    if(profileView) profileView.classList.remove('hidden-force');

    // Populate Data
    const setSafeText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };
    const imgEl = document.getElementById('profilePhotoLarge');
    
    setSafeText('profileNameLarge', currentUser.displayName);
    setSafeText('profileEmail', currentUser.email);
    
    if(imgEl) {
        imgEl.src = currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName)}&background=10b981&color=fff`;
    }
    
    const joinDateObj = new Date(currentUser.metadata.creationTime);
    setSafeText('joinDate', joinDateObj.toLocaleDateString('id-ID'));
    setSafeText('lastLocation', window.lastCity || "Lokasi belum terdeteksi");

    // Hitung Statistik
    const diffTime = Math.abs(new Date() - joinDateObj);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    setSafeText('statDays', `${diffDays} Hari`);

    let wajibDoneCount = 0;
    PRAYER_CONFIG.forEach(p => { if(p.type === 'wajib' && currentRecords[p.id]) wajibDoneCount++; });
    setSafeText('statToday', `${wajibDoneCount}/5`);

    setTimeout(() => loadChartData(7), 100); 
    if(window.lucide) lucide.createIcons();
};

window.closeProfile = () => { window.goHome(); };

// ==========================================
// 5. AUTHENTICATION & STARTUP
// ==========================================
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
    const sidebar = document.getElementById('desktopSidebar');

    if (user) {
        currentUser = user;
        if(loginOverlay) loginOverlay.classList.add('hidden-force');
        if(sidebar) sidebar.classList.remove('hidden-force');
        
        await initApp(); // Tunggu init selesai
        updateHomeUI();  // Update tampilan Home setelah data siap

    } else {
        currentUser = null;
        if(loginOverlay) loginOverlay.classList.remove('hidden-force');
        if(sidebar) sidebar.classList.add('hidden-force');
        hideAllViews(); 
    }

    if(splash) {
        setTimeout(() => {
            splash.classList.add('opacity-0');
            setTimeout(() => splash.classList.add('hidden-force'), 500);
        }, 800);
    }
});

const logoutBtnProfile = document.getElementById('logoutBtnProfile');
if(logoutBtnProfile) {
    logoutBtnProfile.addEventListener('click', () => { signOut(auth).then(() => location.reload()); });
}

// ==========================================
// 6. FEATURES (TASBIH, QIBLA, CHART)
// ==========================================
const DHIKR_DATA = [
    { id: 0, title: "Tasbih", arabic: "سُبْحَانَ الله", latin: "Subhanallah", target: 33 },
    { id: 1, title: "Tahmid", arabic: "الْحَمْدُ لِلَّهِ", latin: "Alhamdulillah", target: 33 },
    { id: 2, title: "Takbir", arabic: "اللهُ أَكْبَرُ", latin: "Allahu Akbar", target: 33 },
    { id: 3, title: "Tahlil", arabic: "لَا إِلَهَ إِلَّا اللهُ", latin: "Laa ilaaha illallah", target: 33 },
    { id: 4, title: "Istighfar", arabic: "أَسْتَغْفِرُ اللهَ", latin: "Astaghfirullah", target: 100 },
    { id: 5, title: "Sholawat", arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ", latin: "Allahumma sholli 'ala Muhammad", target: 100 },
    { id: 6, title: "Hauqolah", arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ", latin: "Laa haula wa laa quwwata illa billah", target: 0 }
];

let tasbihCount = 0;
let tasbihTarget = 33;
let isVibroOn = true;
let currentDhikrIndex = -1; // -1 artinya mode bebas (kosong)

window.openTasbih = () => {
    hideAllViews();
    const tasbihView = document.getElementById('tasbihView');
    if(tasbihView) tasbihView.classList.remove('hidden-force');
    if(window.lucide) lucide.createIcons();
    
    // Default: Reset tampilan bacaan kalau baru buka
    updateDhikrDisplay(); 
};

window.closeTasbih = () => { window.goHome(); };

window.countTasbih = () => {
    tasbihCount++;
    const countEl = document.getElementById('tasbihCount');
    if(countEl) countEl.innerText = tasbihCount;
    
    // Efek Getar
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
    
    // Update style tombol target
    const btn33 = document.getElementById('btnTarget33');
    const btn100 = document.getElementById('btnTarget100');
    const btnInf = document.getElementById('btnTargetInf');
    [btn33, btn100, btnInf].forEach(btn => { if(btn) btn.className = "px-4 py-2 text-xs font-bold rounded-xl transition text-slate-500 dark:text-slate-400 hover:bg-white/20"; });
    
    const activeClass = "px-4 py-2 text-xs font-bold rounded-xl transition bg-white dark:bg-slate-600 text-emerald-600 shadow-sm";
    if(target===33 && btn33) btn33.className = activeClass;
    if(target===100 && btn100) btn100.className = activeClass;
    if(target===0 && btnInf) btnInf.className = activeClass;
    
    resetTasbih();
};

window.toggleVibro = () => {
    isVibroOn = !isVibroOn;
    const btn = document.getElementById('vibroBtn').firstElementChild;
    const txt = document.getElementById('vibroText');
    if(isVibroOn) {
        btn.classList.add('bg-emerald-100/50', 'text-emerald-600');
        btn.classList.remove('bg-white/40', 'text-slate-500');
        txt.innerText = "Getar On";
    } else {
        btn.classList.remove('bg-emerald-100/50', 'text-emerald-600');
        btn.classList.add('bg-white/40', 'text-slate-500');
        txt.innerText = "Getar Off";
    }
};

// --- LOGIKA MENU BACAAN (BARU) ---
window.openDhikrMenu = () => {
    const modal = document.getElementById('dhikrMenuModal');
    const listContainer = document.getElementById('dhikrListContainer');
    
    if(!modal || !listContainer) return;
    
    // Render list bacaan
    let html = '';
    DHIKR_DATA.forEach((item, index) => {
        const isSelected = index === currentDhikrIndex;
        html += `
        <div onclick="chooseDhikr(${index})" class="p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition ${isSelected ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-900/20 dark:border-emerald-500/50' : 'bg-slate-50 dark:bg-slate-800/50 border-transparent hover:bg-emerald-50 dark:hover:bg-slate-800'}">
            <div>
                <h4 class="font-bold text-slate-800 dark:text-white">${item.title}</h4>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${item.latin}</p>
            </div>
            ${isSelected ? '<div class="bg-emerald-500 text-white p-1 rounded-full"><i data-lucide="check" class="w-4 h-4"></i></div>' : ''}
        </div>`;
    });
    
    // Tambah opsi "Mode Bebas" (Tanpa bacaan)
    html += `
        <button onclick="chooseDhikr(-1)" class="w-full p-3 text-sm font-bold text-red-500 border border-red-200 dark:border-red-900 rounded-xl mt-4 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
            Hapus Bacaan (Mode Bebas)
        </button>
    `;

    listContainer.innerHTML = html;
    modal.classList.remove('hidden');
    if(window.lucide) lucide.createIcons();
};

window.closeDhikrMenu = () => {
    document.getElementById('dhikrMenuModal').classList.add('hidden');
};

window.chooseDhikr = (index) => {
    currentDhikrIndex = index;
    
    if(index >= 0) {
        // Set target otomatis sesuai data dzikir
        setTasbihTarget(DHIKR_DATA[index].target);
    }
    
    updateDhikrDisplay();
    closeDhikrMenu();
    resetTasbih(); // Reset hitungan biar mulai dari 0
};

function updateDhikrDisplay() {
    const displayArea = document.getElementById('dhikrDisplayArea');
    const arabicEl = document.getElementById('dhikrArabicDisplay');
    const latinEl = document.getElementById('dhikrLatinDisplay');
    
    if (currentDhikrIndex >= 0) {
        const data = DHIKR_DATA[currentDhikrIndex];
        displayArea.classList.remove('hidden');
        arabicEl.innerText = data.arabic;
        latinEl.innerText = data.latin;
    } else {
        displayArea.classList.add('hidden');
    }
}

// --- QIBLA LOGIC ---
const KAABA_COORDS = { lat: 21.422487, lng: 39.826206 };
let currentDiscRotation = 0;

window.openQibla = () => {
    hideAllViews();
    const qiblaView = document.getElementById('qiblaView');
    if(qiblaView) qiblaView.classList.remove('hidden-force');
    if(window.lastLat && window.lastLng) calculateQibla(window.lastLat, window.lastLng);
    startCompass();
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const btn = document.getElementById('compassPermissionBtn');
        if(btn) btn.classList.remove('hidden');
    }
    const calib = document.getElementById('calibrationWarning');
    if(calib) { calib.classList.remove('hidden'); setTimeout(() => calib.classList.add('hidden'), 8000); }
    if(window.lucide) lucide.createIcons();
};
window.closeQibla = () => { stopCompass(); window.goHome(); };
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
    const lat1 = lat * (PI/180), lng1 = lng * (PI/180), lat2 = KAABA_COORDS.lat * (PI/180), lng2 = KAABA_COORDS.lng * (PI/180);
    const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
    let qiblaAngle = Math.atan2(y, x);
    qiblaAngle = (qiblaAngle * 180 / PI + 360) % 360; 
    document.getElementById('qiblaDegree').innerText = `${Math.round(qiblaAngle)}°`;
    const pointer = document.getElementById('qiblaPointer');
    if(pointer) pointer.style.transform = `rotate(${qiblaAngle}deg)`;
    const R = 6371; const dLat = lat2 - lat1; const dLon = lng2 - lng1;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    document.getElementById('qiblaDistance').innerText = `${Math.round(d).toLocaleString('id-ID')} km`;
}
function startCompass() {
    if ('ondeviceorientationabsolute' in window) window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    else if (window.DeviceOrientationEvent) window.addEventListener('deviceorientation', handleOrientation, true);
}
function stopCompass() {
    if ('ondeviceorientationabsolute' in window) window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
    window.removeEventListener('deviceorientation', handleOrientation, true);
}
function handleOrientation(event) {
    let heading = null;
    if (event.absolute && event.alpha !== null) heading = 360 - event.alpha;
    else if (event.webkitCompassHeading) heading = event.webkitCompassHeading;
    else if (event.alpha !== null) heading = 360 - event.alpha; 
    if (heading !== null) {
        const debugHead = (heading + 360) % 360;
        const headText = document.getElementById('compassHeading');
        if(headText) headText.innerText = `${Math.round(debugHead)}°`;
        const targetRotation = -heading;
        let delta = targetRotation - currentDiscRotation;
        while (delta < -180) delta += 360;
        while (delta > 180) delta -= 360;
        currentDiscRotation += delta;
        const disc = document.getElementById('compassDisc');
        if(disc) requestAnimationFrame(() => { disc.style.transform = `rotate(${currentDiscRotation}deg)`; });
    }
}

// --- CHART LOGIC ---
window.loadChartData = async (days) => {
    if(!currentUser) return;
    const btn7 = document.getElementById('btn7Days');
    const btn14 = document.getElementById('btn14Days');
    if(btn7 && btn14) {
        const act = "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm";
        const inact = "text-slate-500 hover:text-emerald-600";
        btn7.className = "px-2 py-1 text-[10px] rounded-md font-medium transition " + (days===7?act:inact);
        btn14.className = "px-2 py-1 text-[10px] rounded-md font-medium transition " + (days===14?act:inact);
    }
    const labels = [], dataPoints = [], fetchPromises = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
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
            } else dataPoints.push(0);
        });
        renderChart(labels, dataPoints);
    } catch (e) { console.error(e); }
};
function renderChart(labels, data) {
    const ctx = document.getElementById('activityChart'); if(!ctx) return; if(myChart) myChart.destroy();
    const isDark = document.documentElement.classList.contains('dark');
    const colorLine = '#10b981';
    myChart = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'Sholat Wajib', data: data, borderColor: colorLine, backgroundColor: (context) => { const ctx = context.chart.ctx; const gradient = ctx.createLinearGradient(0, 0, 0, 200); gradient.addColorStop(0, "rgba(16, 185, 129, 0.4)"); gradient.addColorStop(1, "rgba(16, 185, 129, 0)"); return gradient; }, borderWidth: 3, tension: 0.4, pointBackgroundColor: '#ffffff', pointBorderColor: colorLine, fill: true }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 5, ticks: { stepSize: 1, color: isDark ? '#94a3b8' : '#64748b' }, grid: { display: false } }, x: { ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { size: 9 } }, grid: { display: false } } } }
    });
}

// ==========================================
// 9. CORE FUNCTIONS
// ==========================================
function formatDateKey(date) { const offset = date.getTimezoneOffset(); const localDate = new Date(date.getTime() - (offset*60*1000)); return localDate.toISOString().split('T')[0]; }

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

async function initApp() {
    initTheme();
    updateDateUI();
    getLocation();
    
    // Default open Home
    window.goHome();
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
    const elDate = document.getElementById('dateDisplay');
    if(elDate) elDate.innerText = currentDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const isToday = currentDate.getDate() === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();
    const resetBtn = document.getElementById('resetDateBtn');
    if(resetBtn) isToday ? resetBtn.classList.add('hidden') : resetBtn.classList.remove('hidden');
}

window.toggleDarkMode = () => {
    isDarkMode = !isDarkMode;
    localStorage.setItem('valdi_theme', isDarkMode ? 'dark' : 'light');
    initTheme();
};

function initTheme() {
    const html = document.documentElement;
    const btns = document.querySelectorAll('button[onclick="toggleDarkMode()"]');
    if(isDarkMode) {
        html.classList.add('dark');
        btns.forEach(btn => { if(btn.querySelector('i')) { btn.querySelector('i').setAttribute('data-lucide', 'sun'); btn.querySelector('i').classList.add('text-yellow-300'); } });
    } else {
        html.classList.remove('dark');
        btns.forEach(btn => { if(btn.querySelector('i')) { btn.querySelector('i').setAttribute('data-lucide', 'moon'); btn.querySelector('i').classList.remove('text-yellow-300'); } });
    }
    if(window.lucide) lucide.createIcons();
}

window.getLocation = () => {
    const t1 = document.getElementById('locationText');
    const t2 = document.getElementById('homeLocationText');
    if(t1) t1.innerText = "Mencari...";
    if(t2) t2.innerText = "Mencari...";
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
    const t1 = document.getElementById('locationText');
    const t2 = document.getElementById('homeLocationText');
    if(t1) t1.innerText = window.lastCity;
    if(t2) t2.innerText = window.lastCity;
    fetchJadwal(window.lastLat, window.lastLng);
}

async function fetchCityName(lat, lng) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`);
        const data = await res.json();
        window.lastCity = data.address.city || data.address.town || "Indonesia"; 
        const t1 = document.getElementById('locationText');
        const t2 = document.getElementById('homeLocationText');
        if(t1) t1.innerText = window.lastCity;
        if(t2) t2.innerText = window.lastCity;
    } catch (e) { 
        document.getElementById('locationText').innerText = "Lokasi Aktif"; 
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
            const clean = (s) => s ? s.split(' ')[0] : '--:--';
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
        if(!p.time || p.time === '--:--' || typeof p.time !== 'string') continue;
        try {
            const parts = p.time.split(':');
            if(parts.length < 2) continue;
            const [h, m] = parts.map(Number);
            const pTime = h * 60 + m;
            if (pTime > curTime && (pTime - curTime) < minDiff) {
                minDiff = pTime - curTime;
                nextP = p;
            }
        } catch(e) { continue; }
    }

    if(nextP) {
        nameEl.innerText = nextP.name;
        timeEl.innerText = nextP.time;
    } else {
        nameEl.innerText = "Subuh";
        timeEl.innerText = prayerTimes.Subuh || "Besok";
    }
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
    const pbText = document.getElementById('progressText');
    const pb = document.getElementById('progressBar');
    if(pbText) pbText.innerText = pct + '%';
    if(pb) { pb.style.width = pct + '%'; pb.className = `h-full rounded-full transition-all duration-1000 ease-out ${pct === 100 ? 'bg-yellow-400 shadow-[0_0_10px_#facc15]' : 'bg-emerald-300'}`; }
    
    const msg = document.getElementById("congratsMessage");
    const isSubuhLocked = checkTimeAvailability(prayerTimes.Subuh).locked;
    if (wD === wT && wT > 0 && !isSubuhLocked) {
        if (!msg) {
            const list = document.getElementById('prayerList');
            if(list) list.insertAdjacentHTML('beforeend', `<div id="congratsMessage" class="mt-6 p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl text-center shadow-lg animate-[slideUp_0.5s_ease-out]"><p class="font-bold">✨ Alhamdulillah Sempurna! ✨</p><p class="text-xs opacity-90">Pertahankan terus ya, Valdi!</p></div>`);
        }
    } else { if (msg) msg.remove(); }
}

function renderPrayers() {
    const container = document.getElementById('prayerList');
    
    // SAFETY CHECK: Jika container tidak ketemu, stop.
    if(!container) {
        console.warn("Element #prayerList belum siap.");
        return;
    }
    
    // SAFETY CHECK 2: Jika data waktu sholat belum siap (masih '--:--'), jangan render kosong
    if(prayerTimes.Subuh === '--:--') {
        // Coba ambil data lagi jika kosong
        if(window.lastLat) fetchJadwal(window.lastLat, window.lastLng);
        return; 
    }

    let html = '';
    PRAYER_CONFIG.forEach((p) => {
        const isDone = currentRecords[p.id] || false;
        const time = prayerTimes[p.id];
        const status = checkTimeAvailability(time);
        
        // Style Glassmorphism untuk Item List
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

        html += `<div id="card-${p.id}" onclick="togglePrayer('${p.id}', ${status.locked})" class="flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 mb-3 ${wrapperClass}">
                    <div class="flex items-center gap-4">
                        <div id="iconbox-${p.id}" class="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 ${iconColor}"><i data-lucide="${p.icon}" class="w-5 h-5"></i></div>
                        <div>
                            <h3 id="title-${p.id}" class="font-bold text-base transition-all duration-200 ${titleStyle}">${p.id}</h3>
                            <div class="flex items-center gap-2 text-xs mt-1">
                                <span class="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">${time}</span>
                                <span class="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${p.type === 'wajib' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">${p.type}</span>
                                ${status.locked && status.reason ? `<span class="text-red-400 italic">${status.reason}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div id="checkbtn-${p.id}">${checkIcon}</div>
                </div>`;
    });
    
    container.innerHTML = html;
    if(window.lucide) lucide.createIcons();
    updateProgressBar();
}

// ==========================================
// FUNGSI TAMBAHAN (SOLUSI MASALAH 2)
// ==========================================
function checkTimeAvailability(prayerTimeStr) {
    // Kalau waktu belum ada
    if (!prayerTimeStr || prayerTimeStr === '--:--') {
        return { locked: true, reason: 'Menunggu Data' };
    }

    // Parse waktu sholat
    const [h, m] = prayerTimeStr.split(':').map(Number);
    const prayerDate = new Date(currentDate);
    prayerDate.setHours(h, m, 0, 0);

    const now = new Date();
    
    // Logika pengamanan: Jika waktu sekarang (now) belum mencapai waktu sholat (prayerDate) 
    // DAN tanggal yang dilihat adalah hari ini (currentDate), maka checklist dikunci.
    if (now < prayerDate && currentDate.toDateString() === now.toDateString()) {
        return { locked: true, reason: 'Belum Masuk' };
    }

    // Tambahan: Kunci jika melihat tanggal di masa depan
    if (currentDate.getTime() > now.getTime() && currentDate.toDateString() !== now.toDateString()) {
        return { locked: true, reason: 'Tanggal Belum Tiba' };
    }
    
    // Jika sedang melihat tanggal masa lalu, atau sudah melewati waktunya hari ini, 
    // maka checklist tidak dikunci.
    return { locked: false };
}

initTheme();

// ==========================================
// 10. SECURITY & UX PROTECTION
// ==========================================
document.addEventListener('contextmenu', event => {
    event.preventDefault();
});

document.addEventListener('keydown', event => {
    if (
        event.key === 'F12' || 
        (event.ctrlKey && (event.key === 'u' || event.key === 's')) ||
        (event.ctrlKey && event.shiftKey && event.key === 'i')
    ) {
        event.preventDefault();
    }
});

// ==========================================
// 11. FITUR AL-QURAN (EQURAN.ID API)
// ==========================================
let surahDataCache = null; 
let currentSurahId = null;
let currentAyahList = []; // [BARU] Simpan data ayat yang sedang dibuka
let currentAudio = null; 

window.openQuran = async () => {
    hideAllViews();
    const quranView = document.getElementById('quranView');
    if(quranView) quranView.classList.remove('hidden-force');
    
    // Stop audio & reset
    stopCurrentAudio();

    // Reset UI Manual
    document.getElementById('surahListContainer').classList.remove('-translate-x-full');
    document.getElementById('ayahListContainer').classList.add('translate-x-full');
    
    const searchContainer = document.getElementById('quranSearchContainer');
    const navButtons = document.getElementById('surahNavButtons');
    
    if(searchContainer) searchContainer.classList.remove('-translate-y-20');
    if(navButtons) navButtons.classList.add('translate-y-32');
    
    document.getElementById('quranTitle').innerText = "Al-Qur'an";
    currentSurahId = null;
    currentAyahList = []; // Reset list ayat

    if(!surahDataCache) {
        await fetchSurahList();
    }
    if(window.lucide) lucide.createIcons();
};

window.handleQuranBack = () => {
    stopCurrentAudio();

    if (currentSurahId) {
        // Balik ke List Surat
        document.getElementById('surahListContainer').classList.remove('-translate-x-full');
        document.getElementById('ayahListContainer').classList.add('translate-x-full');
        
        document.getElementById('quranSearchContainer').classList.remove('-translate-y-20');
        document.getElementById('surahNavButtons').classList.add('translate-y-32');
        
        document.getElementById('quranTitle').innerText = "Al-Qur'an";
        currentSurahId = null;
        currentAyahList = []; // Reset list ayat
        
    } else {
        window.goHome();
    }
};

// Helper untuk matikan audio dengan bersih
function stopCurrentAudio() {
    if(currentAudio) {
        const prevId = currentAudio.getAttribute('data-id');
        currentAudio.pause();
        currentAudio = null;
        
        // Reset icon jadi Play
        const prevIcon = document.getElementById(`icon-audio-${prevId}`);
        if(prevIcon) {
            prevIcon.innerHTML = `<i data-lucide="play" class="w-3 h-3 fill-current"></i>`;
            if(window.lucide) lucide.createIcons();
        }
    }
}

async function fetchSurahList() {
    const loading = document.getElementById('quranLoading');
    const container = document.getElementById('surahListContainer');
    
    if(loading) loading.classList.remove('hidden');
    
    try {
        const res = await fetch('https://equran.id/api/v2/surat');
        const json = await res.json();
        
        if(json.code === 200) {
            surahDataCache = json.data;
            renderSurahList(surahDataCache);
        }
    } catch (e) {
        console.error("Gagal ambil data surat:", e);
        container.innerHTML = `<p class="text-center text-red-500 mt-10">Gagal memuat data. Cek koneksi internet.</p>`;
    } finally {
        if(loading) loading.classList.add('hidden');
    }
}

function renderSurahList(data) {
    const container = document.getElementById('surahListContainer');
    let html = '';
    
    if(data.length === 0) {
        container.innerHTML = `<p class="text-center text-slate-400 mt-10 text-sm">Surat tidak ditemukan.</p>`;
        return;
    }

    data.forEach(s => {
        const safeNamaLatin = s.namaLatin.replace(/'/g, "\\'"); 

        html += `
        <div onclick="openSurahDetail(${s.nomor}, '${safeNamaLatin}')" class="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer hover:border-emerald-500 transition">
            <div class="w-10 h-10 flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/30 rounded-full text-emerald-600 font-bold text-sm relative shrink-0">
                ${s.nomor}
            </div>
            <div class="flex-1">
                <h3 class="font-bold text-slate-800 dark:text-white">${s.namaLatin}</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">${s.arti} • ${s.jumlahAyat} Ayat</p>
            </div>
            <div class="text-right">
                <span class="font-serif text-lg text-slate-800 dark:text-emerald-400">${s.nama}</span>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

// --- FITUR AUDIO PLAYER (AUTO NEXT) ---
window.toggleAudio = (url, ayatNum) => {
    // 1. Jika audio yang diklik sedang main, PAUSE.
    if(currentAudio && currentAudio.getAttribute('data-id') == ayatNum) {
        stopCurrentAudio();
        return;
    }

    // 2. Jika ada audio LAIN yang main, STOP dulu.
    stopCurrentAudio();

    // 3. Play Audio Baru
    const audio = new Audio(url);
    audio.setAttribute('data-id', ayatNum);
    
    // UI: Loading
    const btnIcon = document.getElementById(`icon-audio-${ayatNum}`);
    if(btnIcon) {
        btnIcon.innerHTML = `<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i>`;
        if(window.lucide) lucide.createIcons();
    }

    // Saat audio siap main
    audio.oncanplaythrough = () => {
        if(btnIcon) {
            btnIcon.innerHTML = `<i data-lucide="pause" class="w-3 h-3 fill-current"></i>`;
            if(window.lucide) lucide.createIcons();
        }
        audio.play();
        
        // Auto Scroll ke ayat yang sedang dibaca (biar user gak usah scroll manual)
        const ayatEl = document.getElementById(`ayat-card-${ayatNum}`);
        if(ayatEl) {
            ayatEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    // [PENTING] Saat audio selesai, lanjut ke ayat berikutnya
    audio.onended = () => {
        // Reset icon current jadi Play
        if(btnIcon) {
            btnIcon.innerHTML = `<i data-lucide="play" class="w-3 h-3 fill-current"></i>`;
            if(window.lucide) lucide.createIcons();
        }
        currentAudio = null;

        // Cari ayat berikutnya
        const nextAyatNum = ayatNum + 1;
        const nextAyatData = currentAyahList.find(a => a.nomorAyat === nextAyatNum);

        if(nextAyatData) {
            // Ada ayat selanjutnya? Mainkan!
            const nextAudioUrl = nextAyatData.audio['05'] || nextAyatData.audio['01'];
            toggleAudio(nextAudioUrl, nextAyatNum);
        } else {
            // Udah ayat terakhir (Selesai surat)
            console.log("Alhamdulillah, surat selesai.");
        }
    };

    // Handle Error (misal internet putus)
    audio.onerror = () => {
        alert("Gagal memutar audio. Cek koneksi internet.");
        stopCurrentAudio();
    };

    currentAudio = audio;
};

// --- FITUR PENCARIAN & NAVIGASI ---
window.searchSurah = (keyword) => {
    if(!surahDataCache) return;
    const lowerKey = keyword.toLowerCase();
    const filtered = surahDataCache.filter(s => 
        s.namaLatin.toLowerCase().includes(lowerKey) || 
        s.arti.toLowerCase().includes(lowerKey) ||
        s.nomor.toString().includes(lowerKey)
    );
    renderSurahList(filtered);
};

window.changeSurah = (direction) => {
    if(!currentSurahId) return;
    const nextId = currentSurahId + direction;
    if(nextId < 1 || nextId > 114) return;
    
    const nextSurah = surahDataCache.find(s => s.nomor === nextId);
    if(nextSurah) {
        stopCurrentAudio();
        openSurahDetail(nextSurah.nomor, nextSurah.namaLatin);
    }
};

window.openSurahDetail = async (nomor, namaLatin) => {
    currentSurahId = nomor;
    const loading = document.getElementById('quranLoading');
    const ayahsContent = document.getElementById('ayahsContent');
    const navButtons = document.getElementById('surahNavButtons');
    
    document.getElementById('surahListContainer').classList.add('-translate-x-full');
    document.getElementById('ayahListContainer').classList.remove('translate-x-full');
    document.getElementById('quranSearchContainer').classList.add('-translate-y-20');
    
    navButtons.classList.remove('translate-y-32');
    
    document.getElementById('quranTitle').innerText = `QS. ${namaLatin}`;
    document.getElementById('ayahListContainer').scrollTop = 0;
    
    ayahsContent.innerHTML = "";
    if(loading) loading.classList.remove('hidden');

    try {
        const res = await fetch(`https://equran.id/api/v2/surat/${nomor}`);
        const json = await res.json();
        
        if(json.code === 200) {
            currentAyahList = json.data.ayat; // [BARU] Simpan ke global
            renderAyahs(currentAyahList);
        }
    } catch (e) {
        console.error(e);
        ayahsContent.innerHTML = `<p class="text-center text-red-500">Gagal memuat ayat.</p>`;
    } finally {
        if(loading) loading.classList.add('hidden');
    }
};

function renderAyahs(ayatList) {
    const container = document.getElementById('ayahsContent');
    let html = '';
    
    ayatList.forEach(a => {
        const audioUrl = a.audio['05'] || a.audio['01'];
        
        html += `
        <div id="ayat-card-${a.nomorAyat}" class="border-b border-slate-100 dark:border-slate-800 pb-6 last:border-0 transition-colors duration-500">
            <div class="flex justify-between items-center mb-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-1 rounded-md">Ayat ${a.nomorAyat}</span>
                    
                    <button onclick="toggleAudio('${audioUrl}', ${a.nomorAyat})" class="w-7 h-7 flex items-center justify-center rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-emerald-600 hover:scale-110 transition shadow-sm active:scale-95">
                        <span id="icon-audio-${a.nomorAyat}">
                            <i data-lucide="play" class="w-3 h-3 fill-current"></i>
                        </span>
                    </button>
                </div>
            </div>
            
            <p lang="ar" dir="rtl" class="text-right font-quran text-3xl text-slate-800 dark:text-white mb-4">
                ${a.teksArab}
            </p>
            
            <p class="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">${a.teksLatin}</p>
            <p class="text-sm text-slate-600 dark:text-slate-300 italic">"${a.teksIndonesia}"</p>
        </div>`;
    });
    container.innerHTML = html;
    
    if(window.lucide) lucide.createIcons();
}