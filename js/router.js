import { state } from './state.js'; 

// Variabel untuk melacak status modal exit
let isExitModalOpen = false;

export function setupRouter() {
    // 1. SYSTEM NAVIGASI SATU PINTU (Hash Listener)
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
            'profile': 'profileView'
        };

        const targetViewId = routes[hash] || 'homeView';
        switchView(targetViewId);
    };

    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('load', handleNavigation);

    // [BARU] LOGIKA BACK BUTTON TRAP (UNTUK HOME)
    // Saat tombol back ditekan (popstate)
    window.addEventListener('popstate', (event) => {
        // Jika hash kosong atau #home, dan modal belum terbuka
        if ((!location.hash || location.hash === '#home') && !isExitModalOpen) {
            // Tampilkan Modal Konfirmasi
            toggleExitModal(true);
            
            // Push state lagi agar URL tetap di aplikasi (mencegah keluar langsung)
            history.pushState(null, null, location.href); 
        }
    });

    // 2. FUNGSI TOMBOL GLOBAL
    window.goHome = () => window.location.hash = 'home';
    
    // Fungsi GoBack (Smart Back)
    window.goBack = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.hash = 'home';
        }
    };
    
    window.openTracker = () => window.location.hash = 'tracker';
    window.openTasbih = () => window.location.hash = 'tasbih';
    window.openQibla = () => window.location.hash = 'qibla';
    window.openQuran = () => window.location.hash = 'quran';
    window.openProfile = () => window.location.hash = 'profile';

    window.closeQibla = () => window.goBack();
    window.closeTasbih = () => window.goBack();
    window.closeProfile = () => window.goBack();

    // [BARU] Init Listener Tombol Modal Exit
    setupExitModalListeners();
}

export function switchView(targetId) {
    const allViews = ['homeView', 'trackerView', 'profileView', 'tasbihView', 'qiblaView', 'quranView'];
    const targetEl = document.getElementById(targetId);
    
    if (!targetEl) return;

    // [BARU] Jika masuk ke HOME, pasang "Jebakan History"
    if (targetId === 'homeView') {
        // Push state dummy agar ada history untuk di-pop saat back ditekan
        // Cek agar tidak menumpuk history terlalu banyak
        if (!history.state || history.state.page !== 'home') {
            history.pushState({ page: 'home' }, '', '#home');
        }
    }

    // 1. Reset SEMUA View
    allViews.forEach(id => {
        const el = document.getElementById(id);
        if (el && el !== targetEl) { 
            el.classList.remove('active');
            setTimeout(() => {
                if (!el.classList.contains('active')) {
                    el.classList.add('hidden-force');
                }
            }, 300); 
        }
    });

    // 2. Munculkan TARGET
    targetEl.classList.remove('hidden-force');
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            targetEl.classList.add('active');
        });
    });

    // 3. Render Icon
    if (window.lucide && targetEl.querySelectorAll('i[data-lucide]').length > 0) {
        try { lucide.createIcons({ root: targetEl }); } catch(e) {}
    }

    // 4. Update Sidebar
    updateSidebarUI(targetId);
    
    // 5. Info ke Modul Lain
    window.dispatchEvent(new CustomEvent('viewChanged', { detail: { viewId: targetId } }));
}

function updateSidebarUI(activeViewId) {
    const map = {
        'homeView': 'nav-home',
        'trackerView': 'nav-tracker',
        'tasbihView': 'nav-tasbih',
        'qiblaView': 'nav-qibla',
        'quranView': 'nav-quran',
        'profileView': 'nav-profile'
    };

    const activeBtnId = map[activeViewId];
    if(!activeBtnId) return;

    const allBtns = document.querySelectorAll('.sidebar-btn');
    allBtns.forEach(btn => {
        btn.className = "sidebar-btn w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/40 dark:hover:bg-white/10 transition-all duration-200 text-sm font-medium text-slate-600 dark:text-slate-300 group";
        const icon = btn.querySelector('i');
        if(icon) icon.className = "w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition";
    });

    const activeBtn = document.getElementById(activeBtnId);
    if(activeBtn) {
        activeBtn.className = "sidebar-btn w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none text-sm font-bold text-emerald-600 dark:text-emerald-400 group ring-1 ring-white/50 dark:ring-slate-700";
        const icon = activeBtn.querySelector('i');
        if(icon) icon.className = "w-5 h-5 text-emerald-500";
    }
}

// [BARU] Fungsi Helper Modal Exit
function toggleExitModal(show) {
    const modal = document.getElementById('exitAppModal');
    const content = document.getElementById('exitAppContent');
    if(!modal) return;

    isExitModalOpen = show;

    if(show) {
        modal.classList.remove('hidden-force');
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            if(content) content.classList.remove('scale-90');
        });
    } else {
        modal.classList.add('opacity-0');
        if(content) content.classList.add('scale-90');
        setTimeout(() => modal.classList.add('hidden-force'), 300);
    }
}

function setupExitModalListeners() {
    // Tombol Batal
    const cancelBtn = document.getElementById('cancelExitBtn');
    if(cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            toggleExitModal(false);
        });
    }

    // Tombol Ya, Keluar
    const confirmBtn = document.getElementById('confirmExitBtn');
    if(confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            // Coba tutup window (biasanya diblokir browser modern, tapi worth a try untuk PWA)
            // Trik PWA: Mundur history sebanyak mungkin
            try {
                window.history.go(-(window.history.length + 1));
                window.close(); 
            } catch(e) {
                console.log("Exit attempt");
            }
        });
    }
}