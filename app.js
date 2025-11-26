// --- 1. FIREBASE CONFIG & IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// KONFIGURASI FIREBASE
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

// --- GLOBAL VARIABLES ---
let currentUser = null;
let currentDate = new Date();
let currentRecords = {}; 
let prayerTimes = { Subuh: '--:--', Dhuha: '--:--', Dzuhur: '--:--', Ashar: '--:--', Maghrib: '--:--', Isya: '--:--', Tahajud: '03:00' };

// Default Setup
const DEFAULT_COORDS = { lat: -6.4025, lng: 106.7942 }; // Depok
let isDarkMode = localStorage.getItem('valdi_theme') === 'dark';
window.lastCity = "Menunggu GPS...";

const PRAYER_CONFIG = [
    { id: 'Subuh', type: 'wajib', icon: 'sunrise' },
    { id: 'Dhuha', type: 'sunnah', icon: 'sun' },
    { id: 'Dzuhur', type: 'wajib', icon: 'sun' },
    { id: 'Ashar', type: 'wajib', icon: 'sun' },
    { id: 'Maghrib', type: 'wajib', icon: 'sunset' },
    { id: 'Isya', type: 'wajib', icon: 'moon' },
    { id: 'Tahajud', type: 'sunnah', icon: 'star' }
];

// --- 2. DOM ELEMENTS ---
const loginOverlay = document.getElementById('loginOverlay');
const appHeader = document.getElementById('appHeader');
const mainContent = document.getElementById('mainContent');
const profileView = document.getElementById('profileView');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const loginStatus = document.getElementById('loginStatus');
const errorMsg = document.getElementById('errorMsg');

// --- 3. AUTH LOGIC ---
googleLoginBtn.addEventListener('click', async () => {
    loginStatus.classList.remove('hidden');
    errorMsg.classList.add('hidden');
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error(error);
        loginStatus.classList.add('hidden');
        errorMsg.innerText = "Error: " + error.code;
        errorMsg.classList.remove('hidden');
    }
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loginOverlay.classList.add('hidden-force');
        appHeader.classList.remove('hidden-force');
        mainContent.classList.remove('hidden-force');
        
        document.getElementById('userName').innerText = user.displayName || "Hamba Allah";
        document.getElementById('userPhoto').src = user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`;
        
        initApp();
    } else {
        currentUser = null;
        loginOverlay.classList.remove('hidden-force');
        appHeader.classList.add('hidden-force');
        mainContent.classList.add('hidden-force');
        if(profileView) profileView.classList.add('hidden-force');
    }
});

// --- 4. PROFILE LOGIC ---
window.openProfile = () => {
    if(!currentUser) return;
    document.getElementById('profilePhotoLarge').src = currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}`;
    document.getElementById('profileNameLarge').innerText = currentUser.displayName;
    document.getElementById('profileEmail').innerText = currentUser.email;
    document.getElementById('joinDate').innerText = currentUser.metadata.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString('id-ID') : '-';
    document.getElementById('lastLocation').innerText = window.lastCity || "Lokasi belum terdeteksi";

    appHeader.classList.add('hidden-force');
    mainContent.classList.add('hidden-force');
    profileView.classList.remove('hidden-force');
    if(window.lucide) lucide.createIcons();
};

window.closeProfile = () => {
    profileView.classList.add('hidden-force');
    appHeader.classList.remove('hidden-force');
    mainContent.classList.remove('hidden-force');
};

const logoutBtnProfile = document.getElementById('logoutBtnProfile');
if(logoutBtnProfile) {
    logoutBtnProfile.addEventListener('click', () => {
        signOut(auth).then(() => location.reload());
    });
}

// --- 5. APP FUNCTIONS ---
function formatDateKey(date) {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset*60*1000));
    return localDate.toISOString().split('T')[0];
}

async function loadRecordsFromCloud() {
    if (!currentUser) return;
    showLoading(true);
    
    const dateKey = formatDateKey(currentDate);
    const userDocRef = doc(db, "users", currentUser.uid, "daily_records", dateKey);
    
    try {
        const docSnap = await getDoc(userDocRef);
        currentRecords = docSnap.exists() ? docSnap.data() : {};
    } catch (e) { console.error(e); } 
    finally {
        showLoading(false);
        renderPrayers(); 
    }
}

// FUNGSI BARU: Save tanpa Render Ulang (Seamless)
async function saveToFirestoreOnly(prayerId, status) {
    if (!currentUser) return;
    const dateKey = formatDateKey(currentDate);
    const userDocRef = doc(db, "users", currentUser.uid, "daily_records", dateKey);
    try {
        await setDoc(userDocRef, { [prayerId]: status, last_updated: new Date() }, { merge: true });
    } catch (e) { console.error("Error saving:", e); }
}

function initApp() {
    initTheme();
    updateDateUI();
    getLocation(); 
}

window.changeDate = (days) => {
    currentDate.setDate(currentDate.getDate() + days);
    updateDateUI();
    if (window.lastLat) fetchJadwal(window.lastLat, window.lastLng);
    loadRecordsFromCloud();
};

