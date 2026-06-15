let count = 0;
let target = 33;
let isVibroEnabled = true;

const DHIKR_LIST = [
    { id: 'subhanallah', arabic: 'سُبْحَانَ اللهِ', latin: 'Subhanallah', meaning: 'Maha Suci Allah', target: 33 },
    { id: 'alhamdulillah', arabic: 'الْحَمْدُ لِلهِ', latin: 'Alhamdulillah', meaning: 'Segala Puji Bagi Allah', target: 33 },
    { id: 'allahuakbar', arabic: 'اللهُ أَكْبَرُ', latin: 'Allahu Akbar', meaning: 'Allah Maha Besar', target: 33 },
    { id: 'istighfar', arabic: 'أَسْتَغْفِرُ اللهَ', latin: 'Astaghfirullah', meaning: 'Aku Memohon Ampun', target: 100 },
    { id: 'sholawat', arabic: 'صَلَّى اللهُ عَلَى مُحَمَّدٍ', latin: 'Shollallahu Ala Muhammad', meaning: 'Sholawat Nabi', target: 100 }
];

export function initTasbih() {
    window.countTasbih = countTasbih;
    window.resetTasbih = resetTasbih;
    window.setTasbihTarget = setTasbihTarget;
    window.toggleVibro = toggleVibro;
    window.openDhikrMenu = openDhikrMenu;
    window.closeDhikrMenu = closeDhikrMenu;
    window.selectDhikr = selectDhikr;
    window.removeDhikr = removeDhikr;
    window.isTasbihVibroEnabled = isVibroEnabled;

    window.addEventListener('viewExit', (e) => {
        if (e.detail.viewId === 'tasbihView') closeDhikrMenu(true);
    });
    window.addEventListener('popstate', (e) => {
        const modal = document.getElementById('dhikrMenuModal');
        if (modal && !modal.classList.contains('invisible')) {
            if (!e.state || !e.state.dhikrModalOpen) {
                closeDhikrMenu(true);
            }
        }
    });

    updateDisplay();
    renderDhikrList();
}

function countTasbih() {
    if (isVibroEnabled && typeof vibrateSoft === 'function') vibrateSoft();
    count++;

    const countEl = document.getElementById('tasbihCount');
    const rippleEl = document.getElementById('tasbihRipple');
    const glowEl = document.getElementById('tasbihGlow');

    if (countEl) {
        countEl.classList.add('bg-clip-text', 'text-transparent', 'bg-gradient-to-br', 'from-emerald-400', 'via-emerald-500', 'to-emerald-600', 'scale-110');
        if (rippleEl) rippleEl.style.opacity = '1';
        if (glowEl) glowEl.classList.replace('bg-emerald-500/0', 'bg-emerald-500/20');

        setTimeout(() => {
            countEl.classList.remove('bg-clip-text', 'text-transparent', 'bg-gradient-to-br', 'from-emerald-400', 'via-emerald-500', 'to-emerald-600', 'scale-110');
            if (rippleEl) rippleEl.style.opacity = '0';
            if (glowEl) glowEl.classList.replace('bg-emerald-500/20', 'bg-emerald-500/0');
        }, 150);
    }

    if (isVibroEnabled) {
        if (target > 0 && count % target === 0) {
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        } else {
            if (navigator.vibrate) navigator.vibrate(35);
        }
    }
    updateDisplay();
}

function setTasbihTarget(newTarget, index) {
    if (isVibroEnabled && typeof vibrateSoft === 'function') vibrateSoft();
    target = newTarget;

    const indicator = document.getElementById('targetIndicator');
    if (indicator) {
        indicator.style.transform = `translateX(${index * 100}%)`;
    }

    updateDisplay();
}

function updateDisplay() {
    const countEl = document.getElementById('tasbihCount');
    const targetEl = document.getElementById('tasbihTargetDisplay');
    if (countEl) countEl.innerText = count;
    if (targetEl) targetEl.innerText = target === 0 ? "Target: ∞" : `Target: ${target}`;

    // Update Button Styles
    const targets = [33, 100, 0];
    targets.forEach(t => {
        const id = t === 0 ? 'btnTargetInf' : `btnTarget${t}`;
        const btn = document.getElementById(id);
        if (btn) {
            if (target === t) {
                btn.classList.remove('text-slate-400', 'font-bold');
                btn.classList.add('text-emerald-600', 'font-black');
            } else {
                btn.classList.remove('text-emerald-600', 'font-black');
                btn.classList.add('text-slate-400', 'font-bold');
            }
        }
    });
}

