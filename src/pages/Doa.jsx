// src/pages/Doa.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Heart, BookHeart, Search, ArrowLeft, X, Filter, Check, Tag, ChevronDown, ChevronRight, Info } from 'lucide-react';
import "@aejkatappaja/phantom-ui";
import { useApp } from '@/store/AppContext';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import TopNavConfig from '@/components/TopNavConfig';
import LiquidGlass from '@/components/LiquidGlass';

export default function Doa() {
    const navigate = useNavigate();
    const { showAppToast, setModalOpen } = useApp(state => ({
        showAppToast: state.showAppToast,
        setModalOpen: state.setModalOpen,
    }));
    const [allDoa, setAllDoa] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [searchGlassReady, setSearchGlassReady] = useState(false);
    const [isDesktop, setIsDesktop] = useState(
        () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
    );
    const searchInputRef = useRef(null);
    const userScrollIntent = useRef(false);
    const lastScrollTop = useRef(0);
    const dragControls = useDragControls();
    const handleSearchGlassReady = useCallback(() => setSearchGlassReady(true), []);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(min-width: 768px)');
        const updateViewport = event => setIsDesktop(event.matches);
        setIsDesktop(mediaQuery.matches);
        mediaQuery.addEventListener('change', updateViewport);
        return () => mediaQuery.removeEventListener('change', updateViewport);
    }, []);

    useEffect(() => {
        if (showSearch && !isDesktop) {
            searchInputRef.current?.focus({ preventScroll: true });
        }
    }, [showSearch, isDesktop]);
    
    // Filter states
    const [category, setCategory] = useState('');
    const [categories, setCategories] = useState([]);
    const [tag, setTag] = useState('');
    const [tags, setTags] = useState([]);
    
    // Dropdown states
    const [activeDropdown, setActiveDropdown] = useState(null);
    const filterRef = useRef(null);
    
    // Modal state
    const [selected, setSelected] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Handle back button for Modal
    useEffect(() => {
        const handlePopState = (e) => {
            if (e.state?.modal !== 'doaModal') {
                setShowModal(false);
                setModalOpen(false);
            }
        };

        if (showModal) {
            if (window.history.state?.modal !== 'doaModal') {
                window.history.pushState({ modal: 'doaModal' }, '');
            }
            window.addEventListener('popstate', handlePopState);
        }

        return () => {
            if (showModal) {
                window.removeEventListener('popstate', handlePopState);
                if (window.history.state?.modal === 'doaModal') {
                    window.history.back();
                }
            }
        };
    }, [showModal]);

    useEffect(() => {
        fetch('https://equran.id/api/doa')
            .then(r => r.json())
            .then(result => {
                const data = Array.isArray(result) ? result : (result.data || []);
                setAllDoa(data);
                
                // Extract unique categories and tags (similar to old extractAndRenderFilters)
                const uniqueGrups = new Set();
                const uniqueTags = new Set();
                data.forEach(item => {
                    if (item.grup) uniqueGrups.add(item.grup);
                    if (item.tag) {
                        if (Array.isArray(item.tag)) item.tag.forEach(t => uniqueTags.add(t));
                        else if (typeof item.tag === 'string') item.tag.split(',').forEach(t => uniqueTags.add(t.trim()));
                    }
                });
                
                setCategories([...uniqueGrups].sort());
                setTags([...uniqueTags].sort());
            })
            .catch(e => {
                console.error('Gagal memuat doa:', e);
                showAppToast('Gagal memuat kumpulan doa. Periksa koneksi Anda.', 'error');
            })
            .finally(() => setLoading(false));

        // Close dropdown when clicking outside
        const handleClickOutside = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close the search overlay only when the user intentionally scrolls down.
    useEffect(() => {
        const container = document.getElementById('doaContainer');
        if (!container) return;

        let ticking = false;
        let intentTimeout;
        const markUserScrollIntent = () => {
            userScrollIntent.current = true;
            clearTimeout(intentTimeout);
            intentTimeout = setTimeout(() => {
                userScrollIntent.current = false;
            }, 700);
        };
        const handleScroll = () => {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(() => {
                const currentScrollTop = container.scrollTop;
                const delta = currentScrollTop - lastScrollTop.current;
                if (showSearch && userScrollIntent.current && delta > 4 && currentScrollTop > 8) {
                    setShowSearch(false);
                    setActiveDropdown(null);
                }
                lastScrollTop.current = currentScrollTop;
                ticking = false;
            });
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        container.addEventListener('touchstart', markUserScrollIntent, { passive: true });
        container.addEventListener('wheel', markUserScrollIntent, { passive: true });
        return () => {
            container.removeEventListener('scroll', handleScroll);
            container.removeEventListener('touchstart', markUserScrollIntent);
            container.removeEventListener('wheel', markUserScrollIntent);
            clearTimeout(intentTimeout);
        };
    }, [showSearch]);

    useEffect(() => {
        lastScrollTop.current = 0;
    }, []);

    const toggleDropdown = (type) => {
        if (navigator.vibrate) navigator.vibrate(10);
        setActiveDropdown(activeDropdown === type ? null : type);
    };

    const selectFilter = (type, val) => {
        if (navigator.vibrate) navigator.vibrate(10);
        if (type === 'grup') setCategory(val);
        else setTag(val);
        setActiveDropdown(null);
    };

    const filtered = allDoa.filter(d => {
        if (category && d.grup !== category) return false;
        
        // Match tag if selected
        if (tag) {
            const itemTags = Array.isArray(d.tag) ? d.tag : (typeof d.tag === 'string' ? d.tag.split(',').map(t => t.trim()) : []);
            if (!itemTags.includes(tag)) return false;
        }

        if (search) return (d.nama || '').toLowerCase().includes(search.toLowerCase());
        return true;
    });

    const openDoa = (doa) => { 
        if (navigator.vibrate) navigator.vibrate(10);
        setSelected(doa); 
        setShowModal(true); 
        setModalOpen(true);
    };
    const closeModal = () => {
        setShowModal(false);
        setModalOpen(false);
    };

    return (
        <div id="doaContainer" className="app-view active flex flex-col h-full bg-slate-100 dark:bg-slate-950 overflow-y-auto no-scrollbar">

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
                titleNode="Kumpulan Doa"
                rightNode={
                    <button
                        type="button"
                        onClick={() => {
                            userScrollIntent.current = false;
                            if (!showSearch) setSearchGlassReady(false);
                            setShowSearch(isOpen => !isOpen);
                        }}
                        aria-label={showSearch ? 'Tutup pencarian doa' : 'Cari doa'}
                        aria-expanded={showSearch}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90"
                    >
                        {showSearch ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                    </button>
                }
            />
            <div className="h-[5.5rem] md:h-[7rem] shrink-0 w-full" />

            <div className="flex-1 relative z-10">
                {/* Doa list */}
                <phantom-ui
                    loading={loading ? '' : undefined}
                    count={8}
                    animation="pulse"
                    class="px-5 pt-2 space-y-3 pb-6 md:px-8 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0 md:content-start max-w-7xl mx-auto w-full block"
                >
                    {loading ? (
                        Array.from({length: 8}).map((_, i) => (
                            <div key={i} className="animate-pulse bg-white/50 dark:bg-slate-900/50 p-5 rounded-[1.8rem] border border-white dark:border-slate-800 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full w-20"></div>
                                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-3/4"></div>
                                </div>
                            </div>
                        ))
                    ) : (
                    filtered.map(doa => (
                        <button key={doa.id} onClick={() => openDoa(doa)}
                            className="bento-card group w-full bg-white dark:bg-slate-900 p-5 rounded-[1.8rem] border border-white dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all duration-300 cursor-pointer active:scale-[0.98] flex items-center justify-between text-left">
                            <div className="flex items-center gap-5 overflow-hidden">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/50 transition-transform duration-500">
                                    <BookHeart className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    {doa.grup && <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 dark:text-emerald-400 mb-1 block">{doa.grup}</span>}
                                    <h4 className="font-bold text-slate-700 dark:text-white text-sm group-hover:text-emerald-600 transition-colors line-clamp-2 leading-snug">{doa.nama}</h4>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all shrink-0 ml-3" />
                        </button>
                    ))
                    )}
                    {!loading && filtered.length === 0 && (
                        <div className="col-span-3 py-20 text-center opacity-60">
                            <p className="text-sm font-bold mb-2">Tidak ada doa ditemukan</p>
                            <p className="text-[11px] font-bold text-slate-400 mb-4">Coba ganti kata kunci atau reset filter.</p>
                            <button onClick={() => { setSearch(''); setCategory(''); setTag(''); }} 
                                className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition">
                                Reset Filter
                            </button>
                        </div>
                    )}
                    <div className="h-4 md:col-span-3"></div>
                </phantom-ui>
            </div>

            {createPortal(
                <AnimatePresence initial={false}>
                    {showSearch && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: searchGlassReady ? 1 : 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.16, ease: 'easeOut' }}
                            className="fixed top-[calc(env(safe-area-inset-top)+4.5rem)] md:top-[calc(env(safe-area-inset-top)+6rem)] left-0 right-0 z-[200] px-5 md:px-8 max-w-7xl mx-auto pointer-events-none"
                        >
                            <div className="pointer-events-auto origin-top">
                                <LiquidGlass
                                    tier="regular"
                                    displacementScale={85}
                                    refractionBlur={2}
                                    interactive={false}
                                    overflowVisible
                                    cornerRadius="rounded-[1.8rem]"
                                    onRefractionReady={handleSearchGlassReady}
                                    className="group px-5 py-4 shadow-sm focus-within:ring-4 focus-within:ring-emerald-500/10"
                                >
                                    <div className="relative z-10">
                                        <div className="flex items-center">
                                            <span className="flex shrink-0">
                                                <Search className="w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                            </span>
                                            <input
                                                ref={searchInputRef}
                                                value={search}
                                                onChange={event => setSearch(event.target.value)}
                                                placeholder="Cari doa sehari-hari..."
                                                aria-label="Cari doa"
                                                className="ml-4 w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 dark:text-white placeholder:text-slate-400 outline-none"
                                            />
                                            {search && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSearch('')}
                                                    aria-label="Hapus pencarian"
                                                    className="ml-2 text-slate-400 hover:text-slate-600"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 gap-3 relative z-30" ref={filterRef}>
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleDropdown('grup')}
                                                    className={`w-full backdrop-blur-sm text-[11px] font-bold py-3.5 px-4 rounded-2xl flex justify-between items-center outline-none active:scale-95 transition border ${category ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50' : 'bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 border-white/50 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800'}`}
                                                >
                                                    <span className="truncate mr-2">{category || 'Kategori'}</span>
                                                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-300 ${category ? 'text-emerald-500' : 'text-slate-400'} ${activeDropdown === 'grup' ? 'rotate-180' : ''}`} />
                                                </button>
                                                <div className={`absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto p-2 origin-top transition-all duration-300 no-scrollbar ${activeDropdown === 'grup' ? 'opacity-100 scale-100 block' : 'opacity-0 scale-95 hidden'}`}>
                                                    <div onClick={() => selectFilter('grup', '')} className="px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-emerald-500 hover:text-white rounded-xl cursor-pointer transition-all flex items-center justify-between group mb-1 last:mb-0">
                                                        <span>Semua Kategori</span>
                                                        {category === '' && <Check className="w-3 h-3" />}
                                                    </div>
                                                    {categories.map(item => (
                                                        <div key={item} onClick={() => selectFilter('grup', item)} className="px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-emerald-500 hover:text-white rounded-xl cursor-pointer transition-all flex items-center justify-between group mb-1 last:mb-0">
                                                            <span>{item}</span>
                                                            {category === item && <Check className="w-3 h-3" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleDropdown('tag')}
                                                    className={`w-full backdrop-blur-sm text-[11px] font-bold py-3.5 px-4 rounded-2xl flex justify-between items-center outline-none active:scale-95 transition border ${tag ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50' : 'bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 border-white/50 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800'}`}
                                                >
                                                    <span className="truncate mr-2">{tag || 'Tagar'}</span>
                                                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-300 ${tag ? 'text-emerald-500' : 'text-slate-400'} ${activeDropdown === 'tag' ? 'rotate-180' : ''}`} />
                                                </button>
                                                <div className={`absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto p-2 origin-top transition-all duration-300 no-scrollbar ${activeDropdown === 'tag' ? 'opacity-100 scale-100 block' : 'opacity-0 scale-95 hidden'}`}>
                                                    <div onClick={() => selectFilter('tag', '')} className="px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-emerald-500 hover:text-white rounded-xl cursor-pointer transition-all flex items-center justify-between group mb-1 last:mb-0">
                                                        <span>Semua Tagar</span>
                                                        {tag === '' && <Check className="w-3 h-3" />}
                                                    </div>
                                                    {tags.map(item => (
                                                        <div key={item} onClick={() => selectFilter('tag', item)} className="px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-emerald-500 hover:text-white rounded-xl cursor-pointer transition-all flex items-center justify-between group mb-1 last:mb-0">
                                                            <span>{item}</span>
                                                            {tag === item && <Check className="w-3 h-3" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </LiquidGlass>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Modal - Bottom Sheet */}
            <AnimatePresence>
            {showModal && (
                <div className={`fixed inset-0 z-[200] flex items-end sm:items-center justify-center`}>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                        className={`absolute inset-0 bg-slate-950/60 backdrop-blur-md`}
                        onClick={closeModal}
                    ></motion.div>

                    <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 1000 }}
                        dragElastic={0}
                        onDragEnd={(e, info) => {
                            if (info.offset.y > 100 || info.velocity.y > 500) {
                                closeModal();
                            }
                        }}
                        className={`relative w-full sm:w-[95%] md:max-w-6xl h-[85vh] flex flex-col bg-white dark:bg-slate-950 rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl border-t border-white/20 dark:border-slate-800 md:border md:border-slate-200 dark:md:border-slate-800 overflow-hidden pointer-events-auto`}
                    >
                        {/* Handle */}
                        <div 
                            className="w-full flex justify-center pb-4 pt-6 md:hidden touch-none cursor-grab active:cursor-grabbing"
                        >
                            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto shrink-0"></div>
                        </div>

                    {/* Header */}
                    <div className="px-8 py-4 md:py-6 flex justify-between items-center shrink-0 border-b border-slate-50 dark:border-slate-900/30 bg-white dark:bg-slate-950 z-10">
                        <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white pr-6 leading-tight">{selected?.nama || 'Detail Doa'}</h3>
                        <button onClick={closeModal} className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 transition active:scale-90 shrink-0">
                            <X className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    </div>

                    {/* Body */}
                    {selected && (
                        <div className="flex-1 flex flex-col md:flex-row-reverse overflow-hidden pb-[env(safe-area-inset-bottom)]">
                            {/* Arabic panel */}
                            <div className="w-full md:w-[45%] p-6 md:p-10 flex items-center justify-center bg-emerald-500/[0.03] dark:bg-emerald-500/[0.02] border-b md:border-b-0 md:border-l border-emerald-500/10 shrink-0 md:shrink">
                                <div className="text-center w-full">
                                    <p className="font-quran text-2xl leading-relaxed text-slate-800 dark:text-white text-balance" dir="rtl">{selected.ar || selected.arab || '-'}</p>
                                </div>
                            </div>

                            {/* Latin + translation */}
                            <div 
                                className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar bg-slate-50/50 dark:bg-slate-900/50"
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <div className="space-y-8">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 md:p-8 rounded-[2.5rem] border border-white dark:border-slate-800">
                                        <div>
                                            <p className="text-[10px] md:text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-3">Transliterasi</p>
                                            <p className="text-sm md:text-base font-medium text-slate-600 dark:text-slate-400 italic leading-relaxed">{selected.tr || selected.latin || '-'}</p>
                                        </div>
                                        <div className="pt-6 md:pt-8 border-t border-slate-200/50 dark:border-slate-800 mt-6 md:mt-8">
                                            <p className="text-[10px] md:text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-3">Terjemahan</p>
                                            <p className="text-sm md:text-base text-slate-700 dark:text-slate-200 leading-relaxed font-medium">{selected.idn || selected.arti || selected.terjemahan || '-'}</p>
                                        </div>
                                    </div>

                                    {(selected.riwayat || selected.tentang || selected.sumber) && (selected.riwayat !== "-" && selected.riwayat !== "") && (
                                        <div className="bg-slate-100/50 dark:bg-slate-900/30 p-6 rounded-[2rem] border border-slate-200/50 dark:border-slate-800/50">
                                            <div className="flex items-start gap-3">
                                                <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-sm">
                                                    <Info className="w-3.5 h-3.5 text-emerald-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sumber Doa</p>
                                                    <p className="text-[11px] md:text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed break-words">{selected.riwayat || selected.tentang || selected.sumber}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
            )}
            </AnimatePresence>

        </div>
    );
}
