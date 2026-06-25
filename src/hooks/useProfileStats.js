import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export function useProfileStats(currentUser) {
    const [chartDays, setChartDays] = useState(7);
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });
    const [chartLoading, setChartLoading] = useState(true);
    const [consistencyPercent, setConsistencyPercent] = useState(0);
    const [todayIbadahCount, setTodayIbadahCount] = useState(0);

    useEffect(() => {
        if (!currentUser) return;
        const fetchChartData = async () => {
            const today = new Date();
            const tasks = [];
            for (let i = chartDays - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(today.getDate() - i);
                
                const offset = d.getTimezoneOffset();
                const localDate = new Date(d.getTime() - (offset * 60 * 1000));
                const dateKey = localDate.toISOString().split('T')[0];
                const label = d.toLocaleDateString('id-ID', { weekday: 'short' });
                
                tasks.push(
                    getDoc(doc(db, "users", currentUser.uid, "daily_records", dateKey))
                        .then(snap => ({ snap, label }))
                );
            }
            try {
                const results = await Promise.all(tasks);
                const labels = [];
                const dataPoints = [];
                let totalCompletedInPeriod = 0;
                let todayCount = 0;
                
                results.forEach(({ snap, label }, idx) => {
                    labels.push(label);
                    let count = 0;
                    if (snap.exists()) {
                        const data = snap.data();
                        ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'].forEach(p => { if (data[p]) count++; });
                    }
                    dataPoints.push(count);
                    totalCompletedInPeriod += count;
                    if (idx === results.length - 1) {
                        todayCount = count;
                    }
                });
                
                const percent = Math.round((totalCompletedInPeriod / (chartDays * 5)) * 100);
                setConsistencyPercent(Math.min(100, percent));
                setTodayIbadahCount(todayCount);
                
                setChartData({
                    labels,
                    datasets: [{
                        label: 'Sholat Wajib',
                        data: dataPoints,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        borderWidth: 2,
                        pointBackgroundColor: '#ffffff',
                        pointRadius: 4,
                        tension: 0.4,
                        fill: true
                    }]
                });
            } catch (err) { console.error("Gagal load chart data", err); }
            finally { setChartLoading(false); }
        };
        fetchChartData();
    }, [currentUser, chartDays]);

    return {
        chartDays, setChartDays,
        chartData, chartLoading,
        consistencyPercent, todayIbadahCount
    };
}
