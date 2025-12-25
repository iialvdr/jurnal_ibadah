import { calculateHijri } from './home.js';

// DATABASE NIAT LENGKAP
const niatCollection = {
    "senin": [
        { title: "Niat Puasa Senin", arab: "نَوَيْتُ صَوْمَ يَوْمَ اْلاِثْنَيْنِ سُنَّةً ِللهِ تَعَالَى", latin: "Nawaitu sauma yaumal itsnaini sunnatan lillahi ta'ala", arti: "Saya niat puasa hari Senin, sunnah karena Allah Ta'ala." }
    ],
    "kamis": [
        { title: "Niat Puasa Kamis", arab: "نَوَيْتُ صَوْمَ يَوْمَ الْخَمِيْسِ سُنَّةً ِللهِ تَعَالَى", latin: "Nawaitu sauma yaumal khamisi sunnatan lillahi ta'ala", arti: "Saya niat puasa hari Kamis, sunnah karena Allah Ta'ala." }
    ],
    "ayyamul_bidh": [
        { title: "Niat Puasa Ayyamul Bidh", arab: "نَوَيْتُ صَوْمَ اَيَّامَ اْلبيضِ سُنَّةً ِللهِ تَعَالَى", latin: "Nawaitu sauma ayyamal bidh sunnatan lillahi ta'ala", arti: "Saya niat puasa Ayyamul Bidh, sunnah karena Allah Ta'ala." }
    ],
    "ramadhan": [
        { title: "Niat Puasa Ramadhan (Harian)", arab: "نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ فَرْضِ شَهْرِ رَمَضَانِ هَذِهِ السَّنَةِ لِلّٰهِ تَعَالَى", latin: "Nawaitu shauma ghadin 'an ada'i fardhi syahri ramadhana hadzihis sanati lillahi ta'ala", arti: "Saya niat puasa esok hari untuk menunaikan fardhu di bulan Ramadhan tahun ini, karena Allah Ta'ala." },
        { title: "Niat Puasa Ramadhan (Sebulan Penuh)", arab: "نَوَيْتُ صَوْمَ جَمِيْعِ شَهْرِ رَمَضَانِ هَذِهِ السَّنَةِ تَقْلِيْدًا لِلْإِمَامِ مَالِكٍ فَرْضًا لِلّٰهِ تَعَالَى", latin: "Nawaitu shauma jami'i syahri ramadhana hadzihis sanati taqlidan lil imami Malikin fardhan lillahi ta'ala", arti: "Aku niat puasa sebulan penuh pada bulan Ramadhan tahun ini, mengikuti pendapat Imam Malik, wajib karena Allah Ta'ala." }
    ],
    "syawal": [
        { title: "Niat Puasa Syawal (6 Hari)", arab: "نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ سِتَّةٍ مِنْ شَوَّالٍ لِلّٰهِ تَعَالَى", latin: "Nawaitu shauma ghadin 'an ada'i sunnati sittatin min syawwalin lillahi ta'ala", arti: "Aku berniat puasa sunnah Syawal esok hari karena Allah Ta'ala." }
    ],
    "arafah": [
        { title: "Niat Puasa Arafah (9 Dzulhijjah)", arab: "نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ يَوْمِ عَرَفَةَ لِلّٰهِ تَعَالَى", latin: "Nawaitu shauma ghadin 'an ada'i sunnati yaumi arafah lillahi ta'ala", arti: "Aku berniat puasa sunnah Arafah esok hari karena Allah Ta'ala." },
        { title: "Niat Puasa Tarwiyah (8 Dzulhijjah)", arab: "نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ يَوْمِ التَّرْوِيَةِ لِلّٰهِ تَعَالَى", latin: "Nawaitu shauma ghadin 'an ada'i sunnati yaumi tarwiyah lillahi ta'ala", arti: "Aku berniat puasa sunnah Tarwiyah esok hari karena Allah Ta'ala." }
    ],
    "asyura": [
        { title: "Niat Puasa Asyura (10 Muharram)", arab: "نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ ْعَاشُورَاء لِلّٰهِ تَعَالَى", latin: "Nawaitu shauma ghadin 'an ada'i sunnati 'asyura lillahi ta'ala", arti: "Aku berniat puasa sunnah Asyura esok hari karena Allah Ta'ala." },
        { title: "Niat Puasa Tasu'a (9 Muharram)", arab: "نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ تَاسُوعَاء لِلّٰهِ تَعَالَى", latin: "Nawaitu shauma ghadin 'an ada'i sunnati tasu'a lillahi ta'ala", arti: "Aku berniat puasa sunnah Tasu'a esok hari karena Allah Ta'ala." }
    ]
};

