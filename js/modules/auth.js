import { auth, provider } from '../config.js';
import { signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export function initAuth() {
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if(googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            const status = document.getElementById('loginStatus');
            if(status) status.classList.remove('hidden');
            try { 
                await signInWithPopup(auth, provider); 
            } catch (error) { 
                console.error(error); 
                if(status) status.classList.add('hidden'); 
            }
        });
    }
}