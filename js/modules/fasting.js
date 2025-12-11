import { state } from '../state.js';
import { calculateHijri } from './home.js';
import { switchView } from '../router.js'; 

const HIJRI_MONTHS = ["Muharram","Safar","Rabi'ul Awal","Rabi'ul Akhir", "Jumadil Awal","Jumadil Akhir","Rajab","Sya'ban", "Ramadhan","Syawal","Dzulkaidah","Dzulhijjah"];

const NIAT_DATA = {
    ramadhan: { title: "Niat Puasa Ramadhan", arab: "نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ فَرْضِ شَهْرِ رَمَضَانَ هَذِهِ السَّنَةِ لِلّٰهِ تَعَالَى", latin: "Nawaitu shauma ghadin 'an adā'i fardhi syahri Ramadhāna hādzihis sanati lillāhi ta'ālā.", arti: "Aku berniat puasa esok hari untuk menunaikan fardhu di bulan Ramadhan tahun ini, karena Allah Ta'ala." },
    senin: { title: "Niat Puasa Senin", arab: "نَوَيْتُ صَوْمَ يَوْمِ الْإِثْنَيْنِ لِلّٰهِ تَعَالَى", latin: "Nawaitu shauma yaumil itsnaini sunnatan lillāhi ta'ālā.", arti: "Aku berniat puasa sunnah hari Senin karena Allah Ta'ala." },
    kamis: { title: "Niat Puasa Kamis", arab: "نَوَيْتُ صَوْمَ يَوْمِ الْخَمِيْسِ لِلّٰهِ تَعَالَى", latin: "Nawaitu shauma yaumil khamīsi sunnatan lillāhi ta'ālā.", arti: "Aku berniat puasa sunnah hari Kamis karena Allah Ta'ala." },
    ayyamul_bidh: { title: "Niat Puasa Ayyamul Bidh", arab: "نَوَيْتُ صَوْمَ اَيَّامِ الْبِيْضِ سُنَّةً لِلّٰهِ تَعَالَى", latin: "Nawaitu shauma ayyāmil bīdh sunnatan lillāhi ta'ālā.", arti: "Aku berniat puasa sunnah Ayyamul Bidh karena Allah Ta'ala." },
    arafah: { title: "Niat Puasa Arafah", arab: "نَوَيْتُ صَوْمَ عَرَفَةَ سُنَّةً لِلّٰهِ تَعَالَى", latin: "Nawaitu shauma 'arafata sunnatan lillāhi ta'ālā.", arti: "Aku berniat puasa sunnah Arafah karena Allah Ta'ala." },
    tarwiyah: { title: "Niat Puasa Tarwiyah", arab: "نَوَيْتُ صَوْمَ تَرْوِيَةَ سُنَّةً لِلّٰهِ تَعَالَى", latin: "Nawaitu shauma tarwiyata sunnatan lillāhi ta'ālā.", arti: "Aku berniat puasa sunnah Tarwiyah karena Allah Ta'ala." },
    asyura: { title: "Niat Puasa Asyura", arab: "نَوَيْتُ صَوْمَ عَاشُورَاءَ سُنَّةً لِلّٰهِ تَعَالَى", latin: "Nawaitu shauma 'āsyūrā-a sunnatan lillāhi ta'ālā.", arti: "Aku berniat puasa sunnah Asyura karena Allah Ta'ala." },
    tasua: { title: "Niat Puasa Tasu'a", arab: "نَوَيْتُ صَوْمَ تَاسُوعَاءَ سُنَّةً لِلّٰهِ تَعَالَى", latin: "Nawaitu shauma tāsū'ā-a sunnatan lillāhi ta'ālā.", arti: "Aku berniat puasa sunnah Tasu'a karena Allah Ta'ala." },
    syawal: { title: "Niat Puasa Syawal", arab: "نَوَيْتُ صَوْمَ غَدٍ عَنْ سِتَّةٍ مِنْ شَوَّالٍ سُنَّةً لِلّٰهِ تَعَالَى", latin: "Nawaitu shauma ghadin 'an sittatin min syawwāl sunnatan lillāhi ta'ālā.", arti: "Aku berniat puasa sunnah enam hari bulan Syawal karena Allah Ta'ala." },
    syaban: { title: "Niat Puasa Sya'ban", arab: "نَوَيْتُ صَوْمَ شَهْرِ شَعْبَانَ سُنَّةً لِلّٰهِ تَعَالَى", latin: "Nawaitu shauma syahri sya'bāna sunnatan lillāhi ta'ālā.", arti: "Aku berniat puasa sunnah bulan Sya'ban karena Allah Ta'ala." }
};

