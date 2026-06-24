// src/pages/Home.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store/AppContext';
import { db } from '@/config/firebase';
import * as adhan from 'adhan';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { getHijriDate, fetchHijriDateAPI } from '@/utils/dateUtils';
import { APP_VERSION } from '@/utils/version';
import { syncPushSubscription } from '@/modules/push';
import { calculateStreak, getStreakData, getEarnedBadges, getNextBadge } from '@/modules/streak';
import { getFastingInfo } from '@/modules/fasting';
import { runThemeCircle } from '@/utils/themeTransition';
import {
    MapPin, Moon, Sun, Timer, ListChecks, BookOpen, Library,
    Compass, Grip, Calculator, UtensilsCrossed, BookHeart, Grid,
    HelpCircle, ChevronRight, Bookmark, ArrowRight, BookOpenCheck,
    Quote, ChevronDown, ChevronUp, Sparkles, RefreshCw
} from 'lucide-react';
const THEME_KEY = 'jurnal_theme';

function useTheme() {
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

function usePrayerTimes(currentDate) {
    const { prayerTimes, setPrayerTimes, lastCity, setLastCity } = useApp();
    const countdownRef = useRef(null);
    const [nextPrayer, setNextPrayer] = useState({ name: '...', time: '--:--' });
    const [countdown, setCountdown] = useState('--:--:--');

    // Fetch jadwal sholat via API Muslim (Kemenag)
    // Flow: koordinat → cari kota via geocode → cari ID kota Kemenag → ambil jadwal hari ini
    const fetchJadwal = useCallback(async (lat, lng) => {
        // Helper: fallback ke adhan.js lokal
        const fallbackAdhan = (fallbackCityName) => {
            if (typeof adhan === 'undefined') return;
            const coordinates = new adhan.Coordinates(lat, lng);
            const params = adhan.CalculationMethod.Singapore();
            const times = new adhan.PrayerTimes(coordinates, currentDate, params);
            const fmt = t => t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
            const dhuhaTime = new Date(times.sunrise.getTime() + (20 * 60000));
            setPrayerTimes({
                Subuh: fmt(times.fajr), Dhuha: fmt(dhuhaTime),
                Dzuhur: fmt(times.dhuhr), Ashar: fmt(times.asr),
                Maghrib: fmt(times.maghrib), Isya: fmt(times.isha), Tahajud: '03:00'
            });
            if (fallbackCityName) {
                const formattedCity = fallbackCityName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                setLastCity(formattedCity);
                localStorage.setItem('last_city_name', formattedCity);
            }
        };
        let tempCityName = null;
        let kotaId = null;
        let kotaName = null;

        let geoJson = null;

        try {
            // Cek cache ID kota (valid 7 hari)
            const cachedKota = localStorage.getItem('kemenag_kota_cache');
            if (cachedKota) {
                const parsed = JSON.parse(cachedKota);
                if (parsed.ts && Date.now() - parsed.ts < 7 * 24 * 3600 * 1000) {
                    kotaId = parsed.id;
                    kotaName = parsed.displayName || parsed.name;
                    if (!window.hasLoggedCache) {
                        console.log(`⚡ [Jadwal Sholat] Memuat dari Cache: "${kotaName}" (Data Kemenag: ${parsed.name})`);
                        window.hasLoggedCache = true;
                    }
                }
            }

            if (!kotaId) {
                try {
                    // Step 1: Geocode koordinat via BigDataCloud API
                    const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=id`);
                    geoJson = await geoRes.json();
                    
                    const candidates = [];
                    const addCand = (c) => {
                        if (!c) return;
                        if (!candidates.includes(c)) candidates.push(c);
                        const clean = c.replace(/pusat|selatan|barat|timur|utara|kabupaten|kota/gi, '').trim();
                        if (clean && !candidates.includes(clean)) candidates.push(clean);
                    };
                    
                    addCand(geoJson.locality);
                    addCand(geoJson.city);
                    
                    if (geoJson.localityInfo?.administrative) {
                        const admins = [...geoJson.localityInfo.administrative].sort((a, b) => (b.adminLevel || 0) - (a.adminLevel || 0));
                        admins.forEach(adm => addCand(adm.name));
                    }
                    
                    addCand(geoJson.principalSubdivision);

                    // Ambil master data kota untuk menghindari 404 dari API (dan lebih cepat)
                    let allCities = [];
                    const cachedAll = localStorage.getItem('kemenag_all_cities');
                    if (cachedAll) {
                        try { allCities = JSON.parse(cachedAll); } catch(e){}
                    }
                    if (!allCities.length) {
                        try {
                            const resAll = await fetch('https://api.myquran.com/v3/sholat/kabkota/semua');
                            const jsonAll = await resAll.json();
                            if (jsonAll.status && jsonAll.data) {
                                allCities = jsonAll.data;
                                localStorage.setItem('kemenag_all_cities', JSON.stringify(allCities));
                            }
                        } catch(e) {}
                    }

                    // Step 2: Cari ID kota di data master dengan cascade
                    for (const cand of candidates) {
                        const matches = allCities.filter(c => c.lokasi.toLowerCase().includes(cand.toLowerCase()));
                        if (matches.length > 0) {
                            let selected = matches[0];
                            
                            // Jika ada Kota vs Kabupaten dengan nama yang sama (misal Bogor)
                            if (matches.length > 1) {
                                const rawNames = [geoJson.locality, geoJson.city];
                                if (geoJson.localityInfo?.administrative) {
                                    geoJson.localityInfo.administrative.forEach(a => {
                                        if (a.name) rawNames.push(a.name);
                                        if (a.description) rawNames.push(a.description);
                                    });
                                }
                                const rawString = rawNames.filter(Boolean).join(' ').toLowerCase();
                                
                                const isKabupaten = rawString.includes('kabupaten') || rawString.includes('kab.');
                                const isKota = rawString.includes('kota') || rawString.includes('city');
                                
                                let wantKota = false;
                                if (isKota && !isKabupaten) {
                                    wantKota = true;
                                } else if (isKota && isKabupaten) {
                                    wantKota = rawString.includes(`kota ${cand.toLowerCase()}`) || rawString.includes(`${cand.toLowerCase()} city`);
                                }
                                
                                const exactMatch = matches.find(d => d.lokasi.toLowerCase().includes(wantKota ? 'kota' : 'kab.'));
                                
                                if (exactMatch) selected = exactMatch;
                            }

                            kotaId = selected.id;
                            kotaName = selected.lokasi;
                            
                            const displayName = geoJson?.locality || geoJson?.city || cand;
                            localStorage.setItem('kemenag_kota_cache', JSON.stringify({ 
                                id: kotaId, 
                                name: kotaName,
                                displayName: displayName,
                                ts: Date.now() 
                            }));
                            
                            tempCityName = cand;
                            if (!window.hasLoggedFresh) {
                                console.log(`✅ [Jadwal Sholat] Wilayah Asli: "${displayName}" -> Cocok dengan API Kemenag: "${kotaName}"`);
                                window.hasLoggedFresh = true;
                            }
                            break;
                        }
                    }
                    
                    if (!tempCityName) tempCityName = geoJson?.locality || geoJson?.city || geoJson?.principalSubdivision || 'Jakarta';
                } catch (e) { }
            }

            if (!kotaId) { fallbackAdhan(tempCityName || kotaName || 'Lokasi Anda'); return; }

            try {
                const jadwalRes = await fetch(`https://api.myquran.com/v3/sholat/jadwal/${kotaId}/today`);
                const jadwalJson = await jadwalRes.json();
                if (jadwalJson.status && jadwalJson.data?.jadwal) {
                    const j = Object.values(jadwalJson.data.jadwal)[0];
                    if (j) {
                        setPrayerTimes({
                            Subuh: j.subuh, Dhuha: j.dhuha,
                            Dzuhur: j.dzuhur, Ashar: j.ashar,
                            Maghrib: j.maghrib, Isya: j.isya, Tahajud: '03:00'
                        });
                        const nameToDisplay = geoJson?.locality || geoJson?.city || kotaName || tempCityName;
                        if (nameToDisplay) {
                            const formattedCity = nameToDisplay.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                            setLastCity(formattedCity);
                            localStorage.setItem('last_city_name', formattedCity);
                        }
                        return;
                    }
                }
                fallbackAdhan(geoJson?.locality || geoJson?.city || tempCityName || kotaName || 'Lokasi Anda');
            } catch (e) {
                fallbackAdhan(geoJson?.locality || geoJson?.city || tempCityName || kotaName || 'Lokasi Anda');
            }
        } catch (e) { fallbackAdhan(tempCityName || kotaName || 'Lokasi Anda'); }
    }, [currentDate, setPrayerTimes, setLastCity]);

    const updateNextPrayer = useCallback(() => {
        const now = new Date();
        const curMin = now.getHours() * 60 + now.getMinutes();
        const prayers = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];
        let next = null;
        for (const name of prayers) {
            const t = prayerTimes[name];
            if (!t || t === '--:--') continue;
            const [h, m] = t.split(':').map(Number);
            if (h * 60 + m > curMin) { next = { name, time: t }; break; }
        }
        if (!next) next = { name: 'Subuh', time: prayerTimes.Subuh };
        setNextPrayer(next);
    }, [prayerTimes]);

    useEffect(() => { updateNextPrayer(); }, [prayerTimes, updateNextPrayer]);

    // Countdown ticker
    useEffect(() => {
        if (!nextPrayer.time || nextPrayer.time === '--:--') return;
        if (countdownRef.current) clearInterval(countdownRef.current);
        const [h, m] = nextPrayer.time.split(':').map(Number);
        countdownRef.current = setInterval(() => {
            const now = new Date();
            let target = new Date();
            target.setHours(h, m, 0, 0);
            if (target < now) target.setDate(target.getDate() + 1);
            const diff = target - now;
            const hh = Math.floor(diff / 3600000);
            const mm = Math.floor((diff % 3600000) / 60000);
            const ss = Math.floor((diff % 60000) / 1000);
            setCountdown(`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`);
        }, 1000);
        return () => clearInterval(countdownRef.current);
    }, [nextPrayer.time]);

    const refreshLocation = useCallback((manual = false) => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                const prevLat = parseFloat(localStorage.getItem('last_lat'));
                const prevLng = parseFloat(localStorage.getItem('last_lng'));
                
                if (prevLat && prevLng) {
                    const diffLat = Math.abs(prevLat - latitude);
                    const diffLng = Math.abs(prevLng - longitude);
                    // Jika pindah lebih dari ~5km (0.05 derajat)
                    if (diffLat > 0.05 || diffLng > 0.05) {
                        localStorage.removeItem('kemenag_kota_cache');
                    }
                }
                
                window.lastLat = latitude;
                window.lastLng = longitude;
                localStorage.setItem('last_lat', latitude);
                localStorage.setItem('last_lng', longitude);
                
                // Hapus cache kota jika tombol ditekan manual
                if (manual) localStorage.removeItem('kemenag_kota_cache');
                
                fetchJadwal(latitude, longitude);
            },
            () => { if (!lastCity) setLastCity('Lokasi Belum Diatur'); }
        );
    }, [fetchJadwal, setLastCity, lastCity]);
    // Load cached location on mount
    useEffect(() => {
        const cachedCity = localStorage.getItem('last_city_name');
        const cachedLat = localStorage.getItem('last_lat');
        const cachedLng = localStorage.getItem('last_lng');
        if (cachedCity) setLastCity(cachedCity);
        if (cachedLat && cachedLng) {
            window.lastLat = parseFloat(cachedLat);
            window.lastLng = parseFloat(cachedLng);
            fetchJadwal(window.lastLat, window.lastLng);
        }
        refreshLocation(false);
    }, []);

    return { nextPrayer, countdown, refreshLocation };
}

