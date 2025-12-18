import { db } from '../config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let isChangelogLoaded = false;

export function initChangelog() {
    window.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'changelogView' && !isChangelogLoaded) {
            fetchChangelogs();
        }
    });

    window.toggleChangelog = (index) => {
        if (window.vibrateSoft) window.vibrateSoft();

        const body = document.getElementById(`cl-body-${index}`);
        const chevron = document.getElementById(`cl-chevron-${index}`);

        if (body && chevron) {
            if (body.classList.contains('hidden')) {
                body.classList.remove('hidden');
                body.classList.add('animate-fadeIn');
                chevron.classList.add('rotate-180');
            } else {
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

            const isLatest = index === 0;
            const contentDisplay = isLatest ? '' : 'hidden';
            const chevronRotation = isLatest ? 'rotate-180' : '';

            // Icon Styling
            const iconBg = isLatest ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-50 dark:ring-emerald-900/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 ring-4 ring-slate-50 dark:ring-slate-900';
            const icon = isLatest ? 'sparkles' : 'git-commit';

            // Badge Styling
            const badgeHtml = data.badge ? `<span class="px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest ml-2 border border-emerald-200 dark:border-emerald-800">${data.badge}</span>` : '';

            let itemsArray = [];
            if (Array.isArray(data.items)) {
                itemsArray = data.items;
            } else if (typeof data.items === 'string') {
                itemsArray = data.items.split('\n').filter(item => item.trim() !== '');
            }

            const listItems = itemsArray.map(item =>
                `<li class="text-sm text-slate-600 dark:text-slate-300 mb-2 flex items-start group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                    <span class="mr-3 mt-2 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                    <span class="leading-relaxed">${item}</span>
                </li>`
            ).join('');

            html += `
            <div class="relative pl-8 animate-slideUp" style="animation-delay: ${index * 100}ms">
                <div class="absolute -left-[1.4rem] top-0 w-10 h-10 rounded-full ${iconBg} flex items-center justify-center z-10 transition-transform duration-300 group-hover:scale-110">
                    <i data-lucide="${icon}" class="w-4 h-4"></i>
                </div>

                <div onclick="toggleChangelog(${index})" class="bg-white dark:bg-slate-900 p-5 rounded-[1.8rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer group active:scale-[0.99]">
                    
                    <div class="flex flex-wrap justify-between items-center gap-2 mb-1">
                        <div class="flex items-center">
                            <h3 class="text-lg font-black text-slate-800 dark:text-white tracking-tight">${data.version}</h3>
                            ${badgeHtml}
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">${date}</span>
                            <div class="w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors">
                                <i id="cl-chevron-${index}" data-lucide="chevron-down" class="w-3.5 h-3.5 transition-transform duration-300 ${chevronRotation}"></i>
                            </div>
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
        console.error("Error:", error);
        loading.classList.add('hidden');
        empty.classList.remove('hidden');
        msg.innerText = "Gagal memuat data.";
    }
}