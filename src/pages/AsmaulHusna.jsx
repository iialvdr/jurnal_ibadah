// src/pages/AsmaulHusna.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Volume2, Info, Share2, X, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import "@aejkatappaja/phantom-ui";
import TopNavConfig from '@/components/TopNavConfig';
import { useApp } from '@/store/AppContext';

export default function AsmaulHusna() {
    const navigate = useNavigate();
    const { showAppToast, setModalOpen } = useApp();
    const [asmaList, setAsmaList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState(true);
    const lastScrollY = useRef(0);
    const searchVisibleRef = useRef(true);
    const [selectedIdx, setSelectedIdx] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Handle back button for Modal
    useEffect(() => {
        const handlePopState = (e) => {
            if (e.state?.modal !== 'asmaulHusnaModal') {
                setShowModal(false);
                setModalOpen(false);
            }
        };

        if (showModal) {
            if (window.history.state?.modal !== 'asmaulHusnaModal') {
                window.history.pushState({ modal: 'asmaulHusnaModal' }, '');
            }
            window.addEventListener('popstate', handlePopState);
        }

        return () => {
            if (showModal) {
                window.removeEventListener('popstate', handlePopState);
                if (window.history.state?.modal === 'asmaulHusnaModal') {
                    window.history.back();
                }
            }
        };
    }, [showModal]);

    useEffect(() => {
        // Gunakan dynamic import atau set langsung jika file berada di public
        fetch('/asmaul-husna.json')
            .then(r => {
                if (!r.ok) throw new Error('Network response was not ok');
                const contentType = r.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new TypeError("Oops, we haven't got JSON!");
                }
                return r.json();
            })
            .then(data => {
                setAsmaList(data.map(item => ({
                    urutan: item.urutan,
                    latin: item.latin,
                    arab: item.arab,
                    arti: item.arti,
                    id: item.urutan
                })));
                setLoading(false);
            })
            .catch(async (e) => {
                console.error('Gagal fetch /asmaul-husna.json:', e);
                try {
                    const fallbackData = (await import('../../public/asmaul-husna.json')).default;
                    setAsmaList(fallbackData.map(item => ({
                        urutan: item.urutan,
                        latin: item.latin,
                        arab: item.arab,
                        arti: item.arti,
                        id: item.urutan
                    })));
                } catch (fallbackErr) {
                    showAppToast('Gagal memuat daftar Asmaul Husna. Periksa koneksi internet Anda.', 'error');
                } finally {
                    setLoading(false);
                }
            });
    }, []);

    // Deteksi Scroll untuk Sembunyikan Search
    useEffect(() => {
        const container = document.getElementById('asmaulHusnaView');
        if (!container) return;

        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const currentScrollY = container.scrollTop;
                    const delta = currentScrollY - lastScrollY.current;
                    
                    // Deteksi Scroll Down dengan threshold jarak 10px
                    if (delta > 10 && currentScrollY > 100) {
                        if (searchVisibleRef.current !== false) {
                            searchVisibleRef.current = false;
                            setShowSearch(false);
                        }
                        lastScrollY.current = currentScrollY;
                    } 
                    // Deteksi Scroll Up dengan threshold jarak 10px atau di puncak
                    else if (delta < -10 || currentScrollY < 100) {
                        if (searchVisibleRef.current !== true) {
                            searchVisibleRef.current = true;
                            setShowSearch(true);
                        }
                        lastScrollY.current = currentScrollY;
                    }
                    
                    ticking = false;
                });
                ticking = true;
            }
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (showModal) {
                if (e.key === 'ArrowRight') changeAsma(1);
                else if (e.key === 'ArrowLeft') changeAsma(-1);
                else if (e.key === 'Escape') closeModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showModal, asmaList.length]);

    const openModal = (idx) => {
        if (navigator.vibrate) navigator.vibrate(10);
        setSelectedIdx(idx);
        setShowModal(true);
        setModalOpen(true);
    };
    const closeModal = () => {
        setShowModal(false);
        setModalOpen(false);
    };
    
    const changeAsma = (delta) => {
        if (navigator.vibrate) navigator.vibrate(10);
        setSelectedIdx(i => Math.max(0, Math.min(asmaList.length - 1, i + delta)));
    };

    const filtered = asmaList.filter(a => 
        (a.latin || '').toLowerCase().includes(search.toLowerCase()) || 
        (a.arti || '').toLowerCase().includes(search.toLowerCase())
    );

    const selected = selectedIdx !== null ? asmaList[selectedIdx] : null;

    return (
        <div id="asmaulHusnaView" className="app-view active flex flex-col h-full absolute inset-0 z-50 transition-all duration-300 overflow-y-auto bg-slate-100 dark:bg-slate-950 no-scrollbar">

            {/* Gradient top */}
            <div className="fixed top-0 left-0 right-0 h-80 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none z-0"></div>

            {/* Header - global topnav */}
            <TopNavConfig 
                leftNode={
                    <button onClick={() => { if (navigator.vibrate) navigator.vibrate(10); navigate(-1); }}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90 group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
                    </button>
                }
                titleNode="Asmaul Husna"
                rightNode={<div className="w-10"></div>}
            />
            <div className="h-[5.5rem] md:h-[7rem] shrink-0 w-full" />

            <div className="relative z-10 w-full mx-auto">
                
                {/* Search bar with scroll animation */}
                <div className="sticky top-[85px] z-40 px-5 pt-2 pb-4 md:px-8 md:max-w-7xl md:mx-auto md:w-full pointer-events-none">
                    <div 
                        className="pointer-events-auto transform origin-top flex flex-col space-y-4"
                        style={{
                            transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            transform: showSearch ? 'translateY(0px) scale(1)' : 'translateY(-24px) scale(0.97)',
                            opacity: showSearch ? 1 : 0,
                            pointerEvents: showSearch ? 'auto' : 'none'
                        }}
                    >
                        <div className="relative group">
                            <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-[1.8rem] border border-white dark:border-slate-800 flex items-center px-5 py-4 transition-all duration-300 group-focus-within:ring-4 group-focus-within:ring-emerald-500/10 shadow-sm">
                                <Search className="w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Cari nama Allah..."
                                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 dark:text-white placeholder:text-slate-400 ml-4 outline-none"
                                />
                                {search && (
                                    <button onClick={() => setSearch('')}>
                                        <X className="w-4 h-4 text-slate-400" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* List Container */}
                <div className="px-5 pb-4 scroll-smooth no-scrollbar md:px-8 max-w-7xl mx-auto">
                    <phantom-ui
                        loading={loading ? '' : undefined}
                        count={12}
                        animation="pulse"
                        class="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4 md:space-y-0 block"
                    >
                        {loading ? (
                            Array.from({length: 12}).map((_, i) => (
                                <div key={i} className="animate-pulse bg-white/50 dark:bg-slate-900/50 p-5 rounded-[1.8rem] border border-white dark:border-slate-800 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full w-24"></div>
                                        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full w-16"></div>
                                    </div>
                                </div>
                            ))
                        ) : filtered.length === 0 ? (
                            <div className="col-span-full py-10 text-center opacity-40 text-sm">Tidak ditemukan.</div>
                        ) : (
                            filtered.map((asma, i) => {
                                const globalIdx = asmaList.findIndex(a => a.urutan === asma.urutan);
                                return (
                                    <div key={asma.urutan} onClick={() => openModal(globalIdx)}
                                        className="bento-card group bg-white dark:bg-slate-900 p-5 rounded-[1.8rem] border border-white dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all duration-300 cursor-pointer active:scale-[0.98] flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/50 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                                            {asma.urutan}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-800 dark:text-white text-base group-hover:text-emerald-600 transition-colors truncate">{asma.latin}</h4>
                                            <p className="text-[10px] text-slate-400 font-medium truncate tracking-wide">{asma.arti}</p>
                                        </div>
                                        <div className="text-right pl-2 shrink-0">
                                            <span className="font-quran text-2xl text-slate-300 dark:text-slate-700 group-hover:text-emerald-500/40 transition-colors duration-500">{asma.arab}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </phantom-ui>
                </div>
                <div className="h-8"></div>
            </div>

            {/* Modal - Bottom Sheet */}
            <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center pointer-events-none">
                <div
                    className={`absolute inset-0 bg-slate-950/60 backdrop-blur-md ${showModal ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}
                    onClick={closeModal}
                    style={{ transition: 'opacity 0.5s ease-in-out' }}
                ></div>

                <div
                    className={`relative w-full sm:w-[95%] md:max-w-2xl max-h-[90vh] md:max-h-[85vh] flex flex-col bg-white dark:bg-slate-950 rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl border-t border-white/20 dark:border-slate-800 md:border md:border-slate-200 dark:md:border-slate-800 transform ${showModal ? 'translate-y-0 sm:scale-100 opacity-100 pointer-events-auto' : 'translate-y-full sm:translate-y-10 sm:scale-95 opacity-0'} overflow-hidden`}
                    style={{ transition: 'all 0.5s cubic-bezier(0.32,0.72,0,1)' }}
                >
                    {/* Handle */}
                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mt-6 mb-2 shrink-0 md:hidden"></div>

                    {/* Close button */}
                    <div className="absolute top-5 right-6 z-20">
                        <button onClick={closeModal} className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:text-rose-500 transition active:scale-90 shadow-sm shrink-0">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    {selected && (
                        <div className="flex-1 overflow-y-auto p-6 md:p-10 no-scrollbar relative flex flex-col items-center">
                            {/* Glow bg */}
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                            {/* Number badge */}
                            <div className="relative z-10 mb-6 md:mb-8">
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-[2rem] bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-lg">
                                    <span className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400">{selected.urutan}</span>
                                </div>
                            </div>

                            {/* Arabic + Info grid */}
                            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center relative z-10">
                                
                                <div className="flex flex-col items-center justify-center">
                                    <div className="p-6 md:p-8 rounded-[2.5rem] bg-emerald-500/[0.03] border border-emerald-500/10 w-full flex items-center justify-center shadow-inner">
                                        <h2 className="font-quran text-5xl text-slate-800 dark:text-white leading-tight">{selected.arab}</h2>
                                    </div>
                                </div>

                                <div className="flex flex-col text-center md:text-left space-y-3">
                                    <div>
                                        <h3 className="text-3xl md:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-tight">{selected.latin}</h3>
                                        <div className="h-1 w-16 bg-emerald-200 dark:bg-emerald-800 mx-auto md:mx-0 mt-3 mb-1 rounded-full"></div>
                                    </div>
                                    <div className="w-full">
                                        <p className="text-base md:text-lg font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{selected.arti}</p>
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    {/* Footer nav */}
                    <div className="p-5 md:px-10 md:pb-8 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800 shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                        <div className="flex items-center justify-between gap-4 max-w-lg mx-auto md:max-w-none">
                            <button onClick={() => changeAsma(-1)} disabled={selectedIdx === 0}
                                className="flex-1 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs md:text-sm hover:border-emerald-500/30 transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2 group shadow-sm">
                                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-1 transition" /> Sebelumnya
                            </button>
                            <button onClick={() => changeAsma(1)} disabled={selectedIdx === asmaList.length - 1}
                                className="flex-1 py-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-xs md:text-sm shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2 group">
                                Selanjutnya <ChevronRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
