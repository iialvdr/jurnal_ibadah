import { auth } from './config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { setCurrentUser } from './state.js';
import { setupRouter } from './router.js';
import { APP_VERSION } from './version.js';

// Import Modules
import { initAuth } from './modules/auth.js';
import { initHome, syncThemeWithCloud } from './modules/home.js';
import { initTracker } from './modules/tracker.js';
import { initTasbih } from './modules/tasbih.js';
import { initQibla } from './modules/qibla.js';
import { initQuran } from './modules/quran.js';
import { initProfile } from './modules/profile.js';
import { initDoa } from './modules/doa.js';
import { initAsmaulHusna } from './modules/asmaul_husna.js';
import { initFasting } from './modules/fasting.js';
import { initCredits } from './modules/credits.js';
import { initChangelog } from './modules/changelog.js';
import { initZakat } from './modules/zakat.js';
import { initHadith } from './modules/hadith.js';
import { initFaq } from './modules/faq.js';
import { syncPushSubscription } from './modules/push.js';

window.vibrateSoft = () => { if (navigator.vibrate) navigator.vibrate(10); };
window.vibrateSuccess = () => { if (navigator.vibrate) navigator.vibrate([10, 30, 10]); };

let toastTimer = null;
window.showAppToast = (message, type = 'info') => {
    const toast = document.getElementById('appToast');
    const inner = document.getElementById('appToastInner');
    const text = document.getElementById('appToastText');
    if (!toast || !inner || !text) return;

    text.innerText = message || '';

    inner.classList.remove('bg-slate-900/90', 'bg-emerald-600/90', 'bg-rose-600/90');
    if (type === 'success') inner.classList.add('bg-emerald-600/90');
    else if (type === 'error') inner.classList.add('bg-rose-600/90');
    else inner.classList.add('bg-slate-900/90');

    toast.classList.remove('opacity-0', '-translate-y-4');
    toast.classList.add('opacity-100', 'translate-y-0');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.add('opacity-0', '-translate-y-4');
        toast.classList.remove('opacity-100', 'translate-y-0');
    }, 2200);
};

const VIEW_REGISTRY = {
    loginOverlay: { path: '/views/login.html', init: initAuth },
    homeView: { path: '/views/home.html', init: initHome },
    trackerView: { path: '/views/tracker.html', init: initTracker },
    profileView: { path: '/views/profile.html', init: initProfile },
    tasbihView: { path: '/views/tasbih.html', init: initTasbih },
    qiblaView: { path: '/views/qibla.html', init: initQibla },
    quranView: { path: '/views/quran.html', init: initQuran },
    doaView: { path: '/views/doa.html', init: initDoa },
    asmaulHusnaView: { path: '/views/asmaul_husna.html', init: initAsmaulHusna },
    fastingView: { path: '/views/fasting.html', init: initFasting },
    creditsView: { path: '/views/credits.html', init: initCredits },
    changelogView: { path: '/views/changelog.html', init: initChangelog },
    zakatView: { path: '/views/zakat.html', init: initZakat },
    faqView: { path: '/views/faq.html', init: initFaq },
    hadithView: { path: '/views/hadith.html', init: initHadith }
};

const CORE_VIEWS = ['loginOverlay', 'homeView'];
const initedViews = new Set();
const loadingViews = new Map();
let authWatcherInitialized = false;
let tipsInitialized = false;

function updateVersionLabels() {
    const vLogin = document.getElementById('versionTextLogin');
    if (vLogin) vLogin.innerText = APP_VERSION;

    const vProfile = document.getElementById('versionTextProfile');
    if (vProfile) vProfile.innerText = APP_VERSION;
}

function runViewInitializer(viewId) {
    if (initedViews.has(viewId)) return;
    const def = VIEW_REGISTRY[viewId];
    if (!def || typeof def.init !== 'function') return;
    def.init();
    initedViews.add(viewId);
}

