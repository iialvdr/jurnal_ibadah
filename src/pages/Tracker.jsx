// src/pages/Tracker.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store/AppContext';
import { db } from '@/config/firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { 
    ArrowLeft, ChevronLeft, ChevronRight, TrendingUp, RotateCcw, 
    Sunrise, Sun, SunMedium, CloudSun, Sunset, Moon, Star, Lock, Check,
    BookOpen, Heart, Sparkles, Zap, PenTool, CloudCheck, CalendarCheck, ChevronDown, CheckCircle2, Clock3
} from 'lucide-react';
import { updateStreak } from '@/modules/streak';
import { getHijriDate, fetchHijriDateAPI, formatDateKey } from '@/utils/dateUtils';
import { getFastingInfo } from '@/modules/fasting';
import { motion } from 'framer-motion';

const PRAYER_CONFIG = [
    { id: 'Subuh', type: 'wajib', icon: Sunrise, bgGradient: 'from-sky-400 to-blue-500', activeBg: 'bg-sky-50 dark:bg-sky-900/20', activeBorder: 'border-sky-200 dark:border-sky-800', textActive: 'text-sky-700 dark:text-sky-300' },
    { id: 'Dhuha', type: 'sunnah', icon: Sun, bgGradient: 'from-amber-300 to-orange-400', activeBg: 'bg-amber-50 dark:bg-amber-900/20', activeBorder: 'border-amber-200 dark:border-amber-800', textActive: 'text-amber-700 dark:text-amber-300' },
    { id: 'Dzuhur', type: 'wajib', icon: SunMedium, bgGradient: 'from-yellow-400 to-amber-500', activeBg: 'bg-yellow-50 dark:bg-yellow-900/20', activeBorder: 'border-yellow-200 dark:border-yellow-800', textActive: 'text-yellow-700 dark:text-yellow-300' },
    { id: 'Ashar', type: 'wajib', icon: CloudSun, bgGradient: 'from-orange-400 to-red-400', activeBg: 'bg-orange-50 dark:bg-orange-900/20', activeBorder: 'border-orange-200 dark:border-orange-800', textActive: 'text-orange-700 dark:text-orange-300' },
    { id: 'Maghrib', type: 'wajib', icon: Sunset, bgGradient: 'from-indigo-400 to-purple-500', activeBg: 'bg-indigo-50 dark:bg-indigo-900/20', activeBorder: 'border-indigo-200 dark:border-indigo-800', textActive: 'text-indigo-700 dark:text-indigo-300' },
    { id: 'Isya', type: 'wajib', icon: Moon, bgGradient: 'from-slate-600 to-slate-800', activeBg: 'bg-slate-100 dark:bg-slate-800', activeBorder: 'border-slate-200 dark:border-slate-700', textActive: 'text-slate-700 dark:text-slate-300' },
    { id: 'Tahajud', type: 'sunnah', icon: Star, bgGradient: 'from-violet-500 to-fuchsia-600', activeBg: 'bg-violet-50 dark:bg-violet-900/20', activeBorder: 'border-violet-200 dark:border-violet-800', textActive: 'text-violet-700 dark:text-violet-300' }
];

