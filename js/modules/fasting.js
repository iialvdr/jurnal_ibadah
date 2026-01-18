import { getHijriDate } from '../utils/date-utils.js';
import { state } from '../state.js';

const FASTING_MAP = {
    "Puasa Ramadhan": "ramadhan",
    "Puasa Ayyamul Bidh": "ayyamul_bidh",
    "Puasa Senin": "senin",
    "Puasa Kamis": "kamis",
    "Puasa Syawal": "syawal",
    "Puasa Arafah": "arafah",
    "Puasa Asyura": "asyura"
};

export function initFasting() {
    window.openNiatModal = openNiatModal;
    window.closeNiatModal = closeNiatModal;
    updateFastingStatus();
    window.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'fastingView') updateFastingStatus();
    });
}

function updateFastingStatus() {
    const now = new Date();
    let displayDate = new Date(now);
    let isBesok = false;

    if (state.prayerTimes && state.prayerTimes.Maghrib && state.prayerTimes.Maghrib !== '--:--') {
        const [h, m] = state.prayerTimes.Maghrib.split(':').map(Number);
        const maghribDate = new Date(now);
        maghribDate.setHours(h, m, 0, 0);
        if (now >= maghribDate) {
            isBesok = true;
            displayDate.setDate(displayDate.getDate() + 1);
        }
    }

    const hijri = getHijriDate(displayDate);
    const hijriEl = document.getElementById('fastingHijriDate');
    if (hijriEl) hijriEl.innerText = hijri.full;

    const masehi = displayDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    renderTodayFasting(displayDate, hijri, masehi, isBesok);
    renderUpcomingFasting(now); 
}

function renderTodayFasting(date, hijri, masehi, isBesok = false) {
    const container = document.getElementById('fastingPageTodayContainer');
    if (!container) return;

    const type = checkFastingType(date, hijri);
    const labelDate = isBesok ? "BESOK" : "HARI INI";
    
    if (type) {
        const niatKey = FASTING_MAP[type] || '';
        const isWajib = type === "Puasa Ramadhan";
        let fastingDesc = isBesok 
            ? "Siapkan niat untuk berpuasa esok hari ya." 
            : "Semangat menjalankan ibadah puasa!";

        container.innerHTML = `
            <div onclick="vibrateSoft(); openNiatModal('${niatKey}')" class="bento-card bg-white dark:bg-slate-900 p-5 rounded-[2rem] flex items-center gap-4 border border-amber-100 dark:border-amber-900/40 shadow-sm relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all w-full">
                <div class="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/5 rounded-full blur-3xl"></div>
                <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-800/30">
                    <i data-lucide="${isWajib ? 'sun' : 'utensils-crossed'}" class="w-6 h-6"></i>
                </div>
                <div class="flex-1 relative z-10">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-full">${labelDate}</span>
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${isWajib ? 'Wajib' : 'Sunnah'}</span>
                    </div>
                    <h4 class="text-base font-black text-slate-800 dark:text-white leading-tight">${type}</h4>
                    <p class="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1">${hijri.full} • ${fastingDesc}</p>
                </div>
                <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors"></i>
            </div>`;
    } else {
        container.innerHTML = `
            <div class="bento-card bg-white dark:bg-slate-900 rounded-[2rem] p-5 border border-white dark:border-slate-800 shadow-sm w-full">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700/50">
                        <i data-lucide="calendar" class="w-6 h-6 text-slate-400"></i>
                    </div>
                    <div>
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full mb-1 inline-block">${labelDate}</span>
                        <h4 class="text-base font-black text-slate-800 dark:text-white leading-tight">Tidak Ada Jadwal</h4>
                        <p class="text-[10px] font-medium text-slate-400 mt-1">Gunakan hari ini untuk ibadah lainnya!</p>
                    </div>
                </div>
            </div>`;
    }
    if (window.lucide) lucide.createIcons({ root: container });
}

function renderUpcomingFasting(startDate) {
    const container = document.getElementById('upcomingFastingList');
    if (!container) return;
    let html = '';
    
    for (let i = 1; i <= 30; i++) {
        const nextDate = new Date(startDate);
        nextDate.setDate(startDate.getDate() + i);
        const nextHijri = getHijriDate(nextDate);
        const masehiDay = nextDate.getDate();
        const masehiMonthShort = nextDate.toLocaleDateString('id-ID', { month: 'short' });
        const type = checkFastingType(nextDate, nextHijri);

        if (type) {
            const niatKey = FASTING_MAP[type] || '';
            html += `
            <div onclick="vibrateSoft(); openNiatModal('${niatKey}')" class="bento-card bg-white dark:bg-slate-900 p-4 rounded-2xl border border-white dark:border-slate-800 shadow-sm flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-all hover:border-emerald-500/30">
                <div class="flex items-center gap-3">
                    <div class="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/30 shrink-0">
                        <span class="text-[6px] font-bold text-slate-400 uppercase leading-none mb-0.5">${masehiMonthShort}</span>
                        <span class="text-xs font-black text-slate-700 dark:text-emerald-500 leading-none">${masehiDay}</span>
                    </div>
                    <div>
                        <h5 class="font-bold text-slate-800 dark:text-white text-[12px] leading-tight group-hover:text-emerald-600 transition-colors">${type}</h5>
                        <p class="text-[9px] text-slate-400 font-medium mt-0.5">${nextHijri.full}</p>
                    </div>
                </div>
                <i data-lucide="chevron-right" class="w-3 h-3 text-slate-300"></i>
            </div>`;
        }
    }
    container.innerHTML = html || '<p class="col-span-full py-10 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">Belum ada jadwal terdekat</p>';
    if (window.lucide) lucide.createIcons({ root: container });
}

