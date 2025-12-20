import { APP_VERSION } from '../version.js';

export function initCredits() {
    window.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'creditsView') {
            updateCreditsInfo();
        }
    });
}