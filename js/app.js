import { auth, db } from './config.js';
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

window.vibrateSoft = () => { if (navigator.vibrate) navigator.vibrate(10); };
window.vibrateSuccess = () => { if (navigator.vibrate) navigator.vibrate([10, 30, 10]); };

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js', { scope: './', type: 'module' })
            .then(reg => {
                console.log('SW Registered:', reg.scope);
                reg.update();
            })
            .catch(err => console.error('SW Registration Failed:', err));

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
        metaThemeColor.name = "theme-color";
        document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', color);
}

const themeObserver = new MutationObserver(() => updateStatusBarColor());
themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

const VIEWS = [
    '/views/login.html',
    '/views/home.html',
    '/views/profile.html',
    '/views/tasbih.html',
    '/views/qibla.html',
    '/views/tracker.html',
    '/views/quran.html',
    '/views/doa.html',
    '/views/asmaul_husna.html',
    '/views/fasting.html',
    '/views/credits.html',
    '/views/changelog.html',
    '/views/zakat.html',
    '/views/faq.html',
    '/views/hadith.html'
];

async function loadAllViews() {
    const appContainer = document.getElementById('appContainer');
    if (!appContainer) return;

    appContainer.innerHTML = '';

    const fetchPromises = VIEWS.map(async (viewPath) => {
        try {
            const response = await fetch(viewPath);
            if (!response.ok) throw new Error(`Gagal memuat ${viewPath}`);
            return await response.text();
        } catch (error) {
            console.error(error);
            return '';
        }
    });

    const viewsContent = await Promise.all(fetchPromises);

    viewsContent.forEach(html => {
        if (html) appContainer.insertAdjacentHTML('beforeend', html);
    });

    updateVersionLabels();
    initializeApp();
}

function updateVersionLabels() {
    const vLogin = document.getElementById('versionTextLogin');
    if (vLogin) vLogin.innerText = APP_VERSION;

    const vProfile = document.getElementById('versionTextProfile');
    if (vProfile) vProfile.innerText = APP_VERSION;
}

function initializeApp() {
    initAuth();
    initHome();
    initTracker();
    initFasting();
    initTasbih();
    initQibla();
    initQuran();
    initDoa();
    initAsmaulHusna();
    initProfile();
    initCredits();
    initChangelog();
    initZakat();
    initHadith();

    onAuthStateChanged(auth, (user) => {
        const splash = document.getElementById('splashScreen');
        const appContainer = document.getElementById('appContainer');

        if (user) {
            setCurrentUser(user);
            syncThemeWithCloud();

            const loginOverlay = document.getElementById('loginOverlay');
            if (loginOverlay) loginOverlay.classList.add('hidden-force');

            setupRouter();
            requestNotificationPermission();
        } else {
            setCurrentUser(null);
            if (window.location.pathname !== '/' && window.location.pathname !== '/home') {
                window.history.replaceState(null, null, '/');
            }

            if (appContainer) {
                Array.from(appContainer.children).forEach(child => {
                    if (child.id === 'loginOverlay') {
                        child.classList.remove('hidden-force');
                    } else {
                        child.classList.add('hidden-force');
                        child.classList.remove('active');
                    }
                });
            }
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

document.addEventListener('DOMContentLoaded', () => {
    registerServiceWorker();
    loadAllViews();
});