const EXTRA_IBADAH = [
    { id: 'Tilawah', label: 'Baca Al-Qur\'an', icon: BookOpen, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-500' },
    { id: 'Sedekah', label: 'Sedekah Harian', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-500' },
    { id: 'Sholawat', label: 'Sholawat Nabi', icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-500' },
    { id: 'Dzikir', label: 'Dzikir Pagi/Petang', icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-500' }
];

function formatDateDisplay(date) {
    return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function getMonthYearString(date) {
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export default function Tracker() {
    const navigate = useNavigate();
    const { currentUser, setTodayRecords, showAppToast, prayerTimes: appPrayerTimes } = useApp();
    
    const [activeTab, setActiveTab] = useState('daily');
    const [viewDate, setViewDate] = useState(new Date());
    const [hijriDisplay, setHijriDisplay] = useState('...');
    
    const [records, setRecords] = useState({});
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [savingNote, setSavingNote] = useState(false);
    
    // History
    const [viewMonth, setViewMonth] = useState(new Date());
    const [historyData, setHistoryData] = useState({});
    
    // Settings
    const [tahajudTime, setTahajudTime] = useState(localStorage.getItem('jurnal_prayer_settings_v1') ? JSON.parse(localStorage.getItem('jurnal_prayer_settings_v1')).tahajudTime : '03:00');
    const [showSettings, setShowSettings] = useState(false);
    const [tempTahajud, setTempTahajud] = useState(tahajudTime);
    const [settingsError, setSettingsError] = useState('');

    const unsubRef = useRef(null);
    const isToday = formatDateKey(viewDate) === formatDateKey(new Date());

    const loadRecords = useCallback((date) => {
        if (!currentUser) return;
        const key = formatDateKey(date);
        // Use local hijri for fasting logic, async API for display
        const hijri = getHijriDate(date);
        setHijriDisplay(`${hijri.day} ${hijri.monthName} ${hijri.year} H`);
        // Upgrade display with API data if available
        fetchHijriDateAPI(date).then(h => setHijriDisplay(h.full)).catch(() => {});

        if (unsubRef.current) unsubRef.current();
        setLoading(true);
        unsubRef.current = onSnapshot(doc(db, "users", currentUser.uid, "daily_records", key), (snap) => {
            const data = snap.exists() ? snap.data() : {};
            setRecords(data);
            setNote(data.notes || data.note || '');
            if (isToday) setTodayRecords(data);
            setLoading(false);
        });
    }, [currentUser, isToday, setTodayRecords]);

    useEffect(() => {
        if (activeTab === 'daily') loadRecords(viewDate);
        return () => { if (unsubRef.current) unsubRef.current(); };
    }, [viewDate, currentUser, activeTab]);

    const loadHistory = useCallback(async (date) => {
        if (!currentUser) return;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const prefix = `${year}-${month}`;
        const q = query(collection(db, "users", currentUser.uid, "daily_records"));
        const snap = await getDocs(q);
        const hist = {};
        snap.forEach(d => {
            if (d.id.startsWith(prefix)) hist[d.id] = d.data();
        });
        setHistoryData(hist);
    }, [currentUser]);

    useEffect(() => {
        if (activeTab === 'history') loadHistory(viewMonth);
    }, [viewMonth, currentUser, activeTab]);

    const navigate_date = (days) => {
        if (navigator.vibrate) navigator.vibrate(10);
        const nd = new Date(viewDate);
        nd.setDate(nd.getDate() + days);
        if (nd > new Date()) return;
        setViewDate(nd);
    };

    const navigate_month = (months) => {
        if (navigator.vibrate) navigator.vibrate(10);
        const nd = new Date(viewMonth);
        nd.setMonth(nd.getMonth() + months);
        setViewMonth(nd);
    };

    const toggleItem = async (id, isLocked = false) => {
        if (isLocked) {
            if (navigator.vibrate) navigator.vibrate(200);
            return;
        }
        if (navigator.vibrate) navigator.vibrate([10, 20, 10]);
        const newVal = !records[id];
        const newRecords = { ...records, [id]: newVal };
        setRecords(newRecords);
        if (isToday) setTodayRecords(newRecords);

        const key = formatDateKey(viewDate);
        try {
            await setDoc(doc(db, "users", currentUser.uid, "daily_records", key), { ...newRecords, last_updated: new Date() }, { merge: true });
            if (isToday) updateStreak(currentUser.uid, newRecords);
        } catch (e) {
            showAppToast('Gagal menyimpan', 'error');
        }
    };

    const saveManualNote = async () => {
        if (!currentUser) return;
        if (navigator.vibrate) navigator.vibrate(10);
        setSavingNote(true);
        const key = formatDateKey(viewDate);
        try {
            await setDoc(doc(db, "users", currentUser.uid, "daily_records", key), { notes: note, last_updated: new Date() }, { merge: true });
            showAppToast('Catatan tersimpan', 'success');
            setTimeout(() => setSavingNote(false), 2000);
        } catch (e) {
            showAppToast('Gagal menyimpan catatan', 'error');
            setSavingNote(false);
        }
    };

    const saveSettings = () => {
        const tMins = parseInt(tempTahajud.split(':')[0]) * 60 + parseInt(tempTahajud.split(':')[1]);
        const sTime = appPrayerTimes?.Subuh || '05:00';
        const sMins = parseInt(sTime.split(':')[0]) * 60 + parseInt(sTime.split(':')[1]);
        
        if (tMins >= sMins) {
            setSettingsError('Waktu Tahajud harus sebelum waktu Subuh.');
            return;
        }
        setSettingsError('');
        setTahajudTime(tempTahajud);
        localStorage.setItem('jurnal_prayer_settings_v1', JSON.stringify({ tahajudTime: tempTahajud }));
        showAppToast('Pengaturan tersimpan', 'success');
        setShowSettings(false);
    };

    const checkTimeLocked = (prayerId, timeStr) => {
        if (!timeStr || timeStr === '--:--') return true;
        const [h, m] = timeStr.split(':').map(Number);
        const pDate = new Date(viewDate);
        pDate.setHours(h, m, 0, 0);
        const now = new Date();
        const todayZero = new Date(); todayZero.setHours(0, 0, 0, 0);
        const currentZero = new Date(viewDate); currentZero.setHours(0, 0, 0, 0);
        
        if (currentZero.getTime() < todayZero.getTime()) return false;
        if (currentZero.getTime() > todayZero.getTime()) return true;
        if (now.getTime() < pDate.getTime()) return true;
        return false;
    };

    const totalWajib = 5;
    const completedWajib = PRAYER_CONFIG.filter(i => i.type === 'wajib' && records[i.id]).length;
    const progressPercent = Math.round((completedWajib / totalWajib) * 100);

    const renderCalendar = () => {
        const year = viewMonth.getFullYear();
        const month = viewMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const grid = [];
        let perfectDays = 0;

        for (let i = 0; i < firstDay; i++) {
            grid.push(<div key={`empty-${i}`} className="h-10 md:h-12"></div>);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const isFuture = new Date(year, month, d) > new Date();
            const rec = historyData[dateStr] || {};
            
            const wjbCount = ['Subuh','Dzuhur','Ashar','Maghrib','Isya'].filter(k => rec[k]).length;
            let bgColor = 'bg-slate-50 dark:bg-slate-800/50 text-slate-400';
            let borderClass = '';
            
            if (isFuture) {
                bgColor = 'bg-slate-50/30 dark:bg-slate-900/30 text-slate-300 opacity-50';
            } else if (wjbCount === 5) {
                bgColor = 'bg-emerald-500 text-white shadow-sm';
                perfectDays++;
            } else if (wjbCount > 0) {
                bgColor = 'bg-amber-400 text-white shadow-sm';
            }
            
            if (dateStr === formatDateKey(new Date())) {
                borderClass = 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-950';
            }

            // Fasting info logic
            const hDate = getHijriDate(new Date(year, month, d));
            const fastingInfo = getFastingInfo(new Date(year, month, d), hDate);
            let badge = null;
            if (fastingInfo && !isFuture) {
                let color = 'bg-sky-500';
                if (fastingInfo.category === 'haram') color = 'bg-rose-500';
                else if (fastingInfo.type === 'Puasa Ramadhan') color = 'bg-amber-500';
                else if (fastingInfo.type === 'Puasa Syawal') color = 'bg-purple-500';
                else if (fastingInfo.type === 'Puasa Dzulhijjah') color = 'bg-lime-500';
                else if (fastingInfo.type === 'Puasa Tarwiyah') color = 'bg-teal-500';
                else if (fastingInfo.type === 'Puasa Arafah') color = 'bg-emerald-500';
                else if (fastingInfo.type === "Puasa Tasu'a") color = 'bg-blue-500';
                else if (fastingInfo.type === 'Puasa Asyura') color = 'bg-cyan-500';
                else if (fastingInfo.type === "Puasa Nisfu Sya'ban") color = 'bg-indigo-500';
                else if (fastingInfo.type === 'Puasa Ayyamul Bidh') color = 'bg-violet-500';
                badge = <span title={fastingInfo.type} className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${color}`}></span>;
            }

            grid.push(
                <div key={d} onClick={() => { if(!isFuture){ setViewDate(new Date(year, month, d)); setActiveTab('daily'); } }}
                    className={`relative aspect-square flex items-center justify-center rounded-xl text-[10px] md:text-[11px] font-black cursor-pointer transition-all active:scale-90 ${bgColor} ${borderClass} ${isFuture ? 'cursor-not-allowed' : 'hover:opacity-80'}`} title={fastingInfo ? fastingInfo.type : ''}>
                    {d}
                    {badge}
                </div>
            );
        }
        return { grid, perfectDays };
    };

    const { grid: calendarGrid, perfectDays } = renderCalendar();

    return (
        <div className="app-view active flex flex-col h-full absolute inset-0 z-50 transition-all duration-300 overflow-y-auto bg-slate-100 dark:bg-slate-950 no-scrollbar">
            <div className="fixed top-0 left-0 right-0 h-64 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none z-0"></div>

            <div className="sticky top-0 z-50 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-3 md:px-8 md:pt-6">
                <motion.div className="glass-pill flex items-center justify-between p-2 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-sm w-full max-w-7xl mx-auto">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90 group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
                    </button>
                    <motion.h2 layoutId="navbar-title" className="text-sm font-bold text-slate-800 dark:text-white tracking-tight text-center flex-1 truncate px-2 animate-nav-title">Jurnal Harian</motion.h2>
                    <div className="w-10"></div> 
                </motion.div>
            </div>

            <div className="relative z-10 px-5 pt-4 pb-28 md:pb-10 md:px-8 w-full max-w-7xl mx-auto md:grid md:grid-cols-12 md:gap-6 md:items-start">
                
                {/* Left Column */}
                <div className="md:col-span-7 lg:col-span-8 flex flex-col gap-4">
                    
                    {/* Tabs */}
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-md z-[120] md:static md:translate-x-0 md:w-full md:max-w-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-1.5 rounded-full flex shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-white/50 dark:border-slate-700/50">
                        <div className="absolute inset-1.5 flex pointer-events-none">
                            <div className="w-1/2 h-full transition-transform duration-300 ease-in-out" 
                                 style={{ transform: activeTab === 'daily' ? 'translateX(0)' : 'translateX(100%)' }}>
                                <div className="w-full h-full bg-white dark:bg-slate-800 rounded-full shadow-md border border-slate-100 dark:border-slate-700"></div>
                            </div>
                        </div>
                        <button onClick={() => setActiveTab('daily')} className={`relative z-10 focus:outline-none flex-1 py-3 md:py-2 rounded-full text-xs font-black tracking-tight transition-colors duration-300 ${activeTab === 'daily' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}>Harian</button>
                        <button onClick={() => setActiveTab('history')} className={`relative z-10 focus:outline-none flex-1 py-3 md:py-2 rounded-full text-xs font-black tracking-tight transition-colors duration-300 ${activeTab === 'history' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}>Riwayat</button>
                    </div>

                    {/* Content Container */}
                    <div className="w-full mt-2 animate-fade-in-up stagger-1">
                        
                        {/* DAILY TAB */}
                        {activeTab === 'daily' && (
                            <div className="space-y-4">
                            
                            {/* Mobile Progress */}
                            <div className="md:hidden bento-card bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-black rounded-[2rem] p-6 text-slate-800 dark:text-white relative overflow-hidden shadow-sm dark:shadow-2xl dark:shadow-emerald-950/40 border border-slate-200 dark:border-white/5 transition-all duration-300 animate-fade-in-up stagger-1">
                                <div className="hidden dark:block absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-[50px] -mr-10 -mt-10"></div>
                                <div className="flex justify-between items-center mb-4 relative z-10">
                                    <div>
                                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400/80 uppercase tracking-[0.15em] block mb-1">Progres Hari Ini</span>
                                        <div className="flex items-baseline gap-1">
                                            <h3 className="text-3xl font-black tracking-tighter">{progressPercent}%</h3>
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-tight">Selesai</span>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/5 backdrop-blur-md flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm">
                                        <TrendingUp className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                                    </div>
                                </div>
                                <div className="relative z-10">
                                    <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200 dark:border-white/5 shadow-inner">
                                        <div className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]" style={{ width: `${progressPercent}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Date Navigator */}
                            <div className="bento-card bg-white dark:bg-slate-900 p-3 rounded-[1.5rem] flex items-center justify-between border border-white/50 dark:border-slate-800 shadow-sm animate-fade-in-up stagger-2">
                                <button onClick={() => navigate_date(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-emerald-500 active:scale-90 shrink-0">
                                    <ChevronLeft className="w-4.5 h-4.5" />
                                </button>
                                <div className="text-center flex-1 min-w-0 px-2 flex flex-col items-center justify-center">
                                    <span className="block text-xs md:text-sm font-black text-slate-800 dark:text-white tracking-tight">
                                        {isToday ? 'Hari Ini' : formatDateDisplay(viewDate)}
                                    </span>
                                    <span className="text-[8px] md:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-0.5 rounded-full mt-1 transition-all">
                                        {hijriDisplay}
                                    </span>
                                    {!isToday && (
                                        <button onClick={() => setViewDate(new Date())} className="mt-1 text-[8px] font-bold text-slate-400 hover:text-emerald-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full transition flex items-center gap-1 active:scale-95">
                                            <RotateCcw className="w-2.5 h-2.5" /> Kembali
                                        </button>
                                    )}
                                </div>
                                <button onClick={() => navigate_date(1)} disabled={isToday} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-emerald-500 active:scale-90 shrink-0 disabled:opacity-30">
                                    <ChevronRight className="w-4.5 h-4.5" />
                                </button>
                            </div>

                            {/* Prayer List */}
                            <div className="space-y-2.5 md:grid md:grid-cols-2 md:gap-3.5 md:space-y-0 animate-fade-in-up stagger-3">
                                {PRAYER_CONFIG.map(p => {
                                    const isDone = records[p.id] || false;
                                    let time = appPrayerTimes ? appPrayerTimes[p.id] : '--:--';
                                    if (p.id === 'Tahajud') time = tahajudTime;
                                    if (p.id === 'Dhuha') time = appPrayerTimes?.Dhuha || '--:--';
                                    
                                    const isLocked = checkTimeLocked(p.id, time);

                                    if (isLocked) {
                                        return (
                                            <div key={p.id} onClick={() => toggleItem(p.id, true)} className="group relative flex items-center justify-between p-3.5 md:p-4 rounded-[1.5rem] md:rounded-[1.8rem] border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 opacity-60 cursor-not-allowed">
                                                <div className="flex items-center gap-3.5 md:gap-4 grayscale">
                                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center bg-slate-200 dark:bg-slate-800 text-slate-400">
                                                        <p.icon className="w-5 h-5 md:w-6 md:h-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm md:text-base font-bold text-slate-400 dark:text-slate-600">{p.id}</h3>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <Lock className="w-2.5 h-2.5 text-slate-400" />
                                                            <span className="text-[9px] font-mono font-bold text-slate-400">{time}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    const wrapperClass = isDone ? `${p.activeBg} ${p.activeBorder} shadow-sm` : `bg-white dark:bg-slate-900 border-white dark:border-slate-800 shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer`;
                                    const iconWrapClass = isDone ? `bg-gradient-to-br ${p.bgGradient} text-white shadow-lg scale-105 shadow-emerald-500/20` : `bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:scale-110 hover:text-emerald-500`;
                                    const titleClass = isDone ? p.textActive : `text-slate-700 dark:text-slate-200`;
                                    const checkContainerClass = isDone ? "bg-emerald-500 shadow-lg shadow-emerald-500/40 scale-110" : "bg-transparent border-2 border-slate-100 dark:border-slate-700 hover:border-emerald-300";

                                    return (
                                        <div key={p.id} onClick={() => toggleItem(p.id)} className={`group relative flex items-center justify-between p-3.5 md:p-4 rounded-[1.5rem] md:rounded-[1.8rem] border transition-all duration-300 ${wrapperClass}`}>
                                            <div className="flex items-center gap-3.5 md:gap-4">
                                                <div className={`icon-wrapper w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 ${iconWrapClass}`}>
                                                    <p.icon className="w-5 h-5 md:w-6 md:h-6" />
                                                </div>
                                                <div>
                                                    <h3 className={`prayer-title text-sm md:text-base font-bold transition-colors duration-300 ${titleClass}`}>{p.id}</h3>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{time}</span>
                                                        {p.type === 'sunnah' && <span className="text-[8px] text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-md border border-amber-100 dark:border-amber-800/30 font-black uppercase">Sunnah</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`check-container relative z-10 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all duration-300 ${checkContainerClass}`}>
                                                {isDone && <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-white font-bold" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Prayer Settings Panel */}
                            <div className="bento-card bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-white dark:border-slate-800 shadow-sm mt-4 animate-fade-in-up stagger-4">
                                <button type="button" onClick={() => setShowSettings(!showSettings)} className="w-full flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center">
                                            <Clock3 className="w-4 h-4" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Pengaturan Sunnah</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tahajud</p>
                                        </div>
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                        <ChevronDown className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>
                                {showSettings && (
                                    <form onSubmit={e => { e.preventDefault(); saveSettings(); }} className="mt-4">
                                        <div className="grid grid-cols-1 gap-3">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Jam Tahajud</label>
                                                <input type="time" value={tempTahajud} onChange={e => setTempTahajud(e.target.value)}
                                                    className="w-full mt-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500" />
                                            </div>
                                        </div>
                                        {settingsError && <p className="mt-3 text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/40 px-3 py-2 rounded-xl">{settingsError}</p>}
                                        {!settingsError && <p className="mt-3 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 px-3 py-2 rounded-xl">Silakan atur jam Tahajud. Waktu harus sebelum Subuh.</p>}
                                        <div className="flex justify-end mt-4">
                                            <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-500/20">Simpan</button>
                                        </div>
                                    </form>
                                )}
                            </div>

                            {/* Extra Ibadah */}
                            <div className="pt-2 animate-fade-in-up stagger-5">
                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></span>
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Amalan Tambahan</h3>
                                    <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></span>
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center mb-2">Sunnah, opsional dan fleksibel</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {EXTRA_IBADAH.map(item => {
                                        const isDone = records[item.id] === true;
                                        return (
                                            <div key={item.id} onClick={() => toggleItem(item.id)}
                                                className={`bento-card p-3 rounded-2xl border flex items-center gap-3 cursor-pointer active:scale-95 transition-all ${isDone ? `${item.bg} border-${item.color.split('-')[1]}-500/30` : 'bg-white dark:bg-slate-900 border-white dark:border-slate-800'}`}>
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDone ? 'bg-white/50 dark:bg-white/10' : 'bg-slate-50 dark:bg-slate-800'}`}>
                                                    <item.icon className={`w-4 h-4 ${isDone ? item.color : 'text-slate-400'}`} />
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <p className={`text-[10px] font-bold truncate ${isDone ? 'text-slate-800 dark:text-white' : 'text-slate-500'}`}>{item.label}</p>
                                                </div>
                                                {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Catatan & Refleksi */}
                            <div className="bento-card bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-white dark:border-slate-800 shadow-sm mt-6 animate-fade-in-up stagger-6">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center">
                                            <PenTool className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Catatan & Refleksi</h3>
                                    </div>
                                    <button onClick={saveManualNote} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                                        Simpan
                                        {savingNote && <CloudCheck className="w-3 h-3" />}
                                    </button>
                                </div>
                                <textarea 
                                    value={note} onChange={e => setNote(e.target.value)}
                                    placeholder="Tuliskan refleksi spiritual atau hal baik yang dilakukan hari ini..." 
                                    className="w-full min-h-[120px] bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500 transition-colors no-scrollbar resize-none"
                                />
                            </div>
                            </div>
                        )}

                        {/* HISTORY TAB */}
                        {activeTab === 'history' && (
                            <div className="space-y-6 pt-2 animate-[fadeIn_0.3s_ease-out]">
                            {/* Month Navigator */}
                            <div className="bento-card bg-white dark:bg-slate-900 p-3 rounded-[1.5rem] flex items-center justify-between border border-white/50 dark:border-slate-800 shadow-sm md:max-w-md md:mx-auto animate-fade-in-up stagger-1">
                                <button onClick={() => navigate_month(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-emerald-500 active:scale-90 shrink-0">
                                    <ChevronLeft className="w-4.5 h-4.5" />
                                </button>
                                <div className="text-center flex-1">
                                    <span className="block text-sm font-black text-slate-800 dark:text-white tracking-tight">{getMonthYearString(viewMonth)}</span>
                                </div>
                                <button onClick={() => navigate_month(1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-emerald-500 active:scale-90 shrink-0">
                                    <ChevronRight className="w-4.5 h-4.5" />
                                </button>
                            </div>

                            {/* Calendar Grid */}
                            <div className="bento-card bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-white/50 dark:border-slate-800 shadow-sm md:max-w-md md:mx-auto animate-fade-in-up stagger-2">
                                <div className="grid grid-cols-7 mb-4">
                                    {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(day => (
                                        <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-2">
                                    {calendarGrid}
                                </div>
                                <p className="mt-4 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center mb-6">Ketuk tanggal untuk detail harian</p>
                                
                                {/* Color Legends */}
                                <div className="flex flex-wrap items-center justify-center gap-3 px-2">
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">5 Wajib</span></div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400"></div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">1-4 Wajib</span></div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700"></div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Kosong</span></div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Ramadhan</span></div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-violet-500"></div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Ayyamul Bidh</span></div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-500"></div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Senin/Kamis</span></div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500"></div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Syawal</span></div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Arafah</span></div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-cyan-500"></div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Asyura</span></div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Haram Puasa</span></div>
                                </div>
                            </div>

                            {/* History Summary */}
                            <div className="bento-card bg-emerald-500 p-5 rounded-[2rem] text-white shadow-lg shadow-emerald-500/20 md:max-w-md md:mx-auto animate-fade-in-up stagger-3">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                                        <CalendarCheck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-widest opacity-80">Ringkasan Bulan Ini</h4>
                                        <div className="flex items-baseline gap-1 mt-0.5">
                                            <span className="text-2xl font-black">{perfectDays}</span>
                                            <span className="text-[10px] font-bold opacity-80">Hari Sempurna</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Col on Desktop */}
                <div className="hidden md:flex md:col-span-5 lg:col-span-4 flex-col gap-5 sticky top-24 h-fit animate-fade-in-up stagger-2">
                    
                    {/* Desktop Progress Widget */}
                    <div className="bento-card bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-black rounded-[2.5rem] p-8 text-slate-800 dark:text-white relative overflow-hidden shadow-sm dark:shadow-2xl dark:shadow-emerald-950/50 flex flex-col justify-between border border-slate-200 dark:border-white/5 transition-all duration-300">
                        <div className="hidden dark:block absolute top-0 right-0 w-48 h-48 bg-emerald-500/15 rounded-full blur-[80px] -mr-10 -mt-10 animate-pulse"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-8">
                                 <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-sm">
                                    <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                     <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-none">Pencapaian</h3>
                                     <p className="text-[10px] text-emerald-600 dark:text-emerald-400/60 font-black tracking-[0.2em] uppercase mt-1">Target Harian</p>
                                </div>
                            </div>
                            <div className="text-center py-6">
                                <h3 className="text-7xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-slate-800 to-slate-500 dark:from-white dark:via-white dark:to-emerald-500/50">{progressPercent}%</h3>
                                <div className="flex items-center justify-center gap-2 mt-2">
                                    <span className="h-px w-4 bg-emerald-500/30"></span>
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-[0.3em] uppercase">Terselesaikan</span>
                                    <span className="h-px w-4 bg-emerald-500/30"></span>
                                </div>
                            </div>
                        </div>
                        <div className="relative z-10 mt-4">
                            <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-4 overflow-hidden p-1 border border-slate-200 dark:border-white/5 shadow-inner">
                                <div className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Quote Widget */}
                    <div className="bento-card relative overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-8 rounded-[2.5rem] text-center border border-white/40 dark:border-slate-800 shadow-sm transition-all duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
                        <div className="relative z-10">
                            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-100 dark:border-emerald-800/50">
                                <span className="text-xl">🕌</span>
                            </div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 italic leading-loose text-balance">"Amalan yang paling dicintai Allah adalah amalan yang dawam (konsisten) walaupun itu sedikit."</p>
                            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/50">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Hadits Riwayat Muslim</p>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
