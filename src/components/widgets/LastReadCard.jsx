import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Bookmark, ArrowRight } from 'lucide-react';

export function LastReadCard({ currentUser, navigate }) {
    const [lastRead, setLastRead] = useState(null);

    useEffect(() => {
        if (!currentUser) return;
        getDoc(doc(db, "users", currentUser.uid, "quran", "last_read"))
            .then(snap => { if (snap.exists()) setLastRead(snap.data()); })
            .catch(() => {});
    }, [currentUser]);

    useEffect(() => {
        const handler = () => {
            if (!currentUser) return;
            getDoc(doc(db, "users", currentUser.uid, "quran", "last_read"))
                .then(snap => { if (snap.exists()) setLastRead(snap.data()); })
                .catch(() => {});
        };
        window.addEventListener('bookmarkUpdated', handler);
        return () => window.removeEventListener('bookmarkUpdated', handler);
    }, [currentUser]);

    if (!lastRead) return null;

    const handleContinue = () => {
        if (navigator.vibrate) navigator.vibrate(10);
        navigate('/quran', { state: { surah: lastRead.surah, ayat: lastRead.ayat } });
    };

    return (
        <div onClick={handleContinue}
            className="bento-card relative w-full bg-white dark:bg-slate-900 rounded-[2rem] p-5 cursor-pointer group hover:border-emerald-300 dark:hover:border-emerald-700 transition-all border border-white dark:border-slate-800 shadow-sm">
            <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl -mr-5 -mt-5"></div>
            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-sm border border-emerald-100 dark:border-emerald-800">
                        <Bookmark className="w-6 h-6 fill-current" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Lanjutkan</p>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">QS. {lastRead.name}</h3>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Ayat {lastRead.ayat}</p>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:bg-white dark:group-hover:bg-slate-700 transition">
                    <ArrowRight className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
}
