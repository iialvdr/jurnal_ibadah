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

window.vibrateSoft = () => { if (navigator.vibrate) navigator.vibrate(10); };
window.vibrateSuccess = () => { if (navigator.vibrate) navigator.vibrate([10, 30, 10]); };

// Tambahkan tanda / di awal setiap path view
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
    '/views/zakat.html'
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

    onAuthStateChanged(auth, (user) => {
        const splash = document.getElementById('splashScreen');
        const appContainer = document.getElementById('appContainer');

        if (user) {
            setCurrentUser(user);
            syncThemeWithCloud();

            const loginOverlay = document.getElementById('loginOverlay');
            if (loginOverlay) loginOverlay.classList.add('hidden-force');

            setupRouter();
        } else {
            setCurrentUser(null);
            // Gunakan path absolut untuk routing
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
    });
}

document.addEventListener('DOMContentLoaded', loadAllViews);