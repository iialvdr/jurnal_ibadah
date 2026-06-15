import { getHijriDate } from '../utils/date-utils.js';
import { state } from '../state.js';

const FASTING_MAP = {
    "Puasa Ramadhan": "ramadhan",
    "Puasa Ayyamul Bidh": "ayyamul_bidh",
    "Puasa Senin": "senin",
    "Puasa Kamis": "kamis",
    "Puasa Syawal": "syawal",
    "Puasa Arafah": "arafah",
    "Puasa Asyura": "asyura",
    "Puasa Tarwiyah": "tarwiyah",
    "Puasa Tasu'a": "tasua",
    "Puasa Dzulhijjah": "dzulhijjah",
    "Puasa Nisfu Sya'ban": "nisfu_syaban"
};

const NIAT_DATA = {
    'senin': { judul: 'Puasa Senin', arab: 'نَوَيْتُ صَوْمَ يَوْمِ الاِثْنَيْنِ سُنَّةً لِلهِ تَعَالَى', latin: 'Nawaitu sauma yaumil itsnaini sunnatan lillahi ta\'ala.', arti: 'Saya niat puasa hari Senin, sunnah karena Allah Ta\'ala.' },
    'kamis': { judul: 'Puasa Kamis', arab: 'نَوَيْتُ صَوْمَ يَوْمِ الْخَمِيْسِ سُنَّةً لِلهِ تَعَالَى', latin: 'Nawaitu sauma yaumil khamisi sunnatan lillahi ta\'ala.', arti: 'Saya niat puasa hari Kamis, sunnah karena Allah Ta\'ala.' },
    'ayyamul_bidh': { judul: 'Puasa Ayyamul Bidh', arab: 'نَوَيْتُ صَوْمَ أَيَّامِ الْبِيْضِ سُنَّةً لِلهِ تَعَالَى', latin: 'Nawaitu sauma ayyamil bidhi sunnatan lillahi ta\'ala.', arti: 'Saya niat puasa ayyamul bidh, sunnah karena Allah Ta\'ala.' },
    'ramadhan': { judul: 'Puasa Ramadhan', arab: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ فَرْضِ شَهْرِ رَمَضَانَ هَذِهِ السَّنَةِ لِلهِ تَعَالَى', latin: 'Nawaitu sauma ghadin \'an ada\'i fardhi syahri ramadhana hadzihis sanati lillahi ta\'ala.', arti: 'Saya niat puasa esok hari untuk menunaikan fardhu di bulan Ramadhan tahun ini, karena Allah Ta\'ala.' },
    'syawal': { judul: 'Puasa Syawal', arab: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ الشَّوَّالِ لِلهِ تَعَالَى', latin: 'Nawaitu sauma ghadin \'an ada\'i sunnatis syawwali lillahi ta\'ala.', arti: 'Saya niat puasa sunnah Syawal esok hari karena Allah Ta\'ala.' },
    'arafah': { judul: 'Puasa Arafah', arab: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ يَوْمِ عَرَفَةَ لِلهِ تَعَالَى', latin: 'Nawaitu sauma ghadin \'an ada\'i sunnati yaumi \'arafata lillahi ta\'ala.', arti: 'Saya niat puasa sunnah Arafah esok hari karena Allah Ta\'ala.' },
    'tarwiyah': { judul: 'Puasa Tarwiyah', arab: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ يَوْمِ التَّرْوِيَةِ لِلهِ تَعَالَى', latin: 'Nawaitu sauma ghadin \'an ada\'i sunnati yaumit tarwiyati lillahi ta\'ala.', arti: 'Saya niat puasa sunnah Tarwiyah esok hari karena Allah Ta\'ala.' },
    'asyura': { judul: 'Puasa Asyura', arab: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ عَاشُورَاءَ لِلهِ تَعَالَى', latin: 'Nawaitu sauma ghadin \'an ada\'i sunnati \'asyura-a lillahi ta\'ala.', arti: 'Saya niat puasa sunnah Asyura esok hari karena Allah Ta\'ala.' },
    'tasua': { judul: 'Puasa Tasu\'a', arab: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ تَاسُوعَاءَ لِلهِ تَعَالَى', latin: 'Nawaitu sauma ghadin \'an ada\'i sunnati tasu\'a-a lillahi ta\'ala.', arti: 'Saya niat puasa sunnah Tasu\'a esok hari karena Allah Ta\'ala.' },
    'dzulhijjah': { judul: 'Puasa Dzulhijjah', arab: 'نَوَيْتُ صَوْمَ شَهْرِ ذِيْ الْحِجَّةِ سُنَّةً لِلّٰهِ تَعَالَى', latin: 'Nawaitu shauma syahri dzil hijjah sunnatan lillahi ta\'ala.', arti: 'Saya niat puasa sunnah di bulan Dzulhijjah karena Allah Ta\'ala.' },
    'nisfu_syaban': { judul: 'Puasa Nisfu Sya\'ban', arab: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ نِصْفِ شَعْبَانَ لِلّٰهِ تَعَالَى', latin: 'Nawaitu shauma ghadin \'an ada\'i sunnati nishfi sya\'baana lillahi ta\'ala.', arti: 'Saya niat puasa sunnah Nisfu Sya\'ban esok hari karena Allah Ta\'ala.' },
    'daud': { judul: 'Puasa Daud', arab: 'نَوَيْتُ صَوْمَ دَاوُدَ سُنَّةً لِلهِ تَعَالَى', latin: 'Nawaitu shauma dawuda sunnatan lillahi ta\'ala.', arti: 'Saya niat puasa Daud, sunnah karena Allah Ta\'ala.' },
    'qadha': { judul: 'Puasa Qadha Ramadhan', arab: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ قَضَاءِ فَرْضِ شَهْرِ رَمَضَانَ لِلهِ تَعَالَى', latin: 'Nawaitu shauma ghadin \'an qadha\'i fardhi syahri ramadhana lillahi ta\'ala.', arti: 'Saya niat puasa esok hari karena mengganti fardhu Ramadhan karena Allah Ta\'ala.' },
    'nadzar': { judul: 'Puasa Nadzar', arab: 'نَوَيْتُ صَوْمَ النَّذَرِ لِلهِ تَعَالَى', latin: 'Nawaitu shauman nadzari lillahi ta\'ala.', arti: 'Saya niat puasa nadzar karena Allah Ta\'ala.' },
    'kifarat': { judul: 'Puasa Kifarat', arab: 'نَوَيْتُ صَوْمَ الْكَفَّارَةِ لِلهِ تَعَالَى', latin: 'Nawaitu shaumal kaffarati lillahi ta\'ala.', arti: 'Saya niat puasa kifarat karena Allah Ta\'ala.' },
    'mutlaq': { judul: 'Puasa Mutlaq', arab: 'نَوَيْتُ الصَّوْمَ سُنَّةً لِلهِ تَعَالَى', latin: 'Nawaitush shauma sunnatan lillahi ta\'ala.', arti: 'Saya niat puasa sunnah karena Allah Ta\'ala.' }
};

