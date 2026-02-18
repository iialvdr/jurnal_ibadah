let currentBook = null;
let currentPage = 1;
const itemsPerPage = 20;

export function initHadith() {
    window.openHadithBook = openHadithBook;
    window.goBackHadith = goBackHadith;
    window.searchHadithByNumber = searchHadithByNumber;
    window.goToHadithPage = goToHadithPage;
    window.loadHadithItems = loadHadithItems;

    loadBooks();

    window.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'hadithView' && !currentBook) {
            loadBooks();
        }
    });
}

function formatHadithText(text) {
    if (!text) return "";
    return text.replace(/\[([^\]]+)\]/g, '<b class="text-emerald-700 dark:text-emerald-400 font-bold">$1</b>');
}

async function loadBooks() {
    const grid = document.getElementById('booksGrid');
    if (!grid) return;

    try {
        const response = await fetch('https://api.hadith.gading.dev/books');
        const result = await response.json();

        if (result.code === 200) {
            let html = '';
            result.data.forEach(book => {
                html += `
                <button onclick="vibrateSoft(); openHadithBook('${book.id}', '${book.name}', ${book.available})" class="bento-card bg-white dark:bg-slate-900 p-5 rounded-[2rem] text-left border border-white dark:border-slate-800 shadow-sm hover:border-emerald-500/30 transition-all active:scale-95 group relative overflow-hidden">
                    <div class="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                        <i data-lucide="book" class="w-20 h-20 text-emerald-500"></i>
                    </div>
                    <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-100 dark:border-emerald-800/30">
                        <i data-lucide="book" class="w-5 h-5"></i>
                    </div>
                    <h4 class="font-black text-slate-800 dark:text-white text-sm leading-tight">${book.name}</h4>
                    <p class="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">${book.available} Hadits</p>
                </button>`;
            });
            grid.innerHTML = html;
            if (window.lucide) lucide.createIcons({ root: grid });
        }
    } catch (error) {
        grid.innerHTML = `
            <div class="col-span-full text-center text-xs text-slate-400">
                <p class="font-bold mb-2">Gagal memuat daftar kitab.</p>
                <button onclick="vibrateSoft(); loadBooks()" class="px-3 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition">Coba Lagi</button>
            </div>`;
    }
}

async function openHadithBook(bookId, bookName, availableCount) {
    currentBook = { id: bookId, name: bookName, available: availableCount };
    currentPage = 1;
    
    document.getElementById('hadithHeaderTitle').innerText = bookName;
    document.getElementById('booksGrid').classList.add('hidden');
    document.getElementById('hadithSearchBox').classList.remove('hidden');
    document.getElementById('hadithListContainer').classList.remove('hidden');
    document.getElementById('hadithPagination').classList.remove('hidden');

    loadHadithItems();
}

async function loadHadithItems() {
    const container = document.getElementById('hadithListContainer');
    // Optimalisasi: Batasi range end agar tidak melebihi total available
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(start + itemsPerPage - 1, currentBook.available);

    container.innerHTML = '<div class="py-10 text-center animate-pulse text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat Hadits...</div>';
    
    try {
        const response = await fetch(`https://api.hadith.gading.dev/books/${currentBook.id}?range=${start}-${end}`);
        const result = await response.json();

        if (result.code === 200) {
            let html = '';
            result.data.hadiths.forEach(h => {
                const formattedText = formatHadithText(h.id);
                html += `
                <div class="bento-card bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-white dark:border-slate-800 shadow-sm transition-all hover:bg-emerald-50/[0.02]">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            <span class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[10px] font-black">${h.number}</span>
                            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${currentBook.name}</span>
                        </div>
                    </div>
                    <div class="mb-6 text-right" dir="rtl">
                        <p class="font-quran text-2xl text-slate-800 dark:text-white leading-[2.8]">${h.arab}</p>
                    </div>
                    <div class="pt-5 border-t border-slate-50 dark:border-slate-800">
                        <p class="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-2">Terjemahan</p>
                        <p class="text-[13px] md:text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed">"${formattedText}"</p>
                    </div>
                </div>`;
            });
            container.innerHTML = html;
            renderPagination();
            // Scroll otomatis ke atas agar pengguna tahu konten sudah berganti
            const view = document.getElementById('hadithView');
            if (view) view.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (error) {
        container.innerHTML = `
            <div class="py-10 text-center text-xs text-slate-400">
                <p class="font-bold mb-2">Gagal memuat hadits.</p>
                <button onclick="vibrateSoft(); loadHadithItems()" class="px-3 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition">Coba Lagi</button>
            </div>`;
    }
}

function renderPagination() {
    const container = document.getElementById('hadithPagination');
    if (!container || !currentBook) return;

    const totalPages = Math.ceil(currentBook.available / itemsPerPage);
    let html = '';

    // Tombol Previous
    html += `
    <button onclick="goToHadithPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} 
        class="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 disabled:opacity-30 transition-all active:scale-90 shadow-sm">
        <i data-lucide="chevron-left" class="w-4 h-4 md:w-5 md:h-5"></i>
    </button>`;

    const range = 1; 
    let pages = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - range && i <= currentPage + range)) {
            pages.push(i);
        } else if (i === currentPage - range - 1 || i === currentPage + range + 1) {
            pages.push('...');
        }
    }
    pages = pages.filter((item, pos) => pages.indexOf(item) === pos);

    pages.forEach(p => {
        if (p === '...') {
            html += `<span class="px-1 text-slate-400 font-bold text-xs">...</span>`;
        } else {
            const isActive = p === currentPage;
            html += `
            <button onclick="goToHadithPage(${p})" 
                class="w-9 h-9 md:w-10 md:h-10 rounded-xl text-xs font-black transition-all active:scale-90 shadow-sm border ${isActive 
                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-500/50'}">
                ${p}
            </button>`;
        }
    });

    // Tombol Next
    html += `
    <button onclick="goToHadithPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} 
        class="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 disabled:opacity-30 transition-all active:scale-90 shadow-sm">
        <i data-lucide="chevron-right" class="w-4 h-4 md:w-5 md:h-5"></i>
    </button>`;

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons({ root: container });
}

