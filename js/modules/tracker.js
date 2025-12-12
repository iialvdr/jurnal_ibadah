import { state, setCurrentRecords } from '../state.js';
import { db } from '../config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const PRAYER_CONFIG = [
    { id: 'Subuh', type: 'wajib', icon: 'sunrise', color: 'from-sky-400 to-blue-500', shadow: 'shadow-blue-500/30' },
    { id: 'Dhuha', type: 'sunnah', icon: 'sun', color: 'from-amber-300 to-orange-400', shadow: 'shadow-orange-500/30' },
    { id: 'Dzuhur', type: 'wajib', icon: 'sun-medium', color: 'from-yellow-400 to-amber-500', shadow: 'shadow-yellow-500/30' },
    { id: 'Ashar', type: 'wajib', icon: 'cloud-sun', color: 'from-orange-400 to-red-400', shadow: 'shadow-orange-500/30' },
    { id: 'Maghrib', type: 'wajib', icon: 'sunset', color: 'from-indigo-400 to-purple-500', shadow: 'shadow-purple-500/30' },
    { id: 'Isya', type: 'wajib', icon: 'moon', color: 'from-slate-600 to-slate-800', shadow: 'shadow-slate-500/30' },
    { id: 'Tahajud', type: 'sunnah', icon: 'star', color: 'from-violet-500 to-fuchsia-600', shadow: 'shadow-fuchsia-500/30' }
];

let trackerSchedule = {};
// [OPTIMASI] Timer untuk menunda penyimpanan ke database
let saveDebounceTimer = null;

export function initTracker() {
    window.changeDate = changeDate;
    window.resetToToday = resetToToday;
    window.togglePrayer = togglePrayer;

    state.trackerDate = new Date();

    window.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'trackerView') {
            updateTrackerUI();
            loadRecordsFromCloud();
        }
    });
}

function formatDateKey(date) {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
}

function calculateTrackerSchedule() {
    if (typeof adhan === 'undefined' || !window.lastLat || !window.lastLng) {
        trackerSchedule = { ...state.prayerTimes };
        return;
    }

    const coordinates = new adhan.Coordinates(window.lastLat, window.lastLng);
    const date = state.trackerDate;
    const params = adhan.CalculationMethod.Singapore();
    params.madhab = adhan.Madhab.Shafi;
    params.fajrAngle = 20;
    params.ishaAngle = 18;

    const prayerTimes = new adhan.PrayerTimes(coordinates, date, params);

    const timeFormat = (t) => {
        return t.toLocaleTimeString('id-ID', {
            hour: '2-digit', minute: '2-digit', hour12: false
        }).replace('.', ':');
    };

    const dhuhaTime = new Date(prayerTimes.sunrise.getTime() + (20 * 60000));

    trackerSchedule = {
        Subuh: timeFormat(prayerTimes.fajr),
        Dhuha: timeFormat(dhuhaTime),
        Dzuhur: timeFormat(prayerTimes.dhuhr),
        Ashar: timeFormat(prayerTimes.asr),
        Maghrib: timeFormat(prayerTimes.maghrib),
        Isya: timeFormat(prayerTimes.isha),
        Tahajud: '03:00'
    };
}

