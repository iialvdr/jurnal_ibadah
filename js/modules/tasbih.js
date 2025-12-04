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
    
    // Tutup modal saat klik backdrop (area gelap)
    const menuModal = document.getElementById('dhikrMenuModal');
    if (menuModal) {
        menuModal.addEventListener('click', (e) => {
            if (e.target === menuModal) {
                closeDhikrMenu();
            }
        });
    }
    
    updateTargetUI(33);
}

function countTasbih() {
    tasbihCount++;
    const countEl = document.getElementById('tasbihCount');
    if(countEl) {
        countEl.innerText = tasbihCount;
        countEl.classList.remove('scale-110');
        void countEl.offsetWidth; 
        countEl.classList.add('scale-110', 'transition-transform', 'duration-100');
        setTimeout(() => countEl.classList.remove('scale-110'), 100);
    }

    if(isVibroOn && navigator.vibrate) {
        if(tasbihTarget > 0 && tasbihCount % tasbihTarget === 0) {
            navigator.vibrate([50, 100, 50]); // Getar panjang saat target tercapai
        } else {
            navigator.vibrate(15); // Getar pendek tiap klik
        }
    }
}

function resetTasbih() {
    tasbihCount = 0;
    const el = document.getElementById('tasbihCount');
    if(el) el.innerText = '0';
    if(navigator.vibrate) navigator.vibrate(30);

    // Animasi Putar Icon Reset
    const btn = document.getElementById('resetTasbihBtn');
    if(btn) {
        const icon = btn.querySelector('i');
        if(icon) {
            icon.classList.add('-rotate-180');
            setTimeout(() => icon.classList.remove('-rotate-180'), 500);
        }
    }
}

function setTasbihTarget(target) {
    tasbihTarget = target;
    document.getElementById('tasbihTargetDisplay').innerText = target === 0 ? "TARGET: ∞" : `TARGET: ${target}`;
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
        if(!b.el) return;
        const baseClass = "h-14 w-full rounded-[1.7rem] font-bold transition-all duration-300 flex items-center justify-center";
        const fontSize = b.val === 0 ? "text-2xl pb-1" : "text-sm"; 

        if (b.val === activeTarget) {
            b.el.className = `${baseClass} ${fontSize} bg-white dark:bg-slate-800 text-emerald-600 shadow-sm shadow-slate-300/50 dark:shadow-none ring-1 ring-black/5 dark:ring-white/5`;
        } else {
            b.el.className = `${baseClass} ${fontSize} text-slate-500 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-slate-700/50`;
        }
    });
}

function toggleVibro() {
    isVibroOn = !isVibroOn;
    const txt = document.getElementById('vibroText');
    const btn = document.getElementById('vibroBtn');
    
    if(isVibroOn) {
        if(txt) txt.innerText = "GETAR ON";
        if(btn) {
            btn.className = "flex items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-bold text-xs shadow-sm transition active:scale-95";
        }
    } else {
        if(txt) txt.innerText = "GETAR OFF";
        if(btn) {
            btn.className = "flex items-center justify-center gap-2 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 font-bold text-xs shadow-sm transition active:scale-95";
        }
    }
}

// [UPDATED] Logika Open yang lebih bersih
function openDhikrMenu() {
    const list = document.getElementById('dhikrListContainer');
    const modal = document.getElementById('dhikrMenuModal');
    const content = document.getElementById('dhikrModalContent');
    
    if(!list || !modal) return;
    
    // Render List
    let html = '';
    DHIKR_DATA.forEach((item, index) => {
        html += `
        <div onclick="vibrateSoft(); chooseDhikr(${index})" class="group p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer mb-2 bg-white dark:bg-slate-900 hover:border-emerald-500 transition shadow-sm active:scale-[0.98]">
            <div>
                <h4 class="font-bold text-slate-800 dark:text-white text-base group-hover:text-emerald-600 transition">${item.title}</h4>
                <p class="text-xs text-slate-500 font-mono mt-1">${item.latin}</p>
            </div>
            <div class="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition">
                <span class="text-[10px] font-bold">${item.target}</span>
            </div>
        </div>`;
    });
    list.innerHTML = html;

    // Animasi Masuk (Hapus pointer-events-none dan opacity/translate)
    modal.classList.remove('pointer-events-none');
    // Jika ada hidden-force: modal.classList.remove('hidden-force');

    // [MAGIC LINE]
    void modal.offsetWidth;

    modal.classList.remove('opacity-0');
    if(content) content.classList.remove('translate-y-full');
}

// [UPDATED] Logika Close yang lebih bersih
function closeDhikrMenu() {
    const modal = document.getElementById('dhikrMenuModal');
    const content = document.getElementById('dhikrModalContent');

    if(modal) {
        // Mulai animasi keluar
        modal.classList.add('opacity-0');
        if(content) content.classList.add('translate-y-full');
        
        // Tunggu transisi selesai (300ms) baru hilangkan pointer events
        setTimeout(() => modal.classList.add('pointer-events-none'), 300);
    }
}

function chooseDhikr(index) {
    currentDhikrIndex = index;
    if(index >= 0) {
        const data = DHIKR_DATA[index];
        setTasbihTarget(data.target);
        document.getElementById('dhikrArabicDisplay').innerText = data.arabic;
        document.getElementById('dhikrLatinDisplay').innerText = data.latin;
        document.getElementById('dhikrDisplayArea').classList.remove('hidden');
    }
    closeDhikrMenu();
    resetTasbih();
}