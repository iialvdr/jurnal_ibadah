// src/pages/Doa.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, Info, ChevronDown, BookHeart, ChevronRight, Check } from 'lucide-react';
import { useApp } from '@/store/AppContext';

export default function Doa() {
    const navigate = useNavigate();
    const { showAppToast } = useApp();
    const [allDoa, setAllDoa] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState(true);
    const lastScrollY = useRef(0);
    const searchVisibleRef = useRef(true);
    
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

    // Deteksi Scroll untuk Sembunyikan Search
    useEffect(() => {
        const container = document.getElementById('doaContainer');
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
                            setActiveDropdown(null); // Tutup dropdown saat scroll
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
    };
    const closeModal = () => setShowModal(false);

    return (
        <div id="doaContainer" className="app-view active flex flex-col h-full bg-slate-100 dark:bg-slate-950 overflow-y-auto no-scrollbar">

            {/* Gradient top */}
            <div className="fixed top-0 left-0 right-0 h-80 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none z-0"></div>

            {/* Header - glass pill */}
            <div className="sticky top-0 z-50 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-3 md:px-8 md:pt-6">
                <div className="flex items-center justify-between p-2 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-sm w-full max-w-7xl mx-auto">
                    <button onClick={() => { if (navigator.vibrate) navigator.vibrate(10); navigate('/'); }}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90 group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
                    </button>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight text-center flex-1 truncate px-2">Kumpulan Doa</h2>
                    <div className="w-10"></div>
                </div>
            </div>

            <div className="flex-1 relative z-10">
                <div className="px-5 pt-2 md:px-8 md:max-w-7xl md:mx-auto md:w-full">
                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Cari berdasarkan judul doa, lalu gunakan filter bila perlu.</p>
                </div>
                
                {/* Search & Filters container */}
                <div className="sticky top-[85px] z-40 px-5 pt-3 pb-4 md:px-8 max-w-7xl mx-auto pointer-events-none">
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
                                    placeholder="Cari doa sehari-hari..."
                                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 dark:text-white placeholder:text-slate-400 ml-4 outline-none"
                                />
                                {search && (
                                    <button onClick={() => setSearch('')}>
                                        <X className="w-4 h-4 text-slate-400" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Filter Dropdowns (Grid 2 cols like old design) */}
                        <div className="grid grid-cols-2 gap-3 relative z-30" ref={filterRef}>
                            {/* Kategori Dropdown */}
                            <div className="relative">
                                <button onClick={() => toggleDropdown('grup')} 
                                    className={`w-full backdrop-blur-sm text-[11px] font-bold py-3.5 px-5 rounded-2xl flex justify-between items-center outline-none active:scale-95 transition border ${category ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50' : 'bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 border-white/50 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800'}`}>
                                    <span className="truncate mr-2">{category || 'Kategori'}</span>
                                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-300 ${category ? 'text-emerald-500' : 'text-slate-400'} ${activeDropdown === 'grup' ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {/* Dropdown Menu */}
                                <div className={`absolute top-full left-0 right-0 mt-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto p-2 origin-top transition-all duration-300 no-scrollbar ${activeDropdown === 'grup' ? 'opacity-100 scale-100 block' : 'opacity-0 scale-95 hidden'}`}>
                                    <div onClick={() => selectFilter('grup', '')} className="px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-emerald-500 hover:text-white rounded-xl cursor-pointer transition-all flex items-center justify-between group mb-1 last:mb-0">
                                        <span>Semua Kategori</span>
                                        {category === '' && <Check className="w-3 h-3" />}
                                    </div>
                                    {categories.map(c => (
                                        <div key={c} onClick={() => selectFilter('grup', c)} className="px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-emerald-500 hover:text-white rounded-xl cursor-pointer transition-all flex items-center justify-between group mb-1 last:mb-0">
                                            <span>{c}</span>
                                            {category === c && <Check className="w-3 h-3" />}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tagar Dropdown */}
                            <div className="relative">
                                <button onClick={() => toggleDropdown('tag')} 
                                    className={`w-full backdrop-blur-sm text-[11px] font-bold py-3.5 px-5 rounded-2xl flex justify-between items-center outline-none active:scale-95 transition border ${tag ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50' : 'bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 border-white/50 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800'}`}>
                                    <span className="truncate mr-2">{tag || 'Tagar'}</span>
                                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-300 ${tag ? 'text-emerald-500' : 'text-slate-400'} ${activeDropdown === 'tag' ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {/* Dropdown Menu */}
                                <div className={`absolute top-full left-0 right-0 mt-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto p-2 origin-top transition-all duration-300 no-scrollbar ${activeDropdown === 'tag' ? 'opacity-100 scale-100 block' : 'opacity-0 scale-95 hidden'}`}>
                                    <div onClick={() => selectFilter('tag', '')} className="px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-emerald-500 hover:text-white rounded-xl cursor-pointer transition-all flex items-center justify-between group mb-1 last:mb-0">
                                        <span>Semua Tagar</span>
                                        {tag === '' && <Check className="w-3 h-3" />}
                                    </div>
                                    {tags.map(t => (
                                        <div key={t} onClick={() => selectFilter('tag', t)} className="px-4 py-3 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-emerald-500 hover:text-white rounded-xl cursor-pointer transition-all flex items-center justify-between group mb-1 last:mb-0">
                                            <span>{t}</span>
                                            {tag === t && <Check className="w-3 h-3" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Doa list */}
                <div className="px-5 pt-2 space-y-3 pb-6 md:px-8 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0 md:content-start max-w-7xl mx-auto w-full">
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
                </div>
            </div>

            {/* Modal - Bottom Sheet */}
            <div className={`fixed inset-0 z-[200] flex items-end sm:items-center justify-center pointer-events-none`}>
                <div
                    className={`absolute inset-0 bg-slate-950/60 backdrop-blur-md ${showModal ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}
                    onClick={closeModal}
                    style={{ transition: 'opacity 0.4s ease-out' }}
                ></div>

                <div
                    className={`relative w-full sm:w-[95%] md:max-w-6xl h-[85vh] flex flex-col bg-white dark:bg-slate-950 rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl border-t border-white/20 dark:border-slate-800 md:border md:border-slate-200 dark:md:border-slate-800 overflow-hidden ${showModal ? 'opacity-100 translate-y-0 sm:scale-100 pointer-events-auto' : 'opacity-0 translate-y-full sm:translate-y-10 sm:scale-95'}`}
                    style={{ transition: 'all 0.5s cubic-bezier(0.32,0.72,0,1)' }}
                >
                    {/* Handle */}
                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mt-6 mb-2 shrink-0 md:hidden"></div>

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
                            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 no-scrollbar bg-white dark:bg-slate-950">
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
                </div>
            </div>
        </div>
    );
}
