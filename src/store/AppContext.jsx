// src/store/AppContext.jsx
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { auth } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { gooeyToast } from 'goey-toast';
import { startReminderLoop, stopReminderLoop } from '@/modules/reminder';

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
    const [modalOpen, setModalOpen] = useState(false);

    // Refs for reminder loop to access latest state
    const prayerTimesRef = useRef(prayerTimes);
    const todayRecordsRef = useRef(todayRecords);
    const lastCityRef = useRef(lastCity);

    useEffect(() => { prayerTimesRef.current = prayerTimes; }, [prayerTimes]);
    useEffect(() => { todayRecordsRef.current = todayRecords; }, [todayRecords]);
    useEffect(() => { lastCityRef.current = lastCity; }, [lastCity]);

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

    // Auth listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user ?? null);
        });
        return () => unsubscribe();
    }, []);

    // Start local reminder loop
    useEffect(() => {
        startReminderLoop(
            () => prayerTimesRef.current,
            () => todayRecordsRef.current,
            () => lastCityRef.current
        );
        return () => stopReminderLoop();
    }, []);

    const value = {
        currentUser, setCurrentUser,
        prayerTimes, setPrayerTimes,
        lastCity, setLastCity,
        currentRecords, setCurrentRecords,
        todayRecords, setTodayRecords,
        currentDate, trackerDate, setTrackerDate,
        showAppToast,
        modalOpen, setModalOpen,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}
