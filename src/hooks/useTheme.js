// src/hooks/useTheme.js
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { runThemeCircle } from '@/utils/themeTransition';

const THEME_KEY = 'jurnal_theme';

export function useTheme() {
    const [themeMode, setThemeModeState] = useState(() => {
        const saved = localStorage.getItem(THEME_KEY);
        return ['dark', 'light', 'system'].includes(saved) ? saved : 'system';
    });

    const applyTheme = useCallback((mode) => {
        const isDark = mode === 'dark'
            ? true
            : mode === 'light'
            ? false
            : window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

        document.documentElement.classList.toggle('dark', isDark);
    }, []);

    useEffect(() => {
        applyTheme(themeMode);
    }, [themeMode, applyTheme]);

    useEffect(() => {
        if (!window.matchMedia) return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => { if (themeMode === 'system') applyTheme('system'); };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [themeMode, applyTheme]);

    const toggleDarkMode = useCallback(async (currentUser, origin) => {
        const isDark = document.documentElement.classList.contains('dark');
        const nextMode = isDark ? 'light' : 'dark';

        const updateDOM = () => {
            setThemeModeState(nextMode);
            localStorage.setItem(THEME_KEY, nextMode);
        };

        runThemeCircle(nextMode === 'dark', updateDOM, origin);

        if (currentUser) {
            try {
                const docRef = doc(db, "users", currentUser.uid, "settings", "preferences");
                await setDoc(docRef, { theme: nextMode }, { merge: true });
            } catch (e) { console.error(e); }
        }
    }, []);

    const syncThemeWithCloud = useCallback(async (currentUser) => {
        if (!currentUser) return;
        try {
            const docRef = doc(db, "users", currentUser.uid, "settings", "preferences");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().theme) {
                const cloudTheme = docSnap.data().theme;
                setThemeModeState(cloudTheme);
                localStorage.setItem(THEME_KEY, cloudTheme);
                applyTheme(cloudTheme);
            }
            const notifEnabled = docSnap.exists() ? docSnap.data().notifications : null;
            if (typeof notifEnabled === 'boolean') {
                localStorage.setItem('jurnal_notifications', notifEnabled);
            }
        } catch (e) { console.error(e); }
    }, [applyTheme]);

    return { themeMode, toggleDarkMode, syncThemeWithCloud };
}
