import { useState, useEffect } from 'react';
import { Sun, UtensilsCrossed, ChevronRight } from 'lucide-react';
import { getHijriDate } from '@/utils/dateUtils';
import { getFastingInfo } from '@/modules/fasting';

export function FastingWidget({ prayerTimes, navigate }) {
    const [info, setInfo] = useState(null);
    const [isBesok, setIsBesok] = useState(false);
    const [hijri, setHijri] = useState(null);

    useEffect(() => {
        const now = new Date();
        let displayDate = new Date(now);
        let besok = false;

        if (prayerTimes?.Maghrib && prayerTimes.Maghrib !== '--:--') {
            const [h, m] = prayerTimes.Maghrib.split(':').map(Number);
            const maghribDate = new Date(now);
            maghribDate.setHours(h, m, 0, 0);
            if (now >= maghribDate) { besok = true; displayDate.setDate(displayDate.getDate() + 1); }
        }

        const h = getHijriDate(displayDate);
        const fastingInfo = getFastingInfo(displayDate, h);
        setInfo(fastingInfo);
        setIsBesok(besok);
        setHijri(h);
    }, [prayerTimes]);

    if (!info) return null;

    const isHaram = info.category === 'haram';
    const isWajib = info.category === 'wajib';
    const labelDate = isBesok ? 'BESOK' : 'HARI INI';
    const fastingDesc = isBesok
        ? (isHaram ? 'Hindari puasa pada hari ini.' : 'Siapkan niat untuk berpuasa esok hari ya.')
        : (isHaram ? 'Puasa tidak diperbolehkan pada hari ini.' : 'Semangat menjalankan ibadah puasa!');
    const cardTone = isHaram ? 'border-rose-200 dark:border-rose-900/40' : 'border-amber-100 dark:border-amber-900/40';
    const badgeTone = isHaram ? 'text-rose-600 dark:text-rose-500 bg-rose-500/10' : 'text-amber-600 dark:text-amber-500 bg-amber-500/10';
    const iconTone = isHaram ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/30' : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30';
    const labelType = isHaram ? 'Haram' : (isWajib ? 'Wajib' : 'Sunnah');

    return (
        <div onClick={() => { if (navigator.vibrate) navigator.vibrate(10); navigate('/fasting'); }}
            className={`bento-card bg-white dark:bg-slate-900 p-5 rounded-[2rem] flex items-center gap-4 border ${cardTone} shadow-sm relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all w-full`}>
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/5 rounded-full blur-3xl"></div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${iconTone}`}>
                {isHaram ? <span className="text-xl">🚫</span> : isWajib ? <Sun className="w-6 h-6" /> : <UtensilsCrossed className="w-6 h-6" />}
            </div>
            <div className="flex-1 relative z-10">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${badgeTone}`}>{labelDate}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{labelType}</span>
                </div>
                <h4 className="text-base font-black text-slate-800 dark:text-white leading-tight">{info.type}</h4>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1">{hijri?.full} - {fastingDesc}</p>
            </div>
            {!isHaram && <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors" />}
        </div>
    );
}
