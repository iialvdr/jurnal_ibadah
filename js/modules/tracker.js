import { state, setCurrentRecords } from '../state.js';
import { db } from '../config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const PRAYER_CONFIG = [
    {
        id: 'Subuh', type: 'wajib', icon: 'sunrise',
        bgGradient: 'from-sky-400 to-blue-500',
        activeBg: 'bg-sky-50 dark:bg-sky-900/20',
        activeBorder: 'border-sky-200 dark:border-sky-800',
        textActive: 'text-sky-700 dark:text-sky-300'
    },
    {
        id: 'Dhuha', type: 'sunnah', icon: 'sun',
        bgGradient: 'from-amber-300 to-orange-400',
        activeBg: 'bg-amber-50 dark:bg-amber-900/20',
        activeBorder: 'border-amber-200 dark:border-amber-800',
        textActive: 'text-amber-700 dark:text-amber-300'
    },
    {
        id: 'Dzuhur', type: 'wajib', icon: 'sun-medium',
        bgGradient: 'from-yellow-400 to-amber-500',
        activeBg: 'bg-yellow-50 dark:bg-yellow-900/20',
        activeBorder: 'border-yellow-200 dark:border-yellow-800',
        textActive: 'text-yellow-700 dark:text-yellow-300'
    },
    {
        id: 'Ashar', type: 'wajib', icon: 'cloud-sun',
        bgGradient: 'from-orange-400 to-red-400',
        activeBg: 'bg-orange-50 dark:bg-orange-900/20',
        activeBorder: 'border-orange-200 dark:border-orange-800',
        textActive: 'text-orange-700 dark:text-orange-300'
    },
    {
        id: 'Maghrib', type: 'wajib', icon: 'sunset',
        bgGradient: 'from-indigo-400 to-purple-500',
        activeBg: 'bg-indigo-50 dark:bg-indigo-900/20',
        activeBorder: 'border-indigo-200 dark:border-indigo-800',
        textActive: 'text-indigo-700 dark:text-indigo-300'
    },
    {
        id: 'Isya', type: 'wajib', icon: 'moon',
        bgGradient: 'from-slate-600 to-slate-800',
        activeBg: 'bg-slate-100 dark:bg-slate-800',
        activeBorder: 'border-slate-200 dark:border-slate-700',
        textActive: 'text-slate-700 dark:text-slate-300'
    },
    {
        id: 'Tahajud', type: 'sunnah', icon: 'star',
        bgGradient: 'from-violet-500 to-fuchsia-600',
        activeBg: 'bg-violet-50 dark:bg-violet-900/20',
        activeBorder: 'border-violet-200 dark:border-violet-800',
        textActive: 'text-violet-700 dark:text-violet-300'
    }
];

let trackerSchedule = {};
let saveDebounceTimer = null;

export function initTracker() {
    window.changeDate = changeDate;
    window.resetToToday = resetToToday;
    window.togglePrayer = togglePrayer;
    window.changeTrackerTab = changeTrackerTab;

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
        trackerSchedule.Tahajud = '03:00';
        trackerSchedule.Dhuha = '06:30';
        return;
    }

    const coordinates = new adhan.Coordinates(window.lastLat, window.lastLng);
    const date = state.trackerDate;
    const params = adhan.CalculationMethod.Singapore();
    params.madhab = adhan.Madhab.Shafi;
    const prayerTimes = new adhan.PrayerTimes(coordinates, date, params);

    const timeFormat = (t) => t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');

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
        elDate.innerText = state.trackerDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    const today = new Date();
    const isToday = state.trackerDate.getDate() === today.getDate() &&
        state.trackerDate.getMonth() === today.getMonth() &&
        state.trackerDate.getFullYear() === today.getFullYear();

    const resetBtn = document.getElementById('resetDateContainer');
    const hijriDisplay = document.getElementById('trackerHijriDisplay');

    if (resetBtn) {
        if (isToday) {
            resetBtn.classList.add('hidden');
        } else {
            resetBtn.classList.remove('hidden');
        }
    }

    if (hijriDisplay) {
        hijriDisplay.classList.remove('hidden');
    }

    calculateTrackerSchedule();

    if (hijriDisplay) {
        const h = calculateHijri(state.trackerDate, -1);
        const months = ["Muharram", "Safar", "Rabi'ul Awal", "Rabi'ul Akhir", "Jumadil Awal", "Jumadil Akhir", "Rajab", "Sya'ban", "Ramadhan", "Syawal", "Dzulkaidah", "Dzulhijjah"];
        hijriDisplay.innerText = `${h.day} ${months[h.month]} ${h.year} H`;
    }

    if (window.lucide) lucide.createIcons();
}

