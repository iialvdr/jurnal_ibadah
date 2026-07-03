// src/pages/Home.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store/AppContext';
import { db } from '@/config/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { getHijriDate, fetchHijriDateAPI } from '@/utils/dateUtils';
import { APP_VERSION } from '@/utils/version';
import { syncPushSubscription } from '@/modules/push';
import { calculateStreak, getStreakData, getEarnedBadges, getNextBadge } from '@/modules/streak';
import {
    MapPin, Moon, Sun, Timer, ListChecks, BookOpen,
    Compass, Grip, Calculator, UtensilsCrossed, BookHeart, Grid,
    HelpCircle, ChevronRight, Sparkles, RefreshCw, Library, Newspaper
} from 'lucide-react';
import TopNavConfig from '@/components/TopNavConfig';
import { useTheme } from '@/hooks/useTheme';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { HadithWidget } from '@/components/widgets/HadithWidget';
import { FastingWidget } from '@/components/widgets/FastingWidget';
import { LastReadCard } from '@/components/widgets/LastReadCard';
import { TodayPrayerGrid } from '@/components/widgets/TodayPrayerGrid';
import { motion } from 'framer-motion';

export default function Home() {
    const navigate = useNavigate();
    const { currentUser, prayerTimes, todayRecords, setTodayRecords, currentDate, showAppToast, lastCity } = useApp();
    const currentUserForPushRef = useRef(currentUser);
    const { themeMode, toggleDarkMode, syncThemeWithCloud } = useTheme();
    const { nextPrayer, countdown, refreshLocation } = usePrayerTimes(currentDate, currentUserForPushRef);
    const [hijriDate, setHijriDate] = useState('');
    const [streakData, setStreakData] = useState({ current: 0, longest: 0 });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const unsubscribeRef = useRef(null);

    const vib = () => { if (navigator.vibrate) navigator.vibrate(10); };

    // Hack for accessing currentUser inside useCallback without breaking deps
    useEffect(() => {
        currentUserForPushRef.current = currentUser;
    }, [currentUser]);

    // Sync theme from cloud on mount
    useEffect(() => {
        if (currentUser) syncThemeWithCloud(currentUser);
    }, [currentUser]);

    // Update hijri date when prayer times change
    useEffect(() => {
        fetchHijriDateAPI(currentDate).then(h => setHijriDate(h.full)).catch(() => setHijriDate(getHijriDate(currentDate).full));
    }, [currentDate, prayerTimes]);

    // Load today's records
    useEffect(() => {
        if (!currentUser) return;
        const offset = currentDate.getTimezoneOffset();
        const localDate = new Date(currentDate.getTime() - offset * 60000);
        const dateKey = localDate.toISOString().split('T')[0];

        if (unsubscribeRef.current) unsubscribeRef.current();
        unsubscribeRef.current = onSnapshot(doc(db, "users", currentUser.uid, "daily_records", dateKey), (snap) => {
            setTodayRecords(snap.exists() ? snap.data() : {});
        });
        return () => { if (unsubscribeRef.current) unsubscribeRef.current(); };
    }, [currentUser, currentDate]);

    // Load streak
    useEffect(() => {
        if (!currentUser) return;
        const cached = getStreakData();
        setStreakData(cached);
        calculateStreak(currentUser.uid).then(data => setStreakData(data)).catch(() => {});
    }, [currentUser]);

    const handleRefreshLocation = () => {
        vib();
        setIsRefreshing(true);
        refreshLocation(true);
        setTimeout(() => setIsRefreshing(false), 2000);
    };

    const navBtn = (path, label, color, Icon, colSpan = '', height = '') =>
        <button onClick={() => { vib(); navigate(path); }}
            className={`${colSpan} bento-card hover-${color} bg-white dark:bg-slate-900 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 group ${height || 'h-[105px]'} border border-white dark:border-slate-800 shadow-sm`}>
            <Icon className={`w-6 h-6 text-${color}-500 transition-transform group-hover:scale-110`} />
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 tracking-wider">{label}</span>
        </button>;

    const navRowBtn = (path, label, iconBg, Icon, colSpan = 'col-span-2') =>
        <button onClick={() => { vib(); navigate(path); }}
            className={`${colSpan} bento-card bg-white dark:bg-slate-900 p-4 px-6 rounded-[2rem] flex items-center gap-4 group h-[85px] border border-white dark:border-slate-800 shadow-sm`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${iconBg}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left"><h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{label}</h4></div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
        </button>;

    const isDark = themeMode === 'dark' || (themeMode === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    const photoUrl = currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || 'User')}&background=10b981&color=fff`;

    const earnedBadges = getEarnedBadges(streakData.current);
    const lastBadge = earnedBadges[earnedBadges.length - 1];

    return (
        <div id="homeView" className="app-view active flex flex-col h-full overflow-y-auto bg-slate-100 dark:bg-slate-950 no-scrollbar transition-colors duration-300">
            <div className="fixed top-0 left-0 right-0 h-80 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none z-0"></div>

            {/* Navbar Config */}
            <TopNavConfig 
                leftNode={
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { vib(); navigate('/profile'); }}>
                        <div className="relative shrink-0">
                            <img src={photoUrl} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800 bg-slate-200 transition-transform group-hover:scale-105" alt="Photo" />
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                        </div>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-sm font-bold text-slate-800 dark:text-white leading-tight truncate max-w-[150px]">
                                {currentUser?.displayName || 'Assalamualaikum'}
                            </h1>
                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">{hijriDate || 'Memuat...'}</p>
                        </div>
                    </div>
                }
                rightNode={
                    <div className="flex items-center gap-1.5 pr-1">
                        {streakData.current > 0 && (
                            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border transition-all duration-300 ${streakData.current >= 30 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40' : streakData.current >= 14 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40' : streakData.current >= 7 ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/40' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40'}`}>
                                <span className="text-sm leading-none">{lastBadge?.emoji || '🔥'}</span>
                                <span className={`text-[11px] font-black tabular-nums ${streakData.current >= 30 ? 'text-blue-600 dark:text-blue-400' : streakData.current >= 14 ? 'text-emerald-600 dark:text-emerald-400' : streakData.current >= 7 ? 'text-yellow-600 dark:text-yellow-400' : 'text-orange-600 dark:text-orange-400'}`}>{streakData.current}</span>
                            </div>
                        )}
                        <button
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const origin = {
                                    x: rect.left + rect.width / 2,
                                    y: rect.top + rect.height / 2
                                };
                                toggleDarkMode(currentUser, origin);
                            }}
                            className="relative w-9 h-9 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-400 overflow-hidden transition active:scale-90"
                        >
                            <span className={`absolute transition-all duration-500 ${isDark ? 'rotate-0 scale-100 opacity-100 translate-y-0' : 'rotate-[135deg] scale-0 opacity-0 translate-y-2'}`}
                                style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                                <Sun className="w-5 h-5" />
                            </span>
                            <span className={`absolute transition-all duration-500 ${isDark ? '-rotate-[135deg] scale-0 opacity-0 -translate-y-2' : 'rotate-0 scale-100 opacity-100 translate-y-0'}`}
                                style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                                <Moon className="w-5 h-5" />
                            </span>
                        </button>
                    </div>
                }
            />
            <div className="h-[5.5rem] md:h-[7rem] shrink-0 w-full" />

            {/* Content */}
            <div className="px-5 pt-1 pb-24 space-y-5 relative z-10 md:px-8 max-w-7xl mx-auto w-full md:grid md:grid-cols-12 md:gap-6 md:space-y-0 md:items-start">
                {/* Left Column */}
                <div className="flex flex-col gap-4 w-full md:col-span-5 lg:col-span-4 md:sticky md:top-24">
                    {/* Location / Prayer Card */}
                    <div className="relative w-full animate-fade-in-up stagger-1" onClick={handleRefreshLocation}>
                        <div className="bento-card rounded-[2rem] p-6 text-white border border-slate-800 relative overflow-hidden shadow-xl active:scale-[0.98] transition-transform"
                             style={{ background: 'linear-gradient(135deg, #0f172a 0%, #022c22 100%)' }}>
                            <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/20 via-emerald-900/10 to-transparent opacity-60"></div>
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className="mb-3 flex items-center gap-2 bg-white/10 px-3 py-0.5 rounded-full backdrop-blur-md border border-white/5 cursor-pointer hover:bg-white/20 transition-colors">
                                    {isRefreshing
                                        ? <RefreshCw className="w-3 h-3 text-emerald-300 animate-spin" />
                                        : <MapPin className="w-3 h-3 text-emerald-300" />
                                    }
                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider truncate max-w-[120px]">
                                        {lastCity || 'Mencari...'}
                                    </span>
                                </div>
                                <h2 className="text-4xl font-black tracking-tighter text-white leading-tight py-1">{nextPrayer.name}</h2>
                                <p className="text-lg font-medium text-emerald-400 font-mono tracking-wide">{nextPrayer.time}</p>
                                <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2">
                                    <Timer className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-xs font-mono font-bold text-emerald-100">{countdown}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Today Prayer Grid */}
                    <div className="animate-fade-in-up stagger-2">
                        <TodayPrayerGrid prayerTimes={prayerTimes} todayRecords={todayRecords} />
                    </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-4 w-full md:col-span-7 lg:col-span-8">
                    <div className="space-y-3 animate-fade-in-up stagger-3">
                        <HadithWidget navigate={navigate} />
                        <FastingWidget prayerTimes={prayerTimes} navigate={navigate} />
                        {currentUser && <LastReadCard currentUser={currentUser} navigate={navigate} />}
                    </div>

                    {/* Feature Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 animate-fade-in-up stagger-4">
                        {navBtn('/hadith', 'Hadits', 'rose', Library)}
                        {navBtn('/qibla', 'Kiblat', 'teal', Compass)}
                        {navBtn('/tasbih', 'Tasbih', 'blue', Grip)}
                        {navBtn('/zakat', 'Zakat', 'emerald', Calculator)}

                        {navRowBtn('/fasting', 'Jadwal Puasa', 'text-amber-500 bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800/30', UtensilsCrossed)}
                        {navRowBtn('/doa', 'Kumpulan Doa', 'text-rose-500 bg-rose-50 dark:bg-rose-900/30 border-rose-100 dark:border-rose-800/30', BookHeart)}
                        {navRowBtn('/asmaul-husna', 'Asmaul Husna', 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800/30', Grid)}
                        {navRowBtn('/faq', 'Bantuan & FAQ', 'text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-100 dark:border-slate-700/50', HelpCircle)}
                    </div>

                    {/* Footer */}
                    <p className="text-center text-[9px] font-bold text-slate-300 dark:text-slate-700 pb-2 animate-fade-in-up stagger-5">
                        Jurnal Ibadah App {APP_VERSION}
                    </p>
                </div>
            </div>
        </div>
    );
}
