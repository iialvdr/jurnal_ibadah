// js/router.js

export function setupRouter() {
    // 1. SYSTEM NAVIGASI SATU PINTU (Hash Listener)
    const handleNavigation = () => {
        // Ambil hash, default ke 'home'
        const hash = window.location.hash.replace('#', '') || 'home';
        
        const routes = {
            'home': 'homeView',
            'tracker': 'trackerView',
            'tasbih': 'tasbihView',
            'qibla': 'qiblaView',
            'quran': 'quranView',
            'profile': 'profileView'
        };

        // Jika hash tidak dikenali, paksa balik ke home (cegah blank page)
        const targetViewId = routes[hash] || 'homeView';
        switchView(targetViewId);
    };

    // Dengarkan perubahan URL (#) dan saat load awal
    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('load', handleNavigation);

    // 2. FUNGSI TOMBOL GLOBAL (Cukup ubah Hash saja)
    // Ini menjamin tombol Back HP dan tombol Back di aplikasi sinkron
    window.goHome = () => window.location.hash = 'home';
    
    window.openTracker = () => window.location.hash = 'tracker';
    window.openTasbih = () => window.location.hash = 'tasbih';
    window.openQibla = () => window.location.hash = 'qibla';
    window.openQuran = () => window.location.hash = 'quran';
    window.openProfile = () => window.location.hash = 'profile';

    // Alias tombol Close/Back
    window.closeQibla = () => window.goHome();
    window.closeTasbih = () => window.goHome();
    window.closeProfile = () => window.goHome();
}

export function switchView(targetId) {
    const allViews = ['homeView', 'trackerView', 'profileView', 'tasbihView', 'qiblaView', 'quranView'];
    const targetEl = document.getElementById(targetId);
    
    if (!targetEl) return;

    // 1. Reset SEMUA View (Sembunyikan)
    allViews.forEach(id => {
        const el = document.getElementById(id);
        if (el && el !== targetEl) { // Jangan sembunyikan target dulu biar transisi mulus
            el.classList.remove('active');
            // Beri waktu sedikit untuk animasi keluar, baru display:none
            // (Opsional: bisa langsung hidden-force kalau mau instan)
            setTimeout(() => el.classList.add('hidden-force'), 300); 
        }
    });

    // 2. Munculkan TARGET dengan Animasi
    targetEl.classList.remove('hidden-force');
    
    // [PENTING] Double RAF untuk memicu animasi CSS
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            targetEl.classList.add('active');
        });
    });

    // 3. Render Icon (Lazy Load)
    if (window.lucide && targetEl.querySelectorAll('i[data-lucide]').length > 0) {
        try { lucide.createIcons({ root: targetEl }); } catch(e) {}
    }
    
    // 4. Info ke Modul Lain
    window.dispatchEvent(new CustomEvent('viewChanged', { detail: { viewId: targetId } }));
}