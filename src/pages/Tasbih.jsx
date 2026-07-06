// src/pages/Tasbih.jsx
import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, RotateCcw, Vibrate, X } from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import TopNavConfig from '@/components/TopNavConfig';
import { useApp } from '@/store/AppContext';
import useSwipe from '@/hooks/useSwipe';

const TASBIH_PRESETS = [
    { label: 'Subhanallah', arabic: 'سُبْحَانَ اللَّهِ', latin: 'Subhanallah', target: 33 },
    { label: 'Alhamdulillah', arabic: 'الْحَمْدُ لِلَّهِ', latin: 'Alhamdulillah', target: 33 },
    { label: 'Allahu Akbar', arabic: 'اللَّهُ أَكْبَرُ', latin: 'Allahu Akbar', target: 33 },
    { label: 'Laa Ilaaha Illallah', arabic: 'لَا إِلَهَ إِلَّا اللَّهُ', latin: 'Laa Ilaaha Illallah', target: 100 },
    { label: 'Astaghfirullah', arabic: 'أَسْتَغْفِرُ اللَّهَ', latin: 'Astaghfirullah', target: 100 },
    { label: 'Hasbunallah', arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ', latin: 'Hasbunallah Wa Ni\'mal Wakil', target: 450 },
];

export default function Tasbih() {
    const navigate = useNavigate();
    const [count, setCount] = useState(0);
    const [target, setTarget] = useState(33); // 0 = tak terhingga
    const [selectedDhikr, setSelectedDhikr] = useState(null);
    const [vibroOn, setVibroOn] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const { setModalOpen } = useApp();
    const dragControls = useDragControls();

    // Handle back button for Modal
    useEffect(() => {
        let isPopped = false;
        
        const handlePopState = () => {
            isPopped = true;
            setShowMenu(false);
        };

        if (showMenu) {
            window.history.pushState({ modal: 'tasbihMenu' }, '');
            window.addEventListener('popstate', handlePopState);
        }

        return () => {
            if (showMenu) {
                window.removeEventListener('popstate', handlePopState);
                if (!isPopped) {
                    window.history.back();
                }
            }
        };
    }, [showMenu]);
    
    // Sync global modalOpen flag
    useEffect(() => {
        setModalOpen(showMenu);
        return () => setModalOpen(false);
    }, [showMenu, setModalOpen]);
    
    // Ripple Effect state
    const [ripple, setRipple] = useState(false);
    const [glow, setGlow] = useState(false);

    const lastTapRef = useRef(0);

    const handleTap = useCallback(() => {
        const now = Date.now();
        if (now - lastTapRef.current < 80) return; // debounce
        lastTapRef.current = now;
        
        if (vibroOn && navigator.vibrate) navigator.vibrate(8);
        setCount(c => c + 1);

        // trigger effects
        setRipple(true);
        setGlow(true);
        setTimeout(() => setRipple(false), 200);
        setTimeout(() => setGlow(false), 500);
    }, [vibroOn]);

    const handleReset = () => {
        if (vibroOn && navigator.vibrate) navigator.vibrate([20, 30, 20]);
        setCount(0);
    };

    const handleSetTarget = (t) => {
        if (vibroOn && navigator.vibrate) navigator.vibrate(15);
        setTarget(t);
        setCount(0);
    };

    const selectDhikr = (preset) => {
        setSelectedDhikr(preset);
        setTarget(preset.target);
        setCount(0);
        setShowMenu(false);
    };

    const removeDhikr = () => {
        setSelectedDhikr(null);
        setTarget(33);
        setCount(0);
    };

    // Calculate indicator position for target pill
    const targetIdx = target === 33 ? 0 : target === 100 ? 1 : 2;
    
    return (
        <div className="app-view active flex flex-col h-full absolute inset-0 z-50 transition-all duration-300 overflow-y-auto bg-slate-100 dark:bg-slate-950 no-scrollbar">
            {/* Background Decor */}
            <div className="fixed top-0 left-0 right-0 h-64 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none z-0"></div>

            {/* Header */}
            <TopNavConfig 
                leftNode={
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90 group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
                    </button>
                }
                titleNode="Tasbih Digital"
                rightNode={<div className="w-10"></div>}
            />
            <div className="h-[5.5rem] md:h-[7rem] shrink-0 w-full" />

            {/* Content Area */}
            <div className="relative z-10 px-5 pt-4 pb-32 md:pb-12 md:px-8 w-full max-w-7xl mx-auto md:grid md:grid-cols-12 md:gap-8 md:items-start animate-[fadeIn_0.35s_ease-out]">
                
                {/* Left/Top: Tap Area */}
                <div className="md:col-span-7 lg:col-span-8 flex flex-col items-center justify-center py-6 md:py-12 relative z-10">
                    <div className="relative group cursor-pointer active:scale-95 transition-transform duration-150 select-none touch-none" onPointerDown={handleTap}>
                        {/* Glow Behind */}
                        <div className={`absolute inset-4 bg-emerald-500/15 dark:bg-emerald-500/10 rounded-full blur-[60px] transition-all duration-500 ${glow ? 'scale-125 opacity-100' : 'scale-110 opacity-70'}`}></div>
                        
                        {/* Tap Circle */}
                        <div className="relative w-64 h-64 sm:w-72 sm:h-72 md:w-[380px] md:h-[380px] bg-white/80 dark:bg-slate-900/50 backdrop-blur-2xl rounded-full border-[8px] md:border-[12px] border-white dark:border-slate-800 shadow-2xl flex flex-col items-center justify-center overflow-hidden transition-all duration-300">
                            {/* Inner Ripple */}
                            <div className={`absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-emerald-400/5 to-transparent transition-opacity duration-200 ${ripple ? 'opacity-100' : 'opacity-0'}`}></div>
                            
                            <span className="text-7xl md:text-9xl font-black text-slate-800 dark:text-white tracking-tighter tabular-nums transition-all duration-200 relative z-10">{count}</span>
                            
                            <div className="mt-4 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-inner relative z-10">
                                <span className="text-[10px] md:text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Target: {target === 0 ? '∞' : target}</span>
                            </div>
                        </div>
                    </div>
                    <p className="mt-8 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">Ketuk lingkaran untuk menghitung</p>
                </div>

                {/* Right/Bottom: Controls */}
                <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-5 md:sticky md:top-24 h-fit relative z-20 mt-8 md:mt-0">
                    
                    {/* Target Pill */}
                    <div>
                        <div className="relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-1 rounded-full flex w-full shadow-sm border border-white/40 dark:border-slate-700/50 overflow-hidden">
                            <div className="absolute top-1 bottom-1 w-[calc((100%-0.5rem)/3)] bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 transition-transform duration-300 ease-in-out z-0" style={{ transform: `translateX(calc(${targetIdx * 100}% + ${targetIdx * 0}px))` }}></div>
                            
                            <button onClick={() => handleSetTarget(33)} className={`relative z-10 flex-1 py-3 text-xs font-bold transition-all duration-300 ${target === 33 ? 'text-emerald-600 font-black' : 'text-slate-400'}`}>33</button>
                            <button onClick={() => handleSetTarget(100)} className={`relative z-10 flex-1 py-3 text-xs font-bold transition-all duration-300 ${target === 100 ? 'text-emerald-600 font-black' : 'text-slate-400'}`}>100</button>
                            <button onClick={() => handleSetTarget(0)} className={`relative z-10 flex-1 py-3 text-xl leading-none pb-2 font-bold transition-all duration-300 ${target === 0 ? 'text-emerald-600 font-black' : 'text-slate-400'}`}>∞</button>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center mt-3">∞ = tanpa batas</p>
                    </div>

                    {/* Dhikr Area */}
                    <div className="w-full text-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-[2.5rem] shadow-xl border border-white/50 dark:border-slate-800 relative overflow-hidden transition-all duration-500">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8"></div>
                        
                        {!selectedDhikr ? (
                            <div className="flex flex-col items-center justify-center py-2 relative z-10 transition-all">
                                <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center mb-2 text-emerald-600">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Pilih bacaan dzikir</p>
                            </div>
                        ) : (
                            <div className="space-y-3 relative z-10 pt-2 transition-all">
                                <h3 className="text-3xl font-bold font-quran text-slate-800 dark:text-white leading-loose">{selectedDhikr.arabic}</h3>
                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 italic tracking-wide">{selectedDhikr.latin}</p>
                            </div>
                        )}
                        {/* Content */}
                        <div 
                            className="flex flex-col flex-1 shrink-0 px-6 sm:px-0"
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <button onClick={() => setShowMenu(true)} className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-500/20 active:scale-95 shadow-sm">
                                {selectedDhikr ? 'Ganti Bacaan' : 'Pilih Bacaan'}
                            </button>
                            {selectedDhikr && (
                                <button onClick={removeDhikr} className="w-full py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all active:scale-95">
                                    Hapus Bacaan
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Lower Controls */}
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <button onClick={handleReset} className="flex flex-col items-center justify-center gap-2 p-5 rounded-[2rem] bg-white dark:bg-slate-900 border border-white dark:border-slate-800 text-slate-500 font-black text-[9px] uppercase tracking-widest hover:text-rose-500 transition-all active:scale-95 group shadow-sm">
                            <RotateCcw className="w-5 h-5 group-hover:-rotate-90 transition-transform duration-500" /> RESET
                        </button>
                        <button onClick={() => setVibroOn(v => !v)} className={`flex flex-col items-center justify-center gap-2 p-5 rounded-[2rem] border font-black text-[9px] uppercase tracking-widest shadow-sm transition-all active:scale-95 ${vibroOn ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' : 'bg-white dark:bg-slate-900 border-white dark:border-slate-800 text-slate-400'}`}>
                            <Vibrate className={`w-5 h-5 ${!vibroOn && 'opacity-50'}`} /> <span>GETAR {vibroOn ? 'ON' : 'OFF'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Dhikr Selection Modal */}
            <AnimatePresence>
            {showMenu && (
                <div className={`fixed inset-0 z-[200] flex items-end sm:items-center justify-center`}>
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                        className={`absolute inset-0 bg-slate-950/60 backdrop-blur-md`} 
                        onClick={() => setShowMenu(false)}
                    ></motion.div>
                    
                    {/* Modal Content */}
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
                                setShowMenu(false);
                            }
                        }}
                        className={`relative w-full sm:w-[92%] sm:max-w-lg bg-white dark:bg-slate-950 p-6 sm:p-8 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl border-t border-white/20 dark:border-slate-800 h-[85vh] sm:h-[80vh] flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)] pointer-events-auto`}
                    >
                        <div 
                            className="w-full sm:hidden flex justify-center pb-5 pt-2 -mt-2 touch-none cursor-grab active:cursor-grabbing shrink-0"
                        >
                            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto sm:mb-2 shrink-0"></div>
                        </div>
                    <div className="flex justify-between items-center mb-6 px-1 shrink-0">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Pilih Bacaan</h3>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">Pilih dzikir dengan target otomatis</p>
                        </div>
                        <button onClick={() => setShowMenu(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 transition">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    
                    {/* List Area */}
                    <div className="flex-1 overflow-y-auto space-y-3 pb-4 no-scrollbar">
                        {TASBIH_PRESETS.map((p, i) => (
                            <button key={i} onClick={() => selectDhikr(p)}
                                className={`w-full text-left bg-white dark:bg-slate-900 border ${selectedDhikr?.label === p.label ? 'border-emerald-500 shadow-md shadow-emerald-500/10' : 'border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800'} p-5 rounded-2xl transition-all active:scale-[0.98]`}>
                                <div className="flex justify-between items-start gap-4 mb-2">
                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">{p.label}</h4>
                                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md shrink-0">Target: {p.target}</span>
                                </div>
                                <p className="text-right text-2xl font-quran text-slate-800 dark:text-white leading-loose my-2" dir="rtl">{p.arabic}</p>
                                <p className="text-[10px] italic text-slate-500 dark:text-slate-400">"{p.latin}"</p>
                            </button>
                        ))}
                        <div className="h-6"></div>
                    </div>
                </motion.div>
            </div>
            )}
            </AnimatePresence>
            
        </div>
    );
}