export async function loadRecordsFromCloud() {
    if (!state.currentUser) return;
    const dateKey = formatDateKey(state.trackerDate);

    try {
        const docSnap = await getDoc(doc(db, "users", state.currentUser.uid, "daily_records", dateKey));
        setCurrentRecords(docSnap.exists() ? docSnap.data() : {});
    } catch (e) { console.error(e); }
    finally {
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

function togglePrayer(id, locked) {
    if (locked) {
        if (navigator.vibrate) navigator.vibrate(200);
        return;
    }

    if (navigator.vibrate) navigator.vibrate(50);

    const newState = !state.currentRecords[id];
    state.currentRecords[id] = newState;

    const card = document.getElementById(`prayer-card-${id}`);
    const p = PRAYER_CONFIG.find(x => x.id === id);

    if (card && p) updateCardVisuals(card, p, newState);
    updateProgressBar();

    if (state.currentUser) {
        if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
        saveDebounceTimer = setTimeout(() => {
            const dateKey = formatDateKey(state.trackerDate);
            const dataToSave = { ...state.currentRecords, last_updated: new Date() };
            setDoc(doc(db, "users", state.currentUser.uid, "daily_records", dateKey), dataToSave, { merge: true });
        }, 800);
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

    // 1. Masa lalu: UNLOCKED
    if (currentZero.getTime() < todayZero.getTime()) return { locked: false };

    // 2. Masa depan: LOCKED
    if (currentZero.getTime() > todayZero.getTime()) return { locked: true };

    // 3. Hari ini: Cek Jam
    if (now.getTime() < pDate.getTime()) return { locked: true };

    return { locked: false };
}

function updateCardVisuals(card, p, isDone) {
    if (isDone) {
        card.className = `group relative flex items-center justify-between p-4 rounded-[1.8rem] border transition-all duration-300 shadow-sm ${p.activeBg} ${p.activeBorder}`;
    } else {
        card.className = `group relative flex items-center justify-between p-4 rounded-[1.8rem] border transition-all duration-300 bg-white dark:bg-slate-900 border-white dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 active:scale-[0.98] cursor-pointer`;
    }

    const iconWrap = card.querySelector('.icon-wrapper');
    if (isDone) {
        iconWrap.className = `icon-wrapper w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 scale-105 bg-gradient-to-br ${p.bgGradient} text-white shadow-lg shadow-emerald-500/20`;
    } else {
        iconWrap.className = `icon-wrapper w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500`;
    }

    const title = card.querySelector('.prayer-title');
    if (isDone) title.className = `prayer-title text-base font-bold transition-colors duration-300 ${p.textActive}`;
    else title.className = `prayer-title text-base font-bold transition-colors duration-300 text-slate-700 dark:text-slate-200`;

    const checkContainer = card.querySelector('.check-container');
    if (isDone) {
        checkContainer.className = "check-container relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 bg-emerald-500 shadow-lg shadow-emerald-500/40 scale-110";
        checkContainer.innerHTML = `<i data-lucide="check" class="w-4 h-4 text-white font-bold animate-[zoomIn_0.2s_ease-out]"></i>`;
    } else {
        checkContainer.className = "check-container relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 bg-transparent border-2 border-slate-100 dark:border-slate-700 group-hover:border-emerald-300";
        checkContainer.innerHTML = ``;
    }
    if (window.lucide && isDone) lucide.createIcons({ root: checkContainer });
}

export function renderPrayers() {
    const container = document.getElementById('trackerList');
    if (!container) return;

    let html = '';
    PRAYER_CONFIG.forEach((p) => {
        html += createPrayerCardHTML(p);
    });

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons({ root: container });
    updateProgressBar();
}

function createPrayerCardHTML(p) {
    const isDone = state.currentRecords[p.id] || false;
    const time = trackerSchedule[p.id] || '--:--';

    // CEK KETERSEDIAAN WAKTU
    const status = checkTimeAvailability(time);
    const isLocked = status.locked;

    if (isLocked) {
        return `
        <div id="prayer-card-${p.id}" class="group relative flex items-center justify-between p-4 rounded-[1.8rem] border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 opacity-60 cursor-not-allowed" onclick="togglePrayer('${p.id}', true)">
            <div class="flex items-center gap-4 grayscale">
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-200 dark:bg-slate-800 text-slate-400">
                    <i data-lucide="${p.icon}" class="w-6 h-6"></i>
                </div>
                <div>
                    <h3 class="text-base font-bold text-slate-400 dark:text-slate-600">${p.id}</h3>
                    <div class="flex items-center gap-1.5 mt-0.5">
                        <i data-lucide="lock" class="w-3 h-3 text-slate-400"></i>
                        <span class="text-[10px] font-mono font-bold text-slate-400">${time}</span>
                    </div>
                </div>
            </div>
        </div>`;
    }

    const wrapperClass = isDone
        ? `${p.activeBg} ${p.activeBorder} shadow-sm`
        : `bg-white dark:bg-slate-900 border-white dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 active:scale-[0.98] cursor-pointer`;

    const iconWrapClass = isDone
        ? `bg-gradient-to-br ${p.bgGradient} text-white shadow-lg shadow-emerald-500/20 scale-105`
        : `bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 group-hover:scale-110`;

    const titleClass = isDone ? p.textActive : `text-slate-700 dark:text-slate-200`;

    const checkContainerClass = isDone
        ? "bg-emerald-500 shadow-lg shadow-emerald-500/40 scale-110"
        : "bg-transparent border-2 border-slate-100 dark:border-slate-700 group-hover:border-emerald-300";

    const checkInner = isDone
        ? `<i data-lucide="check" class="w-4 h-4 text-white font-bold animate-[zoomIn_0.2s_ease-out]"></i>`
        : ``;

    return `
    <div id="prayer-card-${p.id}" onclick="togglePrayer('${p.id}', false)" class="group relative flex items-center justify-between p-4 rounded-[1.8rem] border transition-all duration-300 ${wrapperClass}">
        <div class="flex items-center gap-4">
            <div class="icon-wrapper w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${iconWrapClass}">
                <i data-lucide="${p.icon}" class="w-6 h-6"></i>
            </div>
            <div>
                <h3 class="prayer-title text-base font-bold transition-colors duration-300 ${titleClass}">${p.id}</h3>
                <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">${time}</span>
                    ${p.type === 'sunnah' ? '<span class="text-[9px] text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-md border border-amber-100 dark:border-amber-800/30 font-bold tracking-wide uppercase">Sunnah</span>' : ''}
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

    // Update Desktop
    const pbText = document.getElementById('progressText');
    const pb = document.getElementById('progressBar');
    if (pbText) pbText.innerText = pct + '%';
    if (pb) pb.style.width = pct + '%';

    // Update Mobile
    const pbTextMobile = document.getElementById('progressTextMobile');
    const pbMobile = document.getElementById('progressBarMobile');
    if (pbTextMobile) pbTextMobile.innerText = pct + '%';
    if (pbMobile) pbMobile.style.width = pct + '%';
}

function changeTrackerTab(tab) {
    const btnDaily = document.getElementById('tabDaily');
    const btnHistory = document.getElementById('tabHistory');
    const viewDaily = document.getElementById('viewDaily');
    const viewHistory = document.getElementById('viewHistory');

    const activeClass = [
        "bg-white",
        "dark:bg-slate-800",
        "text-emerald-600",
        "shadow-sm",
        "border",
        "border-slate-100",
        "dark:border-slate-700"
    ];

    // Inactive Class sudah termasuk border-transparent
    const inactiveClass = [
        "text-slate-400",
        "hover:text-emerald-600",
        "hover:bg-white/50",
        "dark:hover:bg-slate-800/50",
        "border-transparent"
    ];

    if (tab === 'daily') {
        btnDaily.classList.add(...activeClass);
        btnDaily.classList.remove(...inactiveClass);
        btnHistory.classList.remove(...activeClass);
        btnHistory.classList.add(...inactiveClass);
        viewDaily.classList.remove('hidden');
        viewHistory.classList.add('hidden');
    } else {
        btnHistory.classList.add(...activeClass);
        btnHistory.classList.remove(...inactiveClass);
        btnDaily.classList.remove(...activeClass);
        btnDaily.classList.add(...inactiveClass);
        viewHistory.classList.remove('hidden');
        viewDaily.classList.add('hidden');
    }
}

function calculateHijri(date, adjustment = -1) {
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
    if (y == 1582) {
        if (m > 10) b = -10;
        if (m == 10) { b = 0; if (day > 4) b = -10; }
    }

    let jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524;
    let b0 = 0;
    if (jd > 2299160) {
        let a = Math.floor((jd - 1867216.25) / 36524.25);
        b0 = 1 + a - Math.floor(a / 4);
    }
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