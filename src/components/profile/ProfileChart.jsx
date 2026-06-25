import { Activity } from 'lucide-react';
import { Line } from 'react-chartjs-2';

export function ProfileChart({ chartDays, setChartDays, chartLoading, chartData }) {
    return (
        <div className="mt-5 md:mt-6 md:order-3 order-2">
            <div className="bento-card bg-white dark:bg-slate-900 p-5 md:p-8 rounded-[1.8rem] md:rounded-[2.5rem] border border-white dark:border-slate-800 shadow-sm flex flex-col min-h-[280px] md:min-h-[400px]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-5 md:mb-10">
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm md:text-lg">Tren Ibadah</h3>
                        <p className="text-[8px] md:text-[10px] text-slate-400 uppercase tracking-[0.2em] mt-0.5">Grafik ketepatan sholat wajib</p>
                    </div>

                    <div className="relative flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full w-full sm:w-56 shadow-inner border border-slate-200 dark:border-slate-700">
                        <div className="absolute inset-1.5 flex pointer-events-none">
                            <div className="w-1/2 h-full transition-transform duration-300 ease-in-out" 
                                 style={{ transform: chartDays === 7 ? 'translateX(0)' : 'translateX(100%)' }}>
                                <div className="w-full h-full bg-white dark:bg-slate-700 rounded-full shadow-sm border border-slate-200/50 dark:border-slate-600"></div>
                            </div>
                        </div>
                        <button onClick={() => setChartDays(7)} className={`relative z-10 flex-1 px-4 py-1.5 text-[8px] md:text-[10px] rounded-full uppercase tracking-widest transition-colors duration-300 whitespace-nowrap ${chartDays === 7 ? 'text-emerald-600 font-black' : 'text-slate-400 font-bold hover:text-emerald-500'}`}>
                            7 Hari
                        </button>
                        <button onClick={() => setChartDays(14)} className={`relative z-10 flex-1 px-4 py-1.5 text-[8px] md:text-[10px] rounded-full uppercase tracking-widest transition-colors duration-300 whitespace-nowrap ${chartDays === 14 ? 'text-emerald-600 font-black' : 'text-slate-400 font-bold hover:text-emerald-500'}`}>
                            14 Hari
                        </button>
                    </div>
                </div>

                <div className="relative flex-1 w-full min-h-[160px] flex items-center justify-center">
                    {chartLoading ? (
                        <div className="text-center opacity-40">
                            <Activity className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-50 animate-pulse" />
                            <p className="text-xs font-bold text-slate-500">Memuat riwayat...</p>
                        </div>
                    ) : (
                        <div className="absolute inset-0 pb-2">
                            <Line 
                                data={chartData} 
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                                    scales: {
                                        y: { min: 0, max: 5, ticks: { stepSize: 1 }, display: false },
                                        x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#94a3b8' } }
                                    }
                                }} 
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
