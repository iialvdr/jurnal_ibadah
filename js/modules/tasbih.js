const DHIKR_DATA = [
    { id: 0, title: "Tasbih", arabic: "سُبْحَانَ الله", latin: "Subhanallah", target: 33 },
    { id: 1, title: "Tahmid", arabic: "الْحَمْدُ لِلَّهِ", latin: "Alhamdulillah", target: 33 },
    { id: 2, title: "Takbir", arabic: "اللهُ أَكْبَرُ", latin: "Allahu Akbar", target: 33 },
    { id: 3, title: "Tahlil", arabic: "لَا إِلَهَ إِلَّا اللهُ", latin: "Laa ilaaha illallah", target: 33 },
    { id: 4, title: "Istighfar", arabic: "أَسْتَغْفِرُ اللهَ", latin: "Astaghfirullah", target: 100 },
    { id: 5, title: "Sholawat", arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ", latin: "Allahumma sholli 'ala Muhammad", target: 100 }
];

let tasbihCount = 0;
let tasbihTarget = 33;
let isVibroOn = true;
let currentDhikrIndex = -1;

export function initTasbih() {
    window.countTasbih = countTasbih;
    window.resetTasbih = resetTasbih;
    window.setTasbihTarget = setTasbihTarget;
    window.toggleVibro = toggleVibro;
    window.openDhikrMenu = openDhikrMenu;
    window.closeDhikrMenu = closeDhikrMenu;
    window.chooseDhikr = chooseDhikr;

    updateTargetUI(33);

    // [LISTENER RESET OTOMATIS]
    window.addEventListener('viewExit', (e) => {
        if (e.detail.viewId === 'tasbihView') {
            fullResetTasbih();
        }
    });
}

function fullResetTasbih() {
    tasbihCount = 0;
    const countEl = document.getElementById('tasbihCount');
    if (countEl) countEl.innerText = '0';

    // Sembunyikan Bacaan Dzikir
    const displayArea = document.getElementById('dhikrDisplayArea');
    if (displayArea) displayArea.classList.add('hidden');
    currentDhikrIndex = -1;

    closeDhikrMenu();
}

function countTasbih() {
    tasbihCount++;
    const countEl = document.getElementById('tasbihCount');

    if (countEl) {
        countEl.innerText = tasbihCount;

        // Animasi halus pada angka
        countEl.style.transform = "scale(1.15)";
        setTimeout(() => countEl.style.transform = "scale(1)", 150);
    }

    if (isVibroOn && navigator.vibrate) {
        if (tasbihTarget > 0 && tasbihCount % tasbihTarget === 0) {
            // Getar panjang jika target tercapai
            navigator.vibrate([50, 50, 50]);
        } else {
            // Getar sangat pendek (haptic click)
            navigator.vibrate(15);
        }
    }
}

function resetTasbih() {
    tasbihCount = 0;
    const el = document.getElementById('tasbihCount');
    if (el) el.innerText = '0';
    if (navigator.vibrate) navigator.vibrate(30);

    const btn = document.getElementById('resetTasbihBtn');
    if (btn) {
        const icon = btn.querySelector('i');
        if (icon) {
            icon.classList.add('-rotate-180');
            setTimeout(() => icon.classList.remove('-rotate-180'), 500);
        }
    }
}

function setTasbihTarget(target) {
    tasbihTarget = target;
    const label = document.getElementById('tasbihTargetDisplay');
    if (label) label.innerText = target === 0 ? "Target: ∞" : `Target: ${target}`;
    resetTasbih();
    updateTargetUI(target);
}

function updateTargetUI(activeTarget) {
    const btns = [
        { val: 33, el: document.getElementById('btnTarget33') },
        { val: 100, el: document.getElementById('btnTarget100') },
        { val: 0, el: document.getElementById('btnTargetInf') }
    ];

    btns.forEach(b => {
        if (!b.el) return;
        // Reset classes
        b.el.className = "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300";

        if (b.val === activeTarget) {
            b.el.classList.add('bg-white', 'dark:bg-slate-800', 'text-emerald-600', 'shadow-sm', 'scale-105');
        } else {
            b.el.classList.add('text-slate-500', 'dark:text-slate-400', 'hover:bg-white/50', 'dark:hover:bg-slate-800');
        }

        if (b.val === 0) b.el.classList.add('text-lg', 'pb-1', 'leading-none'); // Icon infinity butuh penyesuaian size
    });
}

function toggleVibro() {
    isVibroOn = !isVibroOn;
    const txt = document.getElementById('vibroText');
    const btn = document.getElementById('vibroBtn');

    if (isVibroOn) {
        if (txt) txt.innerText = "Getar On";
        if (btn) btn.className = "flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider shadow-sm transition active:scale-95";
    } else {
        if (txt) txt.innerText = "Getar Off";
        if (btn) btn.className = "flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 font-bold text-[10px] uppercase tracking-wider shadow-sm transition active:scale-95";
    }
}

// --- ANIMASI MODAL (Sama dengan Profile & Edit) ---
function openDhikrMenu() {
    const list = document.getElementById('dhikrListContainer');
    const modal = document.getElementById('dhikrMenuModal');
    const backdrop = document.getElementById('dhikrMenuBackdrop');
    const content = document.getElementById('dhikrModalContent');

    if (!list || !modal) return;

    // Render List
    let html = '';
    DHIKR_DATA.forEach((item, index) => {
        html += `
        <div onclick="vibrateSoft(); chooseDhikr(${index})" class="group p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer bg-white dark:bg-slate-900 hover:border-emerald-400 dark:hover:border-emerald-600 transition shadow-sm active:scale-[0.98]">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-bold border border-emerald-100 dark:border-emerald-800/50">
                    ${index + 1}
                </div>
                <div>
                    <h4 class="font-bold text-slate-800 dark:text-white text-sm group-hover:text-emerald-600 transition">${item.title}</h4>
                    <p class="text-[10px] text-slate-500 font-medium">${item.latin}</p>
                </div>
            </div>
            <div class="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500">
                ${item.target}x
            </div>
        </div>`;
    });
    list.innerHTML = html;

    // Animasi Masuk
    if (modal && content && backdrop) {
        modal.classList.remove('invisible', 'pointer-events-none');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                backdrop.classList.remove('opacity-0');
                content.classList.remove('translate-y-full', 'sm:translate-y-10', 'sm:scale-95');
                content.classList.add('translate-y-0', 'sm:scale-100');
            });
        });
    }
}

function closeDhikrMenu() {
    const modal = document.getElementById('dhikrMenuModal');
    const backdrop = document.getElementById('dhikrMenuBackdrop');
    const content = document.getElementById('dhikrModalContent');

    if (modal && content && backdrop) {
        backdrop.classList.add('opacity-0');

        content.classList.remove('translate-y-0', 'sm:scale-100');
        content.classList.add('translate-y-full', 'sm:translate-y-10', 'sm:scale-95');

        setTimeout(() => {
            modal.classList.add('invisible', 'pointer-events-none');
        }, 500); // 500ms match CSS transition
    }
}

function chooseDhikr(index) {
    currentDhikrIndex = index;
    if (index >= 0) {
        const data = DHIKR_DATA[index];
        setTasbihTarget(data.target);
        document.getElementById('dhikrArabicDisplay').innerText = data.arabic;
        document.getElementById('dhikrLatinDisplay').innerText = data.latin;

        const displayArea = document.getElementById('dhikrDisplayArea');
        displayArea.classList.remove('hidden');
        displayArea.classList.add('flex', 'flex-col');
    }
    closeDhikrMenu();
    resetTasbih();
}