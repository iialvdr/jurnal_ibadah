import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import LiquidGlass from '@/components/LiquidGlass';

export default function TabSlider({ tabs, activeTab, onChange, className = '' }) {
    const containerRef = useRef(null);
    const indicatorTrackRef = useRef(null);
    const indicatorRef = useRef(null);
    const buttonRefs = useRef([]);
    const [indicatorStyle, setIndicatorStyle] = useState({ x: 0, width: 0, opacity: 0 });
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [indicatorReady, setIndicatorReady] = useState(false);
    const [dragHoverIndex, setDragHoverIndex] = useState(null);
    const indicatorReadyRef = useRef(false);
    const indicatorReadyRafRef = useRef(null);
    const dragStartRef = useRef({ x: 0, y: 0, tracking: false, hasMoved: false });
    const touchHistoryRef = useRef([]);
    const draggedRecentlyRef = useRef(false);

    const activeIdx = Math.max(0, tabs.findIndex(t => t.id === activeTab));
    const tabCount = tabs.length;
    const dragScaleY = 1.55;
    const dragScaleX = 0.9;

    const updateIndicatorTo = useCallback((index) => {
        const track = indicatorTrackRef.current;
        const targetButton = buttonRefs.current[index];
        if (!track || !targetButton) return;

        if (targetButton.offsetWidth <= 0) return;

        const nextStyle = {
            x: targetButton.offsetLeft - track.offsetLeft,
            width: targetButton.offsetWidth,
            opacity: 1,
        };
        setIndicatorStyle(previous =>
            previous.x === nextStyle.x &&
            previous.width === nextStyle.width &&
            previous.opacity === nextStyle.opacity
                ? previous
                : nextStyle
        );
        if (!indicatorReadyRef.current) {
            indicatorReadyRef.current = true;
            indicatorReadyRafRef.current = requestAnimationFrame(() => setIndicatorReady(true));
        }
    }, []);

    useLayoutEffect(() => {
        if (activeIdx < 0 || activeIdx >= tabCount) return;
        updateIndicatorTo(activeIdx);
        const container = containerRef.current;
        const resizeObserver = container && typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(() => updateIndicatorTo(activeIdx))
            : null;
        if (resizeObserver) {
            if (container) resizeObserver.observe(container);
            buttonRefs.current.forEach(button => {
                if (button) resizeObserver.observe(button);
            });
        }
        const onResize = () => updateIndicatorTo(activeIdx);
        window.addEventListener('resize', onResize);

        return () => {
            resizeObserver?.disconnect();
            window.removeEventListener('resize', onResize);
        };
    }, [activeIdx, tabCount, updateIndicatorTo]);

    useLayoutEffect(() => () => {
        if (indicatorReadyRafRef.current !== null) {
            cancelAnimationFrame(indicatorReadyRafRef.current);
            indicatorReadyRef.current = false;
        }
    }, []);

    const handleTouchStart = (e) => {
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
        if (!dragStartRef.current.tracking || !containerRef.current) return;
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const deltaX = currentX - dragStartRef.current.x;
        const deltaY = currentY - dragStartRef.current.y;

        const now = performance.now();
        const hist = touchHistoryRef.current;
        hist.push({ x: currentX, t: now });
        if (hist.length > 5) hist.shift();

        if (!dragStartRef.current.hasMoved) {
            // Jangan blok scroll vertikal jika gesture dominan vertikal
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

        const track = indicatorTrackRef.current;
        const dragPillWidth = indicatorStyle.width * dragScaleX;
        const pillCenter = indicatorStyle.x + indicatorStyle.width / 2 + deltaX;
        const edgeOverflow = 16;
        const minCenter = dragPillWidth / 2 - edgeOverflow;
        const maxCenter = track.offsetWidth - dragPillWidth / 2 + edgeOverflow;
        const dampedDelta = Math.max(minCenter, Math.min(maxCenter, pillCenter))
            - (indicatorStyle.x + indicatorStyle.width / 2);

        setDragOffset(dampedDelta);

        const activeButton = buttonRefs.current[activeIdx];
        if (activeButton) {
            const activeRect = activeButton.getBoundingClientRect();
            const indicatorCenter = activeRect.left + activeRect.width / 2 + dampedDelta;
            let nearestIndex = activeIdx;
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
                velocity = (last.x - first.x) / dt; // px/ms
            }
        }
        touchHistoryRef.current = [];

        if (wasDragging) {
            if (e && e.cancelable) e.preventDefault();
            draggedRecentlyRef.current = true;
            setTimeout(() => {
                draggedRecentlyRef.current = false;
            }, 150);
        }

        setIsDragging(false);
        setDragHoverIndex(null);

        if (containerRef.current && wasDragging) {
            const width = containerRef.current.offsetWidth;
            const tabWidth = width / tabCount;
            const threshold = tabWidth * 0.25;

            // Inersia fling: proyeksikan jarak luncur berdasarkan kecepatan lepas
            const inertiaDistance = velocity * 130;
            const projectedOffset = dragOffset + inertiaDistance;
            let targetIdx = activeIdx;

            if (projectedOffset > threshold) {
                const steps = Math.max(1, Math.round(projectedOffset / tabWidth));
                targetIdx = Math.min(tabCount - 1, activeIdx + steps);
            } else if (projectedOffset < -threshold) {
                const steps = Math.max(1, Math.round(Math.abs(projectedOffset) / tabWidth));
                targetIdx = Math.max(0, activeIdx - steps);
            }

            if (targetIdx !== activeIdx && tabs[targetIdx]) {
                const totalSteps = Math.abs(targetIdx - activeIdx);
                if (totalSteps > 1 && navigator.vibrate) {
                    navigator.vibrate([8, 20, 8]);
                } else if (navigator.vibrate) {
                    navigator.vibrate(8);
                }
                onChange(tabs[targetIdx].id);
            }
        }
        setDragOffset(0);
    };

    const handleTabClick = (tabId) => {
        if (draggedRecentlyRef.current) return;
        if (navigator.vibrate) navigator.vibrate(5);
        onChange(tabId);
    };

    const stopPageSwipe = (event) => {
        event.stopPropagation();
    };

    // ponytail: desktop mouse-drag touch emulation skipped, add when browser emulator requires mouse-drag testing
    return (
        <div
            ref={containerRef}
            onTouchStart={event => {
                stopPageSwipe(event);
                handleTouchStart(event);
            }}
            onTouchMove={event => {
                stopPageSwipe(event);
                handleTouchMove(event);
            }}
            onTouchEnd={event => {
                stopPageSwipe(event);
                handleTouchEnd(event);
            }}
            onTouchCancel={event => {
                stopPageSwipe(event);
                handleTouchEnd(event);
            }}
            className={`relative flex w-full p-1 select-none touch-pan-y cursor-grab active:cursor-grabbing ${className}`}
        >
            {/* Sliding Fluid Glass Pill (Presisi, Halus, Tanpa Deformasi Gepeng) */}
            <div
                ref={indicatorTrackRef}
                className={`absolute inset-1 pointer-events-none overflow-visible ${isDragging ? 'z-20' : 'z-0'}`}
            >
                <div
                    ref={indicatorRef}
                    className="absolute inset-y-0 left-0 pointer-events-none"
                    style={{
                        width: indicatorStyle.width,
                        transform: `translate3d(${indicatorStyle.x + dragOffset}px, 0, 0) scale(${isDragging ? dragScaleX : 1}, ${isDragging ? dragScaleY : 1})`,
                        transformOrigin: 'center center',
                        zIndex: isDragging ? 20 : 0,
                        opacity: indicatorStyle.opacity,
                        transition: !indicatorReady
                            ? 'none'
                            : isDragging
                                ? 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
                                : 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1), width 0.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease',
                    }}
                >
                    <LiquidGlass
                        refractionPreset="switcher"
                        interactive={false}
                        className="liquid-glass-indicator h-full w-full rounded-full pointer-events-none"
                    />
                </div>
            </div>

            {/* Tab Buttons */}
            {tabs.map((tab, idx) => {
                const isHighlighted = activeIdx === idx || dragHoverIndex === idx;

                return (
                    <button
                        key={tab.id}
                        type="button"
                        ref={element => { buttonRefs.current[idx] = element; }}
                        onClick={() => handleTabClick(tab.id)}
                        className={`relative z-10 focus:outline-none flex-1 py-2 px-3 rounded-full text-xs tracking-tight transition-all duration-300 select-none ${
                            isHighlighted
                                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
                        }`}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
