import { state } from './state.js';

let isExplicitNavigation = false;

/**
 * Setup Router menggunakan History API (Clean URL)
 */
export function setupRouter() {
    const handleNavigation = () => {
        // Mengambil segment terakhir dari path URL, default ke 'home' jika kosong
        // Contoh: /tracker -> tracker, / -> home
        const path = window.location.pathname.split('/').filter(Boolean).pop() || 'home';

        // Proteksi: Jika belum login, pastikan tidak bisa akses halaman internal via URL
        if (!state.currentUser) {
            if (path !== 'home' && path !== '') {
                history.replaceState(null, null, '/');
                // Biarkan switchView menangani tampilan (biasanya balik ke landing/home)
            }
        }

        const routes = {
            'home': 'homeView',
            'tracker': 'trackerView',
            'tasbih': 'tasbihView',
            'qibla': 'qiblaView',
            'quran': 'quranView',
            'profile': 'profileView',
            'doa': 'doaView',
            'asmaul-husna': 'asmaulHusnaView',
            'fasting': 'fastingView',
            'credits': 'creditsView',
            'changelog': 'changelogView'
        };

        const targetViewId = routes[path] || 'homeView';
        switchView(targetViewId);
    };

    // Event listener untuk tombol 'Back'/'Forward' di browser
    window.addEventListener('popstate', handleNavigation);

    // Inisialisasi route saat halaman pertama kali dimuat
    window.addEventListener('load', handleNavigation);

    /**
     * Fungsi utama untuk navigasi antar halaman
     */
    const navigateTo = (path) => {
        isExplicitNavigation = true;

        // Tentukan URL tujuan
        const url = path === 'home' ? '/' : `/${path}`;

        // Update URL tanpa reload halaman
        history.pushState(null, null, url);

        // Jalankan logika render view
        handleNavigation();

        setTimeout(() => { isExplicitNavigation = false; }, 100);
    };

    // Ekspos fungsi navigasi agar bisa dipanggil langsung dari HTML (onclick)
    window.navigateTo = navigateTo;
    window.goHome = () => navigateTo('home');
    window.openTracker = () => navigateTo('tracker');
    window.openTasbih = () => navigateTo('tasbih');
    window.openQibla = () => navigateTo('qibla');
    window.openQuran = () => navigateTo('quran');
    window.openProfile = () => navigateTo('profile');
    window.openDoa = () => navigateTo('doa');
    window.openAsma = () => navigateTo('asmaul-husna');
    window.openFasting = () => navigateTo('fasting');
    window.openCredits = () => navigateTo('credits');

    window.goBack = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            navigateTo('home');
        }
    };

    window.closeQibla = () => window.goBack();
    window.closeTasbih = () => window.goBack();
    window.closeProfile = () => window.goBack();
    window.closeAsmaDetail = () => { /* Logic dihandle di module asmaul_husna.js */ };
}

/**
 * Fungsi untuk mengganti tampilan view yang aktif
 */
export function switchView(targetId) {
    const allViews = [
        'homeView', 'trackerView', 'profileView', 'tasbihView',
        'qiblaView', 'quranView', 'doaView', 'asmaulHusnaView',
        'fastingView', 'creditsView', 'changelogView'
    ];

    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;

    // Trigger event viewExit untuk pembersihan modul sebelum pindah
    const currentActive = document.querySelector('.absolute.z-50.active');
    if (currentActive && currentActive.id !== targetId) {
        window.dispatchEvent(new CustomEvent('viewExit', {
            detail: { viewId: currentActive.id }
        }));
    }

    // Pastikan icon Lucide dirender jika belum
    if (window.lucide && targetEl.querySelectorAll('i[data-lucide]').length > 0) {
        if (!targetEl.hasAttribute('data-icons-rendered')) {
            try {
                lucide.createIcons({ root: targetEl });
                targetEl.setAttribute('data-icons-rendered', 'true');
            } catch (e) { }
        }
    }

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

        // Update tampilan menu sidebar/navbar bawah
        updateSidebarUI(targetId);

        // Beritahu modul lain bahwa halaman telah berganti
        window.dispatchEvent(new CustomEvent('viewChanged', { detail: { viewId: targetId } }));
    });
}

/**
 * Update visual tombol navigasi yang aktif
 */
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
        'fastingView': 'nav-fasting',
        'creditsView': 'nav-profile',
        'changelogView': 'nav-profile'
    };

    const activeBtnId = map[activeViewId];
    if (!activeBtnId) return;

    const allBtns = document.querySelectorAll('.sidebar-btn');
    allBtns.forEach(btn => {
        // Reset class ke default
        btn.className = "sidebar-btn w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/40 dark:hover:bg-white/10 transition-all duration-200 text-sm font-medium text-slate-600 dark:text-slate-300 group";
        const icon = btn.querySelector('i');
        if (icon) icon.className = "w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition";
    });

    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) {
        // Set class aktif
        activeBtn.className = "sidebar-btn w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none text-sm font-bold text-emerald-600 dark:text-emerald-400 group ring-1 ring-white/50 dark:ring-slate-700";

        const icon = activeBtn.querySelector('i');
        let iconColorClass = "text-emerald-500";

        // Pewarnaan khusus tiap menu
        if (activeBtnId === 'nav-tasbih') iconColorClass = "text-blue-500";
        if (activeBtnId === 'nav-qibla') iconColorClass = "text-teal-500";
        if (activeBtnId === 'nav-profile') iconColorClass = "text-amber-500";
        if (activeBtnId === 'nav-doa') iconColorClass = "text-pink-500";
        if (activeBtnId === 'nav-asma') iconColorClass = "text-indigo-500";

        if (icon) icon.className = `w-5 h-5 ${iconColorClass}`;
    }
}