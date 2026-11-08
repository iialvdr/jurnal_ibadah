// src/pages/Login.jsx
import { useState, useRef } from 'react';
import { auth, provider } from '@/config/firebase';
import {
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    linkWithCredential,
} from 'firebase/auth';
import { APP_VERSION } from '@/utils/version';
import { Eye, EyeOff } from 'lucide-react';
import { gooeyToast } from 'goey-toast';
import LiquidGlass from '@/components/LiquidGlass';
import TabSlider from '@/components/TabSlider';

const LOGIN_TABS = [
    { id: 'login', label: 'Masuk' },
    { id: 'signup', label: 'Daftar' },
];

function getAuthError(error) {
    switch (error.code) {
        case 'auth/email-already-in-use': return 'Email ini sudah terdaftar. Silakan login.';
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password': return 'Email atau Password salah.';
        case 'auth/invalid-email': return 'Format email tidak valid.';
        case 'auth/weak-password': return 'Password terlalu lemah (min. 6 karakter).';
        case 'auth/too-many-requests': return 'Terlalu banyak percobaan. Tunggu sebentar.';
        case 'auth/network-request-failed': return 'Koneksi internet bermasalah.';
        case 'auth/popup-closed-by-user': return 'Login dibatalkan.';
        default: return error.message || 'Gagal memproses permintaan.';
    }
}