window.resetToToday = () => {
    currentDate = new Date();
    updateDateUI();
    if (window.lastLat) fetchJadwal(window.lastLat, window.lastLng);
    loadRecordsFromCloud();
};

function updateDateUI() {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    document.getElementById('dateDisplay').innerText = currentDate.toLocaleDateString('id-ID', options);
    
    const today = new Date();
    const isToday = currentDate.getDate() === today.getDate() && currentDate.getMonth() === today.getMonth();
    const resetBtn = document.getElementById('resetDateBtn');
    isToday ? resetBtn.classList.add('hidden') : resetBtn.classList.remove('hidden');
}

window.toggleDarkMode = () => {
    isDarkMode = !isDarkMode;
    localStorage.setItem('valdi_theme', isDarkMode ? 'dark' : 'light');
    initTheme();
    // TIDAK PERLU renderPrayers() disini agar transisi smooth
};

function initTheme() {
    const html = document.documentElement;
    const btn = document.getElementById('themeBtn');
    if(btn) {
        if (isDarkMode) {
            html.classList.add('dark');
            btn.innerHTML = `<i data-lucide="sun" class="w-5 h-5 text-yellow-300 fill-yellow-300 animate-spin-slow"></i>`;
        } else {
            html.classList.remove('dark');
            btn.innerHTML = `<i data-lucide="moon" class="w-5 h-5 text-yellow-200 fill-yellow-200/50"></i>`;
        }
    } else {
        isDarkMode ? html.classList.add('dark') : html.classList.remove('dark');
    }
    if(window.lucide) lucide.createIcons();
}

window.getLocation = () => {
    const btnText = document.getElementById('locationText');
    if(btnText) btnText.innerText = "Mencari...";
    
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
    if(btnText) btnText.innerText = window.lastCity;
    fetchJadwal(window.lastLat, window.lastLng);
}

async function fetchCityName(lat, lng) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`;
        const res = await fetch(url);
        const data = await res.json();
        const addr = data.address;
        const city = addr.city || addr.town || addr.village || addr.county || "Indonesia";
        window.lastCity = city; 
        const btnText = document.getElementById('locationText');
        if(btnText) btnText.innerText = city;
    } catch (e) {
        window.lastCity = "Lokasi Terdeteksi";
        const btnText = document.getElementById('locationText');
        if(btnText) btnText.innerText = "Lokasi Aktif";
    }
}

async function fetchJadwal(lat, lng) {
    try {
        const d = currentDate.getDate();
        const m = currentDate.getMonth() + 1;
        const y = currentDate.getFullYear();
        const url = `https://api.aladhan.com/v1/timings/${d}-${m}-${y}?latitude=${lat}&longitude=${lng}&method=20`;
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.data) {
            const t = data.data.timings;
            prayerTimes.Subuh = t.Fajr;
            prayerTimes.Dzuhur = t.Dhuhr;
            prayerTimes.Ashar = t.Asr;
            prayerTimes.Maghrib = t.Maghrib;
            prayerTimes.Isya = t.Isha;
            if (t.Sunrise) {
                const [sh, sm] = t.Sunrise.split(':').map(Number);
                const dhuhaTime = new Date(); dhuhaTime.setHours(sh, sm + 20);
                prayerTimes.Dhuha = dhuhaTime.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit', hour12:false}).replace('.',':');
            }
            if (data.data.date && data.data.date.hijri) {
                document.getElementById('hijriDisplay').innerText = `${data.data.date.hijri.day} ${data.data.date.hijri.month.en} ${data.data.date.hijri.year} H`;
            }
        }
    } catch (e) { console.error(e); }
    finally { loadRecordsFromCloud(); }
}

// --- LOGIKA UTAMA SEAMLESS (ANIMASI) ---

window.togglePrayer = (id, locked) => {
    if (locked) return;
    
    // 1. Update State Local
    const newState = !currentRecords[id];
    currentRecords[id] = newState;

    // 2. Animasi UI Langsung (Tanpa Reload)
    animatePrayerItem(id, newState);
    updateProgressBar();

    // 3. Simpan ke Database (Background Process)
    saveToFirestoreOnly(id, newState);
};

