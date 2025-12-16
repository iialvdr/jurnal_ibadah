import { APP_VERSION } from '../version.js';

export function initCredits() {
    window.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'creditsView') {
            updateCreditsInfo();
        }
    });
}

function updateCreditsInfo() {
    // Update Versi Aplikasi dari version.js
    const versionEl = document.getElementById('appVersionText');
    if (versionEl) {
        versionEl.textContent = `Versi ${APP_VERSION}`;
    }
}