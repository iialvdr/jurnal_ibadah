import { db } from '../config.js';
// Pastikan versi firebase di sini sama dengan di config.js (10.7.1)
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let isChangelogLoaded = false;

export function initChangelog() {
    window.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'changelogView' && !isChangelogLoaded) {
            fetchChangelogs();
        }
    });

    // [BARU] Fungsi global untuk toggle (buka/tutup) changelog
    window.toggleChangelog = (index) => {
        const body = document.getElementById(`cl-body-${index}`);
        const chevron = document.getElementById(`cl-chevron-${index}`);

        if (body && chevron) {
            if (body.classList.contains('hidden')) {
                // Buka
                body.classList.remove('hidden');
                body.classList.add('animate-fadeIn'); // Efek muncul halus
                chevron.classList.add('rotate-180');
            } else {
                // Tutup
                body.classList.add('hidden');
                body.classList.remove('animate-fadeIn');
                chevron.classList.remove('rotate-180');
            }
        }
    };
}

async function fetchChangelogs() {
    const loading = document.getElementById('changelogLoading');
    const container = document.getElementById('changelogList');
    const empty = document.getElementById('changelogEmpty');
    const msg = document.getElementById('changelogMsg');

    try {
        const q = query(collection(db, "changelogs"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            loading.classList.add('hidden');
            empty.classList.remove('hidden');
            msg.innerText = "Belum ada riwayat update.";
            return;
        }

        let html = '';
        let index = 0;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.date ? data.date.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

            // Logika styling
            const isLatest = index === 0;

            // [BARU] Versi terbaru defaultnya TERBUKA, sisanya TERTUTUP
            const contentDisplay = isLatest ? '' : 'hidden';
            const chevronRotation = isLatest ? 'rotate-180' : '';

            const iconColor = isLatest ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
            const icon = isLatest ? 'sparkles' : 'git-commit';
            const badgeHtml = data.badge ? `<span class="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider ml-2">${data.badge}</span>` : '';

            // Handle items (Array atau String)
            let itemsArray = [];
            if (Array.isArray(data.items)) {
                itemsArray = data.items;
            } else if (typeof data.items === 'string') {
                itemsArray = data.items.split('\n').filter(item => item.trim() !== '');
            }

            const listItems = itemsArray.map(item =>
                `<li class="text-sm text-slate-600 dark:text-slate-300 mb-1.5 flex items-start">
                    <span class="mr-2 mt-1.5 w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0"></span>
                    <span class="leading-relaxed">${item}</span>
                </li>`
            ).join('');

            html += `
            <div class="relative pl-8 animate-slideUp" style="animation-delay: ${index * 100}ms">
                <span class="absolute -left-[1.3rem] top-1 w-10 h-10 rounded-2xl ${iconColor} flex items-center justify-center shadow-lg border-4 border-slate-100 dark:border-slate-950 z-10 transition-transform hover:scale-110">
                    <i data-lucide="${icon}" class="w-5 h-5"></i>
                </span>

                <div onclick="toggleChangelog(${index})" class="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer group active:scale-[0.99]">
                    
                    <div class="flex flex-wrap justify-between items-center gap-2">
                        <div class="flex items-center">
                            <h3 class="text-lg font-black text-slate-800 dark:text-white">${data.version}</h3>
                            ${badgeHtml}
                        </div>
                        <div class="flex items-center gap-3">
                            <p class="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">${date}</p>
                            <i id="cl-chevron-${index}" data-lucide="chevron-down" class="w-5 h-5 text-slate-400 transition-transform duration-300 ${chevronRotation}"></i>
                        </div>
                    </div>

                    <div id="cl-body-${index}" class="${contentDisplay} mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <ul class="">${listItems}</ul>
                    </div>
                </div>
            </div>`;

            index++;
        });

        loading.classList.add('hidden');
        container.innerHTML = html;
        container.classList.remove('hidden');

        if (window.lucide) lucide.createIcons();
        isChangelogLoaded = true;

    } catch (error) {
        console.error("Gagal memuat changelog:", error);
        loading.classList.add('hidden');
        empty.classList.remove('hidden');
        msg.innerText = "Terjadi kesalahan saat memuat data.";
    }
}