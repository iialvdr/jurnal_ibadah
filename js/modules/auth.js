// js/modules/auth.js
import { auth, provider } from '../config.js';
import {
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    linkWithCredential,
    linkWithPopup,
    unlink
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { APP_VERSION } from '../version.js';

let pendingGoogleCred = null;

/**
 * FUNGSI VALIDASI: Menyambungkan Google dengan syarat Email wajib sama.
 */
export async function handleLinkGoogle() {
    const user = auth.currentUser;
    if (!user) throw new Error("Kamu harus login terlebih dahulu.");

    try {
        const result = await linkWithPopup(user, provider);
        const googleAccount = result.user.providerData.find(p => p.providerId === 'google.com');
        const googleEmail = googleAccount ? googleAccount.email : null;

        if (googleEmail && googleEmail.toLowerCase() !== user.email.toLowerCase()) {
            await unlink(user, 'google.com');
            throw new Error(`Akses Ditolak! Email Google (${googleEmail}) tidak sama dengan email akun kamu (${user.email}).`);
        }

        return result.user;
    } catch (error) {
        if (error.code === 'auth/credential-already-in-use') {
            throw new Error("Akun Google ini sudah terhubung dengan pengguna lain.");
        }
        throw error;
    }
}

// PERBAIKAN: Fungsi Slide Presisi
window.toggleAuth = (isSignUp) => {
    const track = document.getElementById('authTrack');
    const glider = document.getElementById('authGlider');
    const container = document.getElementById('toggleContainer');
    if (!container) return;
    const buttons = container.querySelectorAll('button');

    if (track && glider) {
        // Geser konten form
        track.style.transform = isSignUp ? 'translateX(-50%)' : 'translateX(0)';

        // Geser indikator (Glider) tepat 100% dari lebarnya
        glider.style.transform = isSignUp ? 'translateX(100%)' : 'translateX(0)';

        // Update warna teks tombol
        buttons[0].classList.toggle('text-slate-400', isSignUp);
        buttons[0].classList.toggle('text-slate-800', !isSignUp);
        buttons[0].classList.toggle('dark:text-white', !isSignUp);

        buttons[1].classList.toggle('text-slate-400', !isSignUp);
        buttons[1].classList.toggle('text-slate-800', isSignUp);
        buttons[1].classList.toggle('dark:text-white', isSignUp);

        if (window.vibrateSoft) window.vibrateSoft();
    }
};

export function initAuth() {
    const verText = document.getElementById('versionTextLogin');
    if (verText) verText.innerText = APP_VERSION;

    const status = document.getElementById('loginStatus');
    const errorBox = document.getElementById('errorMsg');

    // 1. LOGIN ACTION
    const btnLogin = document.getElementById('btnLoginAction');
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const email = document.getElementById('emailLogin').value.trim();
            const password = document.getElementById('passwordLogin').value;
            if (!email || !password) return;

            showLoading(true);
            try {
                const userCred = await signInWithEmailAndPassword(auth, email, password);
                if (pendingGoogleCred) {
                    await linkWithCredential(userCred.user, pendingGoogleCred);
                    pendingGoogleCred = null;
                }
            } catch (error) { handleAuthError(error); }
            finally { showLoading(false); }
        });
    }

    // 2. SIGNUP ACTION
    const btnSignup = document.getElementById('btnSignupAction');
    if (btnSignup) {
        btnSignup.addEventListener('click', async () => {
            const email = document.getElementById('emailSignup').value.trim();
            const password = document.getElementById('passwordSignup').value;
            if (!email || !password) return;

            showLoading(true);
            try {
                await createUserWithEmailAndPassword(auth, email, password);
            } catch (error) { handleAuthError(error); }
            finally { showLoading(false); }
        });
    }

    // 3. GOOGLE LOGIN
    const googleBtn = document.getElementById('googleLoginBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            showLoading(true);
            try {
                await signInWithPopup(auth, provider);
            } catch (error) {
                if (error.code === 'auth/account-exists-with-different-credential') {
                    pendingGoogleCred = error.credential;
                    toggleAuth(false);
                    showError("Email sudah terdaftar. Loginlah via Email untuk sinkronisasi.");
                }
            } finally { showLoading(false); }
        });
    }

    // 4. FORGOT PASSWORD
    const forgotBtn = document.getElementById('forgotPasswordBtn');
    if (forgotBtn) {
        forgotBtn.addEventListener('click', async () => {
            const email = document.getElementById('emailLogin').value.trim();
            if (!email) return alert("Masukkan email login Anda.");
            try {
                await sendPasswordResetEmail(auth, email);
                alert("Email reset password telah dikirim!");
            } catch (e) { alert("Gagal mengirim email reset."); }
        });
    }

    function showLoading(show) {
        if (status) status.classList.toggle('hidden', !show);
        if (errorBox) errorBox.classList.add('hidden');
    }
    function showError(msg) {
        if (errorBox) {
            errorBox.classList.remove('hidden');
            errorBox.querySelector('p').innerText = msg;
        }
    }
    function handleAuthError(error) {
        let msg = "Terjadi kesalahan sistem.";
        if (error.code === 'auth/email-already-in-use') msg = "Email ini sudah terdaftar.";
        else if (error.code === 'auth/invalid-credential') msg = "Email atau Password tidak cocok.";
        else if (error.code === 'auth/weak-password') msg = "Password minimal 6 karakter.";
        showError(msg);
    }
}