async function loadViewMarkup(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Gagal memuat ${path}`);
    return response.text();
}

export async function ensureViewLoaded(viewId) {
    if (!viewId || !VIEW_REGISTRY[viewId]) return null;

    const existing = document.getElementById(viewId);
    if (existing) {
        runViewInitializer(viewId);
        updateVersionLabels();
        if (typeof window.syncTipsForActiveView === 'function') window.syncTipsForActiveView();
        return existing;
    }

    if (loadingViews.has(viewId)) return loadingViews.get(viewId);

    const loadPromise = (async () => {
        const appContainer = document.getElementById('appContainer');
        if (!appContainer) return null;

        const html = await loadViewMarkup(VIEW_REGISTRY[viewId].path);
        appContainer.insertAdjacentHTML('beforeend', html);

        const inserted = document.getElementById(viewId);
        if (!inserted) return null;

        if (window.lucide) {
            try {
                lucide.createIcons({ root: inserted });
                inserted.setAttribute('data-icons-rendered', 'true');
            } catch (e) {
                console.warn('Lucide error di ensureViewLoaded:', e);
            }
        }

        runViewInitializer(viewId);
        updateVersionLabels();
        if (typeof window.syncTipsForActiveView === 'function') window.syncTipsForActiveView();
        return inserted;
    })().finally(() => {
        loadingViews.delete(viewId);
    });

    loadingViews.set(viewId, loadPromise);
    return loadPromise;
}

window.ensureViewLoaded = ensureViewLoaded;

function setupTips() {
    if (tipsInitialized) {
        if (typeof window.syncTipsForActiveView === 'function') window.syncTipsForActiveView();
        return;
    }
    tipsInitialized = true;

    const hideTimers = new WeakMap();
    const overlayStates = new Map();
    const getTips = () => Array.from(document.querySelectorAll('[data-tip-key]'));

    const clearHighlights = () => {
        document.querySelectorAll('.tip-highlight').forEach(el => {
            el.classList.remove('tip-highlight');
        });
    };

    const clearHideTimer = (tip) => {
        const timer = hideTimers.get(tip);
        if (timer) {
            clearTimeout(timer);
            hideTimers.delete(tip);
        }
    };

    const ensureOverlayForView = (viewId) => {
        if (!viewId) return null;
        const existing = overlayStates.get(viewId);
        if (existing && existing.el && existing.el.isConnected) return existing;

        const viewEl = document.getElementById(viewId);
        if (!viewEl) return null;

        let overlayEl = viewEl.querySelector('[data-tip-overlay]');
        if (!overlayEl) {
            overlayEl = document.createElement('div');
            overlayEl.setAttribute('data-tip-overlay', viewId);
            overlayEl.className = 'hidden fixed inset-0 z-[110] pointer-events-none bg-gradient-to-t from-black/70 via-black/35 to-transparent opacity-0 transition-opacity duration-300';
            viewEl.appendChild(overlayEl);
        }

        const state = { el: overlayEl, timer: null };
        overlayStates.set(viewId, state);
        return state;
    };

    const showOverlay = (viewId) => {
        const state = ensureOverlayForView(viewId);
        if (!state || !state.el) return;
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null;
        }
        state.el.classList.remove('hidden');
        requestAnimationFrame(() => {
            state.el.classList.remove('opacity-0');
            state.el.classList.add('opacity-100');
        });
    };

    const hideOverlay = (viewId) => {
        const state = overlayStates.get(viewId) || ensureOverlayForView(viewId);
        if (!state || !state.el) return;
        if (state.timer) clearTimeout(state.timer);
        state.el.classList.remove('opacity-100');
        state.el.classList.add('opacity-0');
        state.timer = setTimeout(() => {
            state.el.classList.add('hidden');
            state.timer = null;
        }, 220);
    };

    const hideAllOverlays = (exceptViewId = null) => {
        getTips().forEach((tip) => {
            const viewId = tip.dataset.tipView;
            if (!viewId || viewId === exceptViewId) return;
            hideOverlay(viewId);
        });
    };

    const hideTip = (tip) => {
        if (!tip) return;
        clearHideTimer(tip);
        tip.classList.add('opacity-0', 'translate-y-4');
        tip.classList.remove('opacity-100', 'translate-y-0');
        const timer = setTimeout(() => {
            tip.classList.add('hidden');
            hideTimers.delete(tip);
        }, 220);
        hideTimers.set(tip, timer);
    };

    const showTip = (tip) => {
        if (!tip) return;
        clearHideTimer(tip);
        tip.classList.remove('hidden');
        requestAnimationFrame(() => {
            tip.classList.remove('opacity-0', 'translate-y-4');
            tip.classList.add('opacity-100', 'translate-y-0');
        });
    };

    const syncTipByView = (viewId) => {
        if (!viewId) return;
        clearHighlights();

        const tips = getTips();
        let hasVisibleTip = false;

        tips.forEach((tip) => {
            const key = tip.dataset.tipKey;
            const isDismissed = key && localStorage.getItem(`jurnal_tip_${key}`) === 'true';
            const isCurrentView = tip.dataset.tipView === viewId;

            if (isCurrentView && !isDismissed) {
                showTip(tip);
                hasVisibleTip = true;

                const targetSelector = tip.dataset.tipTarget;
                if (targetSelector) {
                    const target = document.querySelector(targetSelector);
                    if (target) target.classList.add('tip-highlight');
                }
                return;
            }

            hideTip(tip);
        });

        if (hasVisibleTip) {
            showOverlay(viewId);
            hideAllOverlays(viewId);
        } else {
            hideOverlay(viewId);
            hideAllOverlays();
        }
    };

    const syncTipForActiveView = () => {
        const activeView = document.querySelector('.active[id]');
        if (activeView) syncTipByView(activeView.id);
        else {
            clearHighlights();
            hideAllOverlays();
            getTips().forEach(hideTip);
        }
    };

    window.syncTipsForActiveView = syncTipForActiveView;

    document.addEventListener('click', (e) => {
        const dismissButton = e.target.closest('[data-tip-dismiss]');
        if (!dismissButton) return;

        const tip = dismissButton.closest('[data-tip-key]');
        if (!tip) return;

        const key = tip.dataset.tipKey;
        if (key) localStorage.setItem(`jurnal_tip_${key}`, 'true');

        const activeView = document.querySelector('.active[id]');
        if (activeView) syncTipByView(activeView.id);
        else {
            hideTip(tip);
            clearHighlights();
            hideAllOverlays();
        }
    });

    window.addEventListener('viewChanged', (e) => {
        syncTipByView(e.detail.viewId);
    });

    window.addEventListener('viewExit', () => {
        clearHighlights();
        getTips().forEach(hideTip);
        hideAllOverlays();
    });

    requestAnimationFrame(syncTipForActiveView);
    setTimeout(syncTipForActiveView, 180);
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js', { scope: './', type: 'module' })
            .then(reg => {
                console.log('SW Registered:', reg.scope);
                reg.update();
            })
            .catch(err => console.error('SW Registration Failed:', err));

        navigator.serviceWorker.addEventListener('message', async (event) => {
            if (!event?.data || event.data.type !== 'push-subscription-changed') return;
            const enabled = localStorage.getItem('jurnal_notifications') === 'true';
            if (enabled && auth.currentUser) {
                await syncPushSubscription(auth.currentUser, true);
            }
        });

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            console.log('Versi baru ditemukan, memuat ulang halaman...');
            window.location.reload();
        });
    }
}

async function requestNotificationPermission() {
    if (!('Notification' in window)) return;

    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Izin notifikasi lokal diberikan');
        }
    }
}

function updateStatusBarColor() {
    const isDark = document.documentElement.classList.contains('dark');
    const color = isDark ? '#020617' : '#f8fafc';

    let metaThemeColor = document.querySelector('meta[name="theme-color"]:not([media])');
    if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.name = 'theme-color';
        document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', color);
}

const themeObserver = new MutationObserver(() => updateStatusBarColor());
themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

function initializeAuthWatcher() {
    if (authWatcherInitialized) return;
    authWatcherInitialized = true;

    onAuthStateChanged(auth, async (user) => {
        const splash = document.getElementById('splashScreen');
        const appContainer = document.getElementById('appContainer');

        if (user) {
            setCurrentUser(user);
            await requestNotificationPermission();
            await syncThemeWithCloud();

            const loginOverlay = await ensureViewLoaded('loginOverlay');
            if (loginOverlay) loginOverlay.classList.add('hidden-force');

            setupRouter();
            if (typeof window.syncTipsForActiveView === 'function') window.syncTipsForActiveView();
        } else {
            setCurrentUser(null);
            await ensureViewLoaded('loginOverlay');

            if (window.location.pathname !== '/' && window.location.pathname !== '/home') {
                window.history.replaceState(null, null, '/');
            }

            if (appContainer) {
                Array.from(appContainer.children).forEach(child => {
                    if (child.id === 'loginOverlay') {
                        child.classList.remove('hidden-force');
                        child.classList.remove('active');
                    } else {
                        child.classList.add('hidden-force');
                        child.classList.remove('active');
                    }
                });
            }

            if (typeof window.syncTipsForActiveView === 'function') window.syncTipsForActiveView();
        }

        if (splash) {
            setTimeout(() => {
                splash.classList.add('opacity-0');
                setTimeout(() => splash.classList.add('hidden-force'), 300);
            }, 500);
        }

        updateStatusBarColor();
    });
}

async function loadInitialViews() {
    const appContainer = document.getElementById('appContainer');
    if (!appContainer) return;

    appContainer.innerHTML = '';

    for (const viewId of CORE_VIEWS) {
        try {
            await ensureViewLoaded(viewId);
        } catch (error) {
            console.error(error);
        }
    }

    setupTips();
    initializeAuthWatcher();
}

document.addEventListener('DOMContentLoaded', () => {
    registerServiceWorker();
    loadInitialViews();
});
