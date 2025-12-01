import { state } from './state.js'; 

let isExitModalOpen = false;
let isExiting = false; // [BARU] Flag untuk menandai proses keluar

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
            'profile': 'profileView'
        };

        const targetViewId = routes[hash] || 'homeView';
        switchView(targetViewId);
    };

    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('load', handleNavigation);

    // LOGIKA BACK BUTTON TRAP
    window.addEventListener('popstate', (event) => {
        // [BARU] Jika sedang proses keluar (tombol Ya ditekan), abaikan trap ini!
        if (isExiting) return; 

        if (!state.currentUser) return;

        // Jika modal terbuka, tombol Back menutup modal (Batal)
        if (isExitModalOpen) {
            toggleExitModal(false);
            history.pushState({ page: 'home_trap' }, '', '#home'); 
            return;
        }

        const isHomeUrl = !location.hash || location.hash === '#home';
        
        if (isHomeUrl) {
             // Jika state bukan 'home_trap', berarti user mau keluar
             if (!event.state || event.state.page !== 'home_trap') {
                 // Tampilkan modal
                 toggleExitModal(true);
                 
                 // Push lagi biar gak langsung keluar (Trap)
                 history.pushState({ page: 'home_trap' }, '', '#home');
             }
        }
    });

    // FUNGSI GLOBAL
    window.goHome = () => window.location.hash = 'home';
    
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

    setupExitModalListeners();
}

export function switchView(targetId) {
    const allViews = ['homeView', 'trackerView', 'profileView', 'tasbihView', 'qiblaView', 'quranView'];
    const targetEl = document.getElementById(targetId);
    
    if (!targetEl) return;

    // Pasang Trap saat masuk Home
    if (targetId === 'homeView') {
        if (!history.state || history.state.page !== 'home_trap') {
             history.pushState({ page: 'home_trap' }, '', '#home');
        }
    }

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

    targetEl.classList.remove('hidden-force');
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            targetEl.classList.add('active');
        });
    });

    if (window.lucide && targetEl.querySelectorAll('i[data-lucide]').length > 0) {
        try { lucide.createIcons({ root: targetEl }); } catch(e) {}
    }

    updateSidebarUI(targetId);
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

// FUNGSI MODAL DENGAN SCROLL LOCK YANG BENAR
function toggleExitModal(show) {
    const modal = document.getElementById('exitAppModal');
    const content = document.getElementById('exitAppContent');
    // [PERBAIKAN] Ambil view yang sedang aktif untuk dikunci scroll-nya
    const activeView = document.querySelector('.active'); 
    
    if(!modal) return;

    isExitModalOpen = show;

    if(show) {
        modal.classList.remove('hidden-force');
        
        // [PERBAIKAN] Kunci scroll pada View Aktif (bukan Body saja)
        if(activeView) activeView.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden'; // Backup lock
        
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            if(content) content.classList.remove('scale-90');
        });
    } else {
        modal.classList.add('opacity-0');
        
        // [PERBAIKAN] Buka kunci scroll
        if(activeView) activeView.style.overflow = '';
        document.body.style.overflow = ''; 
        
        if(content) content.classList.add('scale-90');
        setTimeout(() => modal.classList.add('hidden-force'), 300);
    }
}

function setupExitModalListeners() {
    const cancelBtn = document.getElementById('cancelExitBtn');
    if(cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            toggleExitModal(false);
        });
    }

    const confirmBtn = document.getElementById('confirmExitBtn');
    if(confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            // [PERBAIKAN UTAMA] Logika Keluar
            isExiting = true; // Set flag agar popstate listener tidak memblokir
            
            // Coba metode standar dulu
            try {
                window.close();
            } catch(e){}

            // Strategi PWA: Mundur 2 langkah
            // Langkah 1: Undo "Trap" yang baru saja kita push
            // Langkah 2: Mundur ke halaman sebelum PWA dibuka (Exit)
            if (window.history.length > 1) {
                window.history.go(-2); 
            } else {
                // Fallback jika history kosong
                navigator.app.exitApp(); 
            }
        });
    }
}