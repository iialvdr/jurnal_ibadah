import { state } from './state.js'; 

let isExitModalOpen = false;
let isExiting = false; 

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
             if (!event.state || event.state.page !== 'home_trap') {
                 toggleExitModal(true);
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

// [UPDATED] Fungsi Modal: Scroll ke Atas & Kunci Scroll
function toggleExitModal(show) {
    const modal = document.getElementById('exitAppModal');
    const content = document.getElementById('exitAppContent');
    const activeView = document.querySelector('.active'); 
    
    if(!modal) return;

    isExitModalOpen = show;

    if(show) {
        modal.classList.remove('hidden-force');
        
        if(activeView) {
            // 1. Scroll halaman ke paling atas
            activeView.scrollTop = 0; 
            // 2. Kunci scroll agar user tidak bisa scroll ke bawah lagi
            activeView.style.overflow = 'hidden';
        }
        document.body.style.overflow = 'hidden'; 
        
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            if(content) content.classList.remove('scale-90');
        });
    } else {
        modal.classList.add('opacity-0');
        
        // Buka kembali kunci scroll
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
            isExiting = true; 
            
            try {
                window.close();
            } catch(e){}

            if (window.history.length > 1) {
                window.history.go(-2); 
            } else {
                navigator.app.exitApp(); 
            }
        });
    }
}