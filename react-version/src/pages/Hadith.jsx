// src/pages/Hadith.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Quote, BookOpenCheck } from 'lucide-react';

const NARRATORS = [
    { id: 'bukhari', label: 'Bukhari', max: 50 },
    { id: 'muslim', label: 'Muslim', max: 50 },
    { id: 'abu-daud', label: 'Abu Dawud', max: 50 },
    { id: 'tirmidzi', label: 'Tirmidzi', max: 50 },
    { id: 'nasai', label: "An-Nasa'i", max: 50 },
    { id: 'ibnu-majah', label: 'Ibnu Majah', max: 50 },
];

export default function Hadith() {
    const navigate = useNavigate();
    const [narrator, setNarrator] = useState('bukhari');
    const [hadith, setHadith] = useState(null);
    const [loading, setLoading] = useState(false);
    const [number, setNumber] = useState(1);

    const fetchHadith = async (narr = narrator, num = number) => {
        setLoading(true);
        try {
            const res = await fetch(`https://api.hadith.gading.dev/books/${narr}/${num}`);
            const data = await res.json();
            if (data.code === 200 && data.data?.contents) {
                setHadith({ name: data.data.name, number: data.data.contents.number, arab: data.data.contents.arab, text: data.data.contents.id });
            }
        } catch { } finally { setLoading(false); }
    };

    const randomHadith = () => {
        const sel = NARRATORS[Math.floor(Math.random() * NARRATORS.length)];
        const num = Math.floor(Math.random() * 20) + 1;
        setNarrator(sel.id); setNumber(num);
        fetchHadith(sel.id, num);
    };

    useEffect(() => { fetchHadith(); }, []);

    const formatText = (text) => text?.replace(/\[([^\]]+)\]/g, '<b class="text-emerald-700 dark:text-emerald-400 font-bold">$1</b>') || '';

    return (
        <div className="app-view active flex flex-col h-full bg-slate-100 dark:bg-slate-950 no-scrollbar overflow-y-auto">
            <div className="sticky top-0 z-50 px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-3 bg-slate-100/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate('/')} className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center active:scale-90 transition">
                        <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                    <h1 className="text-sm font-black text-slate-800 dark:text-white">Hadits</h1>
                    <button onClick={randomHadith} className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center active:scale-90 transition">
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="px-5 py-4 space-y-4 max-w-2xl mx-auto w-full">
                {/* Narrator tabs */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {NARRATORS.map(n => (
                        <button key={n.id} onClick={() => { setNarrator(n.id); fetchHadith(n.id, number); }}
                            className={`shrink-0 px-4 py-2 rounded-2xl text-[11px] font-black transition border ${narrator === n.id ? 'bg-rose-500 text-white border-rose-500' : 'bg-white dark:bg-slate-900 text-slate-400 border-white dark:border-slate-800'}`}>
                            {n.label}
                        </button>
                    ))}
                </div>

                {/* Number input */}
                <div className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-white dark:border-slate-800 px-4 py-3 shadow-sm">
                    <span className="text-[11px] font-bold text-slate-500">Nomor Hadits:</span>
                    <input type="number" min={1} max={50} value={number} onChange={e => setNumber(Number(e.target.value))}
                        className="flex-1 text-center font-black text-slate-800 dark:text-white bg-transparent focus:outline-none" />
                    <button onClick={() => fetchHadith()} className="px-4 py-2 bg-rose-500 text-white rounded-xl text-[11px] font-black active:scale-95 transition">Tampilkan</button>
                </div>

                {/* Hadith Card */}
                {loading ? (
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-white dark:border-slate-800 p-6 animate-pulse">
                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-32 mb-4"></div>
                        <div className="space-y-2">
                            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4"></div>
                        </div>
                    </div>
                ) : hadith ? (
                    <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2rem] relative overflow-hidden shadow-sm">
                        <div className="absolute -right-6 -top-6 opacity-[0.05] pointer-events-none">
                            <Quote className="w-32 h-32 text-emerald-600" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2.5 mb-5">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                    <BookOpenCheck className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">{hadith.name}</p>
                                    <p className="text-[9px] text-slate-400">No. {hadith.number}</p>
                                </div>
                            </div>
                            <div className="text-right mb-5" dir="rtl">
                                <p className="font-quran text-xl text-slate-800 dark:text-white leading-loose">{hadith.arab}</p>
                            </div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: `"${formatText(hadith.text)}"` }} />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <BookOpenCheck className="w-12 h-12 mb-3 opacity-30" />
                        <p className="font-bold">Pilih nomor hadits di atas</p>
                    </div>
                )}
            </div>
        </div>
    );
}
