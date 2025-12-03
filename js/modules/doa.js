let allDoa = [];
let currentGrup = '';
let currentTag = '';
let isFiltersLoaded = false;
let activeDropdown = null; // Melacak dropdown mana yang sedang terbuka

export function initDoa() {
    window.searchDoa = searchDoa;
    window.openDoaDetail = openDoaDetail;
    window.closeDoaDetail = closeDoaDetail;
    window.toggleFilter = toggleFilter;
    window.selectFilter = selectFilter;
    
    // [BARU] Tutup modal saat klik backdrop
    const detailModal = document.getElementById('doaDetailModal');
    if (detailModal) {
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) {
                closeDoaDetail();
            }
        });
    }
    
    // Fetch data saat view doa pertama kali dibuka
    window.addEventListener('viewChanged', (e) => {
        if(e.detail.viewId === 'doaView' && allDoa.length === 0) {
            fetchDoaList(); 
        } else {
            // Tutup dropdown jika pindah halaman/view
            closeAllDropdowns();
        }
    });

    // Listener global untuk menutup dropdown saat klik di luar area
    document.addEventListener('click', (e) => {
        if (activeDropdown) {
            const wrapper = document.getElementById(activeDropdown === 'grup' ? 'filterGrupWrapper' : 'filterTagWrapper');
            // Jika klik terjadi DI LUAR wrapper dropdown yang aktif, maka tutup
            if (wrapper && !wrapper.contains(e.target)) {
                closeAllDropdowns();
            }
        }
    });
}

async function fetchDoaList(grup = '', tag = '') {
    const loader = document.getElementById('doaLoading');
    if(loader) loader.classList.remove('hidden');

    try {
        const url = new URL('https://equran.id/api/doa');
        if (grup) url.searchParams.append('grup', grup);
        if (tag) url.searchParams.append('tag', tag);

        const response = await fetch(url);
        let result = await response.json();
        let data = [];

        if (Array.isArray(result)) {
            data = result;
        } else if (result.data) {
            data = result.data;
        }
        
        // Simpan data utama jika ini fetch awal (tanpa filter)
        if (!grup && !tag && !isFiltersLoaded) {
            allDoa = data;
            extractAndRenderFilters(data);
            isFiltersLoaded = true;
        }
        
        renderDoaList(data);

    } catch (error) {
        console.error("Gagal memuat doa:", error);
        const container = document.getElementById('doaListContainer');
        if(container) container.innerHTML = `<div class="flex flex-col items-center justify-center pt-10 text-slate-400"><i data-lucide="wifi-off" class="w-8 h-8 mb-2"></i><p class="text-sm">Gagal memuat data</p></div>`;
        if(window.lucide) lucide.createIcons();
    } finally {
        if(loader) loader.classList.add('hidden');
    }
}

// [BARU] Render ke Custom Dropdown
function extractAndRenderFilters(data) {
    const uniqueGrups = new Set();
    const uniqueTags = new Set();

    data.forEach(item => {
        if(item.grup) uniqueGrups.add(item.grup);
        if(item.tag) {
            if(Array.isArray(item.tag)) item.tag.forEach(t => uniqueTags.add(t));
            else if (typeof item.tag === 'string') item.tag.split(',').forEach(t => uniqueTags.add(t.trim()));
        }
    });

    // 1. Render List Grup
    const listGrup = document.getElementById('listGrup');
    if(listGrup) {
        const sortedGrups = Array.from(uniqueGrups).sort();
        // Item 'Semua'
        let html = generateDropdownItem('grup', '', 'Semua Kategori', true);
        // Item Lainnya
        sortedGrups.forEach(g => {
            html += generateDropdownItem('grup', g, g, false);
        });
        listGrup.innerHTML = html;
    }

    // 2. Render List Tag
    const listTag = document.getElementById('listTag');
    if(listTag) {
        const sortedTags = Array.from(uniqueTags).sort();
        let html = generateDropdownItem('tag', '', 'Semua Tag', true);
        sortedTags.forEach(t => {
            html += generateDropdownItem('tag', t, t, false);
        });
        listTag.innerHTML = html;
    }
}

