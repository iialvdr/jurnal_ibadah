// src/pages/Hadith.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/store/AppContext';
import { ArrowLeft, RefreshCw, Quote, BookOpenCheck, ChevronLeft, ChevronRight, Search, Star, Info, BookOpen } from 'lucide-react';
import "@aejkatappaja/phantom-ui";
import { motion } from 'framer-motion';
import TopNavConfig from '@/components/TopNavConfig';
import useSwipe from '@/hooks/useSwipe';
import TabSlider from '@/components/TabSlider';

const API_BASE = 'https://api.myquran.com/v3/hadis/enc';

export default function Hadith() {
    const navigate = useNavigate();
    const [hadith, setHadith] = useState(null);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState('random'); // 'random' | 'browse' | 'detail' | 'search' | 'search_results'
    const [activeTab, setActiveTab] = useState('random'); // 'random' | 'browse' | 'search'
    const [searchInput, setSearchInput] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');
    
    // Browse state
    const [browseData, setBrowseData] = useState(null);
    const [browsePage, setBrowsePage] = useState(1);
    const [browseLoading, setBrowseLoading] = useState(false);

    const fetchRandom = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/random`);
            const data = await res.json();
            if (data.status && data.data) {
                setHadith(data.data);
                setMode('random');
            }
        } catch { /* ignore */ } finally { setLoading(false); }
    }, []);

    const fetchById = useCallback(async (id) => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/show/${id}`);
            const data = await res.json();
            if (data.status && data.data) {
                setHadith(data.data);
                setMode('detail');
            }
        } catch { /* ignore */ } finally { setLoading(false); }
    }, []);

    const fetchBrowse = useCallback(async (page = 1) => {
        setBrowseLoading(true);
        try {
            const res = await fetch(`${API_BASE}/explore?page=${page}`);
            const data = await res.json();
            if (data.status && data.data) {
                setBrowseData(data.data);
                setBrowsePage(page);
                setMode('browse');
            }
        } catch { /* ignore */ } finally { setBrowseLoading(false); }
    }, []);

    const fetchSearch = useCallback(async (keyword, page = 1) => {
        if (!keyword.trim()) return;
        setBrowseLoading(true);
        setSearchKeyword(keyword);
        try {
            const res = await fetch(`${API_BASE}/cari/${encodeURIComponent(keyword)}?page=${page}`);
            const data = await res.json();
            if (data.status && data.data) {
                setBrowseData(data.data);
                setBrowsePage(page);
                setMode('search_results');
            }
        } catch { /* ignore */ } finally { setBrowseLoading(false); }
    }, []);

    useEffect(() => { fetchRandom(); }, []);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchInput.trim()) {
            // Check if it's a number, if so fetch by ID, else fetch by keyword search
            if (/^\d+$/.test(searchInput.trim())) {
                fetchById(searchInput.trim());
            } else {
                fetchSearch(searchInput.trim(), 1);
            }
        }
    };

    const goToHadith = (id) => {
        setSearchInput(String(id));
        fetchById(id);
    };

    const HADITH_TABS = [
        { id: 'random', label: 'Acak' },
        { id: 'browse', label: 'Jelajahi' },
        { id: 'search', label: 'Cari' },
    ];

    const handleTabChange = (id) => {
        if (id === activeTab) return;
        setActiveTab(id);
        if (id === 'random') { setMode('random'); fetchRandom(); }
        else if (id === 'browse') { setMode('browse'); if (!browseData) fetchBrowse(1); }
        else { setMode(browseData?.hadis && searchKeyword ? 'search_results' : 'search'); }
    };

    const swipeHandlers = useSwipe({
        threshold: 30,
        onSwipeLeft: () => {
            if (activeTab === 'random') { if (navigator.vibrate) navigator.vibrate(8); handleTabChange('browse'); return true; }
            else if (activeTab === 'browse') { if (navigator.vibrate) navigator.vibrate(8); handleTabChange('search'); return true; }
            return false;
        },
        onSwipeRight: () => {
            if (activeTab === 'search') { if (navigator.vibrate) navigator.vibrate(8); handleTabChange('browse'); return true; }
            else if (activeTab === 'browse') { if (navigator.vibrate) navigator.vibrate(8); handleTabChange('random'); return true; }
            return false;
        }
    });

    const { setBottomNavExtraNode } = useApp(state => ({ setBottomNavExtraNode: state.setBottomNavExtraNode }));
    const location = useLocation();

    useEffect(() => {
        if (location.pathname === '/hadith') {
            setBottomNavExtraNode(
                <TabSlider
                    tabs={HADITH_TABS}
                    activeTab={activeTab}
                    onChange={handleTabChange}
                    className="md:hidden"
                />
            );
        }
    }, [activeTab, location.pathname, setBottomNavExtraNode]);

    return (
        <div {...swipeHandlers} className="app-view active flex flex-col h-full bg-slate-100 dark:bg-slate-950 no-scrollbar overflow-y-auto relative">
            {/* Background Gradient */}
            <div className="fixed top-0 left-0 right-0 h-64 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none z-0"></div>

            {/* Header */}
            <TopNavConfig 
                leftNode={
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90 group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
                    </button>
                }
                titleNode="Ensiklopedia Hadis"
                rightNode={
                    <div className="w-10 flex items-center justify-center">
                        <BookOpenCheck className="w-4 h-4 text-emerald-500" />
                    </div>
                }
            />
            <div className="h-[5.5rem] md:h-[7rem] shrink-0 w-full" />

            <div className="relative z-10 px-3 pt-4 pb-40 md:px-6 md:pb-12 w-full max-w-3xl mx-auto flex flex-col gap-5 md:gap-6">
                
                {/* Tabs Navigation (Desktop Inline) */}
                <div className="hidden md:flex bg-slate-900/5 dark:bg-white/5 backdrop-blur-md rounded-full border border-black/5 dark:border-white/10 relative">
                    <TabSlider tabs={HADITH_TABS} activeTab={activeTab} onChange={handleTabChange} />
                </div>

                <div className="px-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                        Ensiklopedia hadis
                    </p>
                    <h1 className="mt-1 text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                        {mode === 'browse' ? 'Jelajahi Hadis' : mode === 'search' || mode === 'search_results' ? 'Cari Hadis' : 'Hadis Pilihan'}
                    </h1>
                    <p className="mt-1 text-xs md:text-sm text-slate-500 dark:text-slate-400">
                        Baca hadis, pahami maknanya, dan telusuri sumbernya.
                    </p>
                </div>

                {/* Search Mode */}
                {(mode === 'search' || mode === 'search_results') && (
                    <div className="animate-fade-in-up">
                        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 rounded-[1.4rem] border border-slate-200/80 bg-white/90 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
                            <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
                                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                                <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
                                    placeholder="Cari kata (misal: kiamat) atau ID (misal: 12)"
                                    className="flex-1 min-w-0 py-2 text-xs font-semibold text-slate-800 dark:text-white bg-transparent focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                            </div>
                            <button type="submit" disabled={browseLoading || loading} className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold active:scale-95 transition disabled:opacity-50 shadow-sm flex items-center gap-1.5 shrink-0">
                                {(browseLoading || loading) ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Cari
                            </button>
                        </form>
                    </div>
                )}

                {/* Browse & Search Results mode */}
                {(mode === 'browse' || mode === 'search_results') && (
                    <div className="space-y-4 animate-fade-in-up">
                        {mode === 'search_results' && !browseLoading && browseData?.hadis && (
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">
                                Hasil pencarian: "{searchKeyword}"
                            </p>
                        )}
                        <phantom-ui
                            loading={browseLoading ? '' : undefined}
                            count={3}
                            animation="pulse"
                            class="block space-y-4"
                        >
                        {browseLoading ? (
                            <div className="space-y-4">
                                {[1,2,3].map(i => (
                                    <div key={i} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-white dark:border-slate-800 p-6 shadow-sm animate-pulse">
                                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full w-24 mb-4"></div>
                                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-full mb-3"></div>
                                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4"></div>
                                    </div>
                                ))}
                            </div>
                        ) : browseData?.hadis?.length > 0 ? (
                            <div className="space-y-4">
                                {browseData.hadis.map(h => {
                                    const isTextString = typeof h.text === 'string';
                                    return (
                                        <button key={h.id} onClick={() => goToHadith(h.id)}
                                            className="group w-full rounded-[1.6rem] border border-slate-200/80 bg-white p-5 text-left shadow-sm transition-all hover:border-emerald-500/30 hover:shadow-md active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900">
                                            <div className="mb-4 flex items-center justify-between gap-3">
                                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Hadis #{h.id}</span>
                                                {h.grade && <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"><Star className="w-3 h-3" /> {h.grade}</span>}
                                            </div>
                                            {!isTextString && h.text?.ar && (
                                                <p className="mb-4 rounded-2xl bg-slate-50 px-4 py-3 text-right font-quran text-lg leading-[2.1] text-slate-800 dark:bg-slate-800/70 dark:text-white" dir="rtl">{h.text.ar}</p>
                                            )}
                                            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                                                {isTextString ? h.text : h.text?.id}
                                            </p>
                                            {h.focus && h.focus.length > 0 && (
                                                <div className="mt-4 rounded-xl border-l-2 border-emerald-500 bg-emerald-50/70 px-3 py-2.5 dark:bg-emerald-900/10">
                                                    <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
                                                        {h.focus[0]}
                                                    </p>
                                                </div>
                                            )}
                                            {h.takhrij && (
                                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-start gap-2">
                                                    <BookOpen className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                                                    <p className="text-[10px] font-bold text-slate-400 italic">{h.takhrij}</p>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                                
                                {/* Pagination */}
                                {browseData.paging && (
                                    <div className="flex items-center justify-center gap-4 py-4">
                                        <button onClick={() => mode === 'browse' ? fetchBrowse(browsePage - 1) : fetchSearch(searchKeyword, browsePage - 1)} disabled={!browseData.paging.has_prev}
                                            className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-white dark:border-slate-800 flex items-center justify-center disabled:opacity-30 active:scale-90 transition shadow-sm hover:border-emerald-500/30">
                                            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                        </button>
                                        <div className="text-center px-4">
                                            <span className="text-sm font-black text-slate-800 dark:text-white block">{browseData.paging.current}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dari {browseData.paging.total_pages}</span>
                                        </div>
                                        <button onClick={() => mode === 'browse' ? fetchBrowse(browsePage + 1) : fetchSearch(searchKeyword, browsePage + 1)} disabled={!browseData.paging.has_next}
                                            className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-white dark:border-slate-800 flex items-center justify-center disabled:opacity-30 active:scale-90 transition shadow-sm hover:border-emerald-500/30">
                                            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                    <BookOpenCheck className="w-8 h-8 opacity-30" />
                                </div>
                                <p className="font-bold text-slate-500 dark:text-slate-400">Tidak ada data hadis</p>
                            </div>
                        )}
                        </phantom-ui>
                    </div>
                )}

                {/* Random / Detail mode — single hadith card */}
                {(mode === 'random' || mode === 'detail') && (
                    <div className="animate-fade-in-up">
                        {/* Back button if came from browse/search */}
                        {activeTab !== 'random' && (
                            <button onClick={() => setMode(activeTab === 'browse' ? 'browse' : (searchKeyword ? 'search_results' : 'search'))} 
                                className="mb-4 flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition group w-fit">
                                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                                Kembali ke {activeTab === 'browse' ? 'Jelajahi' : 'Pencarian'}
                            </button>
                        )}
                        <phantom-ui
                            loading={loading ? '' : undefined}
                            count={1}
                            animation="pulse"
                            class="block"
                        >
                        {loading ? (
                            <div className="bento-card bg-white dark:bg-slate-900 rounded-[2rem] border border-white dark:border-slate-800 p-8 shadow-sm animate-pulse">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800"></div>
                                    <div className="space-y-2">
                                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full w-24"></div>
                                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full w-16"></div>
                                    </div>
                                </div>
                                <div className="space-y-3 mb-6">
                                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-full"></div>
                                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-5/6"></div>
                                </div>
                            </div>
                        ) : hadith ? (
                            <div className="relative overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-white p-4 shadow-sm animate-fade-in-up dark:border-slate-800 dark:bg-slate-900 md:p-7">
                                <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-400/5"></div>
                                
                                <div className="relative z-10">
                                    {/* Header */}
                                    <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                            <BookOpenCheck className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">Hadis pilihan</p>
                                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Nomor {hadith.id}</p>
                                        </div>
                                        {hadith.grade && (
                                            <span className="flex max-w-[42%] items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-1.5 text-[10px] font-bold leading-tight text-amber-700 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-300">
                                                <Star className="h-3 w-3 shrink-0" />
                                                {hadith.grade}
                                            </span>
                                        )}
                                    </div>

                                    {/* Arabic text */}
                                    {hadith.text?.ar && (
                                        <div className="mb-5 -mx-2 rounded-2xl border border-emerald-100/70 bg-gradient-to-br from-emerald-50/80 to-slate-50 px-2 py-4 dark:border-emerald-900/30 dark:from-emerald-950/30 dark:to-slate-800/60 md:mx-0 md:p-6" dir="rtl">
                                            <p className="text-right font-quran text-[1.2rem] text-slate-800 dark:text-slate-100 md:text-2xl">{hadith.text.ar}</p>
                                        </div>
                                    )}

                                    {/* Indonesian translation */}
                                    {hadith.text?.id && (
                                        <div className="mb-5 px-1">
                                            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Terjemahan</p>
                                            <p className="text-sm leading-7 text-slate-700 dark:text-slate-200 md:text-base">{hadith.text.id}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 gap-3 mb-2">
                                        {/* Takhrij */}
                                        {hadith.takhrij && (
                                            <div className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                                                <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                                                    <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div className="flex-1 mt-0.5">
                                                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Takhrij</span>
                                                    <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{hadith.takhrij}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Hikmah */}
                                        {hadith.hikmah && (
                                            <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-900/30 dark:bg-amber-900/10">
                                                <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                                                    <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <div className="flex-1 mt-0.5">
                                                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-amber-700/70 dark:text-amber-400/70">Hikmah</span>
                                                    <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">{hadith.hikmah}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Navigation prev/next */}
                                    <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                                        <button onClick={() => hadith.prev && goToHadith(hadith.prev)} disabled={!hadith.prev}
                                            className="flex min-w-0 items-center justify-center gap-1 rounded-xl bg-slate-50 px-2 py-3 text-[10px] font-bold text-slate-600 transition hover:bg-slate-100 active:scale-95 disabled:opacity-30 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                                            <ChevronLeft className="h-4 w-4 shrink-0" /> Sebelum
                                        </button>
                                        <button onClick={fetchRandom}
                                            className="flex min-w-0 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-2 py-3 text-[10px] font-bold text-white transition hover:bg-emerald-700 active:scale-95">
                                            <RefreshCw className="h-3.5 w-3.5 shrink-0" /> Acak
                                        </button>
                                        <button onClick={() => hadith.next && goToHadith(hadith.next)} disabled={!hadith.next}
                                            className="flex min-w-0 items-center justify-center gap-1 rounded-xl bg-slate-50 px-2 py-3 text-[10px] font-bold text-slate-600 transition hover:bg-slate-100 active:scale-95 disabled:opacity-30 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                                            Sesudah <ChevronRight className="h-4 w-4 shrink-0" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 animate-fade-in-up">
                                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                    <BookOpenCheck className="w-8 h-8 opacity-30" />
                                </div>
                                <p className="font-bold text-slate-500 dark:text-slate-400">Hadis tidak ditemukan</p>
                                <p className="text-[11px] mt-1">Coba masukkan ID yang lain</p>
                            </div>
                        )}
                        </phantom-ui>
                    </div>
                )}

                {/* Source attribution */}
                <div className="text-center pb-4">
                    <p className="text-[9px] font-bold text-slate-300 dark:text-slate-700">Sumber: hadeethenc.com via API Muslim</p>
                </div>
            </div>
        </div>
    );
}