export function initFasting() {
    window.openNiatModal = openNiatModal;
    window.closeNiatModal = closeNiatModal;
    
    // Event Listener: Klik area kosong = Tutup Modal
    const modal = document.getElementById('niatModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeNiatModal();
        });
    }

    window.addEventListener('viewChanged', (e) => {
        if(e.detail.viewId === 'homeView') {
            const { date, isTomorrow } = getRelevantDateInfo();
            const status = getFastingStatus(date);
            const container = document.getElementById('homeFastingContainer');
            // Render kartu dengan label dinamis (BESOK/HARI INI)
            renderCard(container, status, true, isTomorrow ? "INFO BESOK" : null);
        }
        else if(e.detail.viewId === 'fastingView') {
            renderFastingPage();
        }
    });
}

function getRelevantDateInfo() {
    const now = new Date();
    let targetDate = new Date(now);
    let isTomorrow = false;

    const maghribStr = state.prayerTimes.Maghrib;
    if (maghribStr && maghribStr !== '--:--') {
        const [h, m] = maghribStr.split(':').map(Number);
        const maghribDate = new Date(now);
        maghribDate.setHours(h, m, 0, 0);
        
        if (now > maghribDate) {
            targetDate.setDate(now.getDate() + 1);
            isTomorrow = true;
        }
    }
    return { date: targetDate, isTomorrow };
}

function getFastingStatus(dateInput) {
    const today = new Date(dateInput);
    const hijri = calculateHijri(today, -1);
    const dayOfWeek = today.getDay(); 
    
    let status = { type: 'none', text: '', icon: '', color: '', niat: [], hijriStr: `${hijri.day} ${HIJRI_MONTHS[hijri.month]}` };

    if (hijri.month === 9 && hijri.day === 1) { status.type = 'haram'; status.text = "Idul Fitri - Diharamkan"; status.icon = "party-popper"; status.color = "rose"; }
    else if (hijri.month === 11 && hijri.day === 10) { status.type = 'haram'; status.text = "Idul Adha - Diharamkan"; status.icon = "party-popper"; status.color = "rose"; }
    else if (hijri.month === 11 && (hijri.day >= 11 && hijri.day <= 13)) { status.type = 'haram'; status.text = "Hari Tasyrik - Diharamkan"; status.icon = "utensils-crossed"; status.color = "rose"; }
    else if (hijri.month === 7 && hijri.day === 30) { status.type = 'haram'; status.text = "Hari Syak - Diharamkan"; status.icon = "alert-circle"; status.color = "rose"; }
    else if (hijri.month === 8) { status.type = 'wajib'; status.text = `Ramadhan Hari ke-${hijri.day}`; status.icon = "moon"; status.color = "amber"; status.niat = ['ramadhan']; }
    else {
        if (hijri.month === 11 && hijri.day === 9) { status.type = 'sunnah'; status.text = "Puasa Arafah"; status.icon = "mountain-snow"; status.color = "emerald"; status.niat = ['arafah']; }
        else if (hijri.month === 11 && hijri.day === 8) { status.type = 'sunnah'; status.text = "Puasa Tarwiyah"; status.icon = "droplet"; status.color = "emerald"; status.niat = ['tarwiyah']; }
        else if (hijri.month === 0 && hijri.day === 10) { status.type = 'sunnah'; status.text = "Puasa Asyura"; status.icon = "sparkles"; status.color = "emerald"; status.niat = ['asyura']; }
        else if (hijri.month === 0 && hijri.day === 9) { status.type = 'sunnah'; status.text = "Puasa Tasu'a"; status.icon = "sparkles"; status.color = "emerald"; status.niat = ['tasua']; }
        else {
            let routineTexts = []; let routineNiat = [];
            if ((hijri.day >= 13 && hijri.day <= 15) && hijri.month !== 11) { routineTexts.push("Ayyamul Bidh"); routineNiat.push('ayyamul_bidh'); }
            if (dayOfWeek === 1) { routineTexts.push("Senin"); routineNiat.push('senin'); }
            else if (dayOfWeek === 4) { routineTexts.push("Kamis"); routineNiat.push('kamis'); }
            if (hijri.month === 9 && hijri.day > 1) { routineTexts.push("Syawal"); routineNiat.push('syawal'); }
            if (routineTexts.length > 0) { status.type = 'sunnah'; status.text = `Sunnah ${routineTexts[0]}`; status.icon = "leaf"; status.color = "emerald"; status.niat = routineNiat; }
        }
    }
    return status;
}

