let allAsma = [];
let currentDetailIndex = 0;
let searchTimeout;

export function initAsmaulHusna() {
    window.searchAsma = searchAsma;
    window.openAsmaDetail = openAsmaDetail;
    window.closeAsmaDetail = closeAsmaDetail;
    window.changeAsma = changeAsma;

    // GENERATE SKELETON
    renderSkeleton();

    window.addEventListener('viewChanged', (e) => {
        const searchWrapper = document.getElementById('asmaSearchWrapper');
        if (e.detail.viewId === 'asmaulHusnaView') {
            if (allAsma.length === 0) fetchAsmaList();

            if (searchWrapper) {
                searchWrapper.style.transform = "";
                setTimeout(() => {
                    const view = document.getElementById('asmaulHusnaView');
                    if (view && (view.classList.contains('active') || !view.classList.contains('hidden-force'))) {
                        searchWrapper.style.transform = "translate3d(0,0,0)";
                    }
                }, 350);
            }
        } else {
            if (searchWrapper) searchWrapper.style.transform = "";
        }
    });

    window.addEventListener('viewExit', (e) => {
        if (e.detail.viewId === 'asmaulHusnaView') {
            closeAsmaDetail();
        }
    });
}

function renderSkeleton() {
    const container = document.getElementById('asmaList');
    if (!container) return;

    // Skeleton Style Identik dengan Konten Asli
    const item = `
    <div class="animate-pulse bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
        <div class="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0"></div>
        <div class="flex-1 space-y-2">
            <div class="h-3 bg-slate-200 dark:bg-slate-800 rounded w-24"></div>
            <div class="h-2 bg-slate-200 dark:bg-slate-800 rounded w-16"></div>
        </div>
    </div>`;

    container.innerHTML = item.repeat(16); // 16 Item biar penuh di desktop
}

async function fetchAsmaList() {
    const container = document.getElementById('asmaList');

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        // Menggunakan sumber data yang stabil
        const response = await fetch('https://raw.githubusercontent.com/mikqi/dzikir-counter/master/www/asmaul-husna.json', { signal: controller.signal });
        clearTimeout(timeoutId);

        const result = await response.json();

        // Mapping data agar sesuai format yang kita pakai
        allAsma = result.map(item => ({
            urutan: item.urutan,
            latin: item.latin,
            arab: item.arab,
            indo: item.arti
        }));

        renderAsmaList(allAsma);
    } catch (error) {
        console.error("Gagal fetch asma:", error);
        if (container) {
            container.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center pt-10 text-slate-400 text-center">
                    <i data-lucide="wifi-off" class="w-10 h-10 mb-2 opacity-50"></i>
                    <p class="text-sm font-bold">Gagal memuat data</p>
                    <button onclick="fetchAsmaList()" class="mt-3 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md hover:bg-emerald-600 transition">Coba Lagi</button>
                </div>`;
            if (window.lucide) lucide.createIcons({ root: container });
        }
    }
}

function renderAsmaList(data) {
    const container = document.getElementById('asmaList');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400 text-sm">Tidak ditemukan.</div>`;
        return;
    }

    let html = '';
    data.forEach((item, index) => {
        html += `
        <div onclick="vibrateSoft(); openAsmaDetail(${index})" class="group bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 cursor-pointer active:scale-[0.98] flex items-center gap-4 item-asma">
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/50 group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-sm">
                ${item.urutan}
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-slate-800 dark:text-white text-base group-hover:text-emerald-600 transition-colors truncate text-asma-latin">${item.latin}</h4>
                <p class="text-[10px] text-slate-400 font-medium truncate">${item.indo}</p>
            </div>
            <div class="text-right">
                <span class="font-quran text-xl text-slate-300 dark:text-slate-700 group-hover:text-emerald-500/30 transition-colors">${item.arab}</span>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

function searchAsma(query) {
    if (searchTimeout) cancelAnimationFrame(searchTimeout);
    searchTimeout = requestAnimationFrame(() => {
        const lowerQ = query.toLowerCase();
        const items = document.querySelectorAll('#asmaList .item-asma');
        items.forEach(item => {
            const latinEl = item.querySelector('.text-asma-latin');
            const text = latinEl ? latinEl.textContent.toLowerCase() : '';
            if (text.includes(lowerQ)) item.classList.remove('hidden');
            else item.classList.add('hidden');
        });
    });
}

function openAsmaDetail(index) {
    currentDetailIndex = index;
    const item = allAsma[index];
    if (!item) return;

    const modal = document.getElementById('asmaDetailModal');
    const backdrop = document.getElementById('asmaBackdrop');
    const content = document.getElementById('asmaDetailContent');

    const detailNumber = document.getElementById('detailNumber');
    const detailArabic = document.getElementById('detailArabic');
    const detailLatin = document.getElementById('detailLatin');
    const detailMeaning = document.getElementById('detailMeaning');

    if (detailNumber) detailNumber.innerText = item.urutan;
    if (detailArabic) detailArabic.innerText = item.arab;
    if (detailLatin) detailLatin.innerText = item.latin;
    if (detailMeaning) detailMeaning.innerText = item.indo;

    const prevBtn = document.getElementById('btnPrevAsma');
    const nextBtn = document.getElementById('btnNextAsma');

    if (prevBtn) prevBtn.disabled = (index === 0);
    if (nextBtn) nextBtn.disabled = (index === allAsma.length - 1);

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

function changeAsma(direction) {
    const newIndex = currentDetailIndex + direction;
    if (newIndex >= 0 && newIndex < allAsma.length) {
        openAsmaDetail(newIndex);
    }
}

function closeAsmaDetail() {
    const modal = document.getElementById('asmaDetailModal');
    const backdrop = document.getElementById('asmaBackdrop');
    const content = document.getElementById('asmaDetailContent');

    if (modal && content && backdrop) {
        backdrop.classList.add('opacity-0');
        content.classList.add('translate-y-full', 'sm:translate-y-20');
        setTimeout(() => { modal.classList.add('invisible', 'pointer-events-none'); }, 300);
    }
}