// Metadata for Kamus Niat - categorization, icons, colors, descriptions
const NIAT_CATALOG = {
    'ramadhan': { 
        category: 'wajib', icon: 'sun', color: 'amber',
        desc: 'Puasa wajib di bulan Ramadhan', tags: ['wajib', 'ramadhan', 'fardhu']
    },
    'qadha': { 
        category: 'wajib', icon: 'rotate-ccw', color: 'amber',
        desc: 'Mengganti puasa Ramadhan yang tertinggal', tags: ['wajib', 'qadha', 'ganti']
    },
    'nadzar': { 
        category: 'wajib', icon: 'hand', color: 'amber',
        desc: 'Puasa karena janji atau kaul', tags: ['wajib', 'nadzar', 'janji']
    },
    'kifarat': { 
        category: 'wajib', icon: 'scale', color: 'amber',
        desc: 'Puasa sebagai tebusan atas pelanggaran', tags: ['wajib', 'kifarat', 'tebusan']
    },
    'senin': { 
        category: 'reguler', icon: 'calendar-check', color: 'emerald',
        desc: 'Sunnah setiap hari Senin', tags: ['sunnah', 'mingguan', 'senin']
    },
    'kamis': { 
        category: 'reguler', icon: 'calendar-check', color: 'emerald',
        desc: 'Sunnah setiap hari Kamis', tags: ['sunnah', 'mingguan', 'kamis']
    },
    'ayyamul_bidh': { 
        category: 'reguler', icon: 'moon', color: 'blue',
        desc: 'Tanggal 13, 14, 15 Hijriyah setiap bulan', tags: ['sunnah', 'bulanan', 'pertengahan']
    },
    'daud': { 
        category: 'reguler', icon: 'zap', color: 'violet',
        desc: 'Puasa sehari, berbuka sehari (selang-seling)', tags: ['sunnah', 'harian', 'daud', 'selang']
    },
    'syawal': { 
        category: 'khusus', icon: 'gift', color: 'teal',
        desc: '6 hari di bulan Syawal setelah Idul Fitri', tags: ['sunnah', 'syawal', 'setelah ramadhan']
    },
    'arafah': { 
        category: 'khusus', icon: 'mountain', color: 'rose',
        desc: '9 Dzulhijjah, bagi yang tidak sedang haji', tags: ['sunnah', 'arafah', 'dzulhijjah', 'haji']
    },
    'tarwiyah': { 
        category: 'khusus', icon: 'droplets', color: 'sky',
        desc: '8 Dzulhijjah, sehari sebelum Arafah', tags: ['sunnah', 'tarwiyah', 'dzulhijjah']
    },
    'asyura': { 
        category: 'khusus', icon: 'star', color: 'orange',
        desc: '10 Muharram, menghapus dosa setahun', tags: ['sunnah', 'asyura', 'muharram']
    },
    'tasua': { 
        category: 'khusus', icon: 'sparkles', color: 'orange',
        desc: '9 Muharram, sehari sebelum Asyura', tags: ['sunnah', 'tasua', 'muharram']
    },
    'dzulhijjah': { 
        category: 'khusus', icon: 'calendar-range', color: 'indigo',
        desc: '1-7 Dzulhijjah, bulan penuh berkah', tags: ['sunnah', 'dzulhijjah']
    },
    'nisfu_syaban': { 
        category: 'khusus', icon: 'cloud-moon', color: 'purple',
        desc: '15 Sya\'ban, malam pengampunan', tags: ['sunnah', 'syaban', 'nisfu']
    },
    'mutlaq': { 
        category: 'lainnya', icon: 'heart', color: 'rose',
        desc: 'Niat puasa sunnah tanpa waktu tertentu', tags: ['sunnah', 'umum', 'mutlaq', 'bebas']
    }
};

