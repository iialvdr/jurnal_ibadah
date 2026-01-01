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

    // Cek apakah sudah lewat Maghrib hari ini berdasarkan data prayerTimes di state
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
    // Perubahan di sini: month menggunakan 'short' agar bulan Masehi tampil singkat
    const masehi = displayDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    // Update Label Header di UI (Status Hari Ini vs Status Besok)
    const statusHeader = document.querySelector('#fastingContent h3.text-\\[11px\\]');
    if (statusHeader) {
        statusHeader.innerText = isBesok ? 'Status Besok' : 'Status Hari Ini';
    }

    const hijriEl = document.getElementById('fastingHijriDate');
    if (hijriEl) hijriEl.innerText = hijri.full;

    renderTodayFasting(displayDate, hijri, masehi, isBesok);
    renderUpcomingFasting(now); 
}

function renderTodayFasting(date, hijri, masehi, isBesok = false) {
    const container = document.getElementById('fastingPageTodayContainer');
    if (!container) return;

    const fastingType = checkFastingType(date, hijri);
    const niatKey = FASTING_MAP[fastingType] || '';
    const isWajib = fastingType === "Puasa Ramadhan";
    
    const labelDate = isBesok ? "Besok" : "Hari Ini";
    const statusType = isWajib ? 'Wajib' : 'Sunnah';

    if (fastingType) {
        container.innerHTML = `
            <div onclick="vibrateSoft(); openNiatModal('${niatKey}')" class="bento-card ${isWajib ? 'bg-amber-600' : 'bg-emerald-600'} rounded-[2rem] p-6 text-white shadow-lg relative overflow-hidden animate-fade-in cursor-pointer active:scale-95 transition-transform w-full">
                <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div class="relative z-10 flex items-center gap-5">
                    <div class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                        <i data-lucide="${isWajib ? 'sun' : 'utensils-crossed'}" class="w-7 h-7"></i>
                    </div>
                    <div>
                        <p class="text-[10px] font-bold text-white/80 uppercase tracking-wider mb-0.5">${labelDate} ${statusType}</p>
                        <h4 class="text-lg md:text-xl font-black leading-tight">${fastingType}</h4>
                        <p class="text-xs text-white/70 font-medium">${hijri.full} • ${masehi}</p>
                    </div>
                </div>
            </div>`;
    } else {
        container.innerHTML = `
            <div class="bento-card bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-white dark:border-slate-800 shadow-sm animate-fade-in w-full">
                <div class="flex items-center gap-5">
                    <div class="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700/50">
                        <i data-lucide="calendar" class="w-7 h-7 text-slate-400"></i>
                    </div>
                    <div>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">${labelDate}</p>
                        <h4 class="text-lg md:text-xl font-black text-slate-800 dark:text-white leading-tight">Tidak Ada Jadwal Puasa</h4>
                        <p class="text-xs text-slate-400 font-medium">${hijri.full} • ${masehi}</p>
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
        // List mendatang juga menggunakan format bulan singkat
        const masehiDateFull = nextDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

        const masehiDay = nextDate.getDate();
        const masehiMonthShort = nextDate.toLocaleDateString('id-ID', { month: 'short' });

        const type = checkFastingType(nextDate, nextHijri);

        if (type) {
            const niatKey = FASTING_MAP[type] || '';
            html += `
            <div onclick="vibrateSoft(); openNiatModal('${niatKey}')" class="bento-card bg-white dark:bg-slate-900 p-4 rounded-3xl border border-white dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-emerald-500/30 transition-all cursor-pointer active:scale-[0.98]">
                <div class="flex items-center gap-4">
                    <div class="flex flex-col items-center justify-center w-11 h-11 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/30 shrink-0">
                        <span class="text-[7px] font-bold text-slate-400 uppercase leading-none mb-0.5 text-center">${masehiMonthShort}</span>
                        <span class="text-sm font-black text-slate-700 dark:text-emerald-500 leading-none">${masehiDay}</span>
                    </div>
                    <div>
                        <h5 class="font-bold text-slate-800 dark:text-white text-[13px] leading-tight group-hover:text-emerald-600 transition-colors">${type}</h5>
                        <p class="text-[9px] text-slate-400 font-medium mt-0.5">${nextHijri.full} | ${masehiDateFull}</p>
                    </div>
                </div>
                <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300"></i>
            </div>`;
        }
    }
    container.innerHTML = html || '<p class="col-span-full py-10 text-center text-xs text-slate-400 font-medium">Belum ada jadwal puasa sunnah terdekat.</p>';
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
            const badgeText = isWajib ? 'Wajib' : 'Sunnah';
            const badgeClass = isWajib
                ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30"
                : "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30";

            html += `
            <div class="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-white dark:border-slate-800 shadow-sm space-y-4">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-sm font-bold text-slate-800 dark:text-white">${data.judul}</h4>
                    <span class="text-[9px] font-bold px-2 py-0.5 rounded-lg border ${badgeClass}">${badgeText}</span>
                </div>
                <div class="text-right"><p class="font-quran text-2xl text-slate-800 dark:text-white leading-loose" dir="rtl">${data.arab}</p></div>
                <div class="space-y-2">
                    <p class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Latin</p>
                    <p class="text-xs font-medium text-slate-500 dark:text-slate-400 italic leading-relaxed">"${data.latin}"</p>
                </div>
                <div class="pt-4 border-t border-slate-50 dark:border-slate-800">
                    <p class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Artinya</p>
                    <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">${data.arti}</p>
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