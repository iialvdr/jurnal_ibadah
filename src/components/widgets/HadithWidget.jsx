import { useState, useEffect } from 'react';
import { Quote, BookOpenCheck, ChevronUp, ChevronDown } from 'lucide-react';
import DOMPurify from 'dompurify';

export function HadithWidget() {
    const [hadith, setHadith] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const cached = localStorage.getItem('daily_hadith_enc');
        const cachedDate = localStorage.getItem('daily_had_enc_date');

        if (cached && cachedDate === today) {
            setHadith(JSON.parse(cached));
            setLoading(false);
            return;
        }

        fetch('https://api.myquran.com/v3/hadis/enc/random')
            .then(r => r.json())
            .then(result => {
                if (result.status && result.data) {
                    const d = result.data;
                    const data = {
                        id: d.id,
                        arab: d.text?.ar || '',
                        text: d.text?.id || '',
                        grade: d.grade || null,
                        takhrij: d.takhrij || null,
                        hikmah: d.hikmah || null
                    };
                    localStorage.setItem('daily_hadith_enc', JSON.stringify(data));
                    localStorage.setItem('daily_had_enc_date', today);
                    setHadith(data);
                }
            })
            .catch(() => setHadith(null))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="bento-card bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-white dark:border-slate-800 animate-pulse">
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded-full mb-3"></div>
                <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full mb-2"></div>
            </div>
        );
    }

    if (!hadith) return null;

    const isLong = hadith.text.length > 150;

    return (
        <div className="bento-card bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2rem] relative overflow-hidden shadow-sm transition-all duration-500">
            <div className="absolute -right-6 -top-6 opacity-[0.05] pointer-events-none">
                <Quote className="w-32 h-32 text-emerald-600" />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <BookOpenCheck className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Hadits Hari Ini</span>
                        <p className="text-[9px] font-bold text-slate-400 leading-none mt-0.5">Ensiklopedia Hadis{hadith.grade ? ` • ${hadith.grade}` : ''}</p>
                    </div>
                </div>

                {expanded && (
                    <div className="mb-4 text-right" dir="rtl">
                        <p className="font-quran text-xl text-slate-800 dark:text-white leading-[2.5]">{hadith.arab}</p>
                    </div>
                )}

                <div className="relative">
                    <p className={`text-[13px] md:text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed transition-all duration-500 ${isLong && !expanded ? 'line-clamp-3' : ''}`}
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(`"${hadith.text}"`) }} />
                </div>

                {expanded && hadith.takhrij && (
                    <p className="mt-3 text-[11px] font-bold text-emerald-600/70 dark:text-emerald-400/70 italic">{hadith.takhrij}</p>
                )}

                {isLong && (
                    <button onClick={() => setExpanded(v => !v)}
                        className="mt-4 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 hover:opacity-70 transition-all">
                        {expanded ? <><ChevronUp className="w-3 h-3" /> Sembunyikan</> : <><ChevronDown className="w-3 h-3" /> Selengkapnya</>}
                    </button>
                )}
            </div>
        </div>
    );
}