function checkFastingType(date, hijri) {
    const day = date.getDay();
    const hDay = hijri.day;
    const hMonth = hijri.month;
    if (hMonth === 9) return "Puasa Ramadhan";
    if (hDay === 13 || hDay === 14 || hDay === 15) return "Puasa Ayyamul Bidh";
    if (day === 1) return "Puasa Senin";
    if (day === 4) return "Puasa Kamis";
    if (hMonth === 10 && hDay >= 2 && hDay <= 7) return "Puasa Syawal";
    if (hMonth === 12 && hDay === 9) return "Puasa Arafah";
    if (hMonth === 1 && hDay === 10) return "Puasa Asyura";
    return null;
}

const NIAT_DATA = {
    'senin': { judul: 'Puasa Senin', arab: 'نَوَيْتُ صَوْمَ يَوْمِ الاِثْنَيْنِ سُنَّةً لِلهِ تَعَالَى', latin: 'Nawaitu sauma yaumil itsnaini sunnatan lillahi ta\'ala.', arti: 'Saya niat puasa hari Senin, sunnah karena Allah Ta\'ala.' },
    'kamis': { judul: 'Puasa Kamis', arab: 'نَوَيْتُ صَوْمَ يَوْمِ الْخَمِيْسِ سُنَّةً لِلهِ تَعَالَى', latin: 'Nawaitu sauma yaumil khamisi sunnatan lillahi ta\'ala.', arti: 'Saya niat puasa hari Kamis, sunnah karena Allah Ta\'ala.' },
    'ayyamul_bidh': { judul: 'Puasa Ayyamul Bidh', arab: 'نَوَيْتُ صَوْمَ أَيَّامِ الْبِيْضِ سُنَّةً لِلهِ تَعَالَى', latin: 'Nawaitu sauma ayyamil bidhi sunnatan lillahi ta\'ala.', arti: 'Saya niat puasa ayyamul bidh, sunnah karena Allah Ta\'ala.' },
    'ramadhan': { judul: 'Puasa Ramadhan', arab: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ فَرْضِ شَهْرِ رَمَضَانَ هَذِهِ السَّنَةِ لِلهِ تَعَالَى', latin: 'Nawaitu sauma ghadin \'an ada\'i fardhi syahri ramadhana hadzihis sanati lillahi ta\'ala.', arti: 'Saya niat puasa esok hari untuk menunaikan fardhu di bulan Ramadhan tahun ini, karena Allah Ta\'ala.' },
    'syawal': { judul: 'Puasa Syawal', arab: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ الشَّوَّالِ لِلهِ تَعَالَى', latin: 'Nawaitu sauma ghadin \'an ada\'i sunnatis syawwali lillahi ta\'ala.', arti: 'Saya niat puasa sunnah Syawal esok hari karena Allah Ta\'ala.' },
    'arafah': { judul: 'Puasa Arafah', arab: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ يَوْمِ عَرَفَةَ لِلهِ تَعَالَى', latin: 'Nawaitu sauma ghadin \'an ada\'i sunnati yaumi \'arafata lillahi ta\'ala.', arti: 'Saya niat puasa sunnah Arafah esok hari karena Allah Ta\'ala.' },
    'asyura': { judul: 'Puasa Asyura', arab: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ عَاشُورَاءَ لِلهِ تَعَالَى', latin: 'Nawaitu sauma ghadin \'an ada\'i sunnati \'asyura-a lillahi ta\'ala.', arti: 'Saya niat puasa sunnah Asyura esok hari karena Allah Ta\'ala.' }
};

function openNiatModal(types) {
    if (!types) return;
    const modal = document.getElementById('niatModal');
    const container = document.getElementById('niatListContainer');
    if (!modal || !container) return;
    let html = '';
    types.split(',').forEach(t => {
        const data = NIAT_DATA[t.trim()];
        if (data) {
            const isWajib = data.judul === "Puasa Ramadhan";
            html += `
            <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-white dark:border-slate-800 shadow-sm space-y-4">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-sm font-black text-slate-800 dark:text-white">${data.judul}</h4>
                    <span class="text-[9px] font-black px-2 py-0.5 rounded-lg border ${isWajib ? 'text-amber-600 border-amber-100' : 'text-emerald-600 border-emerald-100'}">${isWajib ? 'Wajib' : 'Sunnah'}</span>
                </div>
                <div class="text-right"><p class="font-quran text-xl text-slate-800 dark:text-white leading-loose" dir="rtl">${data.arab}</p></div>
                <div class="space-y-1">
                    <p class="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Latin</p>
                    <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400 italic leading-relaxed">"${data.latin}"</p>
                </div>
                <div class="pt-3 border-t border-slate-50 dark:border-slate-800">
                    <p class="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Artinya</p>
                    <p class="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">${data.arti}</p>
                </div>
            </div>`;
        }
    });
    container.innerHTML = html;
    modal.classList.remove('invisible', 'pointer-events-none');
    requestAnimationFrame(() => {
        document.getElementById('niatBackdrop').classList.add('opacity-100');
        document.getElementById('niatModalContent').classList.remove('translate-y-full');
    });
}

function closeNiatModal() {
    const modal = document.getElementById('niatModal');
    if (!modal) return;
    document.getElementById('niatBackdrop').classList.remove('opacity-100');
    document.getElementById('niatModalContent').classList.add('translate-y-full');
    setTimeout(() => { modal.classList.add('invisible', 'pointer-events-none'); }, 500);
}