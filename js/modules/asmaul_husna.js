// Variabel untuk menyimpan data setelah di-fetch
let asmaulHusnaData = [];
let currentDetail = null;

export function initAsmaulHusna() {
    window.searchAsma = searchAsma;
    window.openAsmaDetail = openAsmaDetail;
    window.closeAsmaDetail = closeAsmaDetail;

    // [BARU] Tutup modal saat klik backdrop
    const detailModal = document.getElementById('asmaDetailModal');
    if (detailModal) {
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) {
                closeAsmaDetail();
            }
        });
    }

    window.addEventListener('viewChanged', (e) => {
        if(e.detail.viewId === 'asmaulHusnaView') {
            // Cek apakah data sudah ada, kalau belum fetch dari API
            if (asmaulHusnaData.length === 0) {
                fetchAsmaulHusna();
            } else {
                renderList(asmaulHusnaData);
            }
        }
    });
}

async function fetchAsmaulHusna() {
    const container = document.getElementById('asmaList');
    if(container) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center pt-20">
                <i data-lucide="loader-2" class="w-8 h-8 animate-spin text-emerald-500 mb-2"></i>
                <p class="text-xs font-bold text-slate-400">Mengambil Data API...</p>
            </div>`;
        if(window.lucide) lucide.createIcons({ root: container });
    }

    try {
        // Menggunakan API publik yang stabil (Raw JSON dari GitHub)
        const response = await fetch('https://raw.githubusercontent.com/mikqi/dzikir-counter/master/www/asmaul-husna.json');
        const result = await response.json();
        
        // Mapping data API ke format aplikasi kita
        asmaulHusnaData = result.map(item => ({
            index: item.urutan,
            latin: item.latin,
            arabic: item.arab,
            meaning: item.arti
        }));

        renderList(asmaulHusnaData);

    } catch (error) {
        console.error("Gagal fetch Asmaul Husna:", error);
        if(container) {
            container.innerHTML = `
                <div class="text-center pt-10 px-6">
                    <p class="text-sm font-bold text-red-500 mb-2">Gagal terhubung ke API</p>
                    <button onclick="initAsmaulHusna()" class="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-lg text-xs font-bold">Coba Lagi</button>
                </div>`;
        }
    }
}

function renderList(data) {
    const container = document.getElementById('asmaList');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = `<p class="text-center text-slate-400 text-sm mt-8">Tidak ditemukan.</p>`;
        return;
    }

    let html = '';
    data.forEach(item => {
        html += `
        <div onclick="openAsmaDetail(${item.index})" class="group bg-white dark:bg-slate-900 rounded-[1.5rem] p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 cursor-pointer active:scale-[0.98] flex items-center justify-between relative overflow-hidden">
            
            <div class="flex items-center gap-4 relative z-10">
                <div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold flex items-center justify-center text-slate-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
                    ${item.index}
                </div>
                
                <div class="text-left">
                    <h4 class="font-bold text-slate-800 dark:text-white text-base group-hover:text-emerald-600 transition-colors">${item.latin}</h4>
                    <p class="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">${item.meaning}</p>
                </div>
            </div>

            <div class="relative z-10 pl-2">
                <span class="font-quran text-2xl text-slate-800 dark:text-white group-hover:scale-110 transition-transform duration-300 block text-right">${item.arabic}</span>
            </div>
            
            <div class="absolute z-0 -right-6 -bottom-6 w-20 h-20 bg-emerald-50 dark:bg-emerald-900/10 rounded-full blur-xl group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition duration-500"></div>
        </div>`;
    });

    container.innerHTML = html;
}

function searchAsma(query) {
    const lowerQ = query.toLowerCase();
    const filtered = asmaulHusnaData.filter(item => 
        item.latin.toLowerCase().includes(lowerQ) || 
        item.meaning.toLowerCase().includes(lowerQ) ||
        item.index.toString() === lowerQ
    );
    renderList(filtered);
}

function openAsmaDetail(index) {
    const data = asmaulHusnaData.find(d => d.index === index);
    if(!data) return;

    currentDetail = data;

    document.getElementById('detailNumber').innerText = data.index;
    document.getElementById('detailArabic').innerText = data.arabic;
    document.getElementById('detailLatin').innerText = data.latin;
    document.getElementById('detailMeaning').innerText = data.meaning;

    const modal = document.getElementById('asmaDetailModal');
    const content = document.getElementById('asmaDetailContent');
    
    if(modal) {
        modal.classList.remove('hidden-force');
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-90');
        });
    }
}

function closeAsmaDetail() {
    const modal = document.getElementById('asmaDetailModal');
    const content = document.getElementById('asmaDetailContent');

    if(modal) {
        modal.classList.add('opacity-0');
        content.classList.add('scale-90');
        setTimeout(() => modal.classList.add('hidden-force'), 300);
    }
}