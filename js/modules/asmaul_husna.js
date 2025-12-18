let asmaulHusnaData = [];
let currentDetailIndex = 0;
let searchTimeout = null;

export function initAsmaulHusna() {
    window.searchAsma = searchAsma;
    window.openAsmaDetail = openAsmaDetail;
    window.closeAsmaDetail = closeAsmaDetail;
    window.changeAsma = changeAsma;

    window.addEventListener('viewChanged', (e) => {
        const searchWrapper = document.getElementById('asmaSearchWrapper');

        if (e.detail.viewId === 'asmaulHusnaView') {
            const searchInput = document.getElementById('asmaSearchInput');
            if (searchInput) searchInput.value = '';

            if (asmaulHusnaData.length === 0) {
                fetchAsmaulHusna();
            } else {
                const items = document.querySelectorAll('.item-asma');
                items.forEach(el => el.classList.remove('hidden'));
            }

            // Animasi Search Bar Masuk
            if (searchWrapper) {
                searchWrapper.style.transform = "";
                setTimeout(() => {
                    if (document.getElementById('asmaulHusnaView').classList.contains('active')) {
                        searchWrapper.style.transform = "translate3d(0,0,0)";
                    }
                }, 350);
            }
        } else {
            if (searchWrapper) searchWrapper.style.transform = "";
        }
    });

    // [LISTENER RESET OTOMATIS]
    window.addEventListener('viewExit', (e) => {
        if (e.detail.viewId === 'asmaulHusnaView') {
            closeAsmaDetail();
        }
    });
}

async function fetchAsmaulHusna() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/mikqi/dzikir-counter/master/www/asmaul-husna.json');
        const result = await response.json();

        asmaulHusnaData = result.map(item => ({
            index: item.urutan,
            latin: item.latin,
            arabic: item.arab,
            meaning: item.arti
        }));

        renderList(asmaulHusnaData);

    } catch (error) {
        console.error("Gagal fetch Asmaul Husna:", error);
        const container = document.getElementById('asmaList');
        if (container) container.innerHTML = `<div class="flex flex-col items-center justify-center pt-10 text-slate-400"><i data-lucide="wifi-off" class="w-8 h-8 mb-2"></i><p class="text-sm">Gagal memuat data</p></div>`;
        if (window.lucide) lucide.createIcons();
    }
}

function renderList(data) {
    const container = document.getElementById('asmaList');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center pt-10 text-slate-400"><i data-lucide="search-x" class="w-8 h-8 mb-2"></i><p class="text-sm">Tidak ditemukan</p></div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    const fragment = document.createDocumentFragment();

    data.forEach(item => {
        const div = document.createElement('div');
        div.className = "item-asma group bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 cursor-pointer active:scale-[0.98] flex items-center justify-between relative overflow-hidden";
        div.onclick = () => { if (window.vibrateSoft) window.vibrateSoft(); openAsmaDetail(item.index); };
        div.setAttribute('data-search', `${item.index} ${item.latin.toLowerCase()} ${item.meaning.toLowerCase()}`);

        div.innerHTML = `
            <div class="flex items-center gap-4 relative z-10 w-full">
                <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/50 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-sm">
                    ${item.index}
                </div>
                
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-slate-700 dark:text-white text-base group-hover:text-emerald-600 transition-colors truncate">${item.latin}</h4>
                    <p class="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-tight truncate">${item.meaning}</p>
                </div>

                <div class="text-right pl-2 shrink-0">
                    <span class="font-quran text-2xl text-slate-800 dark:text-white group-hover:text-emerald-600 transition-colors duration-300 block">${item.arabic}</span>
                </div>
            </div>`;

        fragment.appendChild(div);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
    if (window.lucide) lucide.createIcons();
}

function searchAsma(query) {
    if (searchTimeout) cancelAnimationFrame(searchTimeout);

    searchTimeout = requestAnimationFrame(() => {
        const lowerQ = query.toLowerCase();
        const items = document.querySelectorAll('.item-asma');

        items.forEach(item => {
            const searchText = item.getAttribute('data-search') || '';

            if (searchText.includes(lowerQ)) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
    });
}

function openAsmaDetail(index) {
    const data = asmaulHusnaData.find(d => d.index === index);
    if (!data) return;
    currentDetailIndex = index;

    document.getElementById('detailNumber').innerText = data.index;
    document.getElementById('detailArabic').innerText = data.arabic;
    document.getElementById('detailLatin').innerText = data.latin;
    document.getElementById('detailMeaning').innerText = data.meaning;

    const btnPrev = document.getElementById('btnPrevAsma');
    const btnNext = document.getElementById('btnNextAsma');
    if (btnPrev) btnPrev.disabled = (index <= 1);
    if (btnNext) btnNext.disabled = (index >= 99);

    const modal = document.getElementById('asmaDetailModal');
    const backdrop = document.getElementById('asmaBackdrop');
    const content = document.getElementById('asmaDetailContent');

    if (modal && content && backdrop) {
        modal.classList.remove('invisible', 'pointer-events-none');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                backdrop.classList.remove('opacity-0');
                content.classList.remove('translate-y-full');
            });
        });
    }
}

function changeAsma(direction) {
    const newIndex = currentDetailIndex + direction;
    if (newIndex >= 1 && newIndex <= 99) {
        openAsmaDetail(newIndex);
    }
}

function closeAsmaDetail() {
    const modal = document.getElementById('asmaDetailModal');
    const backdrop = document.getElementById('asmaBackdrop');
    const content = document.getElementById('asmaDetailContent');

    if (modal && content && backdrop) {
        backdrop.classList.add('opacity-0');
        content.classList.add('translate-y-full');
        setTimeout(() => { modal.classList.add('invisible', 'pointer-events-none'); }, 300);
    }
}