export function initFasting() {
    window.openNiatModal = openNiatModal;
    window.closeNiatModal = closeNiatModal;

    // GENERATE SKELETON
    renderSkeleton();

    window.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'fastingView') {
            updateFastingUI();
        }
    });

    window.addEventListener('viewExit', (e) => {
        if (e.detail.viewId === 'fastingView') {
            closeNiatModal();
        }
    });
}

function renderSkeleton() {
    const container = document.getElementById('fastingLoading');
    if (!container) return;

    // Skeleton Card
    const item = `
    <div class="animate-pulse bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0"></div>
        <div class="flex-1 space-y-2">
            <div class="h-3 bg-slate-200 dark:bg-slate-800 rounded w-24"></div>
            <div class="h-2 bg-slate-200 dark:bg-slate-800 rounded w-16"></div>
        </div>
    </div>`;

    container.innerHTML = item.repeat(6);
}

function updateFastingUI() {
    const todayContainer = document.getElementById('fastingPageTodayContainer');
    const upcomingContainer = document.getElementById('upcomingFastingList');
    const loader = document.getElementById('fastingLoading');
    const hijriDisplay = document.getElementById('fastingHijriDate');

    if (!todayContainer || !upcomingContainer) return;

    // Show Loader, Hide Content
    if (loader) loader.classList.remove('hidden-force');
    upcomingContainer.classList.add('hidden');

    const now = new Date();
    const h = calculateHijri(now, -1);

    if (hijriDisplay) {
        const months = ["Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir", "Jumadil Awal", "Jumadil Akhir", "Rajab", "Sya'ban", "Ramadhan", "Syawal", "Dzulkaidah", "Dzulhijjah"];
        hijriDisplay.innerText = `${h.day} ${months[h.month]} ${h.year} H`;
    }

    // Simulasi loading sebentar agar smooth
    setTimeout(() => {
        const todayData = getFastingData(now);
        renderTodayCard(todayContainer, todayData);

        const upcoming = [];
        for (let i = 1; i <= 30; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() + i);
            const f = getFastingData(d);
            if (f) upcoming.push({ date: d, ...f });
        }
        renderUpcomingList(upcomingContainer, upcoming);

        // Hide Loader, Show Content
        if (loader) loader.classList.add('hidden-force');
        upcomingContainer.classList.remove('hidden');
    }, 500);
}

function getFastingData(date) {
    const day = date.getDay();
    const h = calculateHijri(date, -1);

    // UPDATE: Tambah 'niatKey' agar kartu bisa diklik
    if (day === 1) return { title: "Puasa Senin", type: "Sunnah", icon: "calendar-check", color: "emerald", niatKey: "senin" };
    if (day === 4) return { title: "Puasa Kamis", type: "Sunnah", icon: "calendar-check", color: "emerald", niatKey: "kamis" };
    if ([13, 14, 15].includes(h.day)) return { title: "Ayyamul Bidh", type: "Sunnah", icon: "moon", color: "blue", niatKey: "ayyamul_bidh" };

    // Ramadhan (Bulan ke-8 di array)
    if (h.month === 8) return { title: `Ramadhan Hari ke-${h.day}`, type: "Wajib", icon: "sun", color: "amber", niatKey: "ramadhan" };

    return null;
}

