// src/pages/Profile.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '@/config/firebase';
import { signOut, updateProfile, updatePassword, EmailAuthProvider, linkWithCredential, GoogleAuthProvider, linkWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useApp } from '@/store/AppContext';
import { APP_VERSION } from '@/utils/version';
import { getStreakData, getAllBadges } from '@/modules/streak';
import { syncPushSubscription } from '@/modules/push';
import {
    ArrowLeft, Settings2, ShieldCheck, Calendar, MapPin,
    Hourglass, Activity, CheckCircle2, HelpCircle, History,
    Info, LogOut, X, Palette, Bell, ChevronDown, Check
} from 'lucide-react';
import { useProfileStats } from '@/hooks/useProfileStats';
import { ProfileChart } from '@/components/profile/ProfileChart';
import { LogoutModal } from '@/components/profile/LogoutModal';
import { runThemeCircle } from '@/utils/themeTransition';

export default function Profile() {
    const navigate = useNavigate();
    const { currentUser, showAppToast } = useApp();
    const [streakData, setStreakData] = useState({ current: 0, longest: 0 });
    const [notifEnabled, setNotifEnabled] = useState(false);
    const [pushSupported, setPushSupported] = useState(false);
    
    // Modal states
    const [showEditModal, setShowEditModal] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    
    // Edit Form states
    const [newName, setNewName] = useState('');
    const [saving, setSaving] = useState(false);
    
    // Theme states
    const [themeOpen, setThemeOpen] = useState(false);
    const [themeVal, setThemeVal] = useState(localStorage.getItem('jurnal_theme') || 'system');
    
    const {
        chartDays, setChartDays,
        chartData, chartLoading,
        consistencyPercent, todayIbadahCount
    } = useProfileStats(currentUser);
    
    // Security states
    const providerData = currentUser?.providerData || [];
    const providers = providerData.map(p => p.providerId);
    const hasPassword = providers.includes('password');
    const hasGoogle = providers.includes('google.com');
    const [linkPassword, setLinkPassword] = useState('');
    const [changePassword, setChangePassword] = useState('');
    const [showChangePwd, setShowChangePwd] = useState(false);
    const [securityLoading, setSecurityLoading] = useState(false);

    useEffect(() => {
        const cached = getStreakData();
        setStreakData(cached);
        setPushSupported('serviceWorker' in navigator && 'PushManager' in window);
        if (currentUser) {
            setNewName(currentUser.displayName || '');
            
            // Ambil sinkronisasi dari firebase saat profil dibuka
            const fetchPrefs = async () => {
                try {
                    const snap = await getDoc(doc(db, "users", currentUser.uid, "settings", "preferences"));
                    if (snap.exists()) {
                        const data = snap.data();
                        if (typeof data.notifications === 'boolean') {
                            setNotifEnabled(data.notifications);
                            localStorage.setItem('jurnal_notifications', data.notifications);
                        }
                        if (data.theme) {
                            setThemeVal(data.theme);
                            localStorage.setItem('jurnal_theme', data.theme);
                            
                            // Apply theme class to DOM to stay strictly in sync
                            const html = document.documentElement;
                            if (data.theme === 'dark' || (data.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                                html.classList.add('dark');
                            } else {
                                html.classList.remove('dark');
                            }
                        }
                    } else {
                        const localNotif = localStorage.getItem('jurnal_notifications') !== 'false';
                        setNotifEnabled(localNotif);
                    }
                } catch (err) {
                    console.error("Gagal load preferences", err);
                }
            };
            fetchPrefs();
        } else {
            const localNotif = localStorage.getItem('jurnal_notifications') !== 'false';
            setNotifEnabled(localNotif);
        }
    }, [currentUser]);

    // Chart fetch logic moved to useProfileStats

    // Handle back button for Edit Modal (Pengaturan)
    useEffect(() => {
        let isPopped = false;
        
        const handlePopState = () => {
            isPopped = true;
            setShowEditModal(false);
        };

        if (showEditModal) {
            window.history.pushState({ modal: 'settings' }, '');
            window.addEventListener('popstate', handlePopState);
        }

        return () => {
            if (showEditModal) {
                window.removeEventListener('popstate', handlePopState);
                if (!isPopped) {
                    window.history.back();
                }
            }
        };
    }, [showEditModal]);

    // Handle back button for Logout Modal
    useEffect(() => {
        let isPopped = false;
        
        const handlePopState = () => {
            isPopped = true;
            setShowLogoutModal(false);
        };

        if (showLogoutModal) {
            window.history.pushState({ modal: 'logout' }, '');
            window.addEventListener('popstate', handlePopState);
        }

        return () => {
            if (showLogoutModal) {
                window.removeEventListener('popstate', handlePopState);
                if (!isPopped) {
                    window.history.back();
                }
            }
        };
    }, [showLogoutModal]);

    // Handle back button for Change Password Modal
    useEffect(() => {
        let isPopped = false;
        
        const handlePopState = () => {
            isPopped = true;
            setShowChangePwd(false);
        };

        if (showChangePwd) {
            window.history.pushState({ modal: 'changePwd' }, '');
            window.addEventListener('popstate', handlePopState);
        }

        return () => {
            if (showChangePwd) {
                window.removeEventListener('popstate', handlePopState);
                if (!isPopped) {
                    window.history.back();
                }
            }
        };
    }, [showChangePwd]);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            showAppToast('Berhasil keluar', 'success');
            navigate('/login');
        } catch (e) { showAppToast('Gagal logout', 'error'); }
    };

    const handleSaveName = async () => {
        if (!newName.trim() || newName.trim() === currentUser?.displayName) {
            setShowEditModal(false);
            return;
        }
        setSaving(true);
        try {
            await updateProfile(currentUser, { displayName: newName.trim() });
            showAppToast('Profil berhasil diperbarui', 'success');
            setShowEditModal(false);
        } catch (e) { showAppToast('Gagal memperbarui profil', 'error'); }
        finally { setSaving(false); }
    };

    const handleEnablePassword = async () => {
        if (!linkPassword || linkPassword.length < 6) {
            showAppToast("Password minimal 6 karakter", "error");
            return;
        }
        setSecurityLoading(true);
        try {
            const credential = EmailAuthProvider.credential(currentUser.email, linkPassword);
            await linkWithCredential(currentUser, credential);
            showAppToast("Password login aktif", "success");
            setLinkPassword('');
        } catch (err) {
            showAppToast("Gagal mengaktifkan password", "error");
        } finally {
            setSecurityLoading(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!changePassword || changePassword.length < 6) {
            showAppToast("Minimal 6 karakter", "error");
            return;
        }
        setSecurityLoading(true);
        try {
            await updatePassword(currentUser, changePassword);
            showAppToast("Password diperbarui", "success");
            setShowChangePwd(false);
            setChangePassword('');
        } catch (err) {
            if (err.code === 'auth/requires-recent-login') {
                showAppToast("Perlu login ulang", "error");
            } else {
                showAppToast("Gagal update password", "error");
            }
        } finally {
            setSecurityLoading(false);
        }
    };

    const handleLinkGoogle = async () => {
        setSecurityLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            await linkWithPopup(currentUser, provider);
            showAppToast("Google terhubung", "success");
        } catch (err) {
            showAppToast("Gagal hubungkan Google", "error");
        } finally {
            setSecurityLoading(false);
        }
    };

    const handleToggleNotif = async () => {
        const val = !notifEnabled;
        if (val && Notification.permission !== 'granted') {
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') { showAppToast('Izin notifikasi ditolak', 'error'); return; }
        }
        localStorage.setItem('jurnal_notifications', val);
        setNotifEnabled(val);

        // Sync with firebase DULUAN sebelum service worker
        if (currentUser) {
            try {
                const docRef = doc(db, "users", currentUser.uid, "settings", "preferences");
                await setDoc(docRef, { notifications: val }, { merge: true });
            } catch (err) {
                console.error("Gagal sinkron notifikasi ke cloud:", err);
            }
        }

        // Jalankan push subscription di background (tanpa await) agar tidak memblokir UI/Firebase
        if (pushSupported) {
            syncPushSubscription(currentUser, val).catch(err => console.error("Gagal push:", err));
        }

        showAppToast(val ? 'Notifikasi diaktifkan' : 'Notifikasi dinonaktifkan', val ? 'success' : 'info');
    };

    const changeTheme = async (val) => {
        if (navigator.vibrate) navigator.vibrate(10);
        
        const updateDOM = () => {
            setThemeVal(val);
            localStorage.setItem('jurnal_theme', val);
            
            const html = document.documentElement;
            if (val === 'dark' || (val === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                html.classList.add('dark');
            } else {
                html.classList.remove('dark');
            }
            setThemeOpen(false);
        };

        const targetDark = val === 'dark' || (val === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        runThemeCircle(targetDark, updateDOM, { x: window.innerWidth / 2, y: window.innerHeight / 2 });

        // Sync with firebase
        if (currentUser) {
            try {
                const docRef = doc(db, "users", currentUser.uid, "settings", "preferences");
                await setDoc(docRef, { theme: val }, { merge: true });
            } catch (err) {
                console.error("Gagal sinkron tema ke cloud:", err);
            }
        }
        
        const themeNames = { 'dark': 'Gelap', 'light': 'Terang', 'system': 'Sistem' };
        showAppToast(`Tema diubah ke mode ${themeNames[val]}`, 'success');
    };

    const photoUrl = currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || 'U')}&background=10b981&color=fff&size=200`;
    
    const joinDateStr = currentUser?.metadata?.creationTime ? 
        new Date(currentUser.metadata.creationTime).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : 
        'Baru Bergabung';

    const accountAgeDays = currentUser?.metadata?.creationTime 
        ? Math.max(1, Math.ceil(Math.abs(new Date() - new Date(currentUser.metadata.creationTime)) / (1000 * 60 * 60 * 24)))
        : 1;

    const badges = getAllBadges();
    const earnedBadges = badges.filter(b => streakData.current >= b.days);
    const lastBadge = earnedBadges.length > 0 ? earnedBadges[earnedBadges.length - 1] : null;
    const streakEmoji = lastBadge ? lastBadge.emoji : (streakData.current > 0 ? '🔥' : '💤');

    return (
        <div className="app-view active flex flex-col h-full overflow-y-auto bg-slate-100 dark:bg-slate-950 no-scrollbar relative">
            
            <div className="fixed top-0 left-0 right-0 h-64 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none z-0"></div>

            {/* Header */}
            <div className="sticky top-0 z-[100] px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-3 md:px-8 md:pt-6">
                <div className="glass-pill flex items-center justify-between p-2 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-sm w-full max-w-7xl mx-auto">
                    <button onClick={() => { if (navigator.vibrate) navigator.vibrate(10); navigate(-1); }}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90 group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
                    </button>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">Profil Saya</h2>
                    <button onClick={() => { if (navigator.vibrate) navigator.vibrate(10); setShowEditModal(true); }}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90">
                        <Settings2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="relative z-10 px-5 pt-5 pb-10 w-full max-w-7xl mx-auto md:px-8">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
                    
                    {/* Main Profile Card */}
                    <div className="md:col-span-7 lg:col-span-8 bento-card relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-white dark:bg-slate-900 border border-white dark:border-slate-800 shadow-xl">
                        
                        {/* Cover Image Area */}
                        <div className="relative h-24 md:h-32 bg-gradient-to-br from-emerald-500/30 via-emerald-500/10 to-transparent">
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl"></div>
                            <div className="absolute -left-10 bottom-0 w-32 h-32 bg-teal-500/20 rounded-full blur-3xl"></div>
                            <div className="absolute right-6 top-6 px-3 py-1 rounded-full bg-white/80 dark:bg-slate-900/70 text-[8px] font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">
                                Profil
                            </div>
                        </div>

                        {/* Profile Info */}
                        <div className="relative px-4 md:px-8 pb-5 md:pb-6 -mt-10 md:-mt-12">
                            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-5">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-[2rem] blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
                                    <img src={photoUrl} referrerPolicy="no-referrer" className="relative w-20 h-20 sm:w-22 sm:h-22 md:w-28 md:h-28 rounded-[1.6rem] border-[3px] border-white dark:border-slate-900 shadow-xl object-cover bg-slate-100" alt="Avatar" />
                                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full border-[2px] border-white dark:border-slate-900 shadow-sm">
                                        <ShieldCheck className="w-3 h-3 md:w-4 md:h-4" />
                                    </div>
                                </div>
                                
                                <div className="flex-1 text-center md:text-left">
                                    <h2 className="text-lg md:text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">
                                        {currentUser?.displayName || 'Pengguna'}
                                    </h2>
                                    <p className="text-[9px] md:text-xs font-medium text-slate-400 mt-0.5 md:mt-1">
                                        {currentUser?.email}
                                    </p>
                                    <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-2">
                                        <div className="px-2 py-1 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                                            <Calendar className="w-3 h-3 text-slate-400" />
                                            <span className="text-[9px] font-black text-slate-600 dark:text-slate-300">{joinDateStr}</span>
                                        </div>
                                        <div className="px-2 py-1 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                                            <MapPin className="w-3 h-3 text-slate-400" />
                                            <span className="text-[9px] font-black text-slate-600 dark:text-slate-300">Indonesia</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div className="bento-card bg-gradient-to-br from-blue-500/10 via-white to-white dark:from-blue-900/20 dark:via-slate-900 dark:to-slate-900 py-2 px-3 rounded-2xl border border-white/80 dark:border-slate-800 shadow-sm flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                        <Hourglass className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <span className="block text-lg font-black text-slate-800 dark:text-white leading-none tabular-nums">{accountAgeDays}</span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Hari</span>
                                    </div>
                                </div>

                                <div className="bento-card bg-gradient-to-br from-orange-500/10 via-white to-white dark:from-orange-900/20 dark:via-slate-900 dark:to-slate-900 py-2 px-3 rounded-2xl border border-white/80 dark:border-slate-800 shadow-sm flex items-center gap-2.5">
                                    <span className="text-xl leading-none shrink-0">{streakEmoji}</span>
                                    <div>
                                        <span className="block text-lg font-black text-slate-800 dark:text-white leading-none tabular-nums">{streakData.current}</span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Streak</span>
                                    </div>
                                </div>

                                <div className="bento-card bg-gradient-to-br from-emerald-500/10 via-white to-white dark:from-emerald-900/20 dark:via-slate-900 dark:to-slate-900 py-2 px-3 rounded-2xl border border-white/80 dark:border-slate-800 shadow-sm flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <Activity className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <span className={`block text-lg font-black leading-none tabular-nums ${consistencyPercent >= 80 ? 'text-emerald-500' : consistencyPercent >= 50 ? 'text-amber-500' : 'text-slate-800 dark:text-white'}`}>{consistencyPercent}%</span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Konsisten</span>
                                    </div>
                                </div>

                                <div className="bento-card bg-gradient-to-br from-amber-500/10 via-white to-white dark:from-amber-900/20 dark:via-slate-900 dark:to-slate-900 py-2 px-3 rounded-2xl border border-white/80 dark:border-slate-800 shadow-sm flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <span className="block text-lg font-black text-slate-800 dark:text-white leading-none tabular-nums">{todayIbadahCount}/5</span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Ibadah</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Menu Grid */}
                    <div className="md:col-span-5 lg:col-span-4 hidden md:grid grid-cols-2 gap-3 md:order-2 order-last">
                        <button onClick={() => navigate('/faq')} className="bento-card bg-white dark:bg-slate-900 p-4 md:p-6 rounded-[1.4rem] border border-white dark:border-slate-800 shadow-sm flex flex-col items-start justify-between transition hover:border-emerald-500/20">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center shadow-sm">
                                <HelpCircle className="w-5 h-5" />
                            </div>
                            <div className="mt-4 text-left">
                                <p className="font-bold text-slate-800 dark:text-white text-xs md:text-sm">Pusat Bantuan</p>
                                <p className="text-[9px] md:text-[10px] text-slate-400">FAQ & Panduan</p>
                            </div>
                        </button>

                        <button onClick={() => navigate('/changelog')} className="bento-card bg-white dark:bg-slate-900 p-4 md:p-6 rounded-[1.4rem] border border-white dark:border-slate-800 shadow-sm flex flex-col items-start justify-between transition hover:border-emerald-500/20">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-500 flex items-center justify-center shadow-sm">
                                <History className="w-5 h-5" />
                            </div>
                            <div className="mt-4 text-left">
                                <p className="font-bold text-slate-800 dark:text-white text-xs md:text-sm">Riwayat Update</p>
                                <p className="text-[9px] md:text-[10px] text-slate-400">Versi Aplikasi</p>
                            </div>
                        </button>

                        <button onClick={() => navigate('/credits')} className="bento-card bg-white dark:bg-slate-900 p-4 md:p-6 rounded-[1.4rem] border border-white dark:border-slate-800 shadow-sm flex flex-col items-start justify-between transition hover:border-emerald-500/20">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center shadow-sm">
                                <Info className="w-5 h-5" />
                            </div>
                            <div className="mt-4 text-left">
                                <p className="font-bold text-slate-800 dark:text-white text-xs md:text-sm">Tentang Aplikasi</p>
                                <p className="text-[9px] md:text-[10px] text-slate-400">Credits & Developer</p>
                            </div>
                        </button>

                        <button onClick={() => setShowLogoutModal(true)} className="bento-card group bg-red-50 dark:bg-red-500/5 p-4 md:p-6 rounded-[1.4rem] border border-red-100 dark:border-red-900/30 shadow-sm flex flex-col items-start justify-between transition hover:bg-red-500 hover:border-red-500 hover:text-white dark:hover:bg-red-500/15 dark:hover:border-red-500/40 dark:hover:text-red-300">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shadow-sm group-hover:bg-white group-hover:text-red-600 dark:group-hover:bg-red-500/40 dark:group-hover:text-red-100">
                                <LogOut className="w-5 h-5" />
                            </div>
                            <div className="mt-4 text-left">
                                <p className="font-bold text-slate-800 dark:text-red-400 text-xs md:text-sm group-hover:text-white dark:group-hover:text-white">Keluar Aplikasi</p>
                                <p className="text-[9px] md:text-[10px] text-slate-400 group-hover:text-white/80 dark:group-hover:text-white/80">Selesai Beribadah</p>
                            </div>
                        </button>
                    </div>
                </div>

                <ProfileChart 
                    chartDays={chartDays} 
                    setChartDays={setChartDays} 
                    chartLoading={chartLoading} 
                    chartData={chartData} 
                />

                {/* Mobile Menu Grid */}
                <div className="mt-4 md:mt-6 grid grid-cols-2 gap-3 md:hidden md:order-last order-3">
                    <button onClick={() => navigate('/faq')} className="bento-card bg-white dark:bg-slate-900 p-4 rounded-[1.4rem] border border-white dark:border-slate-800 shadow-sm flex flex-col items-start justify-between transition hover:border-emerald-500/20">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center shadow-sm">
                            <HelpCircle className="w-5 h-5" />
                        </div>
                        <div className="mt-4 text-left">
                            <p className="font-bold text-slate-800 dark:text-white text-xs">Pusat Bantuan</p>
                            <p className="text-[9px] text-slate-400">FAQ & Panduan</p>
                        </div>
                    </button>

                    <button onClick={() => navigate('/changelog')} className="bento-card bg-white dark:bg-slate-900 p-4 rounded-[1.4rem] border border-white dark:border-slate-800 shadow-sm flex flex-col items-start justify-between transition hover:border-emerald-500/20">
                        <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-500 flex items-center justify-center shadow-sm">
                            <History className="w-5 h-5" />
                        </div>
                        <div className="mt-4 text-left">
                            <p className="font-bold text-slate-800 dark:text-white text-xs">Riwayat Update</p>
                            <p className="text-[9px] text-slate-400">Versi Aplikasi</p>
                        </div>
                    </button>

                    <button onClick={() => navigate('/credits')} className="bento-card bg-white dark:bg-slate-900 p-4 rounded-[1.4rem] border border-white dark:border-slate-800 shadow-sm flex flex-col items-start justify-between transition hover:border-emerald-500/20">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center shadow-sm">
                            <Info className="w-5 h-5" />
                        </div>
                        <div className="mt-4 text-left">
                            <p className="font-bold text-slate-800 dark:text-white text-xs">Tentang Aplikasi</p>
                            <p className="text-[9px] text-slate-400">Credits & Developer</p>
                        </div>
                    </button>

                    <button onClick={() => setShowLogoutModal(true)} className="bento-card group bg-red-50 dark:bg-red-500/5 p-4 rounded-[1.4rem] border border-red-100 dark:border-red-900/30 shadow-sm flex flex-col items-start justify-between transition hover:bg-red-500 hover:border-red-500 hover:text-white dark:hover:bg-red-500/15 dark:hover:border-red-500/40 dark:hover:text-red-300">
                        <div className="w-10 h-10 rounded-2xl bg-white dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shadow-sm group-hover:bg-white group-hover:text-red-600 dark:group-hover:bg-red-500/40 dark:group-hover:text-red-100">
                            <LogOut className="w-5 h-5" />
                        </div>
                        <div className="mt-4 text-left">
                            <p className="font-bold text-slate-800 dark:text-red-400 text-xs group-hover:text-white dark:group-hover:text-white">Keluar Aplikasi</p>
                            <p className="text-[9px] text-slate-400 group-hover:text-white/80 dark:group-hover:text-white/80">Selesai Beribadah</p>
                        </div>
                    </button>
                </div>

                <div className="mt-8 text-center opacity-30 md:order-last order-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">
                        Jurnal Ibadah App &bull; <span>v{APP_VERSION}</span>
                    </p>
                </div>
            </div>

            {/* Edit Profile Modal */}
            <div className={`fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6 pointer-events-none`}>
                <div 
                    className={`absolute inset-0 bg-slate-950/60 backdrop-blur-md ${showEditModal ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}
                    onClick={() => setShowEditModal(false)}
                    style={{ transition: 'opacity 0.4s ease-in-out' }}
                ></div>
                <div 
                    className={`relative w-full sm:w-[92%] sm:max-w-lg max-h-[88vh] overflow-y-auto no-scrollbar bg-white dark:bg-slate-950 p-8 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl border-t sm:border border-white/20 dark:border-slate-800 transform ${showEditModal ? 'translate-y-0 sm:scale-100 opacity-100 pointer-events-auto' : 'translate-y-full sm:translate-y-4 sm:scale-95 opacity-0'}`}
                    style={{ transition: 'all 0.5s cubic-bezier(0.32,0.72,0,1)' }}
                >
                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-8"></div>

                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Pengaturan</h3>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">Sesuaikan preferensi akun kamu</p>
                        </div>
                        <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 transition">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1 mb-2">Nama Tampilan</label>
                            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 transition shadow-inner" />
                        </div>

                        <div className="space-y-3">
                            {/* Theme Dropdown */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl group hover:border-emerald-500/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 shadow-sm">
                                        <Palette className="w-4 h-4" />
                                    </div>
                                    <div className="hidden sm:block">
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Mode Tampilan</span>
                                        <p className="text-[10px] text-slate-400">Dark, Light, Sistem</p>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 sm:hidden">Mode</span>
                                </div>
                                
                                <div className="relative w-[140px] sm:w-[180px]">
                                    <button onClick={() => setThemeOpen(!themeOpen)} type="button" className="w-full h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-[10px] font-black text-slate-700 dark:text-slate-200 flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm transition-all">
                                        <span className="truncate">{themeVal === 'dark' ? 'Dark Mode' : themeVal === 'light' ? 'Light Mode' : 'Ikuti Sistem'}</span>
                                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${themeOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {themeOpen && (
                                        <div className="absolute right-0 mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 shadow-2xl z-50">
                                            {['dark', 'light', 'system'].map(opt => (
                                                <button key={opt} onClick={() => changeTheme(opt)} className="w-full px-3 py-2 rounded-lg text-[10px] font-bold text-left flex items-center justify-between transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                    {opt === 'dark' ? 'Dark Mode' : opt === 'light' ? 'Light Mode' : 'Ikuti Sistem'}
                                                    <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 transition-opacity ${themeVal === opt ? 'opacity-100' : 'opacity-0'}`}></span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Notifications Toggle */}
                            <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer group hover:border-emerald-500/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 shadow-sm">
                                        <Bell className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Notifikasi Sholat</span>
                                </div>
                                <div className="relative inline-flex items-center">
                                    <input type="checkbox" checked={notifEnabled} onChange={handleToggleNotif} className="sr-only peer" />
                                    <div className="relative w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                </div>
                            </label>
                        </div>

                        {/* Security */}
                        <div className="pt-5 border-t border-slate-100 dark:border-slate-800">
                            <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block ml-1 mb-3">Keamanan & Akses</label>
                            
                            {/* Google Linking */}
                            <div className="mb-4">
                                {!hasGoogle ? (
                                    <button onClick={handleLinkGoogle} disabled={securityLoading} className="w-full py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition active:scale-95 disabled:opacity-50">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z" />
                                        </svg>
                                        Sambungkan Google
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
                                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-blue-500 shadow-sm">
                                            <ShieldCheck className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest">Google Terhubung</span>
                                            <p className="text-[8px] text-slate-500">Akses Google aktif.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Password Setup/Change */}
                            {!hasPassword ? (
                                <div>
                                    <p className="text-[9px] text-slate-400 mb-3 ml-1">Buat password untuk aktifkan login via Email.</p>
                                    <input type="password" value={linkPassword} onChange={e => setLinkPassword(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 transition mb-2" placeholder="Password Baru" />
                                    <button onClick={handleEnablePassword} disabled={securityLoading} className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[9px] uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition active:scale-95 disabled:opacity-50">
                                        Aktifkan Password
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {!showChangePwd ? (
                                        <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-emerald-500 shadow-sm">
                                                    <ShieldCheck className="w-4 h-4" />
                                                </div>
                                                <div><span className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Password Aktif</span></div>
                                            </div>
                                            <button onClick={() => setShowChangePwd(true)} className="text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition">
                                                Ganti
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 mt-3">
                                            <input type="password" value={changePassword} onChange={e => setChangePassword(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-emerald-500 transition shadow-inner" placeholder="Password Baru" />
                                            <div className="flex gap-2">
                                                <button onClick={() => { setShowChangePwd(false); setChangePassword(''); }} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-[9px] uppercase tracking-widest disabled:opacity-50">
                                                    Batal
                                                </button>
                                                <button onClick={handleUpdatePassword} disabled={securityLoading} className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-black text-[9px] uppercase tracking-widest shadow-lg disabled:opacity-50">
                                                    Update
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <button onClick={handleSaveName} disabled={saving} className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black text-xs shadow-xl shadow-emerald-500/20 transition-all active:scale-95">
                            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </div>
                </div>
            </div>

            <LogoutModal 
                showLogoutModal={showLogoutModal} 
                setShowLogoutModal={setShowLogoutModal} 
                handleSignOut={handleSignOut} 
            />

        </div>
    );
}
