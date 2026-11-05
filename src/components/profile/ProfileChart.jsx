import React, { memo } from 'react';
import { Activity } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import LiquidGlass from '@/components/LiquidGlass';
import TabSlider from '@/components/TabSlider';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend
);

export const ProfileChart = memo(function ProfileChart({ chartDays, setChartDays, chartLoading, chartData }) {
    const chartTransitionKey = JSON.stringify(chartData);

    return (
        <div className="mt-5 md:mt-6 md:order-3 order-2">
            <div className="bento-card bg-white dark:bg-slate-900 p-5 md:p-8 rounded-[1.8rem] md:rounded-[2.5rem] border border-white dark:border-slate-800 shadow-sm flex flex-col min-h-[280px] md:min-h-[400px]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-5 md:mb-10">
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm md:text-lg">Tren Ibadah</h3>
                        <p className="text-[8px] md:text-[10px] text-slate-400 uppercase tracking-[0.2em] mt-0.5">Grafik ketepatan sholat wajib</p>
                    </div>

                    <LiquidGlass
                        tier="thin"
                        displacementScale={55}
                        refractionBlur={1}
                        interactive={false}
                        overflowVisible
                        cornerRadius="rounded-full"
                        className="w-full sm:w-56 shadow-inner"
                    >
                        <TabSlider
                            tabs={[
                                { id: '7', label: '7 Hari' },
                                { id: '14', label: '14 Hari' },
                            ]}
                            activeTab={String(chartDays)}
                            onChange={value => setChartDays(Number(value))}
                        />
                    </LiquidGlass>
                </div>

                <div className="relative flex-1 w-full min-h-[160px] flex items-center justify-center">
                    {chartLoading ? (
                        <div className="text-center opacity-40">
                            <Activity className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-50 animate-pulse" />
                            <p className="text-xs font-bold text-slate-500">Memuat riwayat...</p>
                        </div>
                    ) : (
                        <AnimatePresence initial={false} mode="sync">
                            <motion.div
                                key={chartTransitionKey}
                                initial={{ opacity: 0, scale: 0.985, filter: 'blur(2px)' }}
                                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, scale: 1.01, filter: 'blur(1px)' }}
                                transition={{
                                    opacity: { duration: 0.48, ease: [0.22, 1, 0.36, 1] },
                                    scale: { duration: 0.58, ease: [0.22, 1, 0.36, 1] },
                                    filter: { duration: 0.48, ease: [0.22, 1, 0.36, 1] },
                                }}
                                className="absolute inset-0 pb-2"
                            >
                                <Line
                                    data={chartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        animation: false,
                                        plugins: { legend: { display: false }, tooltip: { enabled: false } },
                                        scales: {
                                            y: { min: 0, max: 5, ticks: { stepSize: 1 }, display: false },
                                            x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#94a3b8' } }
                                        }
                                    }}
                                />
                            </motion.div>
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </div>
    );
});
