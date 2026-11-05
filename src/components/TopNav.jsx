import { useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { topNavStore } from '@/store/topNavStore';
import { useApp } from '@/store/AppContext';
import LiquidGlass from '@/components/LiquidGlass';

export default function TopNav() {
    const { leftNode, titleNode, rightNode, extraNode, className, hide } = useSyncExternalStore(
        topNavStore.subscribe,
        topNavStore.getState
    );
    const { modalOpen } = useApp();
    const shouldHide = hide || modalOpen;

    return (
        <AnimatePresence>
            {!shouldHide && (
                <motion.div 
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute top-0 left-0 right-0 z-50 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-2 md:px-8 pointer-events-none"
                >
                    <LiquidGlass
                        elasticity={false}
                        displacementScale={85}
                        refractionBlur={2}
                        cornerRadius="rounded-full"
                        className={`pointer-events-auto liquid-glass flex items-center justify-between px-3 py-1.5 md:px-4 md:py-2 rounded-full w-full max-w-2xl md:max-w-7xl mx-auto ${className || ''}`}
                    >
                        {/* LEFT */}
                        <div className="shrink-0 flex items-center min-w-8 relative z-10">
                            {leftNode}
                        </div>
                        
                        {/* CENTER */}
                        <div className="flex-1 flex justify-center items-center overflow-hidden px-2 relative z-10">
                            {typeof titleNode === 'string' ? (
                                <motion.h2 
                                    key={titleNode}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-sm font-bold text-slate-800 dark:text-white tracking-tight truncate text-center w-full"
                                >
                                    {titleNode}
                                </motion.h2>
                            ) : (
                                titleNode
                            )}
                        </div>
                        
                        {/* RIGHT */}
                        <div className="shrink-0 flex items-center justify-end min-w-8 relative z-10">
                            {rightNode}
                        </div>
                        
                        {/* EXTRA (Absolute elements, e.g., progress bar) */}
                        {extraNode}
                    </LiquidGlass>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