function openDhikrMenu() {
    if (isVibroEnabled && typeof vibrateSoft === 'function') vibrateSoft();
    const modal = document.getElementById('dhikrMenuModal');
    if (!modal) return;
    if (!history.state || !history.state.dhikrModalOpen) {
        history.pushState({ dhikrModalOpen: true }, '', window.location.href);
    }
    modal.classList.remove('invisible', 'pointer-events-none');
    requestAnimationFrame(() => {
        document.getElementById('dhikrMenuBackdrop').classList.add('opacity-100');
        document.getElementById('dhikrModalContent').classList.remove('translate-y-full', 'sm:translate-y-10', 'sm:scale-95', 'sm:opacity-0');
    });
}

function closeDhikrMenu(fromPopState = false) {
    const modal = document.getElementById('dhikrMenuModal');
    if (!modal) return;
    if (!fromPopState && history.state && history.state.dhikrModalOpen) {
        history.back();
    }
    document.getElementById('dhikrMenuBackdrop').classList.remove('opacity-100');
    document.getElementById('dhikrModalContent').classList.add('translate-y-full', 'sm:translate-y-10', 'sm:scale-95', 'sm:opacity-0');
    setTimeout(() => modal.classList.add('invisible', 'pointer-events-none'), 500);
}

function selectDhikr(id) {
    const dhikr = DHIKR_LIST.find(d => d.id === id);
    if (dhikr) {
        setTasbihTarget(dhikr.target, dhikr.target === 33 ? 0 : 1);
        count = 0;

        document.getElementById('dhikrPlaceholder').classList.add('hidden');
        document.getElementById('dhikrTextContent').classList.remove('hidden');
        document.getElementById('btnRemoveDhikr').classList.remove('hidden');

        document.getElementById('dhikrArabicDisplay').innerText = dhikr.arabic;
        document.getElementById('dhikrLatinDisplay').innerText = dhikr.latin;

        updateDisplay();
        closeDhikrMenu();
    }
}

function removeDhikr() {
    if (isVibroEnabled && typeof vibrateSoft === 'function') vibrateSoft();
    count = 0;
    document.getElementById('dhikrPlaceholder').classList.remove('hidden');
    document.getElementById('dhikrTextContent').classList.add('hidden');
    document.getElementById('btnRemoveDhikr').classList.add('hidden');
    document.getElementById('dhikrArabicDisplay').innerText = "";
    document.getElementById('dhikrLatinDisplay').innerText = "";
    updateDisplay();
    if (typeof window.showAppToast === 'function') window.showAppToast("Bacaan dihapus", "info");
}

function resetTasbih() {
    if (isVibroEnabled && typeof vibrateSoft === 'function') vibrateSoft();
    count = 0;
    updateDisplay();
    if (typeof window.showAppToast === 'function') window.showAppToast("Tasbih di-reset", "info");
}

function toggleVibro() {
    if (typeof vibrateSoft === 'function') vibrateSoft();
    isVibroEnabled = !isVibroEnabled;
    window.isTasbihVibroEnabled = isVibroEnabled;
    const btn = document.getElementById('vibroBtn');
    const text = document.getElementById('vibroText');
    if (isVibroEnabled) {
        btn.classList.replace('bg-white', 'bg-emerald-50');
        btn.classList.replace('dark:bg-slate-900', 'dark:bg-emerald-900/20');
        btn.classList.replace('text-slate-500', 'text-emerald-600');
        text.innerText = "GETAR ON";
    } else {
        btn.classList.replace('bg-emerald-50', 'bg-white');
        btn.classList.replace('dark:bg-emerald-900/20', 'dark:bg-slate-900');
        btn.classList.replace('text-emerald-600', 'text-slate-500');
        text.innerText = "GETAR OFF";
    }
}

function renderDhikrList() {
    const container = document.getElementById('dhikrListContainer');
    if (!container) return;
    container.innerHTML = DHIKR_LIST.map(dhikr => `
        <div onclick="if(window.isTasbihVibroEnabled && typeof vibrateSoft === 'function') vibrateSoft(); selectDhikr('${dhikr.id}')" class="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/30 transition-colors cursor-pointer group active:scale-[0.98] shadow-sm">
            <div class="flex justify-between items-center mb-3">
                <span class="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full">Target: ${dhikr.target}</span>
                <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform"></i>
            </div>
            <p class="font-quran text-3xl text-slate-800 dark:text-white text-right mb-2">${dhikr.arabic}</p>
            <p class="font-bold text-slate-700 dark:text-zinc-200 text-sm tracking-tight">${dhikr.latin}</p>
        </div>
    `).join('');
    if (window.lucide) lucide.createIcons({ root: container });
}
