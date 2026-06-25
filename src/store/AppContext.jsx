// src/store/AppContext.jsx
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { auth } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { gooeyToast } from 'goey-toast';

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(undefined); // undefined = loading
    const [prayerTimes, setPrayerTimes] = useState({
        Subuh: '--:--', Dhuha: '--:--', Dzuhur: '--:--',
        Ashar: '--:--', Maghrib: '--:--', Isya: '--:--', Tahajud: '03:00'
    });
    const [lastCity, setLastCity] = useState('Menunggu GPS...');
    const [currentRecords, setCurrentRecords] = useState({});
    const [todayRecords, setTodayRecords] = useState({});
    const [currentDate] = useState(new Date());
    const [trackerDate, setTrackerDate] = useState(new Date());

    // Global toast function with goey-toast wrapper
    const showAppToast = useCallback((message, type = 'info') => {
        if (type === 'success') {
            gooeyToast.success(message, { showTimestamp: false });
        } else if (type === 'error') {
            gooeyToast.error(message, { showTimestamp: false });
        } else if (type === 'warning') {
            gooeyToast.warning(message, { showTimestamp: false });
        } else {
            gooeyToast.info(message, { showTimestamp: false });
        }
    }, []);

    // Removed unused window bindings

    // Auth listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user ?? null);
        });
        return () => unsubscribe();
    }, []);

    const value = {
        currentUser, setCurrentUser,
        prayerTimes, setPrayerTimes,
        lastCity, setLastCity,
        currentRecords, setCurrentRecords,
        todayRecords, setTodayRecords,
        currentDate, trackerDate, setTrackerDate,
        showAppToast,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}
