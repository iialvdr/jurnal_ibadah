let allDoa = [];
let currentGrup = '';
let currentTag = '';
let isFiltersLoaded = false;
let activeDropdown = null;
let lastScrollTop = 0;

function searchDoa(query) {
    const lowerQ = query.toLowerCase();
    const items = document.querySelectorAll('#doaListContainer .item-doa');
    if (!items || items.length === 0) return;

    items.forEach(item => {
        if (!item) return;
        const textEl = item.querySelector('.text-doa');
        const text = textEl ? textEl.textContent.toLowerCase() : "";
        item.classList.toggle('hidden', !text.includes(lowerQ));
    });
}

export function initDoa() {
    window.searchDoa = searchDoa;
    window.openDoaDetail = openDoaDetail;
    window.closeDoaDetail = closeDoaDetail;
    window.toggleFilter = toggleFilter;
    window.selectFilter = selectFilter;
    window.resetDoaFilters = resetDoaFilters;

    renderSkeleton();

    const view = document.getElementById('doaView');
    const searchContainer = document.getElementById('doaSearchContainer');

    if (view && searchContainer) {
        view.addEventListener('scroll', () => {
            let st = view.scrollTop;
            if (st > lastScrollTop && st > 150) {
                searchContainer.style.transform = 'translateY(-250px)';
            } else if (st < lastScrollTop) {
                searchContainer.style.transform = 'translateY(0)';
            }
            lastScrollTop = st <= 0 ? 0 : st;
        }, { passive: true });
    }

    window.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'doaView') {
            if (allDoa.length === 0) fetchDoaList();
            const searchWrapper = document.getElementById('doaSearchWrapper');
            if (searchWrapper) searchWrapper.style.transform = "translate3d(0,0,0)";
        } else {
            closeAllDropdowns();
        }
    });

    window.addEventListener('viewExit', (e) => {
        if (e.detail.viewId === 'doaView') {
            closeDoaDetail(true);
            closeAllDropdowns();
        }
    });

    window.addEventListener('popstate', (e) => {
        const modal = document.getElementById('doaDetailModal');
        if (modal && !modal.classList.contains('invisible')) {
            if (!e.state || !e.state.doaModalOpen) {
                closeDoaDetail(true);
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (!activeDropdown) return;
        const grpWrapper = document.getElementById('filterGrupWrapper');
        const tagWrapper = document.getElementById('filterTagWrapper');
        if (grpWrapper && !grpWrapper.contains(e.target) && tagWrapper && !tagWrapper.contains(e.target)) {
            closeAllDropdowns();
        }
    });
}

function renderSkeleton() {
    const container = document.getElementById('doaLoading');
    if (!container) return;
    const item = `
    <div class="animate-pulse bg-white/50 dark:bg-slate-900/50 p-5 rounded-[1.8rem] border border-white dark:border-slate-800 flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0"></div>
        <div class="flex-1 space-y-2">
            <div class="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full w-20"></div>
            <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-3/4"></div>
        </div>
    </div>`;
    container.innerHTML = item.repeat(12);
}

function toggleFilter(event, type) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const isClosingSameDropdown = (activeDropdown === type);
    closeAllDropdowns();
    if (!isClosingSameDropdown) {
        const listId = type === 'grup' ? 'listGrup' : 'listTag';
        const iconId = type === 'grup' ? 'iconGrup' : 'iconTag';
        const listEl = document.getElementById(listId);
        const iconEl = document.getElementById(iconId);
        if (listEl) {
            listEl.classList.remove('hidden');
            requestAnimationFrame(() => {
                listEl.classList.add('opacity-100', 'scale-100');
                listEl.classList.remove('opacity-0', 'scale-95');
            });
        }
        if (iconEl) iconEl.classList.add('rotate-180');
        activeDropdown = type;
    }
}

function closeAllDropdowns() {
    ['grup', 'tag'].forEach(type => {
        const list = document.getElementById(type === 'grup' ? 'listGrup' : 'listTag');
        const icon = document.getElementById(type === 'grup' ? 'iconGrup' : 'iconTag');
        if (list && list.classList.contains('opacity-100')) {
            list.classList.add('opacity-0', 'scale-95');
            list.classList.remove('opacity-100', 'scale-100');
            setTimeout(() => { if (list) list.classList.add('hidden'); }, 200);
        }
        if (icon) icon.classList.remove('rotate-180');
    });
    activeDropdown = null;
}