function renderFastingPage() {
    const todayContainer = document.getElementById('fastingPageTodayContainer');
    const { date, isTomorrow } = getRelevantDateInfo();
    const status = getFastingStatus(date);
    
    if(todayContainer && todayContainer.previousElementSibling) {
        todayContainer.previousElementSibling.innerText = isTomorrow ? "Besok (Setelah Maghrib)" : "Hari Ini";
    }

    renderCard(todayContainer, status, false, null);

    const listContainer = document.getElementById('upcomingFastingList');
    if(!listContainer) return;
    
    let html = '';
    let foundUpcoming = false;
    const startOffset = isTomorrow ? 2 : 1; 
    const baseDate = new Date(); 

    for(let i=startOffset; i<=startOffset+29; i++) {
        const nextDate = new Date();
        nextDate.setDate(baseDate.getDate() + i);
        const st = getFastingStatus(nextDate);

        if(st.type !== 'none') {
            foundUpcoming = true;
            const dateStr = nextDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
            let badgeColor = st.type === 'haram' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : st.type === 'wajib' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';

            const onClick = (st.niat.length > 0) ? `onclick="openNiatModal('${st.niat.join(',')}')"` : '';
            const pointer = (st.niat.length > 0) ? 'cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-600' : '';

            html += `
            <div ${onClick} class="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm transition active:scale-[0.98] ${pointer} group">
                <div class="flex items-center gap-4">
                    <div class="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shrink-0 group-hover:bg-white dark:group-hover:bg-slate-700 transition">
                        <span class="text-[10px] uppercase text-slate-400 font-bold">${nextDate.toLocaleDateString('id-ID', {month:'short'})}</span>
                        <span class="text-xl font-black text-slate-800 dark:text-white">${nextDate.getDate()}</span>
                    </div>
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-[9px] font-bold px-2 py-0.5 rounded-md ${badgeColor} uppercase tracking-wider">${st.type}</span>
                            <span class="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">${st.hijriStr} H</span>
                        </div>
                        <h4 class="font-bold text-slate-700 dark:text-slate-200 text-sm leading-tight">${st.text}</h4>
                        <p class="text-xs text-slate-400 mt-0.5">${dateStr}</p>
                    </div>
                </div>
                ${st.niat.length > 0 ? '<div class="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition"><i data-lucide="book-open" class="w-4 h-4"></i></div>' : ''}
            </div>`;
        }
    }

    if(!foundUpcoming) html = `<div class="text-center py-10 text-slate-400 text-sm italic">Tidak ada jadwal puasa khusus dalam 30 hari ke depan.</div>`;
    listContainer.innerHTML = html;
    if(window.lucide) lucide.createIcons();
}