function goToHadithPage(page) {
    const totalPages = Math.ceil(currentBook.available / itemsPerPage);
    if (page < 1 || page > totalPages || page === currentPage) return;
    vibrateSoft();
    currentPage = page;
    loadHadithItems();
}

function goBackHadith() {
    if (currentBook) {
        currentBook = null;
        document.getElementById('hadithHeaderTitle').innerText = 'Perpustakaan Hadits';
        document.getElementById('booksGrid').classList.remove('hidden');
        document.getElementById('hadithSearchBox').classList.add('hidden');
        document.getElementById('hadithListContainer').classList.add('hidden');
        document.getElementById('hadithPagination').classList.add('hidden');
    } else {
        window.goBack();
    }
}

async function searchHadithByNumber() {
    const numInput = document.getElementById('hadithNumberInput');
    const num = numInput.value;
    if (!num) return;

    vibrateSoft();
    const container = document.getElementById('hadithListContainer');
    container.innerHTML = '<div class="py-10 text-center animate-pulse text-xs font-bold text-slate-400 uppercase tracking-widest">Mencari Hadits...</div>';
    document.getElementById('hadithPagination').classList.add('hidden');

    try {
        const response = await fetch(`https://api.hadith.gading.dev/books/${currentBook.id}/${num}`);
        const result = await response.json();

        if (result.code === 200) {
            const h = result.data.contents;
            const formattedText = formatHadithText(h.id);
            
            container.innerHTML = `
            <div class="mb-4">
                <button onclick="loadHadithItems()" class="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                    <i data-lucide="arrow-left" class="w-3 h-3"></i> Kembali ke Daftar
                </button>
            </div>
            <div class="bento-card bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                <div class="flex items-center gap-2 mb-4">
                    <span class="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black">${h.number}</span>
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${result.data.name}</span>
                </div>
                <div class="mb-6 text-right" dir="rtl">
                    <p class="font-quran text-2xl text-slate-800 dark:text-white leading-[2.8]">${h.arab}</p>
                </div>
                <div class="pt-5 border-t border-slate-50 dark:border-slate-800">
                    <p class="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-2">Terjemahan</p>
                    <p class="text-[13px] md:text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed">"${formattedText}"</p>
                </div>
            </div>`;
            if (window.lucide) lucide.createIcons({ root: container });
        } else {
            container.innerHTML = '<p class="py-10 text-center text-xs text-slate-400">Nomor hadits tidak ditemukan.</p>';
        }
    } catch (error) {
        container.innerHTML = `
            <div class="py-10 text-center text-xs text-slate-400">
                <p class="font-bold mb-2">Gagal mencari hadits.</p>
                <button onclick="vibrateSoft(); searchHadithByNumber()" class="px-3 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition">Coba Lagi</button>
            </div>`;
    }
}