// Helper bikin item HTML
function generateDropdownItem(type, value, label, isDefault) {
    const safeVal = value.replace(/'/g, "\\'");
    return `
    <div onclick="selectFilter('${type}', '${safeVal}', '${label}')" class="px-3 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg cursor-pointer transition-colors flex items-center justify-between group">
        <span>${label}</span>
        ${isDefault ? '' : '<i data-lucide="check" class="w-3 h-3 opacity-0 group-hover:opacity-100 text-emerald-500"></i>'}
    </div>`;
}

// [BARU] Logic Buka/Tutup Dropdown
function toggleFilter(type) {
    const listId = type === 'grup' ? 'listGrup' : 'listTag';
    const iconId = type === 'grup' ? 'iconGrup' : 'iconTag';
    const listEl = document.getElementById(listId);
    const iconEl = document.getElementById(iconId);

    const isOpening = listEl.classList.contains('hidden');
    closeAllDropdowns(); // Tutup yang lain

    if (isOpening) {
        listEl.classList.remove('hidden');
        if(iconEl) iconEl.classList.add('rotate-180');
        activeDropdown = type;
        if(window.lucide) lucide.createIcons({ root: listEl });
    }
}

function closeAllDropdowns() {
    ['grup', 'tag'].forEach(type => {
        const list = document.getElementById(type === 'grup' ? 'listGrup' : 'listTag');
        const icon = document.getElementById(type === 'grup' ? 'iconGrup' : 'iconTag');
        if(list) list.classList.add('hidden');
        if(icon) icon.classList.remove('rotate-180');
    });
    activeDropdown = null;
}

// [BARU] Logic Memilih Item
function selectFilter(type, value, label) {
    const labelId = type === 'grup' ? 'labelGrup' : 'labelTag';
    const labelEl = document.getElementById(labelId);
    
    if(labelEl) {
        if (value === '') {
            labelEl.innerText = type === 'grup' ? 'Semua Kategori' : 'Semua Tag';
            labelEl.classList.remove('text-emerald-600', 'dark:text-emerald-400');
        } else {
            labelEl.innerText = label;
            labelEl.classList.add('text-emerald-600', 'dark:text-emerald-400');
        }
    }

    if (type === 'grup') currentGrup = value;
    else currentTag = value;

    closeAllDropdowns();
    fetchDoaList(currentGrup, currentTag);
}

function renderDoaList(data) {
    const container = document.getElementById('doaListContainer');
    if (!container) return;

    if(data.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center pt-10 opacity-60">
                <i data-lucide="search-x" class="w-10 h-10 mb-2 text-slate-400"></i>
                <p class="text-sm font-bold text-slate-500">Tidak ada doa ditemukan</p>
            </div>`;
        if(window.lucide) lucide.createIcons();
        return;
    }

    let html = '';
    data.forEach(doa => {
        const safeNama = doa.nama.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const kategoriBadge = doa.grup ? 
            `<span class="text-[9px] font-bold uppercase tracking-wider text-emerald-500 dark:text-emerald-400 mb-1 block">${doa.grup}</span>` : '';

        html += `
        <div onclick="openDoaDetail('${doa.id}', '${safeNama}')" class="group bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 cursor-pointer active:scale-[0.98] flex items-center justify-between">
            <div class="flex items-center gap-4 overflow-hidden">
                <div class="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/50 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <i data-lucide="book-heart" class="w-5 h-5"></i>
                </div>
                <div class="flex-1 min-w-0">
                    ${kategoriBadge}
                    <h4 class="font-bold text-slate-700 dark:text-white text-sm group-hover:text-emerald-600 transition-colors truncate">${doa.nama}</h4>
                </div>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0 ml-2"></i>
        </div>`;
    });

    container.innerHTML = html;
    if(window.lucide) lucide.createIcons();
}

function searchDoa(query) {
    const lowerQ = query.toLowerCase();
    const items = document.querySelectorAll('#doaListContainer > div');
    items.forEach(item => {
        const text = item.innerText.toLowerCase();
        if(text.includes(lowerQ)) item.classList.remove('hidden');
        else item.classList.add('hidden');
    });
}

async function openDoaDetail(id, title) {
    const modal = document.getElementById('doaDetailModal');
    const content = document.getElementById('doaDetailContent');
    const modalTitle = document.getElementById('modalDoaTitle');
    
    document.getElementById('modalDoaArab').innerText = "Loading...";
    document.getElementById('modalDoaLatin').innerText = "...";
    document.getElementById('modalDoaIndo').innerText = "...";
    document.getElementById('modalDoaSource').classList.add('hidden');

    if(modalTitle) modalTitle.innerText = title;

    if(modal) {
        modal.classList.remove('hidden-force');
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            if(content) content.classList.remove('translate-y-full', 'sm:translate-y-20');
        });
    }

    try {
        const response = await fetch(`https://equran.id/api/doa/${id}`);
        const result = await response.json();
        const data = result.data || result;
        
        const arab = data.ar || data.arab || "Teks Arab tidak tersedia";
        const latin = data.tr || data.latin || "-";
        const arti = data.idn || data.arti || data.terjemahan || "-";
        const riwayat = data.riwayat || data.tentang || "";

        document.getElementById('modalDoaArab').innerText = arab;
        document.getElementById('modalDoaLatin').innerText = latin;
        document.getElementById('modalDoaIndo').innerText = arti;
        
        if (riwayat) {
             const sourceEl = document.getElementById('modalDoaSource');
             sourceEl.classList.remove('hidden');
             sourceEl.querySelector('p').innerText = `Sumber: ${riwayat}`;
        }

    } catch (e) {
        console.error("Gagal ambil detail doa", e);
        document.getElementById('modalDoaIndo').innerText = "Gagal memuat detail doa.";
    }
}

function closeDoaDetail() {
    const modal = document.getElementById('doaDetailModal');
    const content = document.getElementById('doaDetailContent');

    if(modal) {
        modal.classList.add('opacity-0');
        if(content) content.classList.add('translate-y-full', 'sm:translate-y-20');
        setTimeout(() => modal.classList.add('hidden-force'), 300);
    }
}