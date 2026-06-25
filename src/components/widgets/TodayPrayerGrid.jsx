export function TodayPrayerGrid({ prayerTimes, todayRecords }) {
    const prayers = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];
    return (
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm p-1.5 rounded-2xl border border-white/50 dark:border-slate-800 md:bg-white md:dark:bg-slate-900 shadow-sm">
            <div id="todayPrayerGrid" className="grid grid-cols-5 gap-1 md:flex md:flex-col md:gap-2">
                {prayers.map(name => {
                    const time = prayerTimes[name] || '--:--';
                    const isDone = todayRecords?.[name] === true;
                    return (
                        <div key={name} className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-2xl border transition-all duration-300 ${isDone ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-700 shadow-sm'}`}>
                            <span className={`text-[8.5px] md:text-[11px] leading-none tracking-tighter font-bold ${isDone ? 'text-emerald-50' : 'text-slate-400 dark:text-slate-500'}`}>{name}</span>
                            <span className={`text-[11px] md:text-sm font-black font-mono mt-1 ${isDone ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{time}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
