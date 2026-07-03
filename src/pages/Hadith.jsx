// src/pages/Hadith.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Quote, BookOpenCheck, ChevronLeft, ChevronRight, Search, Star, Info, BookOpen } from 'lucide-react';
import "@aejkatappaja/phantom-ui";
import { motion } from 'framer-motion';
import TopNavConfig from '@/components/TopNavConfig';

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

    return (
        <div className="app-view active flex flex-col h-full bg-slate-100 dark:bg-slate-950 no-scrollbar overflow-y-auto relative">
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

            <div className="relative z-10 px-5 pt-4 pb-28 md:pb-10 w-full max-w-2xl mx-auto flex flex-col gap-4 md:gap-6">
                
                {/* Tabs Navigation */}
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-md z-[120] md:static md:translate-x-0 md:w-full md:max-w-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-1.5 rounded-full flex shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-white/50 dark:border-slate-700/50">
                    <div className="absolute inset-1.5 flex pointer-events-none">
                        <div className="w-1/3 h-full transition-transform duration-300 ease-in-out" 
                             style={{ transform: activeTab === 'random' ? 'translateX(0)' : activeTab === 'browse' ? 'translateX(100%)' : 'translateX(200%)' }}>
                            <div className="w-full h-full bg-white dark:bg-slate-800 rounded-full shadow-md border border-slate-100 dark:border-slate-700"></div>
                        </div>
                    </div>
                    <button onClick={() => { setActiveTab('random'); setMode('random'); fetchRandom(); }} className={`relative z-10 focus:outline-none flex-1 py-3 md:py-2 rounded-full text-xs font-black tracking-tight transition-colors duration-300 ${activeTab === 'random' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}>Acak</button>
                    <button onClick={() => { setActiveTab('browse'); setMode('browse'); if(!browseData) fetchBrowse(1); }} className={`relative z-10 focus:outline-none flex-1 py-3 md:py-2 rounded-full text-xs font-black tracking-tight transition-colors duration-300 ${activeTab === 'browse' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}>Jelajahi</button>
                    <button onClick={() => { setActiveTab('search'); setMode(browseData?.hadis && searchKeyword ? 'search_results' : 'search'); }} className={`relative z-10 focus:outline-none flex-1 py-3 md:py-2 rounded-full text-xs font-black tracking-tight transition-colors duration-300 ${activeTab === 'search' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}>Cari</button>
                </div>

                {/* Search Mode */}
                {(mode === 'search' || mode === 'search_results') && (
                    <div className="animate-fade-in-up">
                        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-900 rounded-2xl border border-white dark:border-slate-800 px-4 py-3 shadow-sm">
                                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                                <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
                                    placeholder="Cari kata (misal: kiamat) atau ID (misal: 12)"
                                    className="flex-1 text-xs font-bold text-slate-800 dark:text-white bg-transparent focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600" />
                            </div>
                            <button type="submit" disabled={browseLoading || loading} className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[11px] font-black active:scale-95 transition disabled:opacity-50 shadow-sm flex items-center gap-1.5 shrink-0">
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
                                            className="w-full text-left bg-white dark:bg-slate-900 rounded-[2rem] border border-white dark:border-slate-800 p-6 hover:border-emerald-500/30 transition-all active:scale-[0.98] shadow-sm group">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">#{h.id}</span>
                                                {h.grade && <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full flex items-center gap-1"><Star className="w-3 h-3" /> {h.grade}</span>}
                                            </div>
                                            {!isTextString && h.text?.ar && (
                                                <p className="text-right font-quran text-lg text-slate-800 dark:text-white leading-[2.2] mb-3 line-clamp-2" dir="rtl">{h.text.ar}</p>
                                            )}
                                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                                                "{isTextString ? h.text : h.text?.id}"
                                            </p>
                                            {h.focus && h.focus.length > 0 && (
                                                <div className="mt-3 bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                                                    <p className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 italic line-clamp-2">
                                                        {h.focus[0]}
                                                    </p>
                                                </div>
                                            )}
                                            {h.takhrij && (
                                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-start gap-2">
                                                    <BookOpen className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                                                    <p className="text-[10px] font-bold text-slate-400 italic line-clamp-1">{h.takhrij}</p>
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
                            <div className="bento-card bg-white dark:bg-slate-900 border border-white dark:border-slate-800 p-6 md:p-8 rounded-[2rem] relative overflow-hidden shadow-sm animate-fade-in-up">
                                {/* Decorative elements */}
                                <div className="absolute -right-8 -top-8 w-40 h-40 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
                                <div className="absolute right-4 top-4 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                                    <Quote className="w-32 h-32 text-emerald-900 dark:text-emerald-100" />
                                </div>
                                
                                <div className="relative z-10">
                                    {/* Header */}
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm border border-emerald-100 dark:border-emerald-800/30">
                                            <BookOpenCheck className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-0.5">Ensiklopedia Hadis</p>
                                            <p className="text-[10px] font-bold text-slate-400">ID #{hadith.id}</p>
                                        </div>
                                        {hadith.grade && (
                                            <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full border border-amber-100 dark:border-amber-800/30 shadow-sm">
                                                <Star className="w-3 h-3" />
                                                {hadith.grade}
                                            </span>
                                        )}
                                    </div>

                                    {/* Arabic text */}
                                    {hadith.text?.ar && (
                                        <div className="text-right mb-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-5 rounded-[1.5rem]" dir="rtl">
                                            <p className="font-quran text-2xl md:text-3xl text-slate-800 dark:text-white leading-[2.5]">{hadith.text.ar}</p>
                                        </div>
                                    )}

                                    {/* Indonesian translation */}
                                    {hadith.text?.id && (
                                        <div className="relative mb-6">
                                            <Quote className="w-5 h-5 text-emerald-500/20 absolute -left-2 -top-2" />
                                            <p className="text-sm md:text-base font-medium text-slate-700 dark:text-slate-200 leading-relaxed px-2">"{hadith.text.id}"</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 gap-3 mb-2">
                                        {/* Takhrij */}
                                        {hadith.takhrij && (
                                            <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-2xl">
                                                <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                                                    <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div className="flex-1 mt-0.5">
                                                    <span className="text-[9px] font-black text-blue-600/70 dark:text-blue-400/70 uppercase tracking-widest block mb-1">Takhrij</span>
                                                    <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300 leading-relaxed italic">{hadith.takhrij}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Hikmah */}
                                        {hadith.hikmah && (
                                            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl">
                                                <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                                                    <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <div className="flex-1 mt-0.5">
                                                    <span className="text-[9px] font-black text-amber-600/70 dark:text-amber-400/70 uppercase tracking-widest block mb-1">Hikmah</span>
                                                    <p className="text-[12px] font-medium text-amber-800 dark:text-amber-300 leading-relaxed">{hadith.hikmah}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Navigation prev/next */}
                                    <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                                        <button onClick={() => hadith.prev && goToHadith(hadith.prev)} disabled={!hadith.prev}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest disabled:opacity-30 active:scale-95 transition">
                                            <ChevronLeft className="w-4 h-4" /> Prev
                                        </button>
                                        <button onClick={fetchRandom}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest active:scale-95 transition">
                                            <RefreshCw className="w-4 h-4" /> Acak
                                        </button>
                                        <button onClick={() => hadith.next && goToHadith(hadith.next)} disabled={!hadith.next}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest disabled:opacity-30 active:scale-95 transition">
                                            Next <ChevronRight className="w-4 h-4" />
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
