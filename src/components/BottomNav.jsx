import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Home, ListChecks, BookOpen, Newspaper, User } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/store/AppContext';
import { useRef, useEffect, useState } from 'react';

const navItems = [
    { path: '/', label: 'Beranda', icon: Home },
    { path: '/tracker', label: 'Jurnal', icon: ListChecks },
    { path: '/quran', label: "Qur'an", icon: BookOpen },
    { path: '/artikel', label: 'Artikel', icon: Newspaper },
    { path: '/profile', label: 'Profil', icon: User },
];

export default function BottomNav() {
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser, modalOpen, bottomNavExtraNode } = useApp();
    const navRef = useRef(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
    const buttonRefs = useRef([]);
    const [searchParams] = useSearchParams();

    const currentPath = location.pathname === '/' ? '/' : '/' + location.pathname.split('/')[1];
    const activeIndex = navItems.findIndex(item => item.path === currentPath);

    // Update sliding indicator position when active index changes
    // Must be called before any early return (Rules of Hooks)
    useEffect(() => {
        if (!currentUser) return;
        const activeBtn = buttonRefs.current[activeIndex];
        const navBar = navRef.current;
        if (activeBtn && navBar) {
            const navRect = navBar.getBoundingClientRect();
            const btnRect = activeBtn.getBoundingClientRect();
            setIndicatorStyle({
                left: btnRect.left - navRect.left,
                width: btnRect.width,
                opacity: 1,
            });
        }
    }, [activeIndex, currentUser]);

    // Jangan tampilkan jika belum login
    if (!currentUser) return null;

    const vib = () => { if (navigator.vibrate) navigator.vibrate(10); };

    const isSurahDetail = location.pathname === '/quran' && searchParams.has('s');
    const isArtikelDetail = location.pathname.startsWith('/artikel/') && location.pathname.split('/').length >= 3;
    const isQibla = location.pathname === '/qibla';
    const shouldHide = modalOpen || isSurahDetail || isArtikelDetail || isQibla;

    return (
        <div
            className="absolute bottom-0 left-0 right-0 z-[150] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 md:bottom-4 md:px-8 pointer-events-none flex flex-col items-center justify-end"
            style={{
                transform: shouldHide ? 'translateY(120%)' : 'translateY(0)',
                transition: 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
            }}
        >
            <motion.div 
                layout
                className="w-full max-w-md pointer-events-auto bg-white/20 dark:bg-slate-900/30 backdrop-blur-2xl border border-white/30 dark:border-slate-700/50 rounded-[2.25rem] flex flex-col p-1.5 relative shadow-2xl shadow-emerald-500/10 dark:shadow-black/40 gap-1.5"
                style={{ borderRadius: '2.25rem' }}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5 rounded-[2.25rem] pointer-events-none"></div>

                {/* Slider Extension Container */}
                <AnimatePresence>
                    {bottomNavExtraNode && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, height: 0 }}
                            animate={{ opacity: 1, scale: 1, height: 'auto' }}
                            exit={{ opacity: 0, scale: 0.95, height: 0 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="w-full relative z-10 shrink-0 overflow-hidden md:hidden"
                        >
                            <div className="w-full shrink-0 bg-white/50 dark:bg-black/30 border border-white/30 dark:border-white/5 rounded-full flex p-1.5 relative shadow-inner" style={{ borderRadius: '9999px' }}>
                                <div className="relative flex w-full h-full items-center overflow-hidden rounded-full">
                                    <AnimatePresence mode="popLayout" initial={false}>
                                        <motion.div
                                            key={location.pathname}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -15 }}
                                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                            className="w-full flex"
                                        >
                                            {bottomNavExtraNode}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main BottomNav Container */}
                <motion.div 
                    layout="position"
                    ref={navRef}
                    className="w-full shrink-0 h-16 bg-white/50 dark:bg-black/30 border border-white/30 dark:border-white/5 rounded-full flex items-center justify-between p-2 px-2.5 relative overflow-hidden z-10"
                    style={{ borderRadius: '9999px' }}
                >

                    {/* Sliding pill indicator */}
                    <div
                        className="absolute top-2 bottom-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 z-0"
                        style={{
                            left: indicatorStyle.left,
                            width: indicatorStyle.width,
                            opacity: indicatorStyle.opacity,
                            transition: 'left 0.3s ease, width 0.3s ease, opacity 0.2s ease',
                        }}
                    />

                {navItems.map((item, index) => {
                    const isActive = currentPath === item.path;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.path}
                            ref={el => buttonRefs.current[index] = el}
                            onClick={() => {
                                vib();
                                if (isActive) return;

                                if (item.path === '/') {
                                    // Kembali ke Home
                                    if (location.state?.fromHome) {
                                        navigate(-1); // Pop history agar tidak menumpuk
                                    } else {
                                        navigate('/', { replace: true });
                                    }
                                } else {
                                    // Pindah ke Tab lain
                                    if (currentPath === '/') {
                                        // Dari Home ke Tab -> Push history agar tombol Back OS kembali ke Home
                                        navigate(item.path, { state: { fromHome: true } });
                                    } else {
                                        // Dari Tab ke Tab -> Replace history agar tidak kebanyakan Back
                                        navigate(item.path, { replace: true, state: { fromHome: true } });
                                    }
                                }
                            }}
                            className={`flex flex-col items-center justify-center flex-1 max-w-[4.5rem] h-12 rounded-full relative transition-all duration-300 z-10 ${
                                isActive
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'
                            }`}
                        >
                            <Icon
                                className="transition-all duration-300 w-5 h-5 mb-0.5"
                                strokeWidth={isActive ? 2.5 : 2}
                                style={{
                                    transform: isActive ? 'translateY(-1px) scale(1.05)' : 'translateY(0) scale(1)',
                                    transition: 'transform 0.25s ease',
                                }}
                            />
                            <span
                                className="text-[9px] font-bold tracking-tight overflow-hidden"
                                style={{
                                    maxHeight: isActive ? '12px' : '0px',
                                    opacity: isActive ? 1 : 0,
                                    transition: 'max-height 0.3s ease, opacity 0.25s ease',
                                }}
                            >
                                {item.label}
                            </span>
                        </button>
                    );
                })}
                </motion.div>
            </motion.div>
        </div>
    );
}