function TodayPrayerGrid({ prayerTimes, todayRecords }) {
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

function FastingWidget({ prayerTimes, navigate }) {
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

function HadithWidget({ navigate }) {
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
                        dangerouslySetInnerHTML={{ __html: `"${hadith.text}"` }} />
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

function LastReadCard({ currentUser, navigate }) {
    const [lastRead, setLastRead] = useState(null);

    useEffect(() => {
        if (!currentUser) return;
        getDoc(doc(db, "users", currentUser.uid, "quran", "last_read"))
            .then(snap => { if (snap.exists()) setLastRead(snap.data()); })
            .catch(() => {});

        const unsub = window.addEventListener && (() => {});
        return () => {};
    }, [currentUser]);

    useEffect(() => {
        const handler = () => {
            if (!currentUser) return;
            getDoc(doc(db, "users", currentUser.uid, "quran", "last_read"))
                .then(snap => { if (snap.exists()) setLastRead(snap.data()); })
                .catch(() => {});
        };
        window.addEventListener('bookmarkUpdated', handler);
        return () => window.removeEventListener('bookmarkUpdated', handler);
    }, [currentUser]);

    if (!lastRead) return null;

    const handleContinue = () => {
        if (navigator.vibrate) navigator.vibrate(10);
        navigate('/quran', { state: { surah: lastRead.surah, ayat: lastRead.ayat } });
    };

    return (
        <div onClick={handleContinue}
            className="bento-card relative w-full bg-white dark:bg-slate-900 rounded-[2rem] p-5 cursor-pointer group hover:border-emerald-300 dark:hover:border-emerald-700 transition-all border border-white dark:border-slate-800 shadow-sm">
            <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl -mr-5 -mt-5"></div>
            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-sm border border-emerald-100 dark:border-emerald-800">
                        <Bookmark className="w-6 h-6 fill-current" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Lanjutkan</p>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">QS. {lastRead.name}</h3>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Ayat {lastRead.ayat}</p>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:bg-white dark:group-hover:bg-slate-700 transition">
                    <ArrowRight className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
}

export default function Home() {
    const navigate = useNavigate();
    const { currentUser, prayerTimes, todayRecords, setTodayRecords, currentDate, showAppToast, lastCity } = useApp();
    const { themeMode, toggleDarkMode, syncThemeWithCloud } = useTheme();
    const { nextPrayer, countdown, refreshLocation } = usePrayerTimes(currentDate);
    const [hijriDate, setHijriDate] = useState('');
    const [streakData, setStreakData] = useState({ current: 0, longest: 0 });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const unsubscribeRef = useRef(null);

    const vib = () => { if (navigator.vibrate) navigator.vibrate(10); };

    // Sync theme from cloud on mount
    useEffect(() => {
        if (currentUser) syncThemeWithCloud(currentUser);
    }, [currentUser]);

    // Update hijri date when prayer times change
    useEffect(() => {
        fetchHijriDateAPI(currentDate).then(h => setHijriDate(h.full)).catch(() => setHijriDate(getHijriDate(currentDate).full));
    }, [currentDate, prayerTimes]);

    // Load today's records
    useEffect(() => {
        if (!currentUser) return;
        const offset = currentDate.getTimezoneOffset();
        const localDate = new Date(currentDate.getTime() - offset * 60000);
        const dateKey = localDate.toISOString().split('T')[0];

        if (unsubscribeRef.current) unsubscribeRef.current();
        unsubscribeRef.current = onSnapshot(doc(db, "users", currentUser.uid, "daily_records", dateKey), (snap) => {
            setTodayRecords(snap.exists() ? snap.data() : {});
        });
        return () => { if (unsubscribeRef.current) unsubscribeRef.current(); };
    }, [currentUser, currentDate]);

    // Load streak
    useEffect(() => {
        if (!currentUser) return;
        const cached = getStreakData();
        setStreakData(cached);
        calculateStreak(currentUser.uid).then(data => setStreakData(data)).catch(() => {});
    }, [currentUser]);

    const handleRefreshLocation = () => {
        vib();
        setIsRefreshing(true);
        refreshLocation(true);
        setTimeout(() => setIsRefreshing(false), 2000);
    };

    const navBtn = (path, label, color, Icon, colSpan = '', height = '') =>
        <button onClick={() => { vib(); navigate(path); }}
            className={`${colSpan} bento-card hover-${color} bg-white dark:bg-slate-900 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 group ${height || 'h-[105px]'} border border-white dark:border-slate-800 shadow-sm`}>
            <Icon className={`w-6 h-6 text-${color}-500 transition-transform group-hover:scale-110`} />
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 tracking-wider">{label}</span>
        </button>;

    const navRowBtn = (path, label, iconBg, Icon, colSpan = 'col-span-2') =>
        <button onClick={() => { vib(); navigate(path); }}
            className={`${colSpan} bento-card bg-white dark:bg-slate-900 p-4 px-6 rounded-[2rem] flex items-center gap-4 group h-[85px] border border-white dark:border-slate-800 shadow-sm`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${iconBg}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left"><h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{label}</h4></div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
        </button>;

    const isDark = themeMode === 'dark' || (themeMode === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    const photoUrl = currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || 'User')}&background=10b981&color=fff`;

    const earnedBadges = getEarnedBadges(streakData.current);
    const lastBadge = earnedBadges[earnedBadges.length - 1];

    return (
        <div id="homeView" className="app-view active flex flex-col h-full overflow-y-auto bg-slate-100 dark:bg-slate-950 no-scrollbar transition-colors duration-300">
            <div className="fixed top-0 left-0 right-0 h-80 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none z-0"></div>

            {/* Navbar */}
            <div className="sticky top-0 z-50 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-3 md:px-8 md:pt-6">
                <div className="glass-pill flex items-center justify-between p-2 pl-3 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-sm w-full max-w-7xl mx-auto">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { vib(); navigate('/profile'); }}>
                        <div className="relative">
                            <img src={photoUrl} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800 bg-slate-200 transition-transform group-hover:scale-105" alt="Photo" />
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                        </div>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-sm font-bold text-slate-800 dark:text-white leading-tight truncate max-w-[150px]">
                                {currentUser?.displayName || 'Assalamualaikum'}
                            </h1>
                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">{hijriDate || 'Memuat...'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 pr-1">
                        {streakData.current > 0 && (
                            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border transition-all duration-300 ${streakData.current >= 30 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40' : streakData.current >= 14 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40' : streakData.current >= 7 ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/40' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40'}`}>
                                <span className="text-sm leading-none">{lastBadge?.emoji || '🔥'}</span>
                                <span className={`text-[11px] font-black tabular-nums ${streakData.current >= 30 ? 'text-blue-600 dark:text-blue-400' : streakData.current >= 14 ? 'text-emerald-600 dark:text-emerald-400' : streakData.current >= 7 ? 'text-yellow-600 dark:text-yellow-400' : 'text-orange-600 dark:text-orange-400'}`}>{streakData.current}</span>
                            </div>
                        )}
                        <button
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const origin = {
                                    x: rect.left + rect.width / 2,
                                    y: rect.top + rect.height / 2
                                };
                                toggleDarkMode(currentUser, origin);
                            }}
                            className="relative w-9 h-9 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-400 overflow-hidden transition active:scale-90"
                        >
                            <span className={`absolute transition-all duration-500 ${isDark ? 'rotate-0 scale-100 opacity-100 translate-y-0' : 'rotate-[135deg] scale-0 opacity-0 translate-y-2'}`}
                                style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                                <Sun className="w-5 h-5" />
                            </span>
                            <span className={`absolute transition-all duration-500 ${isDark ? '-rotate-[135deg] scale-0 opacity-0 -translate-y-2' : 'rotate-0 scale-100 opacity-100 translate-y-0'}`}
                                style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                                <Moon className="w-5 h-5" />
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-5 pt-1 pb-6 space-y-5 relative z-10 md:px-8 max-w-7xl mx-auto w-full md:grid md:grid-cols-12 md:gap-6 md:space-y-0 md:items-start">
                {/* Left Column */}
                <div className="flex flex-col gap-4 w-full md:col-span-5 lg:col-span-4 md:sticky md:top-24">
                    {/* Location / Prayer Card */}
                    <div className="relative w-full animate-fade-in-up stagger-1" onClick={handleRefreshLocation}>
                        <div className="bento-card rounded-[2rem] p-6 text-white border border-slate-800 relative overflow-hidden shadow-xl active:scale-[0.98] transition-transform"
                             style={{ background: 'linear-gradient(135deg, #0f172a 0%, #022c22 100%)' }}>
                            <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/20 via-emerald-900/10 to-transparent opacity-60"></div>
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className="mb-3 flex items-center gap-2 bg-white/10 px-3 py-0.5 rounded-full backdrop-blur-md border border-white/5 cursor-pointer hover:bg-white/20 transition-colors">
                                    {isRefreshing
                                        ? <RefreshCw className="w-3 h-3 text-emerald-300 animate-spin" />
                                        : <MapPin className="w-3 h-3 text-emerald-300" />
                                    }
                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider truncate max-w-[120px]">
                                        {lastCity || 'Mencari...'}
                                    </span>
                                </div>
                                <h2 className="text-4xl font-black tracking-tighter text-white leading-tight py-1">{nextPrayer.name}</h2>
                                <p className="text-lg font-medium text-emerald-400 font-mono tracking-wide">{nextPrayer.time}</p>
                                <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2">
                                    <Timer className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-xs font-mono font-bold text-emerald-100">{countdown}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Today Prayer Grid */}
                    <div className="animate-fade-in-up stagger-2">
                        <TodayPrayerGrid prayerTimes={prayerTimes} todayRecords={todayRecords} />
                    </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-4 w-full md:col-span-7 lg:col-span-8">
                    <div className="space-y-3 animate-fade-in-up stagger-3">
                        <HadithWidget navigate={navigate} />
                        <FastingWidget prayerTimes={prayerTimes} navigate={navigate} />
                        {currentUser && <LastReadCard currentUser={currentUser} navigate={navigate} />}
                    </div>

                    {/* Feature Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 animate-fade-in-up stagger-4">
                        <button onClick={() => { vib(); navigate('/tracker'); }}
                            className="col-span-2 bento-card hover-emerald bg-white dark:bg-slate-900 p-5 rounded-[2rem] text-left group h-[120px] flex flex-col justify-center border border-white dark:border-slate-800 shadow-sm relative overflow-hidden">
                            <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:opacity-20 transition-opacity">
                                <ListChecks className="w-24 h-24 text-emerald-500" />
                            </div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/30">
                                    <ListChecks className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">Jurnal Ibadah</h4>
                                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">Checklist harian</p>
                                </div>
                            </div>
                        </button>

                        <button onClick={() => { vib(); navigate('/quran'); }}
                            className="col-span-2 bento-card hover-purple bg-white dark:bg-slate-900 p-5 rounded-[2rem] text-left group h-[120px] flex flex-col justify-center border border-white dark:border-slate-800 shadow-sm relative overflow-hidden">
                            <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:opacity-20 transition-opacity">
                                <BookOpen className="w-24 h-24 text-purple-500" />
                            </div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-800/30">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">Al-Qur'an</h4>
                                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">Baca & terjemah</p>
                                </div>
                            </div>
                        </button>

                        {navBtn('/hadith', 'Hadits', 'rose', Library)}
                        {navBtn('/qibla', 'Kiblat', 'teal', Compass)}
                        {navBtn('/tasbih', 'Tasbih', 'blue', Grip)}
                        {navBtn('/zakat', 'Zakat', 'emerald', Calculator)}

                        {navRowBtn('/fasting', 'Jadwal Puasa', 'text-amber-500 bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800/30', UtensilsCrossed)}
                        {navRowBtn('/doa', 'Kumpulan Doa', 'text-rose-500 bg-rose-50 dark:bg-rose-900/30 border-rose-100 dark:border-rose-800/30', BookHeart)}
                        {navRowBtn('/asmaul-husna', 'Asmaul Husna', 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800/30', Grid)}
                        {navRowBtn('/faq', 'Bantuan & FAQ', 'text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-100 dark:border-slate-700/50', HelpCircle)}
                    </div>

                    {/* Footer */}
                    <p className="text-center text-[9px] font-bold text-slate-300 dark:text-slate-700 pb-2 animate-fade-in-up stagger-5">
                        Jurnal Ibadah App {APP_VERSION}
                    </p>
                </div>
            </div>
        </div>
    );
}