// Fungsi Animasi Dom Manipulation
function animatePrayerItem(id, isDone) {
    const card = document.getElementById(`card-${id}`);
    const title = document.getElementById(`title-${id}`);
    const iconBox = document.getElementById(`iconbox-${id}`);
    const checkBtn = document.getElementById(`checkbtn-${id}`);

    if(!card) return;

    // A. Efek "Pop" pada Kartu (Scale)
    card.classList.add('scale-[0.98]');
    setTimeout(() => card.classList.remove('scale-[0.98]'), 150);

    // B. Ubah Style Kartu
    if (isDone) {
        // Style: DONE
        card.classList.remove('border-slate-100', 'dark:border-slate-700', 'hover:border-emerald-300');
        card.classList.add('border-emerald-500', 'bg-emerald-50/50', 'dark:bg-emerald-900/10');
        
        // Style: Title
        title.classList.add('text-emerald-700', 'line-through', 'decoration-emerald-500/50');
        title.classList.remove('dark:text-slate-200');

        // Style: Icon Box
        iconBox.classList.remove('text-slate-400');
        iconBox.classList.add('text-emerald-600', 'dark:text-emerald-400');

        // Style: Check Button (Icon Checklist)
        checkBtn.innerHTML = `<div class="bg-emerald-500 text-white rounded-lg p-1 animate-[zoomIn_0.3s_ease-out]"><i data-lucide="check" class="w-4 h-4"></i></div>`;
    } else {
        // Style: UNDONE (Reset)
        card.classList.add('border-slate-100', 'dark:border-slate-700', 'hover:border-emerald-300');
        card.classList.remove('border-emerald-500', 'bg-emerald-50/50', 'dark:bg-emerald-900/10');
        
        // Style: Title
        title.classList.remove('text-emerald-700', 'line-through', 'decoration-emerald-500/50');
        title.classList.add('dark:text-slate-200');

        // Style: Icon Box
        iconBox.classList.add('text-slate-400');
        iconBox.classList.remove('text-emerald-600', 'dark:text-emerald-400');

        // Style: Check Button (Empty Box)
        checkBtn.innerHTML = `<div class="border-2 border-slate-200 dark:border-slate-600 rounded-lg w-6 h-6 transition-colors hover:border-emerald-400"></div>`;
    }
    
    // Refresh icon lucide yang baru di-inject
    if(window.lucide) lucide.createIcons();
}

function updateProgressBar() {
    let wajibTotal = 0, wajibDone = 0;
    
    // Hitung ulang progress
    PRAYER_CONFIG.forEach(p => {
        if(p.type === 'wajib') {
            wajibTotal++;
            if(currentRecords[p.id]) wajibDone++;
        }
    });

    // Update Bar UI
    const percent = wajibTotal === 0 ? 0 : Math.round((wajibDone / wajibTotal) * 100);
    document.getElementById('progressText').innerText = percent + '%';
    const pb = document.getElementById('progressBar');
    if(pb) {
        pb.style.width = percent + '%';
        pb.className = `h-full rounded-full transition-all duration-1000 ease-out ${percent === 100 ? 'bg-yellow-400 shadow-[0_0_10px_#facc15]' : 'bg-emerald-300'}`;
    }

    // Handle "Sempurna" Message
    const congratsId = "congratsMessage";
    const existingMsg = document.getElementById(congratsId);
    
    const isSubuhLocked = checkTimeAvailability(prayerTimes.Subuh).locked;

    if (wajibDone === wajibTotal && wajibTotal > 0 && !isSubuhLocked) {
        if (!existingMsg) {
            const msgHTML = `
            <div id="${congratsId}" class="mt-6 p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl text-center shadow-lg animate-[slideUp_0.5s_ease-out]">
                <p class="font-bold">✨ Alhamdulillah Sempurna! ✨</p>
                <p class="text-xs opacity-90">Pertahankan terus ya, Valdi!</p>
            </div>`;
            document.getElementById('prayerList').insertAdjacentHTML('beforeend', msgHTML);
        }
    } else {
        if (existingMsg) existingMsg.remove();
    }
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

    PRAYER_CONFIG.forEach((p, idx) => {
        const isDone = currentRecords[p.id] || false;
        const time = prayerTimes[p.id];
        const status = checkTimeAvailability(time);
        
        // CSS Logic (Initial Render)
        let wrapperClass = status.locked 
            ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed grayscale' 
            : (isDone 
                ? 'cursor-pointer bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-500 shadow-md' 
                : 'cursor-pointer bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-emerald-300 hover:shadow-md');

        let iconColor = isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400';
        let titleStyle = isDone ? 'text-emerald-700 line-through decoration-emerald-500/50' : 'dark:text-slate-200';
        
        let checkIcon = isDone 
            ? `<div class="bg-emerald-500 text-white rounded-lg p-1"><i data-lucide="check" class="w-4 h-4"></i></div>`
            : (status.locked ? `<i data-lucide="lock" class="w-4 h-4 text-slate-300"></i>` : `<div class="border-2 border-slate-200 dark:border-slate-600 rounded-lg w-6 h-6 transition-colors hover:border-emerald-400"></div>`);

        // Tambahkan ID unik: card-{id}, title-{id}, iconbox-{id}, checkbtn-{id}
        html += `
        <div id="card-${p.id}" onclick="togglePrayer('${p.id}', ${status.locked})" 
             class="slide-up flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 mb-3 ${wrapperClass}" 
             style="animation-delay: ${idx * 50}ms">
            <div class="flex items-center gap-4">
                <div id="iconbox-${p.id}" class="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 ${iconColor}">
                    <i data-lucide="${p.icon}" class="w-5 h-5"></i>
                </div>
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
    
    // Hitung progress awal tanpa animasi pop
    updateProgressBar();
}

function showLoading(show) {
    const el = document.getElementById('dataLoading');
    if(el) show ? el.classList.remove('hidden') : el.classList.add('hidden');
}

initTheme();