// Color map for Tailwind classes
const COLOR_MAP = {
    amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-800/30', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-800/30', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-800/30', badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    violet:  { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-100 dark:border-violet-800/30', badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
    teal:    { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-100 dark:border-teal-800/30', badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400' },
    rose:    { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-800/30', badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
    sky:     { bg: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-100 dark:border-sky-800/30', badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
    orange:  { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-800/30', badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
    indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-100 dark:border-indigo-800/30', badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
    purple:  { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-800/30', badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
};

const CATEGORY_LABELS = {
    'wajib': 'Wajib',
    'reguler': 'Sunnah Rutin',
    'khusus': 'Sunnah Khusus',
    'lainnya': 'Lainnya'
};

let currentCategory = 'semua';
let currentSearch = '';

export function initFasting() {
    window.openNiatModal = openNiatModal;
    window.closeNiatModal = closeNiatModal;
    window.filterNiatByCategory = filterNiatByCategory;

    // Setup search input
    const searchInput = document.getElementById('niatSearchInput');
    const clearBtn = document.getElementById('niatSearchClear');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.trim().toLowerCase();
            if (clearBtn) clearBtn.classList.toggle('hidden', !currentSearch);
            renderNiatCards();
        });
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            currentSearch = '';
            clearBtn.classList.add('hidden');
            renderNiatCards();
        });
    }

    updateFastingStatus();
    renderNiatCards();

    window.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'fastingView') {
            updateFastingStatus();
            renderNiatCards();
        }
    });
    window.addEventListener('viewExit', (e) => {
        if (e.detail.viewId === 'fastingView') closeNiatModal(true);
    });
    window.addEventListener('popstate', (e) => {
        const modal = document.getElementById('niatModal');
        if (modal && !modal.classList.contains('invisible')) {
            if (!e.state || !e.state.fastingModalOpen) {
                closeNiatModal(true);
            }
        }
    });
}

