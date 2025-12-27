let allAsma = [];
let currentDetailIndex = 0;
let lastScrollTop = 0;

/**
 * PINDAHKAN FUNGSI KE ATAS AGAR TERDEFINISI SEBELUM DIGUNAKAN
 * Memperbaiki error ReferenceError
 */
function searchAsma(query) {
    const lowerQ = query.toLowerCase();
    const items = document.querySelectorAll('#asmaList .item-asma');
    items.forEach(item => {
        const text = item.querySelector('.text-asma-latin')?.textContent.toLowerCase() || "";
        item.classList.toggle('hidden', !text.includes(lowerQ));
    });
}

export function initAsmaulHusna() {
    window.searchAsma = searchAsma;
    window.openAsmaDetail = openAsmaDetail;
    window.closeAsmaDetail = closeAsmaDetail;
    window.changeAsma = changeAsma;

    renderSkeleton();

    // Logika Smart Hide Search Bar (Header Tetap, SearchBar Ngumpet -250px)
    const view = document.getElementById('asmaulHusnaView');
    const searchContainer = document.getElementById('asmaSearchContainer');

    if (view && searchContainer) {
        view.addEventListener('scroll', () => {
            let st = view.scrollTop;
            if (st > lastScrollTop && st > 150) {
                // Sembunyikan halus ke atas di balik header
                searchContainer.style.transform = 'translateY(-250px)';
            } else if (st < lastScrollTop) {
                // Munculkan kembali
                searchContainer.style.transform = 'translateY(0)';
            }
            lastScrollTop = st <= 0 ? 0 : st;
        }, { passive: true });
    }

    window.addEventListener('viewChanged', (e) => {
        const searchWrapper = document.getElementById('asmaSearchWrapper');
        if (e.detail.viewId === 'asmaulHusnaView') {
            if (allAsma.length === 0) fetchAsmaList();
            if (searchWrapper) {
                searchWrapper.style.transform = "translate3d(0,0,0)";
            }
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
    const item = `
    <div class="animate-pulse bg-white/50 dark:bg-slate-900/50 p-5 rounded-[1.8rem] border border-white dark:border-slate-800 flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0"></div>
        <div class="flex-1 space-y-2">
            <div class="h-3 bg-slate-200 dark:bg-slate-800 rounded-full w-24"></div>
            <div class="h-2 bg-slate-200 dark:bg-slate-800 rounded-full w-16"></div>
        </div>
    </div>`;
    container.innerHTML = item.repeat(12);
}

async function fetchAsmaList() {
    const container = document.getElementById('asmaList');
    try {
        const response = await fetch('https://raw.githubusercontent.com/mikqi/dzikir-counter/master/www/asmaul-husna.json');
        const result = await response.json();
        allAsma = result.map(item => ({
            urutan: item.urutan,
            latin: item.latin,
            arab: item.arab,
            indo: item.arti
        }));
        renderAsmaList(allAsma);
    } catch (error) {
        console.error("Fetch Asmaul Husna error:", error);
        if (container) container.innerHTML = `<div class="col-span-full py-20 text-center opacity-50"><p class="text-sm font-bold">Gagal memuat data</p></div>`;
    }
}

function renderAsmaList(data) {
    const container = document.getElementById('asmaList');
    if (!container) return;
    if (data.length === 0) {
        container.innerHTML = `<div class="col-span-full py-10 text-center opacity-40 text-sm">Tidak ditemukan.</div>`;
        return;
    }
    let html = '';
    data.forEach((item, index) => {
        html += `
        <div onclick="vibrateSoft(); openAsmaDetail(${index})" class="bento-card group bg-white dark:bg-slate-900 p-5 rounded-[1.8rem] border border-white dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all duration-300 cursor-pointer active:scale-[0.98] flex items-center gap-4 item-asma">
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/50 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                ${item.urutan}
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-slate-800 dark:text-white text-base group-hover:text-emerald-600 transition-colors truncate text-asma-latin">${item.latin}</h4>
                <p class="text-[10px] text-slate-400 font-medium truncate tracking-wide">${item.indo}</p>
            </div>
            <div class="text-right pl-2 shrink-0">
                <span class="font-quran text-2xl text-slate-300 dark:text-slate-700 group-hover:text-emerald-500/40 transition-colors duration-500">${item.arab}</span>
            </div>
        </div>`;
    });
    container.innerHTML = html;
    if (window.lucide) lucide.createIcons({ root: container });
}

function openAsmaDetail(index) {
    currentDetailIndex = index;
    const item = allAsma[index];
    if (!item) return;
    const modal = document.getElementById('asmaDetailModal');
    const backdrop = document.getElementById('asmaBackdrop');
    const content = document.getElementById('asmaDetailContent');

    document.getElementById('detailNumber').innerText = item.urutan;
    document.getElementById('detailArabic').innerText = item.arab;
    document.getElementById('detailLatin').innerText = item.latin;
    document.getElementById('detailMeaning').innerText = item.indo;

    const prevBtn = document.getElementById('btnPrevAsma');
    const nextBtn = document.getElementById('btnNextAsma');
    if (prevBtn) prevBtn.disabled = (index === 0);
    if (nextBtn) nextBtn.disabled = (index === allAsma.length - 1);

    if (modal && content && backdrop) {
        modal.classList.remove('invisible', 'pointer-events-none');
        requestAnimationFrame(() => {
            backdrop.classList.add('opacity-100');
            content.classList.remove('translate-y-full');
            content.classList.add('translate-y-0');
        });
    }
}

function changeAsma(direction) {
    const newIndex = currentDetailIndex + direction;
    if (newIndex >= 0 && newIndex < allAsma.length) {
        vibrateSoft();
        openAsmaDetail(newIndex);
    }
}

function closeAsmaDetail() {
    const modal = document.getElementById('asmaDetailModal');
    const backdrop = document.getElementById('asmaBackdrop');
    const content = document.getElementById('asmaDetailContent');
    if (modal && content && backdrop) {
        backdrop.classList.remove('opacity-100');
        content.classList.add('translate-y-full');
        content.classList.remove('translate-y-0');
        setTimeout(() => modal.classList.add('invisible', 'pointer-events-none'), 500);
    }
}