function renderTodayCard(container, data) {
    if (!data) {
        container.innerHTML = `
        <div class="bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 text-center">
            <p class="text-xs text-slate-400">Tidak ada jadwal puasa khusus hari ini.</p>
        </div>`;
        return;
    }
    const colorClass = data.color === 'blue' ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' :
        data.color === 'amber' ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' :
            'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30';

    // UPDATE: Tambahkan onclick="openNiatModal" dan styling cursor-pointer
    container.innerHTML = `
        <div onclick="vibrateSoft(); openNiatModal('${data.niatKey}')" class="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition active:scale-[0.98] group relative overflow-hidden">
            
            <div class="absolute right-0 top-0 w-20 h-20 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-bl-full pointer-events-none"></div>

            <div class="flex items-center gap-4 relative z-10">
                <div class="w-12 h-12 rounded-full ${colorClass} flex items-center justify-center shrink-0 shadow-sm">
                    <i data-lucide="${data.icon}" class="w-6 h-6"></i>
                </div>
                <div>
                    <h4 class="font-bold text-slate-800 dark:text-white text-lg leading-tight">${data.title}</h4>
                    <p class="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                        Dianjurkan <span class="w-1 h-1 bg-slate-300 rounded-full"></span> <span class="text-emerald-500 font-bold">Ketuk untuk Niat</span>
                    </p>
                </div>
            </div>
            <div class="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full relative z-10">
                <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">${data.type}</span>
            </div>
        </div>`;

    if (window.lucide) lucide.createIcons({ root: container });
}

function renderUpcomingList(container, list) {
    let html = '';
    list.forEach(item => {
        const colorClass = item.color === 'blue' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' :
            item.color === 'amber' ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' :
                'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20';

        // UPDATE: List upcoming juga bisa diklik untuk lihat niatnya
        html += `
        <div onclick="vibrateSoft(); openNiatModal('${item.niatKey}')" class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
            <div class="w-12 h-12 rounded-xl ${colorClass} flex flex-col items-center justify-center shrink-0 border border-white dark:border-slate-700 shadow-sm">
                <span class="text-[10px] font-bold uppercase leading-none opacity-60">${item.date.toLocaleDateString('id-ID', { weekday: 'short' })}</span>
                <span class="text-lg font-black leading-none mt-0.5">${item.date.getDate()}</span>
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-slate-700 dark:text-white text-sm truncate">${item.title}</h4>
                <p class="text-[10px] text-slate-400 font-medium">${item.type}</p>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300"></i>
        </div>`;
    });

    if (list.length === 0) {
        html = `<div class="text-center py-8 text-slate-400 text-xs">Tidak ada puasa sunnah dalam waktu dekat.</div>`;
    }

    container.innerHTML = html;
}

// FUNGSI UTAMA PEMBUKA MODAL
function openNiatModal(keyString) {
    const modal = document.getElementById('niatModal');
    const backdrop = document.getElementById('niatBackdrop');
    const content = document.getElementById('niatModalContent');
    const listContainer = document.getElementById('niatListContainer');

    if (!keyString) return; // Cegah error jika key kosong

    // Reset isi list
    listContainer.innerHTML = '';
    let html = '';

    // Split key jika ada koma (contoh: "senin,kamis")
    const keys = keyString.split(',');

    keys.forEach(k => {
        const cleanKey = k.trim();
        if (niatCollection[cleanKey]) {
            niatCollection[cleanKey].forEach(n => {
                html += renderNiatItem(n);
            });
        }
    });

    // Jika kosong (misal key salah)
    if (html === '') {
        html = `<div class="p-8 text-center text-slate-400 text-xs">Belum ada data niat untuk kategori ini.</div>`;
    }

    listContainer.innerHTML = html;

    if (modal && content && backdrop) {
        modal.classList.remove('invisible', 'pointer-events-none');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                backdrop.classList.remove('opacity-0');
                content.classList.remove('translate-y-full', 'sm:translate-y-20');
            });
        });
    }
}

function renderNiatItem(n) {
    return `
    <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 mb-4">
        <h4 class="font-bold text-emerald-600 dark:text-emerald-400 text-sm border-b border-slate-100 dark:border-slate-800 pb-2">${n.title}</h4>
        <p class="font-quran text-2xl text-center text-slate-800 dark:text-white leading-loose py-2" dir="rtl">${n.arab}</p>
        <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl space-y-1">
            <p class="text-xs font-bold text-slate-600 dark:text-slate-300 italic">"${n.latin}"</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">${n.arti}</p>
        </div>
    </div>`;
}

function closeNiatModal() {
    const modal = document.getElementById('niatModal');
    const backdrop = document.getElementById('niatBackdrop');
    const content = document.getElementById('niatModalContent');

    if (modal && content && backdrop) {
        backdrop.classList.add('opacity-0');
        content.classList.add('translate-y-full', 'sm:translate-y-20');
        setTimeout(() => { modal.classList.add('invisible', 'pointer-events-none'); }, 300);
    }
}