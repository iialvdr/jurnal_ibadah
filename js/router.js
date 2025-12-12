import { state } from './state.js';

let isExplicitNavigation = false;

export function setupRouter() {
    const handleNavigation = () => {
        if (!state.currentUser) {
            if (window.location.hash && window.location.hash !== '#home') {
                history.replaceState(null, null, window.location.pathname);
            }
            return;
        }

        const hash = window.location.hash.replace('#', '') || 'home';

        const routes = {
            'home': 'homeView',
            'tracker': 'trackerView',
            'tasbih': 'tasbihView',
            'qibla': 'qiblaView',
            'quran': 'quranView',
            'profile': 'profileView',
            'doa': 'doaView',
            'asmaul-husna': 'asmaulHusnaView',
            'fasting': 'fastingView'
        };

        const targetViewId = routes[hash] || 'homeView';
        switchView(targetViewId);
    };

    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('load', handleNavigation);

    const navigateTo = (hash) => {
        isExplicitNavigation = true;
        window.location.hash = hash;
        setTimeout(() => { isExplicitNavigation = false; }, 100);
    };

    window.goHome = () => navigateTo('home');
    window.openTracker = () => navigateTo('tracker');
    window.openTasbih = () => navigateTo('tasbih');
    window.openQibla = () => navigateTo('qibla');
    window.openQuran = () => navigateTo('quran');
    window.openProfile = () => navigateTo('profile');
    window.openDoa = () => navigateTo('doa');
    window.openAsma = () => navigateTo('asmaul-husna');
    window.openFasting = () => navigateTo('fasting');

    window.goBack = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.hash = 'home';
        }
    };

    window.closeQibla = () => window.goBack();
    window.closeTasbih = () => window.goBack();
    window.closeProfile = () => window.goBack();
    window.closeAsmaDetail = () => { /* Dihandle di module */ };
}

export function switchView(targetId) {
    const allViews = ['homeView', 'trackerView', 'profileView', 'tasbihView', 'qiblaView', 'quranView', 'doaView', 'asmaulHusnaView', 'fastingView'];
    const targetEl = document.getElementById(targetId);

    if (!targetEl) return;

    // [OPTIMASI] Render icon HANYA JIKA BELUM dirender
    // Ini mencegah flicker icon setiap pindah halaman
    if (window.lucide && targetEl.querySelectorAll('i[data-lucide]').length > 0) {
        if (!targetEl.hasAttribute('data-icons-rendered')) {
            try {
                lucide.createIcons({ root: targetEl });
                targetEl.setAttribute('data-icons-rendered', 'true');
            } catch (e) { }
        }
    }

    // [OPTIMASI] Gunakan requestAnimationFrame agar browser siap
    requestAnimationFrame(() => {
        allViews.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;

            if (id === targetId) {
                el.classList.remove('hidden-force');
                el.classList.add('active');
            } else {
                el.classList.remove('active');
                el.classList.add('hidden-force');
            }
        });

        updateSidebarUI(targetId);
        window.dispatchEvent(new CustomEvent('viewChanged', { detail: { viewId: targetId } }));
    });
}

function updateSidebarUI(activeViewId) {
    const map = {
        'homeView': 'nav-home',
        'trackerView': 'nav-tracker',
        'tasbihView': 'nav-tasbih',
        'qiblaView': 'nav-qibla',
        'quranView': 'nav-quran',
        'profileView': 'nav-profile',
        'doaView': 'nav-doa',
        'asmaulHusnaView': 'nav-asma',
        'fastingView': 'nav-fasting'
    };

    const activeBtnId = map[activeViewId];
    if (!activeBtnId) return;

    const allBtns = document.querySelectorAll('.sidebar-btn');
    allBtns.forEach(btn => {
        btn.className = "sidebar-btn w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/40 dark:hover:bg-white/10 transition-all duration-200 text-sm font-medium text-slate-600 dark:text-slate-300 group";
        const icon = btn.querySelector('i');
        if (icon) icon.className = "w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition";
    });

    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) {
        activeBtn.className = "sidebar-btn w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none text-sm font-bold text-emerald-600 dark:text-emerald-400 group ring-1 ring-white/50 dark:ring-slate-700";
        const icon = activeBtn.querySelector('i');

        let iconColorClass = "text-emerald-500";
        if (activeBtnId === 'nav-tasbih') iconColorClass = "text-blue-500";
        if (activeBtnId === 'nav-qibla') iconColorClass = "text-teal-500";
        if (activeBtnId === 'nav-profile') iconColorClass = "text-amber-500";
        if (activeBtnId === 'nav-doa') iconColorClass = "text-pink-500";
        if (activeBtnId === 'nav-asma') iconColorClass = "text-indigo-500";

        if (icon) icon.className = `w-5 h-5 ${iconColorClass}`;
    }
}