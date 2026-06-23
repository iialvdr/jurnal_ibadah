// src/pages/Changelog.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, History, GitBranch, Sparkles, GitCommit, ChevronDown } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useApp } from '@/store/AppContext';

export default function Changelog() {
    const navigate = useNavigate();
    const { showAppToast } = useApp();
    const [loading, setLoading] = useState(true);
    const [changelogs, setChangelogs] = useState([]);
    const [openIndex, setOpenIndex] = useState(0);

    useEffect(() => {
        const fetchChangelogs = async () => {
            try {
                const q = query(collection(db, "changelogs"), orderBy("date", "desc"));
                const querySnapshot = await getDocs(q);
                
                const data = [];
                querySnapshot.forEach((doc) => {
                    const docData = doc.data();
                    let itemsArray = [];
                    if (Array.isArray(docData.items)) {
                        itemsArray = docData.items;
                    } else if (typeof docData.items === 'string') {
                        itemsArray = docData.items.split('\n').filter(item => item.trim() !== '');
                    }
                    data.push({ ...docData, id: doc.id, itemsArray });
                });
                
                setChangelogs(data);
            } catch (err) {
                console.error("Gagal memuat changelog", err);
                showAppToast('Gagal memuat riwayat pembaruan.', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchChangelogs();
    }, []);

    const toggleOpen = (index) => {
        if (navigator.vibrate) navigator.vibrate(10);
        setOpenIndex(openIndex === index ? -1 : index);
    };

    return (
        <div className="app-view active flex flex-col h-full absolute inset-0 z-50 transition-all duration-300 overflow-y-auto bg-slate-100 dark:bg-slate-950 no-scrollbar">
            <div className="fixed top-0 left-0 right-0 h-80 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none z-0"></div>

            <div className="sticky top-0 z-[100] px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-3 md:px-8 md:pt-6">
                <div className="glass-pill flex items-center justify-between p-2 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-sm w-full max-w-7xl mx-auto">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90 group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
                    </button>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight text-center flex-1 truncate px-2">Riwayat Update</h2>
                    <div className="w-10"></div> 
                </div>
            </div>

            <div className="relative z-10 px-5 pt-4 pb-12 w-full max-w-7xl mx-auto md:px-8">
                
                <div className="bento-card mb-6 md:mb-8 relative overflow-hidden rounded-[2rem] bg-white dark:bg-slate-900 p-6 md:p-8 shadow-xl border border-white dark:border-slate-800">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div className="absolute -left-8 bottom-0 w-28 h-28 bg-teal-500/10 rounded-full blur-3xl"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center md:items-center gap-5 md:gap-8">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                            <History className="w-8 h-8 md:w-9 md:h-9" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">Riwayat Update</h3>
                            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">Catatan perubahan dan peningkatan terbaru di Jurnal Ibadah.</p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-6 md:space-y-8 ml-3 border-l-2 border-slate-200 dark:border-slate-800 pl-8 relative">
                        {[1, 2].map(i => (
                            <div key={i} className="space-y-4">
                                <div className="absolute -left-[1.4rem] w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 border-4 border-slate-100 dark:border-slate-950 animate-pulse"></div>
                                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse"></div>
                                <div className="h-28 w-full bg-white/50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-200 dark:border-slate-800 animate-pulse"></div>
                            </div>
                        ))}
                    </div>
                ) : changelogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center pt-16 text-slate-400">
                        <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-center mb-6">
                            <GitBranch className="w-10 h-10 opacity-30" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Belum ada riwayat update.</p>
                    </div>
                ) : (
                    <div className="relative border-l-2 border-emerald-500/20 dark:border-emerald-500/10 ml-3 space-y-8 md:space-y-10 pb-10">
                        {changelogs.map((data, index) => {
                            const dateStr = data.date ? data.date.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
                            const isLatest = index === 0;
                            const isOpen = openIndex === index;

                            const iconBg = isLatest
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 ring-4 ring-emerald-50 dark:ring-emerald-900/20'
                                : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 ring-4 ring-slate-100 dark:ring-slate-950';

                            return (
                                <div key={data.id} className="relative pl-8 animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                                    <div className={`absolute -left-[1.4rem] top-0 w-10 h-10 rounded-full ${iconBg} flex items-center justify-center z-10 transition-transform duration-300`}>
                                        {isLatest ? <Sparkles className="w-4 h-4" /> : <GitCommit className="w-4 h-4" />}
                                    </div>

                                    <div onClick={() => toggleOpen(index)} className="bento-card bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-white dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-[0.99] overflow-hidden relative">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.02] rounded-full blur-3xl -mr-16 -mt-16"></div>
                                        
                                        <div className="flex flex-wrap justify-between items-center gap-3 mb-2 relative z-10">
                                            <div className="flex items-center">
                                                <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">{data.version}</h3>
                                                {data.badge && (
                                                    <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest ml-3 border border-emerald-500/20">{data.badge}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full uppercase tracking-wider border border-slate-100 dark:border-slate-700">{dateStr}</span>
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-all">
                                                    <ChevronDown className={`w-4 h-4 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`mt-5 pt-5 border-t border-slate-50 dark:border-slate-800 relative z-10 transition-all duration-300 ${isOpen ? 'block animate-fade-in-up' : 'hidden'}`}>
                                            <ul className="space-y-1">
                                                {data.itemsArray.map((item, idx) => (
                                                    <li key={idx} className="text-sm text-slate-600 dark:text-slate-400 mb-3 flex items-start group">
                                                        <span className="mr-3 mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                                        <span className="leading-relaxed font-medium group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
