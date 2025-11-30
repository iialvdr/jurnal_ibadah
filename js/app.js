import { auth } from './config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { setCurrentUser } from './state.js';
import { setupRouter, switchView } from './router.js';
import { APP_VERSION } from './version.js'; // [BARU] Import Versi

// Import Modules
import { initAuth } from './modules/auth.js';
import { initHome } from './modules/home.js';
import { initTracker } from './modules/tracker.js';
import { initTasbih } from './modules/tasbih.js';
import { initQibla } from './modules/qibla.js';
import { initQuran } from './modules/quran.js';
import { initProfile } from './modules/profile.js';

const VIEWS = [
    'views/login.html', 'views/home.html', 'views/profile.html',
    'views/tasbih.html', 'views/qibla.html', 'views/tracker.html', 'views/quran.html'
];

async function loadAllViews() {
    const appContainer = document.getElementById('appContainer');
    if (!appContainer) return;

    appContainer.innerHTML = '';
    
    for (const viewPath of VIEWS) {
        try {
            const response = await fetch(viewPath);
            if (!response.ok) throw new Error(`Gagal memuat ${viewPath}`);
            const html = await response.text();
            appContainer.insertAdjacentHTML('beforeend', html);
        } catch (error) { console.error(error); }
    }
    
    // [BARU] Update Label Versi di UI setelah view dimuat
    updateVersionLabels();
    
    initializeApp();
}

// [BARU] Fungsi update teks versi
function updateVersionLabels() {
    const vLogin = document.getElementById('versionTextLogin');
    if(vLogin) vLogin.innerText = APP_VERSION;
    
    const vProfile = document.getElementById('versionTextProfile');
    if(vProfile) vProfile.innerText = APP_VERSION;
}

function initializeApp() {
    setupRouter();
    
    // Init Modules
    initAuth();
    initHome();
    initTracker();
    initTasbih();
    initQibla();
    initQuran();
    initProfile();

    onAuthStateChanged(auth, (user) => {
        const splash = document.getElementById('splashScreen');
        const sidebar = document.getElementById('desktopSidebar');
        const appContainer = document.getElementById('appContainer');

        if (user) {
            setCurrentUser(user);
            const loginOverlay = document.getElementById('loginOverlay');
            if(loginOverlay) loginOverlay.classList.add('hidden-force');
            if(sidebar) sidebar.classList.remove('hidden-force');
            switchView('homeView', false);
        } else {
            setCurrentUser(null);
            if(sidebar) sidebar.classList.add('hidden-force');

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

        if(splash) {
            setTimeout(() => {
                splash.classList.add('opacity-0');
                setTimeout(() => splash.classList.add('hidden-force'), 500);
            }, 800);
        }
    });
}

document.addEventListener('DOMContentLoaded', loadAllViews);