export default function Login() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [showPassLogin, setShowPassLogin] = useState(false);
    const [showPassSignup, setShowPassSignup] = useState(false);
    const pendingGoogleCredRef = useRef(null);

    const [emailLogin, setEmailLogin] = useState('');
    const [passwordLogin, setPasswordLogin] = useState('');
    const [emailSignup, setEmailSignup] = useState('');
    const [passwordSignup, setPasswordSignup] = useState('');
    
    const [failedAttempts, setFailedAttempts] = useState(0);

    const handleLogin = () => {
        if (!emailLogin) return gooeyToast.error('Email tidak boleh kosong.', { showTimestamp: false });
        if (!passwordLogin) return gooeyToast.error('Password tidak boleh kosong.', { showTimestamp: false });

        const promise = signInWithEmailAndPassword(auth, emailLogin.trim(), passwordLogin)
            .then(async (userCred) => {
                setFailedAttempts(0);
                if (pendingGoogleCredRef.current) {
                    await linkWithCredential(userCred.user, pendingGoogleCredRef.current);
                    pendingGoogleCredRef.current = null;
                }
                return userCred;
            })
            .catch(e => {
                if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
                    setFailedAttempts(prev => prev + 1);
                }
                return Promise.reject(getAuthError(e));
            });

        gooeyToast.promise(promise, {
            loading: 'Memproses login...',
            success: 'Berhasil masuk!',
            error: (err) => err,
            showTimestamp: false,
            action: failedAttempts >= 2 ? {
                error: {
                    label: 'Lupa Password?',
                    onClick: () => handleForgotPassword()
                }
            } : undefined
        });
    };

    const handleSignup = () => {
        if (!emailSignup) return gooeyToast.error('Email tidak boleh kosong.');
        if (!passwordSignup) return gooeyToast.error('Password tidak boleh kosong.');

        const promise = createUserWithEmailAndPassword(auth, emailSignup.trim(), passwordSignup)
            .catch(e => Promise.reject(getAuthError(e)));

        gooeyToast.promise(promise, {
            loading: 'Membuat akun...',
            success: 'Akun berhasil dibuat!',
            error: (err) => err,
            showTimestamp: false
        });
    };

    const handleGoogle = () => {
        const promise = signInWithPopup(auth, provider).catch(e => {
            if (e.code === 'auth/account-exists-with-different-credential') {
                pendingGoogleCredRef.current = e.credential;
                setIsSignUp(false);
                return Promise.reject('Email sudah terdaftar. Loginlah via Email untuk sinkronisasi.');
            }
            if (e.code === 'auth/popup-closed-by-user') {
                return Promise.reject('Login dibatalkan.');
            }
            return Promise.reject(getAuthError(e));
        });

        gooeyToast.promise(promise, {
            loading: 'Menghubungkan ke Google...',
            success: 'Berhasil masuk!',
            error: (err) => err,
            showTimestamp: false
        });
    };

    const handleForgotPassword = () => {
        if (!emailLogin) return gooeyToast.error('Masukkan email login Anda terlebih dahulu.');

        const promise = sendPasswordResetEmail(auth, emailLogin.trim())
            .catch(e => Promise.reject(getAuthError(e)));

        gooeyToast.promise(promise, {
            loading: 'Mengirim email reset...',
            success: 'Email reset password telah dikirim! Cek inbox/spam Anda.',
            error: (err) => err,
            showTimestamp: false
        });
    };

    const handleKeyDown = (e, action) => {
        if (e.key === 'Enter') action();
    };

    return (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-5 transition-all duration-500 bg-slate-100 dark:bg-slate-950 overflow-x-hidden overflow-y-auto max-md:justify-end max-md:px-6 max-md:pt-8 max-md:pb-[calc(1.5rem+env(safe-area-inset-bottom))]">

            {/* Background gradient */}
            <div className="fixed top-0 left-0 right-0 h-80 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none z-0"></div>

            {/* Subtle, intentionally cropped ambient shapes */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[48%] overflow-hidden">
                <div className="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/10"></div>
                <div className="absolute -top-24 -right-28 h-64 w-64 rounded-full bg-teal-300/15 blur-3xl dark:bg-teal-500/10"></div>
                <div className="absolute top-12 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full border border-emerald-500/[0.07] dark:border-emerald-200/[0.06]"></div>
                <div className="absolute top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full border border-emerald-500/[0.06] dark:border-emerald-200/[0.05]"></div>
            </div>

            {/* Card */}
            <div className="relative z-10 my-auto w-full max-w-[420px] shrink-0 md:max-w-[320px] max-md:my-0 max-md:mt-auto">
                {/* Logo & Branding */}
                <div className="flex flex-col items-center text-center mb-5 max-md:mb-4">
                    <div className="relative mb-3">
                        <div className="absolute -inset-2 bg-emerald-400/15 dark:bg-emerald-500/10 rounded-full blur-xl"></div>
                        <img src="img/favicon/android-chrome-192x192.png" className="relative w-14 h-14 rounded-full object-contain shadow-lg border-2 border-white dark:border-slate-800 bg-white" alt="Logo" />
                    </div>
                    <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter">Jurnal Ibadah</h1>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">Teman setia ibadah harianmu</p>
                </div>

                {/* Form Card */}
                <LiquidGlass
                    tier="regular"
                    displacementScale={85}
                    refractionBlur={2}
                    elasticity={false}
                    overflowVisible
                    cornerRadius="rounded-[2rem]"
                    className="login-glass-card p-5 max-md:p-0"
                >
                    <div className="flex flex-col">
                        {/* Tab Toggle */}
                        <div className="order-2 md:order-1 mt-5 w-full md:mt-0 md:mb-5">
                            <TabSlider
                                tabs={LOGIN_TABS}
                                activeTab={isSignUp ? 'signup' : 'login'}
                                onChange={tab => setIsSignUp(tab === 'signup')}
                                className="login-tab-track bg-slate-900/5 dark:bg-white/5 backdrop-blur-md rounded-full border border-black/5 dark:border-white/10"
                            />
                        </div>

                        {/* Sliding Form */}
                        <div className="order-1 md:order-2 w-full overflow-hidden">
                        <div 
                            className="flex w-[200%]"
                            style={{
                                transform: isSignUp ? 'translateX(-50%)' : 'translateX(0)',
                                transition: 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)'
                            }}
                        >
                            {/* Login Form */}
                            <div className="w-1/2 flex flex-col items-center px-1">
                                <form className="w-full space-y-2.5" onSubmit={e => { e.preventDefault(); handleLogin(); }}>
                                    <input type="email" value={emailLogin} onChange={e => setEmailLogin(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 transition shadow-inner"
                                        placeholder="EMAIL" />
                                    <div className="relative">
                                        <input type={showPassLogin ? 'text' : 'password'} value={passwordLogin} onChange={e => setPasswordLogin(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 pr-11 py-3.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 transition shadow-inner"
                                            placeholder="PASSWORD" />
                                        <button type="button" onClick={() => setShowPassLogin(v => !v)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-slate-400 hover:text-emerald-500 transition">
                                            {showPassLogin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <button type="submit"
                                        className="w-full min-h-12 py-3.5 rounded-2xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition active:scale-95 shadow-lg shadow-emerald-500/20">
                                        Masuk Sekarang
                                    </button>
                                    <button type="button" onClick={handleForgotPassword}
                                        className="w-full text-[9px] font-black text-slate-400 hover:text-emerald-500 transition uppercase tracking-wider text-center">
                                        Lupa Password?
                                    </button>
                                </form>
                            </div>

                            {/* Signup Form */}
                            <div className="w-1/2 flex flex-col items-center px-1">
                                <form className="w-full space-y-2.5" onSubmit={e => { e.preventDefault(); handleSignup(); }}>
                                    <input type="email" value={emailSignup} onChange={e => setEmailSignup(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 transition shadow-inner"
                                        placeholder="EMAIL BARU" />
                                    <div className="relative">
                                        <input type={showPassSignup ? 'text' : 'password'} value={passwordSignup} onChange={e => setPasswordSignup(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 pr-11 py-3.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 transition shadow-inner"
                                            placeholder="BUAT PASSWORD" />
                                        <button type="button" onClick={() => setShowPassSignup(v => !v)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-slate-400 hover:text-emerald-500 transition">
                                            {showPassSignup ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <button type="submit"
                                        className="w-full min-h-12 py-3.5 rounded-2xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition active:scale-95 shadow-lg shadow-emerald-500/20">
                                        Buat Akun Baru
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                    </div>

                    {/* Divider */}
                    <div className="w-full mt-4">
                        <div className="flex items-center gap-3 my-3 opacity-20">
                            <div className="h-[1px] flex-1 bg-slate-400"></div>
                            <span className="text-[8px] font-black uppercase">Atau</span>
                            <div className="h-[1px] flex-1 bg-slate-400"></div>
                        </div>
                        <p className="text-center text-[9px] font-bold text-slate-400 dark:text-slate-500 mb-2 tracking-wide">
                            Ingin lebih praktis? Gunakan akun Google
                        </p>
                        <button onClick={handleGoogle}
                            className="w-full min-h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl transition active:scale-95 flex items-center justify-center gap-2.5">
                            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-white">Masuk via Google</span>
                        </button>
                    </div>
                </LiquidGlass>

                <p className="text-center text-[9px] font-bold text-slate-300 dark:text-slate-700 mt-4">v{APP_VERSION}</p>
            </div>


        </div>
    );
}