async function updateTrackerUI() {
    const elDate = document.getElementById('dateDisplay');
    if (elDate) {
        elDate.innerText = state.trackerDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    const isToday = state.trackerDate.getDate() === new Date().getDate() &&
        state.trackerDate.getMonth() === new Date().getMonth();
    const resetBtn = document.getElementById('resetDateBtn');
    if (resetBtn) isToday ? resetBtn.classList.add('hidden') : resetBtn.classList.remove('hidden');

    calculateTrackerSchedule();

    const tEl = document.getElementById('trackerHijriDisplay');
    if (tEl) {
        // Asumsi fungsi getHijriDate ada di scope global atau import (sesuaikan jika perlu)
        // Di file asli ada fungsi getHijriDate internal, kita salin yang simple
        tEl.innerText = getTrackerHijriDate(state.trackerDate, -1);
    }
}

// Helper Hijri simple lokal (agar tidak dependensi silang ribet)
function getTrackerHijriDate(date, adjustment = 0) {
    // ... (Fungsi Hijriyah standar, sama seperti sebelumnya) ...
    // Untuk ringkasnya, gunakan logika yang sudah ada di file lama atau import dari home.js jika export
    // Di sini saya asumsikan Valdi pakai kode lama untuk logic hijriah, 
    // tapi agar file ini jalan, pastikan fungsi ini ada.
    return window.calculateHijri ? window.calculateHijri(date, adjustment) : "...";
}

export async function loadRecordsFromCloud() {
    if (!state.currentUser) return;
    const dateKey = formatDateKey(state.trackerDate);
    const loading = document.getElementById('dataLoading');
    const list = document.getElementById('prayerList');

    if (loading) loading.classList.remove('hidden');
    if (list) list.classList.add('hidden');

    try {
        const docSnap = await getDoc(doc(db, "users", state.currentUser.uid, "daily_records", dateKey));
        setCurrentRecords(docSnap.exists() ? docSnap.data() : {});
    } catch (e) { console.error(e); }
    finally {
        if (loading) loading.classList.add('hidden');
        if (list) list.classList.remove('hidden');
        renderPrayers();
    }
}

function changeDate(days) {
    state.trackerDate.setDate(state.trackerDate.getDate() + days);
    updateTrackerUI();
    loadRecordsFromCloud();
}

function resetToToday() {
    state.trackerDate = new Date();
    updateTrackerUI();
    loadRecordsFromCloud();
}

// [OPTIMASI] Toggle dengan Debounce Save
function togglePrayer(id, locked) {
    if (locked) return;
    if (navigator.vibrate) navigator.vibrate(50);

    // 1. Update STATE & UI SEKETIKA (Optimistic UI)
    const newState = !state.currentRecords[id];
    state.currentRecords[id] = newState;

    const card = document.getElementById(`prayer-card-${id}`);
    const p = PRAYER_CONFIG.find(x => x.id === id);
    if (card && p) updateCardVisuals(card, p, newState);
    updateProgressBar();

    // 2. Tunda penyimpanan ke DB (Debounce)
    if (state.currentUser) {
        // Hapus timer sebelumnya jika user klik lagi sebelum 1 detik
        if (saveDebounceTimer) clearTimeout(saveDebounceTimer);

        saveDebounceTimer = setTimeout(() => {
            const dateKey = formatDateKey(state.trackerDate);
            // Simpan seluruh state hari ini agar konsisten
            // Tambahkan last_updated agar server tau ini data baru
            const dataToSave = { ...state.currentRecords, last_updated: new Date() };

            setDoc(doc(db, "users", state.currentUser.uid, "daily_records", dateKey), dataToSave, { merge: true })
                .then(() => console.log("Data tersimpan (Debounced)"))
                .catch(e => console.error("Gagal simpan:", e));
        }, 1000); // Tunggu 1 detik hening baru simpan
    }
}

function updateCardVisuals(card, p, isDone) {
    if (isDone) {
        card.classList.remove('bg-white', 'dark:bg-slate-900', 'border-white', 'dark:border-slate-800');
        card.classList.add('bg-emerald-50/50', 'dark:bg-slate-900', 'border-emerald-200', 'dark:border-emerald-900/50', 'shadow-sm');
    } else {
        card.classList.remove('bg-emerald-50/50', 'dark:bg-slate-900', 'border-emerald-200', 'dark:border-emerald-900/50', 'shadow-sm');
        card.classList.add('bg-white', 'dark:bg-slate-900', 'border-white', 'dark:border-slate-800');
    }

    const iconWrap = card.querySelector('.icon-wrapper');
    if (isDone) {
        iconWrap.className = `icon-wrapper w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 scale-110 bg-gradient-to-br ${p.color} text-white shadow-lg ${p.shadow}`;
    } else {
        iconWrap.className = `icon-wrapper w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 bg-gradient-to-br ${p.color} text-white shadow-md ${p.shadow}`;
    }

    const title = card.querySelector('.prayer-title');
    if (isDone) {
        title.className = "prayer-title text-lg transition-colors duration-300 text-emerald-700 dark:text-emerald-400 font-bold decoration-emerald-500/30";
    } else {
        title.className = "prayer-title text-lg transition-colors duration-300 text-slate-700 dark:text-slate-200 font-bold";
    }

    const checkContainer = card.querySelector('.check-container');
    if (isDone) {
        checkContainer.className = "check-container relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 bg-emerald-500 shadow-lg shadow-emerald-500/40 border-transparent";
        checkContainer.innerHTML = `<i data-lucide="check" class="w-5 h-5 text-white font-bold animate-[zoomIn_0.2s_ease-out]"></i>`;
    } else {
        checkContainer.className = "check-container relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 bg-transparent border-2 border-slate-200 dark:border-slate-700 group-hover:border-emerald-300";
        checkContainer.innerHTML = ``;
    }
    if (window.lucide && isDone) lucide.createIcons({ root: checkContainer });
}

export function renderPrayers() {
    const container = document.getElementById('prayerList');
    if (!container) return;

    let html = '';
    PRAYER_CONFIG.forEach((p) => {
        html += createPrayerCardHTML(p);
    });

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
    updateProgressBar();
}

function createPrayerCardHTML(p) {
    const isDone = state.currentRecords[p.id] || false;
    const time = trackerSchedule[p.id] || '--:--';
    const status = checkTimeAvailability(time);

    if (status.locked) {
        return `
        <div id="prayer-card-${p.id}" class="group relative flex items-center justify-between p-4 rounded-[1.5rem] border transition-all duration-300 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60 grayscale cursor-not-allowed" onclick="togglePrayer('${p.id}', true)">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-200 dark:bg-slate-800 text-slate-400">
                    <i data-lucide="${p.icon}" class="w-6 h-6"></i>
                </div>
                <div>
                    <h3 class="text-lg text-slate-400 dark:text-slate-600 font-bold">${p.id}</h3>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold bg-slate-200 dark:bg-slate-800 text-slate-400">${time}</span>
                    </div>
                </div>
            </div>
            <div class="relative z-10 w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center">
                <i data-lucide="lock" class="w-3 h-3 text-slate-400"></i>
            </div>
        </div>`;
    }

    const wrapperClass = isDone ? "bg-emerald-50/50 dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/50 shadow-sm" : "bg-white dark:bg-slate-900 border-white dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-98";
    const iconWrapClass = isDone ? `bg-gradient-to-br ${p.color} text-white shadow-lg ${p.shadow} scale-110` : `bg-gradient-to-br ${p.color} text-white shadow-md ${p.shadow}`;
    const textClass = isDone ? "text-emerald-700 dark:text-emerald-400 font-bold decoration-emerald-500/30" : "text-slate-700 dark:text-slate-200 font-bold";
    const timeClass = isDone ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400";
    const checkContainerClass = isDone ? "bg-emerald-500 shadow-lg shadow-emerald-500/40 border-transparent" : "bg-transparent border-2 border-slate-200 dark:border-slate-700 group-hover:border-emerald-300";
    const checkInner = isDone ? `<i data-lucide="check" class="w-5 h-5 text-white font-bold animate-[zoomIn_0.2s_ease-out]"></i>` : ``;

    return `
    <div id="prayer-card-${p.id}" onclick="togglePrayer('${p.id}', false)" class="group relative flex items-center justify-between p-4 rounded-[1.5rem] border transition-all duration-300 ${wrapperClass}">
        <div class="flex items-center gap-4">
            <div class="icon-wrapper w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${iconWrapClass}">
                <i data-lucide="${p.icon}" class="w-6 h-6"></i>
            </div>
            <div>
                <h3 class="prayer-title text-lg transition-colors duration-300 ${textClass}">${p.id}</h3>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold transition-colors duration-300 ${timeClass}">${time}</span>
                    ${p.type === 'sunnah' ? '<span class="text-[10px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100 font-medium">Sunnah</span>' : ''}
                </div>
            </div>
        </div>
        <div class="check-container relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${checkContainerClass}">${checkInner}</div>
    </div>`;
}

export function updateProgressBar() {
    let wT = 0, wD = 0;
    PRAYER_CONFIG.forEach(p => {
        if (p.type === 'wajib') {
            wT++;
            if (state.currentRecords[p.id]) wD++;
        }
    });
    const pct = wT === 0 ? 0 : Math.round((wD / wT) * 100);
    const pbText = document.getElementById('progressText');
    const pb = document.getElementById('progressBar');
    if (pbText) pbText.innerText = pct + '%';
    if (pb) {
        pb.style.width = pct + '%';
        if (pct === 100) { pb.classList.remove('from-emerald-400', 'to-teal-500'); pb.classList.add('from-emerald-500', 'to-emerald-400'); }
        else { pb.classList.add('from-emerald-400', 'to-teal-500'); pb.classList.remove('from-emerald-500', 'to-emerald-400'); }
    }
}

function checkTimeAvailability(prayerTimeStr) {
    if (!prayerTimeStr || prayerTimeStr === '--:--') return { locked: true };
    const [h, m] = prayerTimeStr.split(':').map(Number);
    const pDate = new Date(state.trackerDate.getTime());
    pDate.setHours(h, m, 0, 0);
    const now = new Date();
    const todayZero = new Date(); todayZero.setHours(0, 0, 0, 0);
    const currentZero = new Date(state.trackerDate.getTime()); currentZero.setHours(0, 0, 0, 0);
    if (currentZero.getTime() > todayZero.getTime()) return { locked: true };
    if (currentZero.getTime() < todayZero.getTime()) return { locked: false };
    if (now.getTime() < pDate.getTime()) return { locked: true };
    return { locked: false };
}