function selectFilter(type, value, label) {
    const labelEl = document.getElementById(type === 'grup' ? 'labelGrup' : 'labelTag');
    const btnEl = document.getElementById(type === 'grup' ? 'btnGrupFilter' : 'btnTagFilter');

    if (labelEl && btnEl) {
        if (value === '') {
            labelEl.innerText = type === 'grup' ? 'Kategori' : 'Tagar';
            btnEl.classList.remove('border-emerald-500/50', 'bg-emerald-50', 'dark:bg-emerald-900/20');
        } else {
            labelEl.innerText = label;
            btnEl.classList.add('border-emerald-500/50', 'bg-emerald-50', 'dark:bg-emerald-900/20');
        }
    }
    if (type === 'grup') currentGrup = value;
    else currentTag = value;
    closeAllDropdowns();
    fetchDoaList(currentGrup, currentTag);
}

function resetDoaFilters() {
    currentGrup = '';
    currentTag = '';

    const labelGrup = document.getElementById('labelGrup');
    const labelTag = document.getElementById('labelTag');
    const btnGrup = document.getElementById('btnGrupFilter');
    const btnTag = document.getElementById('btnTagFilter');
    const input = document.getElementById('doaSearchInput');

    if (labelGrup) labelGrup.innerText = 'Kategori';
    if (labelTag) labelTag.innerText = 'Tagar';
    if (btnGrup) btnGrup.classList.remove('border-emerald-500/50', 'bg-emerald-50', 'dark:bg-emerald-900/20');
    if (btnTag) btnTag.classList.remove('border-emerald-500/50', 'bg-emerald-50', 'dark:bg-emerald-900/20');
    if (input) input.value = '';

    closeAllDropdowns();
    fetchDoaList();
}

async function fetchDoaList(grup = '', tag = '') {
    const loader = document.getElementById('doaLoading');
    const container = document.getElementById('doaListContainer');
    if (loader) loader.classList.remove('hidden-force');
    if (container) container.classList.add('hidden');
    try {
        const url = new URL('https://equran.id/api/doa');
        if (grup) url.searchParams.append('grup', grup);
        if (tag) url.searchParams.append('tag', tag);
        const response = await fetch(url);
        let result = await response.json();
        let data = (Array.isArray(result)) ? result : (result.data || []);
        if (!grup && !tag && !isFiltersLoaded) {
            allDoa = data;
            extractAndRenderFilters(data);
            isFiltersLoaded = true;
        }
        renderDoaList(data);
    } catch (error) {
        console.error(error);
        const container = document.getElementById('doaListContainer');
        if (container) {
            container.innerHTML = `
            <div class="py-20 text-center opacity-70">
                <p class="text-sm font-bold mb-2">Gagal memuat data doa</p>
                <p class="text-[11px] font-bold text-slate-400 mb-4">Periksa koneksi atau coba lagi.</p>
                <button onclick="vibrateSoft(); fetchDoaList('${currentGrup}', '${currentTag}')" class="px-4 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition">Coba Lagi</button>
            </div>`;
        }
    } finally {
        if (loader) loader.classList.add('hidden-force');
        if (container) container.classList.remove('hidden');
    }
}

function extractAndRenderFilters(data) {
    const uniqueGrups = new Set();
    const uniqueTags = new Set();
    data.forEach(item => {
        if (item.grup) uniqueGrups.add(item.grup);
        if (item.tag) {
            if (Array.isArray(item.tag)) item.tag.forEach(t => uniqueTags.add(t));
            else if (typeof item.tag === 'string') item.tag.split(',').forEach(t => uniqueTags.add(t.trim()));
        }
    });
    const render = (el, items, type, defLabel) => {
        if (!el) return;
        let html = generateDropdownItem(type, '', defLabel, true);
        Array.from(items).sort().forEach(val => html += generateDropdownItem(type, val, val, false));
        el.innerHTML = html;
        if (window.lucide) lucide.createIcons({ root: el });
    };
    render(document.getElementById('listGrup'), uniqueGrups, 'grup', 'Semua Kategori');
    render(document.getElementById('listTag'), uniqueTags, 'tag', 'Semua Tagar');
}

