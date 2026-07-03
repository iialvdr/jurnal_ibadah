// src/components/TopNav.jsx
import { useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { topNavStore } from '@/store/topNavStore';

export default function TopNav() {
    const { leftNode, titleNode, rightNode, extraNode, className, hide } = useSyncExternalStore(
        topNavStore.subscribe,
        topNavStore.getState
    );

    return (
        <AnimatePresence>
            {!hide && (
                <motion.div 
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute top-0 left-0 right-0 z-50 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-3 md:px-8 md:pt-6 pointer-events-none"
                >
                    <div className={`glass-pill pointer-events-auto flex items-center justify-between p-2 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-sm w-full max-w-7xl mx-auto transition-colors duration-300 ${className || ''}`}>
                        {/* LEFT */}
                        <div className="flex-shrink-0 flex items-center min-w-[2.5rem] relative z-10">
                            {leftNode}
                        </div>
                        
                        {/* CENTER */}
                        <div className="flex-1 flex justify-center items-center overflow-hidden px-2 h-full relative z-10">
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
                        <div className="flex-shrink-0 flex items-center justify-end min-w-[2.5rem] relative z-10">
                            {rightNode}
                        </div>
                        
                        {/* EXTRA (Absolute elements, e.g., progress bar) */}
                        {extraNode}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
