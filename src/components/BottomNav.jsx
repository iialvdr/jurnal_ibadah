import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Home, ListChecks, BookOpen, Newspaper, User } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/store/AppContext';
import { useRef, useEffect, useState, useCallback } from 'react';
import LiquidGlass from '@/components/LiquidGlass';

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
    const { currentUser, modalOpen, bottomNavExtraNode } = useApp(state => ({
        currentUser: state.currentUser,
        modalOpen: state.modalOpen,
        bottomNavExtraNode: state.bottomNavExtraNode,
    }));
    const navRef = useRef(null);
    const indicatorRef = useRef(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ x: 0, width: 0, opacity: 0 });
    const buttonRefs = useRef([]);
    const [searchParams] = useSearchParams();

    const currentPath = location.pathname === '/' ? '/' : '/' + location.pathname.split('/')[1];
    const activeIndex = navItems.findIndex(item => item.path === currentPath);
    const dragPillScale = 1.55;

    // Measure both elements in the same viewport coordinate space so the pill
    // stays aligned even when the nav container has padding or transformed ancestors.
    const updateIndicatorTo = useCallback((index) => {
        const nav = navRef.current;
        const targetBtn = buttonRefs.current[index];
        if (!nav || !targetBtn) return;

        const navRect = nav.getBoundingClientRect();
        const buttonRect = targetBtn.getBoundingClientRect();
        if (buttonRect.width <= 0) return;

        const nextStyle = {
            x: buttonRect.left - navRect.left,
            width: buttonRect.width,
            opacity: 1,
        };
        setIndicatorStyle(previous =>
            previous.x === nextStyle.x &&
            previous.width === nextStyle.width &&
            previous.opacity === nextStyle.opacity
                ? previous
                : nextStyle
        );
    }, []);

    // Update sliding indicator position when active index changes
    // Must be called before any early return (Rules of Hooks)
    useEffect(() => {
        if (!currentUser || activeIndex === -1) return;
        updateIndicatorTo(activeIndex);
        const raf = requestAnimationFrame(() => updateIndicatorTo(activeIndex));
        const nav = navRef.current;
        const resizeObserver = nav && typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(() => updateIndicatorTo(activeIndex))
            : null;
        if (nav && resizeObserver) resizeObserver.observe(nav);
        const onResize = () => updateIndicatorTo(activeIndex);
        window.addEventListener('resize', onResize);
        return () => {
            cancelAnimationFrame(raf);
            resizeObserver?.disconnect();
            window.removeEventListener('resize', onResize);
        };
    }, [activeIndex, currentUser, updateIndicatorTo]);

    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragHoverIndex, setDragHoverIndex] = useState(null);
    const dragStartRef = useRef({ x: 0, y: 0, tracking: false, hasMoved: false });
    const dragPillBaseSizeRef = useRef({ width: 0, height: 0 });
    const touchHistoryRef = useRef([]);
    const draggedRecentlyRef = useRef(false);

    useEffect(() => {
        if (dragHoverIndex === activeIndex) {
            setDragHoverIndex(null);
        }
    }, [activeIndex, dragHoverIndex]);

    // Jangan tampilkan jika belum login
    // Jangan tampilkan jika belum login atau sedang berada di halaman Tanya Al-Qur'an
    if (!currentUser || location.pathname === '/tanya-quran') return null;

    const vib = () => { if (navigator.vibrate) navigator.vibrate(10); };

    const isSurahDetail = location.pathname === '/quran' && searchParams.has('s');
    const isArtikelDetail = location.pathname.startsWith('/artikel/') && location.pathname.split('/').length >= 3;
    const isQibla = location.pathname === '/qibla';
    const isTanyaQuran = location.pathname === '/tanya-quran';
    const shouldHide = modalOpen || isSurahDetail || isArtikelDetail || isQibla || isTanyaQuran;

    const handleTouchStart = (e) => {
        if (activeIndex === -1) return;
        const indicatorRect = indicatorRef.current?.getBoundingClientRect();
        if (indicatorRect) {
            dragPillBaseSizeRef.current = {
                width: indicatorRect.width,
                height: indicatorRect.height,
            };
        }
        const now = performance.now();
        const clientX = e.touches[0].clientX;
        dragStartRef.current = {
            x: clientX,
            y: e.touches[0].clientY,
            tracking: true,
            hasMoved: false,
        };
        touchHistoryRef.current = [{ x: clientX, t: now }];
    };

    const handleTouchMove = (e) => {
        if (!dragStartRef.current.tracking || !navRef.current) return;
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const deltaX = currentX - dragStartRef.current.x;
        const deltaY = currentY - dragStartRef.current.y;

        const now = performance.now();
        const hist = touchHistoryRef.current;
        hist.push({ x: currentX, t: now });
        if (hist.length > 5) hist.shift();

        if (!dragStartRef.current.hasMoved) {
            // Jangan blok scroll jika gesture dominan vertikal
            if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
                dragStartRef.current.tracking = false;
                return;
            }
            if (Math.abs(deltaX) > 6) {
                dragStartRef.current.hasMoved = true;
                setIsDragging(true);
            } else {
                return;
            }
        }

        const dragPillHeight = dragPillBaseSizeRef.current.height;
        const dragPillWidth = indicatorStyle.width
            ? dragPillHeight * dragPillScale
            : 0;
        const pillCenter = indicatorStyle.x + indicatorStyle.width / 2 + deltaX;
        const edgeOverflow = 16;
        const minCenter = dragPillWidth / 2 - edgeOverflow;
        const maxCenter = navRef.current.offsetWidth - dragPillWidth / 2 + edgeOverflow;
        const dampedDelta = Math.max(minCenter, Math.min(maxCenter, pillCenter))
            - (indicatorStyle.x + indicatorStyle.width / 2);

        setDragOffset(dampedDelta);

        const activeButton = buttonRefs.current[activeIndex];
        if (activeButton) {
            const activeRect = activeButton.getBoundingClientRect();
            const indicatorCenter = activeRect.left + activeRect.width / 2 + dampedDelta;
            let nearestIndex = activeIndex;
            let nearestDistance = Infinity;

            buttonRefs.current.forEach((button, index) => {
                if (!button) return;
                const rect = button.getBoundingClientRect();
                const distance = Math.abs(indicatorCenter - (rect.left + rect.width / 2));
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = index;
                }
            });

            setDragHoverIndex(nearestIndex);
        }
    };

    const handleTouchEnd = (e) => {
        if (!dragStartRef.current.tracking) return;
        const wasDragging = dragStartRef.current.hasMoved;
        dragStartRef.current.tracking = false;
        dragStartRef.current.hasMoved = false;

        const now = performance.now();
        const hist = touchHistoryRef.current;
        let velocity = 0;
        if (hist.length >= 2) {
            const first = hist[0];
            const last = hist[hist.length - 1];
            const dt = last.t - first.t;
            const timeSinceLast = now - last.t;
            if (timeSinceLast < 80 && dt > 0) {
                velocity = (last.x - first.x) / dt; // px per ms
            }
        }
        touchHistoryRef.current = [];

        if (wasDragging) {
            if (e && e.cancelable) {
                e.preventDefault();
            }
            draggedRecentlyRef.current = true;
            setTimeout(() => {
                draggedRecentlyRef.current = false;
            }, 150);
        }

        setIsDragging(false);

        if (navRef.current && activeIndex !== -1 && wasDragging) {
            const navWidth = navRef.current.offsetWidth;
            const itemWidth = navWidth / navItems.length;
            const threshold = itemWidth * 0.28;

            // Inersia fling: proyeksikan jarak luncur berdasarkan kecepatan lepas
            const inertiaDistance = velocity * 130;
            const projectedOffset = dragOffset + inertiaDistance;
            let targetIdx = activeIndex;

            if (projectedOffset > threshold) {
                const steps = Math.max(1, Math.round(projectedOffset / itemWidth));
                targetIdx = Math.min(navItems.length - 1, activeIndex + steps);
            } else if (projectedOffset < -threshold) {
                const steps = Math.max(1, Math.round(Math.abs(projectedOffset) / itemWidth));
                targetIdx = Math.max(0, activeIndex - steps);
            }

            if (targetIdx !== activeIndex && navItems[targetIdx]) {
                setDragHoverIndex(targetIdx);
                const totalSteps = Math.abs(targetIdx - activeIndex);
                if (totalSteps > 1 && navigator.vibrate) {
                    navigator.vibrate([8, 20, 8]);
                }
                navigateToTab(navItems[targetIdx].path, targetIdx);
            } else {
                setDragHoverIndex(null);
            }
        } else {
            setDragHoverIndex(null);
        }
        setDragOffset(0);
    };

    const navigateToTab = (path, targetIndex) => {
        vib();
        const destIdx = targetIndex !== undefined ? targetIndex : navItems.findIndex(item => item.path === path);
        if (destIdx !== -1) {
            updateIndicatorTo(destIdx);
        }

        if (path === currentPath) return;

        if (path === '/') {
            navigate('/', { replace: true });
        } else {
            navigate(path, { replace: currentPath !== '/', state: { fromHome: true } });
        }
    };

    const handleButtonClick = (path, index) => {
        if (draggedRecentlyRef.current) return;
        navigateToTab(path, index);
    };

    return (
        <div
            className="absolute bottom-0 left-0 right-0 z-[150] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 md:bottom-4 md:px-8 pointer-events-none flex flex-col items-center justify-end gap-2"
            style={{
                transform: shouldHide ? 'translateY(120%)' : 'translateY(0)',
                transition: 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
            }}
        >
            {/* Slider Extension (Floating Segmented Control Pill) */}
            <AnimatePresence>
                {bottomNavExtraNode && (
                    <LiquidGlass
                        as={motion.div}
                        key="bottom-nav-extra-slider"
                        overflowVisible
                        tier="regular"
                        refractionBlur={2}
                        elasticity={false}
                        cornerRadius="rounded-full"
                        initial={{ y: 34, scale: 0.84 }}
                        animate={{ y: 0, scale: 1, opacity: 1 }}
                        exit={{
                            y: 46,
                            scale: 0.8,
                            opacity: 0,
                            transition: {
                                duration: 0.25,
                                ease: [0.32, 0, 0.67, 0],
                            },
                        }}
                        transition={{
                            type: 'spring',
                            stiffness: 360,
                            damping: 27,
                            mass: 0.75,
                        }}
                        className="w-full max-w-[280px] p-1 flex relative shadow-lg shadow-emerald-500/5 dark:shadow-black/20 pointer-events-auto md:hidden z-0"
                        style={{
                            borderRadius: '9999px',
                            transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                        }}
                    >
                        <AnimatePresence mode="popLayout" initial={false}>
                            <motion.div
                                key={location.pathname}
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full flex"
                            >
                                {bottomNavExtraNode}
                            </motion.div>
                        </AnimatePresence>
                    </LiquidGlass>
                )}
            </AnimatePresence>

            {/* Main BottomNav Bar */}
            <LiquidGlass
                as={motion.div}
                layout
                elasticity={false}
                overflowVisible
                displacementScale={85}
                refractionBlur={2}
                cornerRadius="rounded-full"
                className="w-full max-w-md pointer-events-auto liquid-glass flex items-center justify-between px-2 h-[4.5rem] rounded-full relative z-10 select-none"
                style={{
                    borderRadius: '9999px',
                    transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                }}
            >
                <div
                    ref={navRef}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    className="w-full h-full flex items-center justify-between relative z-10 touch-pan-y"
                >
                    {/* Sliding Liquid Fluid Pill Indicator (Presisi, Rapi, Tanpa Deformasi Gepeng) */}
                    <div
                        className={`absolute top-2 bottom-2 bottom-nav-liquid-indicator pointer-events-none ${
                            isDragging ? 'z-20' : 'z-0'
                        }`}
                        ref={indicatorRef}
                        style={{
                            left: 0,
                            width: indicatorStyle.width,
                            transform: `translate3d(${indicatorStyle.x + dragOffset}px, 0, 0) scale(${isDragging && indicatorStyle.width ? (dragPillBaseSizeRef.current.height * dragPillScale) / dragPillBaseSizeRef.current.width : 1}, ${isDragging ? dragPillScale : 1})`,
                            transformOrigin: 'center center',
                            zIndex: isDragging ? 20 : 0,
                            opacity: indicatorStyle.opacity,
                            transition: isDragging
                                ? 'transform 0.16s cubic-bezier(0.2, 0.8, 0.2, 1)'
                                : 'transform 0.55s cubic-bezier(0.2, 1.1, 0.3, 1), width 0.48s cubic-bezier(0.2, 1, 0.3, 1), opacity 0.2s ease',
                            willChange: isDragging ? 'transform' : 'auto',
                        }}
                    >
                        <LiquidGlass
                            refractionPreset="switcher"
                            interactive={false}
                            className="liquid-glass-indicator h-full w-full rounded-full pointer-events-none"
                        />
                    </div>

                {navItems.map((item, index) => {
                    const isActive = currentPath === item.path;
                    const isHighlighted = isActive || dragHoverIndex === index;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.path}
                            ref={el => buttonRefs.current[index] = el}
                            onClick={() => handleButtonClick(item.path, index)}
                            className={`flex min-w-0 flex-1 flex-col items-center justify-center h-16 py-2 rounded-full relative transition-all duration-300 z-10 select-none ${
                                isHighlighted
                                    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
                            }`}
                        >
                            <Icon
                                className="transition-all duration-300 w-[22px] h-[22px] mb-1 drop-shadow-[0_1px_1px_rgba(0,0,0,0.06)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                                strokeWidth={isHighlighted ? 2.6 : 2.2}
                                style={{
                                    transform: isHighlighted ? 'translateY(-1px) scale(1.06)' : 'translateY(0) scale(1)',
                                    transition: 'transform 0.25s ease',
                                }}
                            />
                            <span
                                className="text-[10px] font-black tracking-tight leading-3 overflow-hidden"
                                style={{
                                    maxHeight: isHighlighted ? '12px' : '0px',
                                    opacity: isHighlighted ? 1 : 0,
                                    transition: 'max-height 0.3s ease, opacity 0.25s ease',
                                }}
                            >
                                {item.label}
                            </span>
                        </button>
                    );
                })}
                </div>
            </LiquidGlass>
        </div>
    );
}