function generateDropdownItem(type, value, label, isDefault) {
    const safeVal = value.replace(/'/g, "\\'");
    return `<div onclick="event.stopPropagation(); vibrateSoft(); selectFilter('${type}', '${safeVal}', '${label}')" class="px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-emerald-500 hover:text-white rounded-xl cursor-pointer transition-all flex items-center justify-between group mb-1 last:mb-0"><span>${label}</span>${isDefault ? '' : '<i data-lucide="check" class="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"></i>'}</div>`;
}

function renderDoaList(data) {
    const container = document.getElementById('doaListContainer');
    if (!container) return;
    if (data.length === 0) {
        container.innerHTML = `
        <div class="py-20 text-center opacity-60">
            <p class="text-sm font-bold mb-2">Tidak ada doa ditemukan</p>
            <p class="text-[11px] font-bold text-slate-400 mb-4">Coba ganti kata kunci atau reset filter.</p>
            <button onclick="vibrateSoft(); resetDoaFilters()" class="px-4 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition">Reset Filter</button>
        </div>`;
        return;
    }
    let html = '';
    data.forEach(doa => {
        const safeNama = doa.nama.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const badge = doa.grup ? `<span class="text-[9px] font-black uppercase tracking-widest text-emerald-500 dark:text-emerald-400 mb-1 block">${doa.grup}</span>` : '';
        html += `
        <div onclick="vibrateSoft(); openDoaDetail('${doa.id}', '${safeNama}')" class="bento-card group bg-white dark:bg-slate-900 p-5 rounded-[1.8rem] border border-white dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all duration-300 cursor-pointer active:scale-[0.98] flex items-center justify-between item-doa">
            <div class="flex items-center gap-5 overflow-hidden">
                <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/50 transition-transform duration-500">
                    <i data-lucide="book-heart" class="w-6 h-6"></i>
                </div>
                <div class="flex-1 min-w-0">
                    ${badge}
                    <h4 class="font-bold text-slate-700 dark:text-white text-sm group-hover:text-emerald-600 transition-colors line-clamp-2 text-doa leading-snug">${doa.nama}</h4>
                </div>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all shrink-0 ml-3"></i>
        </div>`;
    });
    container.innerHTML = html;
    if (window.lucide) lucide.createIcons({ root: container });
}

async function openDoaDetail(id, title) {
    const modal = document.getElementById('doaDetailModal');
    const backdrop = document.getElementById('doaBackdrop');
    const content = document.getElementById('doaDetailContent');
    const titleEl = document.getElementById('modalDoaTitle');
    
    if (titleEl) titleEl.innerText = title;

    if (modal && content && backdrop) {
        if (!history.state || !history.state.doaModalOpen) {
            history.pushState({ doaModalOpen: true }, '', window.location.href);
        }
        modal.classList.remove('invisible', 'pointer-events-none');
        requestAnimationFrame(() => {
            backdrop.classList.add('opacity-100');
            content.classList.remove('translate-y-full', 'sm:translate-y-10', 'sm:scale-95', 'sm:opacity-0');
            content.classList.add('translate-y-0');
        });
    }
    try {
        const doaData = allDoa.find(d => d.id === id);
        updateDetailContent(doaData || (await (await fetch(`https://equran.id/api/doa/${id}`)).json()).data);
    } catch (e) {
        console.error(e);
    }
}

function updateDetailContent(data) {
    const arabEl = document.getElementById('modalDoaArab');
    const latinEl = document.getElementById('modalDoaLatin');
    const indoEl = document.getElementById('modalDoaIndo');

    if (arabEl) arabEl.innerText = data.ar || data.arab || "-";
    if (latinEl) latinEl.innerText = data.tr || data.latin || "-";
    if (indoEl) indoEl.innerText = data.idn || data.arti || data.terjemahan || "-";

    const riwayat = data.riwayat || data.tentang || data.sumber || "";
    const sourceEl = document.getElementById('modalDoaSource');
    const sourceTextEl = document.getElementById('sourceText');

    if (sourceEl && sourceTextEl) {
        if (riwayat && riwayat !== "-" && riwayat !== "") {
            sourceEl.classList.remove('hidden');
            sourceTextEl.innerText = riwayat;
        } else {
            sourceEl.classList.add('hidden');
        }
    }
}

function closeDoaDetail(fromPopState = false) {
    const modal = document.getElementById('doaDetailModal');
    const backdrop = document.getElementById('doaBackdrop');
    const content = document.getElementById('doaDetailContent');
    if (modal && content && backdrop) {
        if (!fromPopState && history.state && history.state.doaModalOpen) {
            history.back();
        }
        backdrop.classList.remove('opacity-100');
        content.classList.add('translate-y-full', 'sm:translate-y-10', 'sm:scale-95', 'sm:opacity-0');
        content.classList.remove('translate-y-0');
        setTimeout(() => { if (modal) modal.classList.add('invisible', 'pointer-events-none'); }, 500);
    }
}
