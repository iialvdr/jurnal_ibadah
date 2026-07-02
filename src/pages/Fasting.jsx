// src/pages/Fasting.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store/AppContext';
import { ArrowLeft, Search, X, UtensilsCrossed, ChevronRight, Layers, ShieldCheck, Repeat, CalendarHeart, Bookmark, SearchX } from 'lucide-react';
import { getFastingInfo, getUpcomingFasting, NIAT_DATA, NIAT_CATALOG, COLOR_MAP, CATEGORY_LABELS } from '@/modules/fasting';
import { getHijriDate, fetchHijriDateAPI } from '@/utils/dateUtils';
import { motion } from 'framer-motion';

function NiatModal({ niatKey, onClose }) {
    const [activeKey, setActiveKey] = useState(niatKey || 'senin'); 
    const [shouldRender, setShouldRender] = useState(!!niatKey);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (niatKey) {
            setActiveKey(niatKey);
            setShouldRender(true);
            // Double rAF: pastikan browser sudah melukis frame awal (posisi tersembunyi)
            // baru trigger class transisi agar animasi berjalan mulus
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setIsAnimating(true));
            });
        } else if (shouldRender) {
            // Parent set niatKey to null (e.g. from back button)
            setIsAnimating(false);
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 450);
            return () => clearTimeout(timer);
        }
    }, [niatKey]);

    // Tutup: jalankan animasi keluar dulu, BARU panggil onClose di parent
    const handleClose = () => {
        setIsAnimating(false);
        setTimeout(() => {
            setShouldRender(false);
            onClose();
        }, 450);
    };

    if (!shouldRender) return null;

    const niat = NIAT_DATA[activeKey] || NIAT_DATA['senin'];
    const catalog = NIAT_CATALOG[activeKey] || NIAT_CATALOG['senin'];
    const isWajib = catalog?.category === 'wajib';

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
            <div 
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                style={{ 
                    opacity: isAnimating ? 1 : 0,
                    transition: 'opacity 400ms ease'
                }}
                onClick={handleClose} 
            />
            <div 
                className="relative w-full sm:w-[90%] sm:max-w-md max-h-[85vh] flex flex-col bg-white dark:bg-slate-950 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl border-t border-white/20 dark:border-slate-800 overflow-hidden pb-[env(safe-area-inset-bottom)]"
                style={{ 
                    willChange: 'transform, opacity',
                    transform: isAnimating ? 'translateY(0) scale(1)' : 'translateY(100%)',
                    opacity: isAnimating ? 1 : 0,
                    transition: 'transform 480ms cubic-bezier(0.25, 1, 0.5, 1), opacity 300ms ease'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mt-4 mb-2 shrink-0" />
                <div className="px-6 py-4 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white">Bacaan Niat</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Disunnahkan sebelum fajar</p>
                    </div>
                    <button onClick={handleClose} className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 active:scale-90 shrink-0 transition hover:bg-slate-200 dark:hover:bg-slate-700">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 pb-8 space-y-4 no-scrollbar">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-black text-slate-800 dark:text-white">{niat.judul}</h4>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border ${isWajib ? 'text-amber-600 border-amber-100 dark:border-amber-900/50' : 'text-emerald-600 border-emerald-100 dark:border-emerald-900/50'}`}>
                                {isWajib ? 'Wajib' : 'Sunnah'}
                            </span>
                        </div>
                        {catalog && <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium -mt-2">{catalog.desc}</p>}
                        <div className="text-right">
                            <p className="font-quran text-xl text-slate-800 dark:text-white leading-loose" dir="rtl">{niat.arab}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Latin</p>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 italic leading-relaxed">"{niat.latin}"</p>
                        </div>
                        <div className="pt-3 border-t border-slate-50 dark:border-slate-800">
                            <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Artinya</p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{niat.arti}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Fasting() {
    const navigate = useNavigate();
    const { prayerTimes, setModalOpen } = useApp();
    const [todayInfo, setTodayInfo] = useState(null);
    const [upcomingList, setUpcomingList] = useState([]);
    const [isBesok, setIsBesok] = useState(false);
    const [hijriToday, setHijriToday] = useState(null);
    const [selectedNiatKey, setSelectedNiatKey] = useState(null);
    const [category, setCategory] = useState('semua');
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('jadwal');

    const openNiatModal = (key) => {
        if (key) {
            setSelectedNiatKey(key);
            setModalOpen(true);
        }
    };

    const closeNiatModal = () => {
        setSelectedNiatKey(null);
        setModalOpen(false);
    };

    useEffect(() => {
        const now = new Date();
        let displayDate = new Date(now);
        let besok = false;

        if (prayerTimes?.Maghrib && prayerTimes.Maghrib !== '--:--') {
            const [h, m] = prayerTimes.Maghrib.split(':').map(Number);
            const maghrib = new Date(now); maghrib.setHours(h, m, 0, 0);
            if (now >= maghrib) { besok = true; displayDate.setDate(displayDate.getDate() + 1); }
        }

        const hijri = getHijriDate(displayDate);
        setHijriToday(hijri);
        setTodayInfo(getFastingInfo(displayDate, hijri));
        setIsBesok(besok);
        setUpcomingList(getUpcomingFasting(30));
        // Upgrade hijri display with API data
        fetchHijriDateAPI(displayDate).then(h => setHijriToday(h)).catch(() => {});
    }, [prayerTimes]);

    // Handle back button for Niat Modal
    useEffect(() => {
        const handlePopState = (e) => {
            if (e.state?.modal !== 'niatModal') {
                closeNiatModal();
            }
        };

        if (selectedNiatKey) {
            if (window.history.state?.modal !== 'niatModal') {
                window.history.pushState({ modal: 'niatModal' }, '');
            }
            window.addEventListener('popstate', handlePopState);
        }

        return () => {
            if (selectedNiatKey) {
                window.removeEventListener('popstate', handlePopState);
                if (window.history.state?.modal === 'niatModal') {
                    window.history.back();
                }
            }
        };
    }, [selectedNiatKey]);

    const allNiatKeys = Object.keys(NIAT_DATA);
    const filteredNiat = allNiatKeys.filter(key => {
        const niat = NIAT_DATA[key];
        const catalog = NIAT_CATALOG[key];
        if (category !== 'semua' && catalog?.category !== category) return false;
        if (search) {
            const text = [niat.judul, catalog?.desc || '', ...(catalog?.tags || [])].join(' ').toLowerCase();
            if (!text.includes(search.toLowerCase())) return false;
        }
        return true;
    });

    return (
        <div className="app-view active flex flex-col h-full absolute inset-0 z-50 transition-all duration-300 overflow-y-auto bg-slate-100 dark:bg-slate-950 no-scrollbar">
            
            {/* Background Gradient Ornamen */}
            <div className="fixed top-0 left-0 right-0 h-80 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none z-0"></div>

            {/* Sticky Header */}
            <div className="sticky top-0 z-50 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-3 md:px-8 md:pt-6">
                <motion.div className="glass-pill flex items-center justify-between p-2 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-sm w-full max-w-7xl mx-auto">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90 group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
                    </button>
                    <motion.h2 layoutId="navbar-title" className="text-sm font-bold text-slate-800 dark:text-white tracking-tight text-center flex-1 truncate px-2 animate-nav-title">Kalender Puasa</motion.h2>
                    <div className="w-10"></div> 
                </motion.div>
            </div>

            <div className="relative z-10 px-5 pt-4 pb-28 md:pb-10 w-full max-w-7xl mx-auto flex flex-col gap-4 md:gap-5">
                
                {/* Tabs - Jurnal Harian Style */}
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-md z-[120] md:static md:translate-x-0 md:w-full md:max-w-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-1.5 rounded-full flex shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-white/50 dark:border-slate-700/50">
                    <div className="absolute inset-1.5 flex pointer-events-none">
                        <div className="w-1/2 h-full transition-transform duration-300 ease-in-out" 
                                style={{ transform: activeTab === 'jadwal' ? 'translateX(0)' : 'translateX(100%)' }}>
                            <div className="w-full h-full bg-white dark:bg-slate-800 rounded-full shadow-md border border-slate-100 dark:border-slate-700"></div>
                        </div>
                    </div>
                    <button onClick={() => setActiveTab('jadwal')} className={`relative z-10 focus:outline-none flex-1 py-3 md:py-2 rounded-full text-xs font-black tracking-tight transition-colors duration-300 ${activeTab === 'jadwal' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}>Jadwal Puasa</button>
                    <button onClick={() => setActiveTab('niat')} className={`relative z-10 focus:outline-none flex-1 py-3 md:py-2 rounded-full text-xs font-black tracking-tight transition-colors duration-300 ${activeTab === 'niat' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}>Kamus Niat</button>
                </div>
                
                {activeTab === 'jadwal' && (
                    <div key="jadwal-main" className='animate-[fadeIn_0.35s_ease-out]'>
                        {/* === SECTION 1: KONDISI HARI INI === */}
                        <div>
                    <div className="flex items-center justify-between px-2 mb-3">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Kondisi Ibadah</h3>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{isBesok ? 'Besok' : 'Hari Ini'} • {hijriToday?.full || '--'}</span>
                    </div>
                    <div className="w-full">
                        {todayInfo ? (
                            <div onClick={() => openNiatModal(todayInfo.niatKey)}
                                className={`group animate-fade-in-up bg-white dark:bg-slate-900 rounded-[2rem] p-5 border border-white dark:border-slate-800 shadow-sm flex items-center gap-4 transition-all duration-300 ${todayInfo.niatKey ? 'cursor-pointer active:scale-[0.97] hover:shadow-md' : ''}`}
                                style={{ animationFillMode: 'both', animationDelay: '0.05s' }}>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm ${todayInfo.category === 'haram' ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-100' : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100'}`}>
                                    {todayInfo.category === 'haram' ? <span className="text-2xl">🚫</span> : <UtensilsCrossed className="w-7 h-7" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${todayInfo.category === 'haram' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                            {todayInfo.category === 'haram' ? 'Haram' : todayInfo.category === 'wajib' ? 'Wajib' : 'Sunnah'}
                                        </span>
                                    </div>
                                    <h3 className="font-black text-slate-800 dark:text-white text-base leading-tight">{todayInfo.type}</h3>
                                </div>
                                {todayInfo.niatKey && <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center"><ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" /></div>}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 border border-white dark:border-slate-800 shadow-sm flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center shrink-0">
                                    <UtensilsCrossed className="w-6 h-6 opacity-50" />
                                </div>
                                <div>
                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-400 mb-1 inline-block">Bebas</span>
                                    <h3 className="font-bold text-slate-500 text-sm">Tidak ada jadwal puasa sunnah</h3>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                </div>)}

                {activeTab === 'niat' && (
                <div key="niat-tab" className="animate-[fadeIn_0.35s_ease-out]">
                {/* === SECTION 2: KAMUS NIAT PUASA === */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between px-2">
                        <div>
                            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Kamus Niat Puasa</h3>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Cari dan temukan niat puasa yang kamu butuhkan</p>
                        </div>
                        <span className={`text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full ${filteredNiat.length > 0 ? '' : 'hidden'}`}>{filteredNiat.length} niat</span>
                    </div>

                    {/* Search Bar */}
                    <div className="relative group">
                        <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-[1.8rem] border border-white dark:border-slate-800 flex items-center px-5 py-4 transition-all duration-300 group-focus-within:ring-4 group-focus-within:ring-emerald-500/10 shadow-sm">
                            <Search className="w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors shrink-0" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari niat puasa... (cth: senin, ramadhan)"
                                className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 dark:text-white placeholder:text-slate-400 ml-4 outline-none" />
                            {search && (
                                <button onClick={() => setSearch('')} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 active:scale-90 transition shrink-0 ml-2">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Category Filter Tabs */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar px-1 pb-1">
                        {[
                            { id: 'semua', label: 'Semua', icon: Layers },
                            { id: 'wajib', label: 'Wajib', icon: ShieldCheck },
                            { id: 'reguler', label: 'Sunnah Rutin', icon: Repeat },
                            { id: 'khusus', label: 'Sunnah Khusus', icon: CalendarHeart },
                            { id: 'lainnya', label: 'Lainnya', icon: Bookmark },
                        ].map(cat => {
                            const Icon = cat.icon;
                            return (
                                <button key={cat.id} onClick={() => setCategory(cat.id)}
                                    className={`shrink-0 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${category === cat.id ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:border-emerald-200'}`}>
                                    <span className="flex items-center gap-1.5">
                                        <Icon className="w-3.5 h-3.5" />
                                        {cat.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Niat Cards Grid 4 Kolom */}
                    {filteredNiat.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                            {filteredNiat.map((key, index) => {
                                const niat = NIAT_DATA[key];
                                const catalog = NIAT_CATALOG[key];
                                const c = COLOR_MAP[catalog?.color] || COLOR_MAP.emerald;
                                return (
                                    <button key={key} onClick={() => openNiatModal(key)}
                                        className={`animate-fade-in-up bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-sm flex flex-col items-start text-left active:scale-[0.97] transition-all group overflow-hidden relative ${c.border} hover:shadow-md`}
                                        style={{ animationFillMode: 'both', animationDelay: `${index * 0.04}s`, minHeight: '120px' }}>
                                        
                                        {/* Ikon dekoratif besar di pojok kanan bawah */}
                                        <div className={`absolute -right-3 -bottom-3 w-16 h-16 ${c.text} opacity-[0.08] group-hover:opacity-[0.15] transition-opacity`}>
                                            <UtensilsCrossed className="w-full h-full" />
                                        </div>

                                        {/* Ikon kecil */}
                                        <div className={`w-9 h-9 shrink-0 rounded-xl ${c.bg} ${c.text} flex items-center justify-center border ${c.border} mb-2.5`}>
                                            <UtensilsCrossed className="w-4 h-4" />
                                        </div>

                                        {/* Judul */}
                                        <h4 className="font-black text-slate-800 dark:text-white text-[11px] leading-snug line-clamp-2 flex-1 relative z-10">{niat.judul}</h4>
                                        
                                        {/* Deskripsi */}
                                        {catalog?.desc && (
                                            <p className="text-[8.5px] text-slate-400 dark:text-slate-500 leading-snug line-clamp-1 mt-1 relative z-10">{catalog.desc}</p>
                                        )}

                                        {/* Badge kategori */}
                                        <span className={`mt-2 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded relative z-10 ${c.badge}`}>{CATEGORY_LABELS[catalog?.category] || 'Sunnah'}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                <SearchX className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                            </div>
                            <p className="text-sm font-bold text-slate-400 dark:text-slate-500">Niat tidak ditemukan</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1">Coba kata kunci lain atau pilih kategori berbeda</p>
                        </div>
                    )}
                </div>
                </div>
                )}

                {activeTab === 'jadwal' && (
                <div key="jadwal-upcoming" className="animate-[fadeIn_0.35s_ease-out] mt-4">
                {/* === SECTION 3: JADWAL 30 HARI MENDATANG === */}
                <div>
                    <h3 className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">30 Hari Mendatang</h3>
                    <div className="space-y-3 pb-2 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                        {upcomingList.map(({ date, hijri, info }, i) => {
                            const isHaram = info.category === 'haram';
                            return (
                                <div key={i} onClick={() => !isHaram && info.niatKey && openNiatModal(info.niatKey)}
                                    className={`group animate-fade-in-up bg-white dark:bg-slate-900 p-4 rounded-2xl border border-white dark:border-slate-800 shadow-sm flex items-center justify-between transition-all duration-300 ${!isHaram ? 'cursor-pointer active:scale-[0.97] hover:shadow-md' : ''}`}
                                    style={{ animationFillMode: 'both', animationDelay: `${i * 0.04}s` }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0 shadow-sm">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase leading-none">{date.toLocaleDateString('id-ID', { month: 'short' })}</span>
                                            <span className="text-sm font-black text-slate-700 dark:text-emerald-400 leading-none">{date.getDate()}</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                {isHaram ? (
                                                    <span className="text-[8px] font-black text-rose-500 bg-rose-500/10 px-1.5 rounded uppercase tracking-widest">Haram</span>
                                                ) : (
                                                    <span className="text-[8px] font-black text-amber-600 bg-amber-500/10 px-1.5 rounded uppercase tracking-widest">{info.category === 'wajib' ? 'Wajib' : 'Sunnah'}</span>
                                                )}
                                            </div>
                                            <h4 className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{info.type}</h4>
                                            <p className="text-[9px] text-slate-400 mt-0.5">{hijri.full}</p>
                                        </div>
                                    </div>
                                    {!isHaram && info.niatKey ? (
                                        <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center"><ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 transition-colors" /></div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </div>
                </div>
                )}
            </div>

            {/* Modal Pop-up Niat Puasa */}
            {selectedNiatKey && <NiatModal niatKey={selectedNiatKey} onClose={closeNiatModal} />}
        </div>
    );
}
