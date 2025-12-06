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

export function initTracker() {
    window.changeDate = changeDate;
    window.resetToToday = resetToToday;
    window.togglePrayer = togglePrayer;
    
    state.trackerDate = new Date();
    
    window.addEventListener('viewChanged', (e) => {
        if(e.detail.viewId === 'trackerView') {
            updateTrackerUI(); 
            loadRecordsFromCloud();
        }
    });
}

function formatDateKey(date) { 
    const offset = date.getTimezoneOffset(); 
    const localDate = new Date(date.getTime() - (offset*60*1000)); 
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
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
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
    if(elDate) {
        elDate.innerText = state.trackerDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    const isToday = state.trackerDate.getDate() === new Date().getDate() && 
                    state.trackerDate.getMonth() === new Date().getMonth();
    const resetBtn = document.getElementById('resetDateBtn');
    if(resetBtn) isToday ? resetBtn.classList.add('hidden') : resetBtn.classList.remove('hidden');

    calculateTrackerSchedule();

    const tEl = document.getElementById('trackerHijriDisplay');
    if(tEl) {
        tEl.innerText = getHijriDate(state.trackerDate, -1);
    }
}

function getHijriDate(date, adjustment = 0) {
    let d = new Date(date);
    d.setDate(d.getDate() + adjustment);

    let day = d.getDate();
    let month = d.getMonth();
    let year = d.getFullYear();

    let m = month + 1;
    let y = year;
    if (m < 3) {
        y -= 1;
        m += 12;
    }

    let a = Math.floor(y / 100);
    let b = 2 - a + Math.floor(a / 4);
    if (y < 1583) b = 0;
    if (y == 1582) {
        if (m > 10)  b = -10;
        if (m == 10) {
            b = 0;
            if (day > 4) b = -10;
        }
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
    if (ee > 13) {
        cc += 1;
        month = ee - 13;
    }
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

    const iMonthNames = ["Muharram","Safar","Rabi'ul Awal","Rabi'ul Akhir",
    "Jumadil Awal","Jumadil Akhir","Rajab","Sya'ban",
    "Ramadhan","Syawal","Dzulkaidah","Dzulhijjah"];

    return `${id} ${iMonthNames[im-1]} ${iy} H`;
}

// [UPDATE PENTING] Toggle visibility list saat loading
export async function loadRecordsFromCloud() {
    if (!state.currentUser) return;
    const dateKey = formatDateKey(state.trackerDate); 
    const loading = document.getElementById('dataLoading');
    const list = document.getElementById('prayerList'); 

    if(loading) loading.classList.remove('hidden');
    if(list) list.classList.add('hidden'); // Sembunyikan list lama

    try {
        const docSnap = await getDoc(doc(db, "users", state.currentUser.uid, "daily_records", dateKey));
        setCurrentRecords(docSnap.exists() ? docSnap.data() : {});
    } catch (e) { console.error(e); } 
    finally { 
        if(loading) loading.classList.add('hidden');
        if(list) list.classList.remove('hidden'); // Munculkan list baru
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
    if (locked) return;
    if (navigator.vibrate) navigator.vibrate(50);

    const newState = !state.currentRecords[id];
    state.currentRecords[id] = newState;
    
    const dateKey = formatDateKey(state.trackerDate);
    if(state.currentUser) {
        setDoc(doc(db, "users", state.currentUser.uid, "daily_records", dateKey), { [id]: newState, last_updated: new Date() }, { merge: true });
    }

    const pConfig = PRAYER_CONFIG.find(p => p.id === id);
    if(pConfig) {
        const oldEl = document.getElementById(`prayer-card-${id}`);
        if(oldEl) {
            const newHTML = createPrayerCardHTML(pConfig);
            oldEl.outerHTML = newHTML;
            const newEl = document.getElementById(`prayer-card-${id}`);
            if(window.lucide && newEl) lucide.createIcons({ root: newEl });
        }
    }

    updateProgressBar();
}

export function renderPrayers() {
    const container = document.getElementById('prayerList');
    if(!container) return;
    
    let html = '';
    PRAYER_CONFIG.forEach((p) => {
        html += createPrayerCardHTML(p);
    });
    
    container.innerHTML = html;
    if(window.lucide) lucide.createIcons();
    updateProgressBar();
}

function createPrayerCardHTML(p) {
    const isDone = state.currentRecords[p.id] || false;
    const time = trackerSchedule[p.id] || '--:--'; 
    const status = checkTimeAvailability(time);
    
    let wrapperClass, iconWrapperClass, textClass, timeClass, checkIcon;

    if (status.locked) {
        wrapperClass = "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60 grayscale cursor-not-allowed";
        iconWrapperClass = "bg-slate-200 dark:bg-slate-800 text-slate-400";
        textClass = "text-slate-400 dark:text-slate-600";
        timeClass = "bg-slate-200 dark:bg-slate-800 text-slate-400";
        checkIcon = `<div class="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center"><i data-lucide="lock" class="w-3 h-3 text-slate-400"></i></div>`;
    } else if (isDone) {
        wrapperClass = "bg-emerald-50/50 dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/50 shadow-sm";
        iconWrapperClass = `bg-gradient-to-br ${p.color} text-white shadow-lg ${p.shadow}`;
        textClass = "text-emerald-700 dark:text-emerald-400 font-bold decoration-emerald-500/30"; 
        timeClass = "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300";
        checkIcon = `<div class="w-8 h-8 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40 flex items-center justify-center text-white animate-[zoomIn_0.2s_ease-out]"><i data-lucide="check" class="w-5 h-5 font-bold"></i></div>`;
    } else {
        wrapperClass = "bg-white dark:bg-slate-900 border-white dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-98";
        iconWrapperClass = `bg-gradient-to-br ${p.color} text-white shadow-md ${p.shadow}`;
        textClass = "text-slate-700 dark:text-slate-200 font-bold";
        timeClass = "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400";
        checkIcon = `<div class="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-700 group-hover:border-emerald-300 transition-colors"></div>`;
    }

    return `
    <div id="prayer-card-${p.id}" onclick="togglePrayer('${p.id}', ${status.locked})" class="group relative flex items-center justify-between p-4 rounded-[1.5rem] border transition-all duration-300 ${wrapperClass}">
        <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${iconWrapperClass}">
                <i data-lucide="${p.icon}" class="w-6 h-6"></i>
            </div>
            <div>
                <h3 class="text-lg ${textClass}">${p.id}</h3>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold ${timeClass}">${time}</span>
                    ${p.type === 'sunnah' ? '<span class="text-[10px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100 font-medium">Sunnah</span>' : ''}
                </div>
            </div>
        </div>
        <div class="relative z-10">${checkIcon}</div>
    </div>`;
}

export function updateProgressBar() {
    let wT = 0, wD = 0;
    PRAYER_CONFIG.forEach(p => { 
        if(p.type === 'wajib') { 
            wT++; 
            if(state.currentRecords[p.id]) wD++; 
        } 
    });
    const pct = wT === 0 ? 0 : Math.round((wD/wT)*100);
    const pbText = document.getElementById('progressText');
    const pb = document.getElementById('progressBar');
    
    if(pbText) {
        let start = parseInt(pbText.innerText) || 0;
        if(start !== pct) pbText.innerText = pct + '%';
    }
    if(pb) { 
        pb.style.width = pct + '%'; 
        if(pct === 100) {
            pb.classList.remove('from-emerald-400', 'to-teal-500');
            pb.classList.add('from-emerald-500', 'to-emerald-400');
        }
    }
}

function checkTimeAvailability(prayerTimeStr) {
    if (!prayerTimeStr || prayerTimeStr === '--:--') return { locked: true };
    
    const [h, m] = prayerTimeStr.split(':').map(Number);
    const pDate = new Date(state.trackerDate.getTime());
    pDate.setHours(h, m, 0, 0); 
    
    const now = new Date(); 
    const todayZero = new Date(); 
    todayZero.setHours(0,0,0,0);
    
    const currentZero = new Date(state.trackerDate.getTime());
    currentZero.setHours(0,0,0,0);
    
    if (currentZero.getTime() > todayZero.getTime()) return { locked: true }; 
    if (currentZero.getTime() < todayZero.getTime()) return { locked: false };
    if (now.getTime() < pDate.getTime()) return { locked: true }; 
    
    return { locked: false }; 
}