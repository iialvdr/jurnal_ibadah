import { auth, provider } from '../config.js';
import { signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { APP_VERSION } from '../version.js'; // Import Versi

export function initAuth() {
    // Update versi di halaman login saat inisialisasi
    const verText = document.getElementById('versionTextLogin');
    if (verText) verText.innerText = APP_VERSION;

    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            const status = document.getElementById('loginStatus');
            if (status) status.classList.remove('hidden');
            try {
                await signInWithPopup(auth, provider);
            } catch (error) {
                console.error(error);
                if (status) status.classList.add('hidden');
            }
        });
    }
}