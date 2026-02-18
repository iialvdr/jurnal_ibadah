import { state } from './state.js';

let isExplicitNavigation = false;

const detectReloadNavigation = () => {
    try {
        const entries = performance.getEntriesByType('navigation');
        if (entries && entries.length > 0) {
            return entries[0].type === 'reload';
        }
    } catch (e) { }
    return performance && performance.navigation && performance.navigation.type === 1;
};

export function setupRouter() {
    let forceHomeOnLoad = detectReloadNavigation();
    const handleNavigation = async () => {
        let path = window.location.pathname.split('/').filter(Boolean).pop() || 'home';

        if (forceHomeOnLoad && !isExplicitNavigation && path !== 'home' && path !== '') {
            history.replaceState(null, null, '/');
            path = 'home';
        }
        if (forceHomeOnLoad) forceHomeOnLoad = false;

        if (!state.currentUser) {
            const allInternalViews = [
                'homeView', 'trackerView', 'profileView', 'tasbihView',
                'qiblaView', 'quranView', 'doaView', 'asmaulHusnaView',
                'fastingView', 'creditsView', 'changelogView',
                'zakatView', 'faqView', 'hadithView'
            ];

            allInternalViews.forEach(id => {
                const el = document.getElementById(id);
                if (el && el.classList) {
                    el.classList.add('hidden-force');
                    el.classList.remove('active');
                }
            });

            if (path !== 'home' && path !== '') {
                history.replaceState(null, null, '/');
            }
            return;
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
            'changelog': 'changelogView',
            'zakat': 'zakatView',
            'faq': 'faqView',
            'hadith': 'hadithView'
        };

        const targetViewId = routes[path] || 'homeView';
        await switchView(targetViewId);
    };

    window.addEventListener('popstate', () => { handleNavigation(); });
    window.addEventListener('load', () => { handleNavigation(); });

    handleNavigation();

    const navigateTo = (path) => {
        isExplicitNavigation = true;
        const url = path === 'home' ? '/' : `/${path}`;
        history.pushState(null, null, url);
        handleNavigation();
        setTimeout(() => { isExplicitNavigation = false; }, 100);
    };

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
    window.openZakat = () => navigateTo('zakat');
    window.openFaq = () => navigateTo('faq');
    window.openHadith = () => navigateTo('hadith');

    window.goBack = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            navigateTo('home');
        }
    };
}

export function switchView(targetId) {
    const ensureViewLoaded = window.ensureViewLoaded;
    if (typeof ensureViewLoaded === 'function') {
        return ensureViewLoaded(targetId).then(() => applySwitchView(targetId));
    }
    return applySwitchView(targetId);
}

function applySwitchView(targetId) {
    const allViews = [
        'homeView', 'trackerView', 'profileView', 'tasbihView',
        'qiblaView', 'quranView', 'doaView', 'asmaulHusnaView',
        'fastingView', 'creditsView', 'changelogView',
        'zakatView', 'faqView', 'hadithView'
    ];

    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;

    const currentActive = document.querySelector('.absolute.z-50.active');
    if (currentActive && currentActive.id !== targetId) {
        window.dispatchEvent(new CustomEvent('viewExit', {
            detail: { viewId: currentActive.id }
        }));
    }

    if (window.lucide && targetEl) {
        if (!targetEl.hasAttribute('data-icons-rendered')) {
            try {
                lucide.createIcons({ root: targetEl });
                targetEl.setAttribute('data-icons-rendered', 'true');
            } catch (e) { console.warn("Lucide error di switchView:", e); }
        }
    }

    requestAnimationFrame(() => {
        allViews.forEach(id => {
            const el = document.getElementById(id);
            if (!el || !el.classList) return;

            if (id === targetId) {
                el.classList.remove('hidden-force');
                el.classList.add('active');
            } else {
                el.classList.remove('active');
                el.classList.add('hidden-force');
            }
        });

        window.dispatchEvent(new CustomEvent('viewChanged', { detail: { viewId: targetId } }));
    });
}
