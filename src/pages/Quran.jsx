// src/pages/Quran.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useApp } from '@/store/AppContext';
import { db } from '@/config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { 
    ArrowLeft, Search, Bookmark, BookmarkCheck, ChevronDown, ChevronUp, X, 
    Play, Pause, Loader2, SkipBack, SkipForward, Volume2, BookOpen, ChevronRight, ChevronLeft 
} from 'lucide-react';
import "@aejkatappaja/phantom-ui";

// In-Memory Cache untuk preload ayat surah
const ayatCache = {};

export default function Quran() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { currentUser, showAppToast } = useApp();
    const [surahList, setSurahList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState(true);
    const lastScrollY = useRef(0);
    const [selectedSurah, setSelectedSurah] = useState(null);
    const [ayats, setAyats] = useState([]);
    const [loadingAyats, setLoadingAyats] = useState(false);
    const [bookmarked, setBookmarked] = useState(null); 

    // Audio & Tafsir States
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [playingAyat, setPlayingAyat] = useState(null);
    const [tafsirData, setTafsirData] = useState({});
    const [loadingTafsir, setLoadingTafsir] = useState({});
    const audioRef = useRef(null);       // Audio element aktif (sedang bermain)
    const nextAudioRef = useRef(null);   // Audio element buffer (preload ayat berikutnya)
    const playingAyatRef = useRef(null); // Sinkron dengan playingAyat, bisa dibaca di closure tanpa stale
    const ayatsRef = useRef([]);         // Sinkron dengan ayats state, bisa dibaca di closure tanpa stale
    const scrolledAheadRef = useRef(false); // Mencegah scroll dobel dalam satu ayat

    // Initial Load
    useEffect(() => {
        fetch('https://equran.id/api/v2/surat')
            .then(r => r.json())
            .then(d => { setSurahList(d.data || []); setLoading(false); })
            .catch(() => setLoading(false));
            
        // Fetch Last Read Bookmark
        if (currentUser) {
            getDoc(doc(db, "users", currentUser.uid, "quran", "last_read")).then(snap => {
                if(snap.exists()) {
                    setBookmarked(snap.data());
                }
            });
        }
    }, [currentUser]);

    // Navigate from Last Read
    useEffect(() => {
        if (location.state?.surah && surahList.length > 0) {
            const surah = surahList.find(s => s.nomor === location.state.surah);
            if (surah) openSurah(surah, location.state.ayat);
        }
    }, [location.state, surahList]);

    // Sinkronisasi dengan tombol Back Browser / Perangkat (mendeteksi perubahan URL param 's')
    useEffect(() => {
        const surahId = searchParams.get('s');
        if (!surahId && selectedSurah) {
            stopAudio();
            setSelectedSurah(null);
            setAyats([]);
        } else if (surahId && surahList.length > 0) {
            const sid = parseInt(surahId);
            if (!selectedSurah || selectedSurah.nomor !== sid) {
                const surah = surahList.find(s => s.nomor === sid);
                if (surah) openSurah(surah, null, true);
            }
        }
    }, [searchParams, surahList]);

    // Sinkron ayatsRef setiap kali ayats berubah (tidak recreate audio element!)
    useEffect(() => {
        ayatsRef.current = ayats;
    }, [ayats]);

    // Helper: pasang event listener ke sebuah audio element
    const setupAudioEvents = (aud) => {
        // Reset flag scroll-ahead setiap ganti ayat
        scrolledAheadRef.current = false;

        aud.onplay    = () => { setIsPlaying(true);  setIsBuffering(false); };
        aud.onpause   = () => { setIsPlaying(false); setIsBuffering(false); };
        aud.onwaiting = () => setIsBuffering(true);
        aud.onstalled = () => setIsBuffering(true);
        aud.onplaying = () => setIsBuffering(false);

        // Scroll ke ayat berikutnya 0.8 detik sebelum audio habis
        const SCROLL_AHEAD_SEC = 0.8;
        aud.ontimeupdate = () => {
            if (scrolledAheadRef.current) return; // Sudah scroll, skip
            const { duration, currentTime } = aud;
            if (!duration || !isFinite(duration)) return;
            if (duration - currentTime > SCROLL_AHEAD_SEC) return;

            // Tandai sudah scroll agar tidak scroll lagi
            scrolledAheadRef.current = true;

            const curr = playingAyatRef.current;
            if (curr === null) return;
            const list = ayatsRef.current;
            const nextAyat = list.find(a => a.nomorAyat === curr + 1);
            if (!nextAyat) return;

            const el = document.getElementById(`ayat-${nextAyat.nomorAyat}`);
            const container = document.getElementById('quranDetailContainer');
            if (el && container) {
                const elRect = el.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                const scrollTop = container.scrollTop + elRect.top - containerRect.top - 100;
                container.scrollTo({ top: scrollTop, behavior: 'smooth' });
            }
        };
    };

    // Helper: preload ayat berikutnya ke buffer — membaca dari ayatsRef (selalu fresh)
    const preloadNextAyat = (currentAyatNum) => {
        const list = ayatsRef.current;
        const next = list.find(a => a.nomorAyat === currentAyatNum + 1);
        if (!next) { nextAudioRef.current = null; return; }
        const url = next.audio['05'] || next.audio['01'];
        if (!url)  { nextAudioRef.current = null; return; }
        const buf = new Audio();
        buf.preload = 'auto';
        buf.src = url;
        nextAudioRef.current = buf;
    };

    // Handler: dipanggil saat ayat selesai — membaca ayatsRef (selalu fresh, tidak stale)
    const handleAudioEnded = () => {
        const curr = playingAyatRef.current;
        if (curr === null) return;

        const list = ayatsRef.current;
        const nextAyat = list.find(a => a.nomorAyat === curr + 1);
        if (!nextAyat) {
            setIsPlaying(false);
            setPlayingAyat(null);
            playingAyatRef.current = null;
            return;
        }

        const expectedUrl = nextAyat.audio['05'] || nextAyat.audio['01'];
        if (!expectedUrl) { setIsPlaying(false); setPlayingAyat(null); playingAyatRef.current = null; return; }

        // Cek apakah buffer sudah preload ayat ini
        const buf = nextAudioRef.current;
        const fname = expectedUrl.split('/').pop().split('?')[0];
        const useBuffer = buf && buf.src && buf.src.includes(fname) && buf.readyState > 0;

        // Lepaskan onended dari element lama sebelum swap
        const oldAud = audioRef.current;
        if (oldAud) oldAud.onended = null;

        let nextAud;
        if (useBuffer) {
            nextAud = buf;
        } else {
            nextAud = new Audio();
            nextAud.src = expectedUrl;
        }

        setupAudioEvents(nextAud);
        nextAud.onended = handleAudioEnded;
        audioRef.current = nextAud;

        nextAud.play().catch(() => {});
        playingAyatRef.current = nextAyat.nomorAyat;
        setPlayingAyat(nextAyat.nomorAyat);
        preloadNextAyat(nextAyat.nomorAyat);
        // Scroll sudah ditangani oleh ontimeupdate (0.8 detik sebelum audio selesai)
    };

    // Setup Audio Player — dibuat SEKALI saja, tidak di-recreate saat ayats berubah
    useEffect(() => {
        const aud = new Audio();
        audioRef.current = aud;
        setupAudioEvents(aud);
        aud.onended = handleAudioEnded;
        return () => {
            aud.onended = null;
            aud.pause();
            aud.src = '';
            if (nextAudioRef.current) {
                nextAudioRef.current.src = '';
                nextAudioRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // <- empty deps: buat audio element SEKALI, bukan setiap ayats berubah

    // Update onended saat ayats/handler berubah (tanpa recreate element audio)
    useEffect(() => {
        const aud = audioRef.current;
        if (!aud) return;
        aud.onended = handleAudioEnded;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ayats]);

    // Deteksi Scroll untuk Sembunyikan Search
    const searchVisibleRef = useRef(true);
    useEffect(() => {
        const container = document.getElementById('quranDetailContainer');
        if (!container || selectedSurah) return;

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
    }, [selectedSurah]);

    // Force show search bar every time we go back to the Surah List
    useEffect(() => {
        if (!selectedSurah) {
            setShowSearch(true);
            searchVisibleRef.current = true;
        }
    }, [selectedSurah]);

    const playAyat = (ayat) => {
        if (navigator.vibrate) navigator.vibrate(10);
        const url = ayat.audio['05'] || ayat.audio['01'];
        if (!url) return;

        const currentAud = audioRef.current;
        if (!currentAud) return;

        if (playingAyat === ayat.nomorAyat && isPlaying) {
            currentAud.pause();
        } else if (playingAyat === ayat.nomorAyat && !isPlaying) {
            currentAud.play().catch(() => {});
        } else {
            // Hentikan audio sebelumnya
            currentAud.pause();

            // Cek apakah buffer sudah preload ayat ini
            const buf = nextAudioRef.current;
            const fname = url.split('/').pop().split('?')[0];
            const useBuffer = buf && buf.src && buf.src.includes(fname) && buf.readyState > 0;

            let aud;
            if (useBuffer) {
                aud = buf;
                setupAudioEvents(aud);
                aud.onended = handleAudioEnded;
                audioRef.current = aud;
            } else {
                const newAud = new Audio();
                newAud.src = url;
                setupAudioEvents(newAud);
                newAud.onended = handleAudioEnded;
                audioRef.current = newAud;
                aud = newAud;
            }

            aud.play().catch(() => {});
            playingAyatRef.current = ayat.nomorAyat;
            setPlayingAyat(ayat.nomorAyat);

            // Langsung preload ayat berikutnya
            preloadNextAyat(ayat.nomorAyat);
        }
    };

    const stopAudio = () => {
        if (audioRef.current) { audioRef.current.pause(); }
        nextAudioRef.current = null;
        playingAyatRef.current = null;
        setPlayingAyat(null);
        setIsPlaying(false);
    };

    const playAdjacentAyat = (delta) => {
        if (navigator.vibrate) navigator.vibrate(10);
        if (!playingAyat) return;
        const target = ayats.find(a => a.nomorAyat === playingAyat + delta);
        if (target) {
            playAyat(target);
            setTimeout(() => {
                const el = document.getElementById(`ayat-${target.nomorAyat}`);
                const container = document.getElementById('quranDetailContainer');
                if (el && container) {
                    const elRect = el.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    const scrollTop = container.scrollTop + elRect.top - containerRect.top - 100;
                    container.scrollTo({ top: scrollTop, behavior: 'smooth' });
                }
            }, 100);
        }
    };

    const openSurah = async (surah, scrollToAyat = null, fromUrl = false, replaceHistory = false) => {
        if (!fromUrl) {
            setSearchParams({ s: surah.nomor }, { replace: replaceHistory });
        }
        stopAudio();
        setSelectedSurah(surah);
        setTafsirData({});
        
        const executeScroll = () => {
            // Segera paksa halaman ke paling atas untuk mencegah scroll list surah terbawa
            setTimeout(() => {
                const container = document.getElementById('quranDetailContainer');
                if (container && (!scrollToAyat || scrollToAyat === 'null')) {
                    container.scrollTop = 0;
                }
            }, 10);

            // Jika ada ayat yang dituju, tunggu komponen selesai merender baru gulir ke sana
            if (scrollToAyat && scrollToAyat !== 'null') {
                setTimeout(() => {
                    const el = document.getElementById(`ayat-${scrollToAyat}`);
                    const container = document.getElementById('quranDetailContainer');
                    if (el && container) {
                        const elRect = el.getBoundingClientRect();
                        const containerRect = container.getBoundingClientRect();
                        const scrollTop = container.scrollTop + elRect.top - containerRect.top - 100;
                        container.scrollTo({ top: scrollTop, behavior: 'smooth' });
                    }
                }, 600);
            }
        };

        // Gunakan cache jika sudah ada (instan loading)
        if (ayatCache[surah.nomor]) {
            setAyats(ayatCache[surah.nomor]);
            setLoadingAyats(false);
            executeScroll();
        } else {
            setLoadingAyats(true);
            try {
                const res = await fetch(`https://equran.id/api/v2/surat/${surah.nomor}`);
                const data = await res.json();
                const fetchedAyats = data.data?.ayat || [];
                ayatCache[surah.nomor] = fetchedAyats;
                setAyats(fetchedAyats);
                executeScroll();
            } catch { showAppToast('Gagal memuat surah', 'error'); }
            finally { setLoadingAyats(false); }
        }

        // Background Preload: Unduh diam-diam surah tetangga agar siap dipakai
        const neighbors = [surah.nomor - 1, surah.nomor + 1];
        neighbors.forEach(num => {
            if (num >= 1 && num <= 114 && !ayatCache[num]) {
                fetch(`https://equran.id/api/v2/surat/${num}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.code === 200 && data.data?.ayat) {
                            ayatCache[num] = data.data.ayat;
                        }
                    }).catch(() => {});
            }
        });
    };

    const changeSurah = (delta) => {
        if (navigator.vibrate) navigator.vibrate(10);
        if (!selectedSurah) return;
        const nextNum = selectedSurah.nomor + delta;
        const nextSurah = surahList.find(s => s.nomor === nextNum);
        if (nextSurah) {
            const container = document.getElementById('quranDetailContainer');
            if (container) container.scrollTop = 0;
            openSurah(nextSurah, null, false, true);
        }
    };

    const toggleTafsir = async (ayatNum) => {
        if (navigator.vibrate) navigator.vibrate(10);
        if (tafsirData[ayatNum] !== undefined) {
            setTafsirData(prev => {
                const n = {...prev};
                delete n[ayatNum];
                return n;
            });
            return;
        }

        setLoadingTafsir(prev => ({...prev, [ayatNum]: true}));
        try {
            const cacheKey = `tafsir_${selectedSurah.nomor}_${ayatNum}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                setTafsirData(prev => ({...prev, [ayatNum]: cached}));
                return;
            }
            const res = await fetch(`https://equran.id/api/v2/tafsir/${selectedSurah.nomor}`);
            const result = await res.json();
            if (result.code === 200 && result.data?.tafsir) {
                result.data.tafsir.forEach(item => {
                    localStorage.setItem(`tafsir_${selectedSurah.nomor}_${item.ayat}`, item.teks);
                });
                const t = result.data.tafsir.find(x => x.ayat === ayatNum);
                setTafsirData(prev => ({...prev, [ayatNum]: t ? t.teks : 'Tafsir tidak tersedia.'}));
            }
        } catch {
            showAppToast('Gagal memuat tafsir', 'error');
        } finally {
            setLoadingTafsir(prev => { const n = {...prev}; delete n[ayatNum]; return n; });
        }
    };

    const saveBookmark = async (ayat) => {
        if (!currentUser || !selectedSurah) return;
        
        const isDeleting = bookmarked && bookmarked.surah === selectedSurah.nomor && bookmarked.ayat === ayat.nomorAyat;
        
        try {
            if (isDeleting) {
                setBookmarked(null);
                showAppToast('Bookmark dihapus', 'success');
            } else {
                const data = {
                    surah: selectedSurah.nomor,
                    ayat: ayat.nomorAyat,
                    name: selectedSurah.namaLatin,
                    savedAt: new Date()
                };
                await setDoc(doc(db, "users", currentUser.uid, "quran", "last_read"), data);
                setBookmarked(data);
                showAppToast(`Bookmark disimpan - ${selectedSurah.namaLatin} : ${ayat.nomorAyat}`, 'success');
            }
            window.dispatchEvent(new CustomEvent('bookmarkUpdated'));
        } catch { showAppToast('Gagal menyimpan bookmark', 'error'); }
    };

    const filtered = surahList.filter(s =>
        s.namaLatin?.toLowerCase().includes(search.toLowerCase()) ||
        s.arti?.toLowerCase().includes(search.toLowerCase()) ||
        String(s.nomor).includes(search)
    );

    if (selectedSurah) {
        const hasPrev = selectedSurah.nomor > 1;
        const hasNext = selectedSurah.nomor < 114;
        
        return (
            <div id="quranDetailContainer" className="app-view active h-full bg-slate-100 dark:bg-slate-950 no-scrollbar overflow-y-auto absolute inset-0 z-40">
                <div className="fixed top-0 left-0 right-0 h-96 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none z-0"></div>
                
                {/* Header Detail Surah */}
                <div className="sticky top-0 z-[130] px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-3 md:px-8 md:pt-6">
                    <div className="glass-pill flex items-center justify-between p-2 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-sm w-full max-w-7xl mx-auto">
                        <button onClick={() => { 
                            stopAudio(); 
                            setSelectedSurah(null); 
                            setAyats([]); 
                            navigate(-1); 
                        }} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90 group">
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
                        </button>
                        <h2 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight text-center flex-1 truncate px-2">{selectedSurah.namaLatin}</h2>
                        <div className="w-10"></div> 
                    </div>
                </div>

                <div className="relative z-10 w-full max-w-4xl mx-auto pt-8">
                    {/* Bismillah */}
                    {selectedSurah.nomor !== 1 && selectedSurah.nomor !== 9 && (
                        <div className="text-center py-8 mb-6 px-5 md:py-12 animate-fade-in-up stagger-1">
                            <div className="inline-block p-5 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border border-white/50 dark:border-slate-800 shadow-sm mb-4 md:p-6 md:rounded-[2.5rem]">
                                <p className="font-quran text-2xl text-emerald-600 dark:text-emerald-400 drop-shadow-sm leading-relaxed">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
                            </div>
                        </div>
                    )}

                    {/* Ayat List with Phantom UI Skeleton */}
                    <phantom-ui 
                        loading={loadingAyats ? '' : undefined} 
                        count={3} 
                        animation="pulse"
                        class="px-5 pb-40 space-y-6 md:px-8 block"
                    >
                        {loadingAyats ? (
                            [...Array(5)].map((_, i) => (
                                <div key={`skeleton-ayat-${i}`} className="bg-white dark:bg-slate-900 rounded-[1.8rem] p-5 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden mb-6">
                                    <div className="flex justify-between items-center mb-6 border-b border-slate-50 dark:border-slate-800/50 pb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-100 dark:border-emerald-800/30"></div>
                                        </div>
                                        <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400"></div>
                                    </div>
                                    <div className="flex flex-col items-end space-y-3 mb-8 mt-2">
                                        <div className="h-10 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-full max-w-[90%]"></div>
                                        <div className="h-10 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-full max-w-[65%]"></div>
                                    </div>
                                    <div className="space-y-4 bg-slate-50/50 dark:bg-slate-800/30 -mx-5 -mb-5 p-5 border-t border-slate-100 dark:border-slate-800">
                                        <div className="h-3 bg-slate-200 dark:bg-slate-700/50 rounded w-16"></div>
                                        <div className="h-3 bg-slate-200 dark:bg-slate-700/50 rounded w-3/4 mb-4"></div>
                                        
                                        <div className="h-3 bg-slate-200 dark:bg-slate-700/50 rounded w-20 mt-6"></div>
                                        <div className="space-y-2 mt-2">
                                            <div className="h-3 bg-slate-200 dark:bg-slate-700/50 rounded w-full"></div>
                                            <div className="h-3 bg-slate-200 dark:bg-slate-700/50 rounded w-11/12"></div>
                                            <div className="h-3 bg-slate-200 dark:bg-slate-700/50 rounded w-4/5"></div>
                                        </div>
                                    </div>
                                </div>
                            ))
                            ) : (
                                ayats.map((ayat, i) => {
                                    const isAyatPlaying = playingAyat === ayat.nomorAyat;
                                    const isBookmarked = bookmarked && bookmarked.surah === selectedSurah.nomor && bookmarked.ayat === ayat.nomorAyat;
                                    
                                    return (
                                        <div key={ayat.nomorAyat} id={`ayat-${ayat.nomorAyat}`} 
                                             className={`animate-fade-in-up bg-white dark:bg-slate-900 rounded-[1.8rem] p-5 shadow-sm border relative overflow-hidden group transition-all duration-300 ${isAyatPlaying ? 'border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800'}`}
                                             style={{ animationDelay: `${i * 0.05}s` }}>
                                            
                                            {/* Ayat header */}
                                            <div className="flex justify-between items-center mb-6 border-b border-slate-50 dark:border-slate-800/50 pb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-100 dark:border-emerald-800/30">
                                                        {ayat.nomorAyat}
                                                    </div>
                                                    <button onClick={() => saveBookmark(ayat)} className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90`}>
                                                        <Bookmark className={`w-4 h-4 transition-colors ${isBookmarked ? 'fill-emerald-500 text-emerald-500' : 'text-slate-300 hover:text-emerald-500'}`} />
                                                    </button>
                                                </div>
                                                <button onClick={() => playAyat(ayat)} className={`play-audio-btn w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 ${isAyatPlaying ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-emerald-500 hover:text-white'}`}>
                                                    {isAyatPlaying && isBuffering ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                                                     isAyatPlaying && isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> :
                                                     <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                                                </button>
                                            </div>
                                            
                                            {/* Arabic */}
                                            <div className="text-right mb-6">
                                                <p className="font-quran text-[1.7rem] leading-[2.4] text-slate-800 dark:text-white" dir="rtl">{ayat.teksArab}</p>
                                            </div>
                                            
                                            {/* Translation & Latin */}
                                            <div className="space-y-3 bg-slate-50/50 dark:bg-slate-800/30 -mx-5 -mb-5 p-5 border-t border-slate-100 dark:border-slate-800">
                                                <p className="text-emerald-600 text-[10px] font-bold tracking-widest uppercase">Latin</p>
                                                <p className="text-slate-500 dark:text-slate-400 text-xs italic mb-2 leading-relaxed">"{ayat.teksLatin}"</p>
                                                <p className="text-emerald-600 text-[10px] font-bold tracking-widest uppercase mt-3">Artinya</p>
                                                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{ayat.teksIndonesia}</p>
                                                
                                                {/* Tafsir Toggle */}
                                                <div className="pt-3 mt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                                                    <button onClick={() => toggleTafsir(ayat.nomorAyat)} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg hover:text-emerald-600 transition-all active:scale-95">
                                                        <BookOpen className="w-3 h-3" /> <span>{tafsirData[ayat.nomorAyat] ? 'Tutup Tafsir' : 'Tafsir'}</span>
                                                    </button>
                                                    
                                                    {/* Tafsir Content */}
                                                    {(tafsirData[ayat.nomorAyat] || loadingTafsir[ayat.nomorAyat]) && (
                                                        <div className="mt-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in">
                                                            {loadingTafsir[ayat.nomorAyat] 
                                                                ? <p className="text-xs text-slate-400 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Memuat tafsir...</p>
                                                                : <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">{tafsirData[ayat.nomorAyat]}</p>
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                    </phantom-ui>
                </div>

                {/* Floating Nav Buttons */}
                <div className="fixed bottom-8 left-5 right-5 flex justify-between gap-4 z-[120] transition-transform duration-500 max-w-lg mx-auto">
                    <button onClick={() => changeSurah(-1)} disabled={loadingAyats} style={{ display: hasPrev ? 'flex' : 'none' }} className="flex-1 glass-pill bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 rounded-3xl border border-white/50 dark:border-slate-700 shadow-2xl text-slate-600 dark:text-slate-300 font-bold text-xs items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100">
                        <ChevronLeft className="w-5 h-5 text-emerald-500" /> Sebelumnya
                    </button>
                    <button onClick={() => changeSurah(1)} disabled={loadingAyats} style={{ display: hasNext ? 'flex' : 'none' }} className="flex-1 bg-emerald-500 p-4 rounded-3xl shadow-2xl shadow-emerald-500/30 text-white font-bold text-xs items-center justify-center gap-3 active:scale-95 hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:scale-100">
                        Selanjutnya <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Sticky Audio Player */}
                <div className={`fixed left-4 right-4 z-[125] transition-all duration-500 max-w-xl mx-auto ${playingAyat ? 'bottom-24 opacity-100 translate-y-0 scale-100 pointer-events-auto ease-[cubic-bezier(0.34,1.56,0.64,1)]' : '-bottom-24 opacity-0 translate-y-12 scale-95 pointer-events-none ease-in'}`}>
                    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/60 shadow-2xl rounded-2xl px-3 py-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                {isBuffering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Audio Tilawah</p>
                                <p className="text-[11px] font-bold text-slate-800 dark:text-white truncate">QS. {selectedSurah?.namaLatin}</p>
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">Ayat {playingAyat}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => playAdjacentAyat(-1)} disabled={playingAyat === 1} className="w-8 h-8 rounded-full bg-white/60 dark:bg-slate-800/80 text-slate-500 dark:text-slate-300 flex items-center justify-center border border-white/50 dark:border-slate-700 active:scale-95 transition disabled:opacity-40">
                                <SkipBack className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { isPlaying ? audioRef.current.pause() : audioRef.current.play() }} className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-95 transition">
                                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                            </button>
                            <button onClick={() => playAdjacentAyat(1)} disabled={playingAyat === ayats.length} className="w-8 h-8 rounded-full bg-white/60 dark:bg-slate-800/80 text-slate-500 dark:text-slate-300 flex items-center justify-center border border-white/50 dark:border-slate-700 active:scale-95 transition disabled:opacity-40">
                                <SkipForward className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={stopAudio} className="w-8 h-8 rounded-full bg-white/60 dark:bg-slate-800/80 text-slate-500 dark:text-slate-300 flex items-center justify-center border border-white/50 dark:border-slate-700 active:scale-95 transition">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div id="quranDetailContainer" className="app-view active h-full absolute inset-0 z-40 overflow-y-auto bg-slate-100 dark:bg-slate-950 no-scrollbar">
            <div className="fixed top-0 left-0 right-0 h-80 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none z-0"></div>
            
            <div className="sticky top-0 z-[130] px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-3 md:px-8 md:pt-6">
                <div className="glass-pill flex items-center justify-between p-2 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-sm w-full max-w-7xl mx-auto">
                    <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90 group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
                    </button>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight text-center flex-1 truncate px-2">Al-Qur'an</h2>
                    <div className="w-10"></div> 
                </div>
            </div>

            <div className="relative z-10 w-full mx-auto">
                {/* Sticky Wrapper - Tidak Boleh Dianimasi! */}
                <div className="sticky top-[85px] z-40 px-5 pt-2 pb-4 md:px-8 max-w-7xl mx-auto pointer-events-none">
                    {/* Inner Wrapper - Dikhususkan Untuk Transisi/Animasi via Inline Style untuk garansi 100% mulus */}
                    <div 
                        className="pointer-events-auto transform origin-top"
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
                                <input value={search} onChange={e => setSearch(e.target.value)}
                                    placeholder="Cari surat atau arti..."
                                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 dark:text-white placeholder:text-slate-400 ml-4 outline-none" />
                                {search && <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button>}
                            </div>
                        </div>
                    </div>
                </div>

                <phantom-ui 
                    loading={loading ? '' : undefined} 
                    count={9} 
                    animation="pulse"
                    class="px-5 pb-12 space-y-3 md:px-8 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0 max-w-7xl mx-auto block"
                >
                    {loading ? (
                            [...Array(12)].map((_, i) => (
                                <div key={`skeleton-surah-${i}`} className="group bg-white dark:bg-slate-900 p-3.5 md:py-5 md:px-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between relative overflow-hidden md:min-h-[90px] mb-3 md:mb-0">
                                    <div className="flex items-center gap-3.5 md:gap-5 relative z-10 w-full">
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-100 dark:bg-slate-800/60 shrink-0"></div>
                                        <div className="flex-1 space-y-3 min-w-0 py-1">
                                            <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded-md w-32"></div>
                                            <div className="h-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-md w-20"></div>
                                        </div>
                                        <div className="text-right pl-2 shrink-0">
                                            <div className="h-6 w-16 bg-slate-100 dark:bg-slate-800/60 rounded-md"></div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            filtered.map((surah, index) => {
                                const isLastRead = bookmarked && bookmarked.surah === surah.nomor;
                                const borderClass = isLastRead ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800';
                                
                                return (
                                    <div key={surah.nomor} onClick={() => openSurah(surah, isLastRead ? bookmarked.ayat : null)}
                                        className={`animate-fade-in-up group bg-white dark:bg-slate-900 p-3.5 md:py-5 md:px-5 rounded-2xl border ${borderClass} shadow-sm active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-between relative overflow-hidden hover:border-emerald-300 dark:hover:border-emerald-700 md:min-h-[90px]`}
                                        style={{ animationDelay: `${index * 0.03}s` }}>
                                        
                                        <div className="flex items-center gap-3.5 md:gap-5 relative z-10 w-full">
                                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm md:text-base flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/50 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-sm">
                                                {surah.nomor}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {isLastRead && (
                                                    <div className="mb-1 animate-fade-in">
                                                        <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md font-bold border border-emerald-200 dark:border-emerald-800">
                                                            Terakhir: Ayat {bookmarked.ayat}
                                                        </span>
                                                    </div>
                                                )}
                                                <h4 className="font-bold text-slate-700 dark:text-white text-sm md:text-base group-hover:text-emerald-600 transition-colors truncate">{surah.namaLatin}</h4>
                                                <p className="text-[10px] md:text-xs text-slate-400 font-medium">{surah.arti} • {surah.jumlahAyat} Ayat</p>
                                            </div>
                                            <div className="text-right pl-2 shrink-0">
                                                <span className="font-quran text-lg text-slate-300 dark:text-slate-700 group-hover:text-emerald-500/30 transition-colors">{surah.nama}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                </phantom-ui>
            </div>
        </div>
    );
}