function filterNiatByCategory(cat) {
    currentCategory = cat;

    // Update tab styling
    document.querySelectorAll('#niatCategoryTabs button').forEach(btn => {
        const btnCat = btn.getAttribute('data-niat-cat');
        if (btnCat === cat) {
            btn.classList.remove('niat-tab');
            btn.classList.add('niat-tab-active');
        } else {
            btn.classList.remove('niat-tab-active');
            btn.classList.add('niat-tab');
        }
    });

    renderNiatCards();
}

function renderNiatCards() {
    const grid = document.getElementById('niatCardsGrid');
    const emptyState = document.getElementById('niatEmptyState');
    const countEl = document.getElementById('niatResultCount');
    if (!grid) return;

    let html = '';
    let count = 0;

    const keys = Object.keys(NIAT_DATA);

    keys.forEach(key => {
        const niat = NIAT_DATA[key];
        const catalog = NIAT_CATALOG[key];
        if (!niat || !catalog) return;

        // Filter by category
        if (currentCategory !== 'semua' && catalog.category !== currentCategory) return;

        // Filter by search
        if (currentSearch) {
            const searchTarget = [
                niat.judul, 
                catalog.desc, 
                key, 
                ...catalog.tags,
                catalog.category === 'wajib' ? 'wajib' : 'sunnah'
            ].join(' ').toLowerCase();
            if (!searchTarget.includes(currentSearch)) return;
        }

        const c = COLOR_MAP[catalog.color] || COLOR_MAP.emerald;
        const catLabel = CATEGORY_LABELS[catalog.category] || 'Sunnah';

        html += `
            <button onclick="vibrateSoft(); openNiatModal('${key}')" 
                class="bento-card bg-white dark:bg-slate-900 p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] text-left border border-white dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between transition-all active:scale-[0.97] group hover:border-emerald-500/30 dark:hover:border-emerald-500/20" 
                style="min-height: 140px;">
                <div class="relative z-10">
                    <div class="w-10 h-10 md:w-11 md:h-11 rounded-xl md:rounded-2xl ${c.bg} ${c.text} flex items-center justify-center mb-3 border ${c.border}">
                        <i data-lucide="${catalog.icon}" class="w-5 h-5"></i>
                    </div>
                    <h4 class="font-black text-slate-800 dark:text-white text-[13px] md:text-sm leading-tight mb-1">${niat.judul}</h4>
                    <p class="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-snug line-clamp-2">${catalog.desc}</p>
                </div>
                <div class="flex items-center justify-between mt-3 relative z-10">
                    <span class="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${c.badge}">${catLabel}</span>
                    <i data-lucide="chevron-right" class="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors"></i>
                </div>
                <div class="absolute -right-3 -bottom-3 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                    <i data-lucide="${catalog.icon}" class="w-20 h-20 md:w-24 md:h-24 ${c.text}"></i>
                </div>
            </button>`;
        count++;
    });

    grid.innerHTML = html;

    // Show/hide empty state
    if (emptyState) {
        emptyState.classList.toggle('hidden', count > 0);
    }
    grid.classList.toggle('hidden', count === 0);

    // Update counter
    if (countEl) {
        countEl.textContent = `${count} niat`;
        countEl.classList.toggle('hidden', count === 0);
    }

    if (window.lucide) lucide.createIcons({ root: grid });
    if (emptyState && window.lucide) lucide.createIcons({ root: emptyState });
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

    const info = getFastingInfo(date, hijri);
    const labelDate = isBesok ? "BESOK" : "HARI INI";

    if (info) {
        const niatKey = info.niatKey || '';
        const isWajib = info.category === "wajib";
        const isHaram = info.category === "haram";
        let fastingDesc = isBesok
            ? (isHaram ? "Hindari puasa pada hari ini." : "Siapkan niat untuk berpuasa esok hari ya.")
            : (isHaram ? "Puasa tidak diperbolehkan pada hari ini." : "Semangat menjalankan ibadah puasa!");
        const clickable = !isHaram ? `onclick="vibrateSoft(); openNiatModal('${niatKey}')"` : '';
        const cardTone = isHaram ? 'border-rose-200 dark:border-rose-900/40' : 'border-amber-100 dark:border-amber-900/40';
        const badgeTone = isHaram ? 'text-rose-600 dark:text-rose-500 bg-rose-500/10' : 'text-amber-600 dark:text-amber-500 bg-amber-500/10';
        const iconTone = isHaram ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/30' : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30';
        const labelType = isHaram ? 'Haram' : (isWajib ? 'Wajib' : 'Sunnah');
        const iconName = isHaram ? 'ban' : (isWajib ? 'sun' : 'utensils-crossed');

        container.innerHTML = `
            <div ${clickable} class="bento-card bg-white dark:bg-slate-900 p-5 rounded-[2rem] flex items-center gap-4 border ${cardTone} shadow-sm relative overflow-hidden group ${isHaram ? '' : 'cursor-pointer active:scale-[0.98]'} transition-all w-full">
                <div class="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/5 rounded-full blur-3xl"></div>
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${iconTone}">
                    <i data-lucide="${iconName}" class="w-6 h-6"></i>
                </div>
                <div class="flex-1 relative z-10">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${badgeTone}">${labelDate}</span>
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${labelType}</span>
                    </div>
                    <h4 class="text-base font-black text-slate-800 dark:text-white leading-tight">${info.type}</h4>
                    <p class="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1">${hijri.full} - ${fastingDesc}</p>
                </div>
                ${isHaram ? '' : '<i data-lucide="chevron-right" class="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors"></i>'}
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
        const info = getFastingInfo(nextDate, nextHijri);

        if (info) {
            const niatKey = info.niatKey || '';
            const isHaram = info.category === 'haram';
            const click = isHaram ? '' : `onclick="vibrateSoft(); openNiatModal('${niatKey}')"`;
            const hover = isHaram ? '' : 'hover:border-emerald-500/30';
            html += `
            <div ${click} class="bento-card bg-white dark:bg-slate-900 p-4 rounded-2xl border border-white dark:border-slate-800 shadow-sm flex items-center justify-between group ${isHaram ? '' : 'cursor-pointer active:scale-[0.98]'} transition-all ${hover}">
                <div class="flex items-center gap-3">
                    <div class="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/30 shrink-0">
                        <span class="text-[6px] font-bold text-slate-400 uppercase leading-none mb-0.5">${masehiMonthShort}</span>
                        <span class="text-xs font-black text-slate-700 dark:text-emerald-500 leading-none">${masehiDay}</span>
                    </div>
                    <div>
                        <h5 class="font-bold text-slate-800 dark:text-white text-[12px] leading-tight ${isHaram ? '' : 'group-hover:text-emerald-600 transition-colors'}">${info.type}</h5>
                        <p class="text-[9px] text-slate-400 font-medium mt-0.5">${nextHijri.full}</p>
                    </div>
                </div>
                ${isHaram ? '<span class="text-[8px] font-black text-rose-500 uppercase tracking-widest">Haram</span>' : '<i data-lucide="chevron-right" class="w-3 h-3 text-slate-300"></i>'}
            </div>`;
        }
    }
    container.innerHTML = html || '<p class="col-span-full py-10 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">Belum ada jadwal terdekat</p>';
    if (window.lucide) lucide.createIcons({ root: container });
}

export function getFastingInfo(date, hijri) {
    const day = date.getDay();
    const hDay = hijri.day;
    const hMonth = hijri.month;

    if (hMonth === 10 && hDay === 1) return { type: "Idul Fitri", category: "haram" };
    if (hMonth === 12 && hDay === 10) return { type: "Idul Adha", category: "haram" };
    if (hMonth === 12 && (hDay === 11 || hDay === 12 || hDay === 13)) return { type: "Hari Tasyriq", category: "haram" };

    if (hMonth === 9) return { type: "Puasa Ramadhan", category: "wajib", niatKey: FASTING_MAP["Puasa Ramadhan"] };
    if (hMonth === 10 && hDay >= 2 && hDay <= 7) return { type: "Puasa Syawal", category: "sunnah", niatKey: FASTING_MAP["Puasa Syawal"] };
    if (hMonth === 12 && hDay >= 1 && hDay <= 7) return { type: "Puasa Dzulhijjah", category: "sunnah", niatKey: FASTING_MAP["Puasa Dzulhijjah"] };
    if (hMonth === 12 && hDay === 8) return { type: "Puasa Tarwiyah", category: "sunnah", niatKey: FASTING_MAP["Puasa Tarwiyah"] };
    if (hMonth === 12 && hDay === 9) return { type: "Puasa Arafah", category: "sunnah", niatKey: FASTING_MAP["Puasa Arafah"] };
    if (hMonth === 1 && hDay === 9) return { type: "Puasa Tasu'a", category: "sunnah", niatKey: FASTING_MAP["Puasa Tasu'a"] };
    if (hMonth === 1 && hDay === 10) return { type: "Puasa Asyura", category: "sunnah", niatKey: FASTING_MAP["Puasa Asyura"] };
    if (hMonth === 8 && hDay === 15) return { type: "Puasa Nisfu Sya'ban", category: "sunnah", niatKey: FASTING_MAP["Puasa Nisfu Sya'ban"] };
    if (hDay === 13 || hDay === 14 || hDay === 15) return { type: "Puasa Ayyamul Bidh", category: "sunnah", niatKey: FASTING_MAP["Puasa Ayyamul Bidh"] };
    if (day === 1) return { type: "Puasa Senin", category: "sunnah", niatKey: FASTING_MAP["Puasa Senin"] };
    if (day === 4) return { type: "Puasa Kamis", category: "sunnah", niatKey: FASTING_MAP["Puasa Kamis"] };
    return null;
}

function openNiatModal(types) {
    if (!types) return;
    const modal = document.getElementById('niatModal');
    const container = document.getElementById('niatListContainer');
    if (!modal || !container) return;
    let html = '';
    types.split(',').forEach(t => {
        const data = NIAT_DATA[t.trim()];
        if (data) {
            const isWajib = ["Puasa Ramadhan", "Puasa Qadha Ramadhan", "Puasa Nadzar", "Puasa Kifarat"].includes(data.judul);
            const catalog = NIAT_CATALOG[t.trim()];
            const c = catalog ? COLOR_MAP[catalog.color] || COLOR_MAP.emerald : COLOR_MAP.emerald;
            html += `
            <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-white dark:border-slate-800 shadow-sm space-y-4">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-sm font-black text-slate-800 dark:text-white">${data.judul}</h4>
                    <span class="text-[9px] font-black px-2 py-0.5 rounded-lg border ${isWajib ? 'text-amber-600 border-amber-100' : 'text-emerald-600 border-emerald-100'}">${isWajib ? 'Wajib' : 'Sunnah'}</span>
                </div>
                ${catalog ? `<p class="text-[10px] text-slate-400 dark:text-slate-500 font-medium -mt-2">${catalog.desc}</p>` : ''}
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
    if (!history.state || !history.state.fastingModalOpen) {
        history.pushState({ fastingModalOpen: true }, '', window.location.href);
    }
    modal.classList.remove('invisible', 'pointer-events-none');
    requestAnimationFrame(() => {
        document.getElementById('niatBackdrop').classList.add('opacity-100');
        document.getElementById('niatModalContent').classList.remove('translate-y-full', 'sm:translate-y-10', 'sm:scale-95', 'sm:opacity-0');
    });
}

function closeNiatModal(fromPopState = false) {
    const modal = document.getElementById('niatModal');
    if (!modal) return;
    if (!fromPopState && history.state && history.state.fastingModalOpen) {
        history.back();
    }
    document.getElementById('niatBackdrop').classList.remove('opacity-100');
    document.getElementById('niatModalContent').classList.add('translate-y-full', 'sm:translate-y-10', 'sm:scale-95', 'sm:opacity-0');
    setTimeout(() => { modal.classList.add('invisible', 'pointer-events-none'); }, 500);
}
