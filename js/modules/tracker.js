import { state, setCurrentRecords } from '../state.js';
import { db } from '../config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { updateDateUI } from './home.js';

// Konfigurasi Sholat dengan Warna Gradient Premium
const PRAYER_CONFIG = [
    { id: 'Subuh', type: 'wajib', icon: 'sunrise', color: 'from-sky-400 to-blue-500', shadow: 'shadow-blue-500/30' },
    { id: 'Dhuha', type: 'sunnah', icon: 'sun', color: 'from-amber-300 to-orange-400', shadow: 'shadow-orange-500/30' },
    { id: 'Dzuhur', type: 'wajib', icon: 'sun-medium', color: 'from-yellow-400 to-amber-500', shadow: 'shadow-yellow-500/30' },
    { id: 'Ashar', type: 'wajib', icon: 'cloud-sun', color: 'from-orange-400 to-red-400', shadow: 'shadow-orange-500/30' },
    { id: 'Maghrib', type: 'wajib', icon: 'sunset', color: 'from-indigo-400 to-purple-500', shadow: 'shadow-purple-500/30' },
    { id: 'Isya', type: 'wajib', icon: 'moon', color: 'from-slate-600 to-slate-800', shadow: 'shadow-slate-500/30' },
    { id: 'Tahajud', type: 'sunnah', icon: 'star', color: 'from-violet-500 to-fuchsia-600', shadow: 'shadow-fuchsia-500/30' }
];

export function initTracker() {
    window.changeDate = changeDate;
    window.resetToToday = resetToToday;
    window.togglePrayer = togglePrayer;
    
    window.addEventListener('prayerTimesUpdated', renderPrayers);
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
    if(window.lastLat) window.refreshLocation(); 
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
    
    // Efek Haptic getar di HP saat ditekan
    if (navigator.vibrate) navigator.vibrate(50);

    const newState = !state.currentRecords[id];
    state.currentRecords[id] = newState;
    
    // Save to DB
    const dateKey = formatDateKey(state.currentDate);
    if(state.currentUser) {
        setDoc(doc(db, "users", state.currentUser.uid, "daily_records", dateKey), { [id]: newState, last_updated: new Date() }, { merge: true });
    }

    renderPrayers(); 
    updateProgressBar();
}

export function renderPrayers() {
    const container = document.getElementById('prayerList');
    if(!container) return;
    
    let html = '';
    
    PRAYER_CONFIG.forEach((p) => {
        const isDone = state.currentRecords[p.id] || false;
        const time = state.prayerTimes[p.id];
        const status = checkTimeAvailability(time);
        
        // --- LOGIKA STYLING ---
        let wrapperClass, iconWrapperClass, textClass, timeClass, checkIcon;

        if (status.locked) {
            // STATE: TERKUNCI / BELUM WAKTUNYA
            wrapperClass = "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60 grayscale cursor-not-allowed";
            iconWrapperClass = "bg-slate-200 dark:bg-slate-800 text-slate-400";
            textClass = "text-slate-400 dark:text-slate-600";
            timeClass = "bg-slate-200 dark:bg-slate-800 text-slate-400";
            checkIcon = `<div class="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center"><i data-lucide="lock" class="w-3 h-3 text-slate-400"></i></div>`;
        
        } else if (isDone) {
            // STATE: SELESAI
            wrapperClass = "bg-emerald-50/50 dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/50 shadow-sm";
            iconWrapperClass = `bg-gradient-to-br ${p.color} text-white shadow-lg ${p.shadow}`;
            textClass = "text-emerald-700 dark:text-emerald-400 font-bold decoration-emerald-500/30"; 
            timeClass = "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300";
            checkIcon = `<div class="w-8 h-8 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40 flex items-center justify-center text-white animate-[zoomIn_0.2s_ease-out]"><i data-lucide="check" class="w-5 h-5 font-bold"></i></div>`;
        
        } else {
            // STATE: BELUM DIKERJAKAN
            wrapperClass = "bg-white dark:bg-slate-900 border-white dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-98";
            iconWrapperClass = `bg-gradient-to-br ${p.color} text-white shadow-md ${p.shadow}`;
            textClass = "text-slate-700 dark:text-slate-200 font-bold";
            timeClass = "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400";
            checkIcon = `<div class="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-700 group-hover:border-emerald-300 transition-colors"></div>`;
        }

        html += `
        <div onclick="togglePrayer('${p.id}', ${status.locked})" class="group relative flex items-center justify-between p-4 rounded-[1.5rem] border transition-all duration-300 ${wrapperClass}">
            
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

            <div class="relative z-10">
                ${checkIcon}
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
    if(window.lucide) lucide.createIcons();
    updateProgressBar();
}

export function updateProgressBar() {
    let wT = 0, wD = 0;
    
    // Hitung progress hanya untuk sholat WAJIB
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
        // Animasi angka (counting up)
        let start = parseInt(pbText.innerText) || 0;
        if(start !== pct) pbText.innerText = pct + '%';
    }
    
    if(pb) { 
        pb.style.width = pct + '%'; 
        // Ubah warna bar kalau sudah 100%
        if(pct === 100) {
            pb.classList.remove('from-emerald-400', 'to-teal-500');
            pb.classList.add('from-emerald-500', 'to-emerald-400');
        }
    }
}

// [PERBAIKAN LOGIKA]
function checkTimeAvailability(prayerTimeStr) {
    if (!prayerTimeStr || prayerTimeStr === '--:--') return { locked: true };
    
    const [h, m] = prayerTimeStr.split(':').map(Number);
    
    // 1. Buat salinan objek tanggal agar state global tidak rusak/berubah
    const pDate = new Date(state.currentDate.getTime());
    pDate.setHours(h, m, 0, 0); // Set jam sholat pada tanggal tersebut
    
    const now = new Date(); // Waktu sekarang (real-time)

    // 2. Buat objek khusus untuk membandingkan "Hari" saja (tanpa jam)
    const todayZero = new Date(); 
    todayZero.setHours(0,0,0,0);
    
    const currentZero = new Date(state.currentDate.getTime());
    currentZero.setHours(0,0,0,0);
    
    // LOGIKA PENGECEKAN:
    
    // A. Jika tanggal yang dibuka > hari ini (Masa Depan) -> KUNCI
    if (currentZero.getTime() > todayZero.getTime()) {
        return { locked: true }; 
    }
    
    // B. Jika tanggal yang dibuka < hari ini (Masa Lalu) -> BUKA (Boleh qadha/isi jurnal kemarin)
    if (currentZero.getTime() < todayZero.getTime()) {
        return { locked: false };
    }
    
    // C. Jika tanggal == hari ini -> Cek jamnya
    // Kalau jam sekarang < jam sholat, berarti belum waktunya -> KUNCI
    if (now.getTime() < pDate.getTime()) {
        return { locked: true }; 
    }
    
    // Kalau sudah lewat waktunya -> BUKA
    return { locked: false }; 
}