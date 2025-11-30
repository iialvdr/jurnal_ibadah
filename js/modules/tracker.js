import { state, setCurrentRecords } from '../state.js';
import { db } from '../config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { updateDateUI } from './home.js';

const PRAYER_CONFIG = [
    { id: 'Subuh', type: 'wajib', icon: 'sunrise' },
    { id: 'Dhuha', type: 'sunnah', icon: 'sun' },
    { id: 'Dzuhur', type: 'wajib', icon: 'sun' },
    { id: 'Ashar', type: 'wajib', icon: 'sun' },
    { id: 'Maghrib', type: 'wajib', icon: 'sunset' },
    { id: 'Isya', type: 'wajib', icon: 'moon' },
    { id: 'Tahajud', type: 'sunnah', icon: 'star' }
];

export function initTracker() {
    window.changeDate = changeDate;
    window.resetToToday = resetToToday;
    window.togglePrayer = togglePrayer;
    
    // Listener saat jadwal sholat berubah (dari home.js)
    window.addEventListener('prayerTimesUpdated', renderPrayers);
    // Listener saat view berubah ke tracker
    window.addEventListener('viewChanged', (e) => {
        if(e.detail.viewId === 'trackerView') {
            loadRecordsFromCloud();
            renderPrayers();
        }
    });
}

function formatDateKey(date) { 
    const offset = date.getTimezoneOffset(); 
    const localDate = new Date(date.getTime() - (offset*60*1000)); 
    return localDate.toISOString().split('T')[0]; 
}

export async function loadRecordsFromCloud() {
    if (!state.currentUser) return;
    const dateKey = formatDateKey(state.currentDate);
    const loading = document.getElementById('dataLoading');
    if(loading) loading.classList.remove('hidden');

    try {
        const docSnap = await getDoc(doc(db, "users", state.currentUser.uid, "daily_records", dateKey));
        setCurrentRecords(docSnap.exists() ? docSnap.data() : {});
    } catch (e) { console.error(e); } 
    finally { 
        if(loading) loading.classList.add('hidden');
        renderPrayers(); 
    }
}

function changeDate(days) {
    state.currentDate.setDate(state.currentDate.getDate() + days);
    updateDateUI();
    // Refresh jadwal sholat jika tanggal berubah (panggil fetchJadwal di home.js via global atau event, 
    // tapi karena fetchJadwal butuh lat/lng, kita trigger getLocation simpelnya atau asumsi latlng ada di window)
    if(window.lastLat) window.refreshLocation(); // Hacky but works for now
    loadRecordsFromCloud();
}

function resetToToday() {
    state.currentDate = new Date();
    updateDateUI();
    if(window.lastLat) window.refreshLocation();
    loadRecordsFromCloud();
}

function togglePrayer(id, locked) {
    if (locked) return;
    const newState = !state.currentRecords[id];
    state.currentRecords[id] = newState;
    
    // Save to DB
    const dateKey = formatDateKey(state.currentDate);
    if(state.currentUser) {
        setDoc(doc(db, "users", state.currentUser.uid, "daily_records", dateKey), { [id]: newState, last_updated: new Date() }, { merge: true });
    }

    renderPrayers(); // Re-render logic handled inside animatePrayerItem ideally, but full render is safe
}

export function renderPrayers() {
    const container = document.getElementById('prayerList');
    if(!container) return;
    
    let html = '';
    PRAYER_CONFIG.forEach((p) => {
        const isDone = state.currentRecords[p.id] || false;
        const time = state.prayerTimes[p.id];
        const status = checkTimeAvailability(time);
        
        let wrapperClass = status.locked ? 'bg-slate-100/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/30 opacity-60 cursor-not-allowed grayscale' : (isDone ? 'cursor-pointer bg-emerald-50/60 dark:bg-emerald-900/20 border-emerald-500/50' : 'cursor-pointer bg-white/60 dark:bg-slate-800/60 border-white/40 dark:border-slate-700/40 hover:border-emerald-300');
        let checkIcon = isDone ? `<div class="bg-emerald-500 text-white rounded-lg p-1"><i data-lucide="check" class="w-4 h-4"></i></div>` : (status.locked ? `<i data-lucide="lock" class="w-4 h-4 text-slate-300"></i>` : `<div class="border-2 border-slate-200 dark:border-slate-600 rounded-lg w-6 h-6"></div>`);
        
        html += `<div onclick="togglePrayer('${p.id}', ${status.locked})" class="flex items-center justify-between p-4 rounded-2xl border transition mb-3 ${wrapperClass}">
            <div class="flex items-center gap-4">
                <div class="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 ${isDone ? 'text-emerald-600' : 'text-slate-400'}"><i data-lucide="${p.icon}" class="w-5 h-5"></i></div>
                <div>
                    <h3 class="font-bold text-base ${isDone ? 'text-emerald-700 line-through' : 'dark:text-slate-200'}">${p.id}</h3>
                    <div class="flex items-center gap-2 text-xs mt-1"><span class="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">${time}</span></div>
                </div>
            </div>
            <div>${checkIcon}</div>
        </div>`;
    });
    container.innerHTML = html;
    if(window.lucide) lucide.createIcons();
    updateProgressBar();
}

export function updateProgressBar() {
    let wT = 0, wD = 0;
    PRAYER_CONFIG.forEach(p => { if(p.type === 'wajib') { wT++; if(state.currentRecords[p.id]) wD++; } });
    const pct = wT === 0 ? 0 : Math.round((wD/wT)*100);
    
    const pbText = document.getElementById('progressText');
    const pb = document.getElementById('progressBar');
    if(pbText) pbText.innerText = pct + '%';
    if(pb) { pb.style.width = pct + '%'; }
}

function checkTimeAvailability(prayerTimeStr) {
    if (!prayerTimeStr || prayerTimeStr === '--:--') return { locked: true };
    const [h, m] = prayerTimeStr.split(':').map(Number);
    const pDate = new Date(state.currentDate); pDate.setHours(h, m, 0, 0);
    const now = new Date();
    
    if (now < pDate && state.currentDate.toDateString() === now.toDateString()) return { locked: true };
    if (state.currentDate.getTime() > now.getTime() && state.currentDate.toDateString() !== now.toDateString()) return { locked: true };
    return { locked: false };
}