function renderCard(container, status, isHome = false, labelOverride = null) {
    if (!container) return;
    
    // [PERBAIKAN] Selalu tampilkan container, jangan di-hide
    container.classList.remove('hidden');
    
    let bgClass, borderClass, textClass, iconBgClass;
    
    if (status.type === 'none') {
        bgClass = "bg-white dark:bg-slate-900"; 
        borderClass = "border-slate-200 dark:border-slate-800"; 
        textClass = "text-slate-500 dark:text-slate-400"; 
        iconBgClass = "bg-slate-100 dark:bg-slate-800";
        status.icon = "coffee"; 
        status.text = "Tidak ada jadwal puasa khusus.";
    } else if (status.type === 'haram') {
        bgClass = "bg-rose-50 dark:bg-rose-900/10"; borderClass = "border-rose-100 dark:border-rose-900/30"; textClass = "text-rose-600 dark:text-rose-400"; iconBgClass = "bg-rose-100 dark:bg-rose-900/20";
    } else if (status.type === 'wajib') {
        bgClass = "bg-amber-50 dark:bg-amber-900/10"; borderClass = "border-amber-100 dark:border-amber-900/30"; textClass = "text-amber-600 dark:text-amber-400"; iconBgClass = "bg-amber-100 dark:bg-amber-900/20";
    } else {
        bgClass = "bg-emerald-50 dark:bg-emerald-900/10"; borderClass = "border-emerald-100 dark:border-emerald-900/30"; textClass = "text-emerald-600 dark:text-emerald-400"; iconBgClass = "bg-emerald-100 dark:bg-emerald-900/20";
    }

    const actionClick = isHome ? "openFasting()" : `openNiatModal('${status.niat.join(',')}')`;
    const btnText = isHome ? "Selengkapnya" : "Lihat Niat";
    const btnAction = (status.niat && status.niat.length > 0) 
        ? `<button onclick="event.stopPropagation(); ${actionClick}" class="shrink-0 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-xs font-bold ${textClass} hover:opacity-80 transition active:scale-95">${btnText}</button>`
        : '';

    let headerLabel = labelOverride;
    if (!headerLabel) {
        headerLabel = status.type === 'haram' ? 'PERINGATAN' : (status.type === 'none' ? 'INFO PUASA' : 'INFO HARI INI');
    }

    container.innerHTML = `
        <div onclick="${actionClick}" class="relative w-full ${bgClass} rounded-[1.8rem] p-5 border ${borderClass} shadow-sm flex items-center gap-4 transition-all duration-300 cursor-pointer active:scale-[0.98]">
            <div class="w-12 h-12 rounded-2xl ${iconBgClass} ${textClass} flex items-center justify-center shrink-0"><i data-lucide="${status.icon}" class="w-6 h-6"></i></div>
            <div class="flex-1 min-w-0">
                <p class="text-[10px] font-bold opacity-60 uppercase tracking-wider ${textClass}">${headerLabel}</p>
                <h3 class="text-sm font-black ${textClass} leading-tight mt-0.5">${status.text}</h3>
                <p class="text-[10px] opacity-80 ${textClass} mt-0.5 font-medium">${status.hijriStr} H</p>
            </div>
            ${btnAction}
        </div>`;
    
    if (window.lucide) lucide.createIcons({ root: container });
}

function openNiatModal(keysStr) {
    if(event) event.stopPropagation();
    
    const fastingView = document.getElementById('fastingView');
    if (!fastingView || fastingView.classList.contains('hidden-force')) {
        if(window.openFasting) window.openFasting();
        setTimeout(() => showNiatModalInternal(keysStr), 300);
        return;
    }

    showNiatModalInternal(keysStr);
}

function showNiatModalInternal(keysStr) {
    const keys = keysStr.split(',');
    const container = document.getElementById('niatListContainer');
    const modal = document.getElementById('niatModal');
    const content = document.getElementById('niatModalContent');
    if (!container || !modal) return;

    let html = '';
    keys.forEach(key => {
        const data = NIAT_DATA[key];
        if (data) {
            html += `
            <div class="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 mb-4 last:mb-0">
                <div class="mb-4 text-center"><span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">${data.title}</span></div>
                <p class="font-quran text-2xl leading-[2.4] text-center text-slate-800 dark:text-white mb-4" dir="rtl">${data.arab}</p>
                <div class="space-y-2"><p class="text-sm font-medium text-emerald-600 dark:text-emerald-400 italic text-center">"${data.latin}"</p><p class="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">${data.arti}</p></div>
            </div>`;
        }
    });
    container.innerHTML = html;
    modal.classList.remove('invisible', 'pointer-events-none');
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        if(content) { content.style.transform = "translate3d(0,0,0)"; content.classList.remove('translate-y-full', 'sm:translate-y-20'); }
    });
}

function closeNiatModal() {
    const modal = document.getElementById('niatModal');
    const content = document.getElementById('niatModalContent');
    if(modal) {
        modal.classList.add('opacity-0');
        if(content) { content.style.transform = "translate3d(0,100%,0)"; content.classList.add('translate-y-full', 'sm:translate-y-20'); }
        setTimeout(() => { modal.classList.add('invisible', 'pointer-events-none'); }, 300);
    }
}