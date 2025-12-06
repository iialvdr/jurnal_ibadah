// Variabel untuk menyimpan data setelah di-fetch
let asmaulHusnaData = [];
let currentDetailIndex = 0; 

export function initAsmaulHusna() {
    window.searchAsma = searchAsma;
    window.openAsmaDetail = openAsmaDetail;
    window.closeAsmaDetail = closeAsmaDetail;
    window.changeAsma = changeAsma; 

    const detailModal = document.getElementById('asmaDetailModal');
    if (detailModal) {
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) {
                closeAsmaDetail();
            }
        });
        detailModal.classList.remove('hidden-force');
        detailModal.classList.add('invisible', 'opacity-0', 'pointer-events-none');
    }

    window.addEventListener('viewChanged', (e) => {
        if(e.detail.viewId === 'asmaulHusnaView') {
            if (asmaulHusnaData.length === 0) {
                fetchAsmaulHusna();
            } else {
                renderList(asmaulHusnaData);
            }
        }
    });
}

async function fetchAsmaulHusna() {
    // Loader sekarang otomatis muncul karena di HTML sudah di-set (jika ada class 'hidden' di-remove dulu)
    // Tapi karena kita pakai skeleton di HTML statis, kita tidak perlu loader JS tambahan.
    // List container skeleton akan ketimpa saat renderList jalan.
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
        // [UNIFORM DESIGN] Style Kartu Seragam
        html += `
        <div onclick="openAsmaDetail(${item.index})" class="group bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 cursor-pointer active:scale-[0.98] flex items-center justify-between relative overflow-hidden">
            
            <div class="flex items-center gap-4 relative z-10 w-full">
                <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/50 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-sm">
                    ${item.index}
                </div>
                
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-slate-700 dark:text-white text-base group-hover:text-emerald-600 transition-colors truncate">${item.latin}</h4>
                    <p class="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-tight">${item.meaning}</p>
                </div>

                <div class="text-right pl-2 shrink-0">
                    <span class="font-quran text-2xl text-slate-800 dark:text-white group-hover:text-emerald-600 transition-colors duration-300 block">${item.arabic}</span>
                </div>
            </div>
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

// ... (OPEN/CLOSE MODAL FUNCTIONS TETAP SAMA SEPERTI YANG SUDAH DIOPTIMASI SEBELUMNYA) ...
function openAsmaDetail(index) {
    const data = asmaulHusnaData.find(d => d.index === index);
    if(!data) return;
    currentDetailIndex = index;
    document.getElementById('detailNumber').innerText = data.index;
    document.getElementById('detailArabic').innerText = data.arabic;
    document.getElementById('detailLatin').innerText = data.latin;
    document.getElementById('detailMeaning').innerText = data.meaning;
    const btnPrev = document.getElementById('btnPrevAsma');
    const btnNext = document.getElementById('btnNextAsma');
    if(btnPrev) btnPrev.disabled = (index <= 1);
    if(btnNext) btnNext.disabled = (index >= 99);
    const modal = document.getElementById('asmaDetailModal');
    const content = document.getElementById('asmaDetailContent');
    if(modal) {
        modal.classList.remove('invisible', 'pointer-events-none');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modal.classList.remove('opacity-0');
                if(content) content.classList.remove('scale-90');
            });
        });
    }
}

function changeAsma(direction) { const newIndex = currentDetailIndex + direction; if (newIndex >= 1 && newIndex <= 99) { openAsmaDetail(newIndex); } }

function closeAsmaDetail() {
    const modal = document.getElementById('asmaDetailModal');
    const content = document.getElementById('asmaDetailContent');
    if(modal) {
        modal.classList.add('opacity-0');
        if(content) content.classList.add('scale-90');
        setTimeout(() => { modal.classList.add('invisible', 'pointer-events-none'); }, 300);
    }
}