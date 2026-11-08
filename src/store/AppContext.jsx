// src/store/AppContext.jsx
import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect, useSyncExternalStore } from 'react';
import { auth } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { gooeyToast } from 'goey-toast';
import { startReminderLoop, stopReminderLoop } from '@/modules/reminder';

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(undefined); // undefined = loading
    const [installPromptEvent, setInstallPromptEvent] = useState(null);
    const [isPwaInstalled, setIsPwaInstalled] = useState(() => Boolean(
        typeof window !== 'undefined' && (
            window.matchMedia?.('(display-mode: standalone)')?.matches ||
            window.navigator.standalone === true
        )
    ));
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

    useEffect(() => {
        const handleBeforeInstallPrompt = (event) => {
            event.preventDefault();
            setInstallPromptEvent(event);
        };
        const handleAppInstalled = () => {
            setIsPwaInstalled(true);
            setInstallPromptEvent(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const installPwa = useCallback(async () => {
        if (!installPromptEvent) {
            return;
        }

        try {
            await installPromptEvent.prompt();
            const { outcome } = await installPromptEvent.userChoice;
            setInstallPromptEvent(null);
            if (outcome === 'accepted') {
                showAppToast('Permintaan instalasi aplikasi diterima.', 'success');
            }
        } catch (error) {
            console.error('Gagal menampilkan prompt instalasi PWA', error);
            showAppToast('Tidak dapat membuka instalasi. Coba melalui menu browser.', 'error');
        }
    }, [installPromptEvent, showAppToast]);

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

    const [bottomNavExtraNode, setBottomNavExtraNode] = useState(null);

    const value = useMemo(() => ({
        currentUser, setCurrentUser,
        prayerTimes, setPrayerTimes,
        lastCity, setLastCity,
        currentRecords, setCurrentRecords,
        todayRecords, setTodayRecords,
        currentDate, trackerDate, setTrackerDate,
        showAppToast,
        isPwaInstalled, canInstallPwa: Boolean(installPromptEvent), installPwa,
        modalOpen, setModalOpen,
        bottomNavExtraNode, setBottomNavExtraNode,
    }), [
        currentUser, prayerTimes, lastCity, currentRecords, todayRecords, currentDate,
        trackerDate, showAppToast, isPwaInstalled, installPromptEvent, installPwa,
        modalOpen, bottomNavExtraNode,
    ]);

    const snapshotRef = useRef(value);
    snapshotRef.current = value;
    const storeRef = useRef(null);
    if (!storeRef.current) {
        const listeners = new Set();
        storeRef.current = {
            getSnapshot: () => snapshotRef.current,
            subscribe: listener => {
                listeners.add(listener);
                return () => listeners.delete(listener);
            },
            notify: () => listeners.forEach(listener => listener()),
        };
    }

    useLayoutEffect(() => {
        storeRef.current.notify();
    }, [value]);

    return <AppContext.Provider value={storeRef.current}>{children}</AppContext.Provider>;
}

const identity = value => value;

function shallowEqual(left, right) {
    if (Object.is(left, right)) return true;
    if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return leftKeys.length === rightKeys.length &&
        leftKeys.every(key => Object.prototype.hasOwnProperty.call(right, key) && Object.is(left[key], right[key]));
}

export function useApp(selector = identity) {
    const store = useContext(AppContext);
    if (!store) throw new Error('useApp must be used within AppProvider');

    const selectorRef = useRef(selector);
    selectorRef.current = selector;
    const selectionRef = useRef({ initialized: false, value: undefined });
    const getSelection = useCallback(() => {
        const next = selectorRef.current(store.getSnapshot());
        if (!selectionRef.current.initialized || !shallowEqual(selectionRef.current.value, next)) {
            selectionRef.current = { initialized: true, value: next };
        }
        return selectionRef.current.value;
    }, [store]);

    return useSyncExternalStore(store.subscribe, getSelection, getSelection);
}
