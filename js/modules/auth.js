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
let toastTimeout = null;

// --- FUNGSI HELPER UI (Ditaruh di luar agar bisa diakses global) ---

function showLoading(isLoading) {
    const status = document.getElementById('loginStatus');
    if (status) status.classList.toggle('hidden', !isLoading);
}

function hideError() {
    const toast = document.getElementById('floatingToast');
    if (toast) {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', '-translate-y-10');
    }
}

function showError(msg) {
    const toast = document.getElementById('floatingToast');
    const msgText = document.getElementById('toastMessage');

    if (toast && msgText) {
        msgText.innerText = msg;
        toast.classList.remove('opacity-0', '-translate-y-10');
        toast.classList.add('opacity-100', 'translate-y-0');

        if (window.vibrateSoft) window.vibrateSoft();

        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            hideError();
        }, 3000);
    } else {
        console.error("Toast element not found:", msg);
        alert(msg);
    }
}

function handleAuthError(error) {
    console.error("Auth Error:", error.code, error.message);

    let msg = "Terjadi kesalahan sistem.";

    switch (error.code) {
        case 'auth/email-already-in-use':
            msg = "Email ini sudah terdaftar. Silakan login.";
            break;
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            msg = "Email atau Password salah.";
            break;
        case 'auth/invalid-email':
            msg = "Format email tidak valid.";
            break;
        case 'auth/weak-password':
            msg = "Password terlalu lemah (min. 6 karakter).";
            break;
        case 'auth/too-many-requests':
            msg = "Terlalu banyak percobaan. Tunggu sebentar.";
            break;
        case 'auth/network-request-failed':
            msg = "Koneksi internet bermasalah.";
            break;
        case 'auth/popup-closed-by-user':
            msg = "Login dibatalkan.";
            break;
        default:
            msg = error.message || "Gagal memproses permintaan.";
    }

    showError(msg);
}

// --- FUNGSI UTAMA ---

/**
 * Validasi Link Google
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

// Fungsi Slide Tab (Masuk / Daftar)
window.toggleAuth = (isSignUp) => {
    const track = document.getElementById('authTrack');
    const glider = document.getElementById('authGlider');
    const container = document.getElementById('toggleContainer');

    // Sekarang hideError() sudah bisa dipanggil karena ada di scope global module
    hideError();

    if (!container) return;
    const buttons = container.querySelectorAll('button');

    if (track && glider) {
        track.style.transform = isSignUp ? 'translateX(-50%)' : 'translateX(0)';
        glider.style.transform = isSignUp ? 'translateX(100%)' : 'translateX(0)';

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

    const validateInput = (email, password) => {
        if (!email) {
            showError("Email tidak boleh kosong.");
            return false;
        }
        if (!password) {
            showError("Password tidak boleh kosong.");
            return false;
        }
        return true;
    };

    // 1. LOGIN ACTION
    const btnLogin = document.getElementById('btnLoginAction');
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const email = document.getElementById('emailLogin').value.trim();
            const password = document.getElementById('passwordLogin').value;

            hideError();
            if (!validateInput(email, password)) return;

            showLoading(true);
            try {
                const userCred = await signInWithEmailAndPassword(auth, email, password);
                if (pendingGoogleCred) {
                    await linkWithCredential(userCred.user, pendingGoogleCred);
                    pendingGoogleCred = null;
                }
            } catch (error) {
                handleAuthError(error);
            } finally {
                showLoading(false);
            }
        });
    }

    // 2. SIGNUP ACTION
    const btnSignup = document.getElementById('btnSignupAction');
    if (btnSignup) {
        btnSignup.addEventListener('click', async () => {
            const email = document.getElementById('emailSignup').value.trim();
            const password = document.getElementById('passwordSignup').value;

            hideError();
            if (!validateInput(email, password)) return;

            showLoading(true);
            try {
                await createUserWithEmailAndPassword(auth, email, password);
            } catch (error) {
                handleAuthError(error);
            } finally {
                showLoading(false);
            }
        });
    }

    // 3. GOOGLE LOGIN
    const googleBtn = document.getElementById('googleLoginBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            hideError();
            showLoading(true);
            try {
                await signInWithPopup(auth, provider);
            } catch (error) {
                if (error.code === 'auth/account-exists-with-different-credential') {
                    pendingGoogleCred = error.credential;
                    toggleAuth(false);
                    showError("Email sudah terdaftar. Loginlah via Email untuk sinkronisasi.");
                } else {
                    handleAuthError(error);
                }
            } finally {
                showLoading(false);
            }
        });
    }

    // 4. FORGOT PASSWORD
    const forgotBtn = document.getElementById('forgotPasswordBtn');
    if (forgotBtn) {
        forgotBtn.addEventListener('click', async () => {
            const email = document.getElementById('emailLogin').value.trim();
            if (!email) {
                showError("Masukkan email login Anda terlebih dahulu.");
                return;
            }

            hideError();
            showLoading(true);
            try {
                await sendPasswordResetEmail(auth, email);
                alert("Email reset password telah dikirim! Cek inbox/spam.");
            } catch (e) {
                handleAuthError(e);
            } finally {
                showLoading(false);
            }
        });
    }
}