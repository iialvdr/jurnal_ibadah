// src/hooks/usePrayerTimes.js
import { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import * as adhan from 'adhan';

let lastLoggedKota = null;

export function usePrayerTimes(currentDate, currentUserForPushRef) {
    const { prayerTimes, setPrayerTimes, lastCity, setLastCity } = useApp();
    const countdownRef = useRef(null);
    const [nextPrayer, setNextPrayer] = useState({ name: '...', time: '--:--' });
    const [countdown, setCountdown] = useState('--:--:--');

    // Fetch jadwal sholat via API Muslim (Kemenag) — dengan support internasional via adhan.js
    // Flow: koordinat → deteksi negara → jika Indonesia: cari kota Kemenag → jika luar negeri / gagal: adhan.js
    const fetchJadwal = useCallback(async (lat, lng) => {
        // Helper: fallback ke adhan.js lokal (berlaku global, semua koordinat di dunia)
        const fallbackAdhan = (fallbackCityName) => {
            if (typeof adhan === 'undefined') return;
            const coordinates = new adhan.Coordinates(lat, lng);
            // Pilih metode kalkulasi berdasarkan koordinat (Indonesia & Asia Tenggara → Singapore)
            // adhan.js menghitung waktu dalam UTC, lalu device timezone menentukan tampilan lokal
            const params = adhan.CalculationMethod.Singapore();
            const times = new adhan.PrayerTimes(coordinates, currentDate, params);
            const fmt = t => t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
            const dhuhaTime = new Date(times.sunrise.getTime() + (20 * 60000));
            setPrayerTimes({
                Subuh: fmt(times.fajr), Dhuha: fmt(dhuhaTime),
                Dzuhur: fmt(times.dhuhr), Ashar: fmt(times.asr),
                Maghrib: fmt(times.maghrib), Isya: fmt(times.isha), Tahajud: '03:00'
            });
            const cityLabel = fallbackCityName || 'Lokasi Anda';
            const formattedCity = cityLabel.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            setLastCity(formattedCity);
            localStorage.setItem('last_city_name', formattedCity);
        };
        let tempCityName = null;
        let kotaId = null;
        let kotaName = null;

        let geoJson = null;

        try {
            // Cek cache ID kota (valid 7 hari, dan koordinat tidak bergeser > ~50km)
            const cachedKota = localStorage.getItem('kemenag_kota_cache');
            if (cachedKota) {
                const parsed = JSON.parse(cachedKota);
                const stillFresh = parsed.ts && Date.now() - parsed.ts < 7 * 24 * 3600 * 1000;
                // Cek apakah lokasi bergeser signifikan (> ~0.5 derajat ≈ 55km)
                const locChanged = parsed.lat != null && parsed.lng != null &&
                    (Math.abs(parsed.lat - lat) > 0.5 || Math.abs(parsed.lng - lng) > 0.5);
                if (stillFresh && !locChanged) {
                    kotaId = parsed.id;
                    kotaName = parsed.displayName || parsed.name;
                    if (lastLoggedKota !== parsed.name) {
                        console.log(`⚡ [Jadwal Sholat] Memuat dari Cache: "${kotaName}" (Data Kemenag: ${parsed.name})`);
                        lastLoggedKota = parsed.name;
                    }
                } else if (locChanged) {
                    console.log('📍 [Jadwal Sholat] Lokasi berubah signifikan, reset cache kota.');
                    localStorage.removeItem('kemenag_kota_cache');
                }
            }

            if (!kotaId) {
                try {
                    // Step 1: Geocode koordinat via BigDataCloud API
                    const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=id`);
                    geoJson = await geoRes.json();

                    // Deteksi negara — hanya coba API Kemenag kalau di Indonesia
                    const countryCode = geoJson?.countryCode || '';
                    const isIndonesia = countryCode === 'ID';

                    // Ambil nama kota terbaik dari respons geocode
                    tempCityName = geoJson?.locality || geoJson?.city || geoJson?.principalSubdivision || null;

                    if (!isIndonesia) {
                        // Luar negeri: langsung fallback ke adhan.js, skip API Kemenag
                        console.log(`🌏 [Jadwal Sholat] Lokasi di luar Indonesia (${countryCode || 'unknown'}), gunakan adhan.js.`);
                        fallbackAdhan(tempCityName);
                        return;
                    }

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
                                lat: lat,
                                lng: lng,
                                ts: Date.now() 
                            }));
                            
                            tempCityName = cand;
                            console.log(`✅ [Jadwal Sholat] Wilayah Asli: "${displayName}" -> Cocok dengan API Kemenag: "${kotaName}"`);
                            break;
                        }
                    }
                    
                    // Jika tidak ketemu di Kemenag (kota kecil/pelosok), fallback ke adhan.js
                    if (!kotaId) tempCityName = geoJson?.locality || geoJson?.city || geoJson?.principalSubdivision || null;
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
                    } else fallbackAdhan(tempCityName || kotaName);
                } else fallbackAdhan(tempCityName || kotaName);
            } catch (e) {
                fallbackAdhan(tempCityName || kotaName);
            }
        } catch (e) {
            fallbackAdhan('Lokasi Anda');
        }
    }, [currentDate, setPrayerTimes, setLastCity]);

    const refreshLocation = useCallback((manual = true) => {
        if (!navigator.geolocation) {
            if (!lastCity) setLastCity('Lokasi Belum Diatur');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                
                // Hapus cache kota jika tombol ditekan manual
                if (manual) localStorage.removeItem('kemenag_kota_cache');
                
                fetchJadwal(latitude, longitude);

                // Sinkronkan lokasi baru ke Firebase jika notifikasi aktif
                const notifEnabled = localStorage.getItem('jurnal_notifications') === 'true';
                if (notifEnabled && currentUserForPushRef?.current) {
                    import('@/modules/push').then(({ syncPushSubscription }) => {
                        syncPushSubscription(currentUserForPushRef.current, true).catch(() => {});
                    });
                }
            },
            () => { if (!lastCity) setLastCity('Lokasi Belum Diatur'); }
        );
    }, [fetchJadwal, setLastCity, lastCity, currentUserForPushRef]);

    // Load cached location on mount
    useEffect(() => {
        const cachedCity = localStorage.getItem('last_city_name');
        const cachedLat = localStorage.getItem('last_lat');
        const cachedLng = localStorage.getItem('last_lng');
        if (cachedCity) setLastCity(cachedCity);
        if (cachedLat && cachedLng) {
            const lat = parseFloat(cachedLat);
            const lng = parseFloat(cachedLng);
            fetchJadwal(lat, lng);
        }
        refreshLocation(false);
    }, []);

    // Timer logic
    useEffect(() => {
        if (!prayerTimes) return;

        const updateTimer = () => {
            const now = new Date();
            const times = [
                { name: 'Subuh', time: prayerTimes.Subuh },
                { name: 'Dhuha', time: prayerTimes.Dhuha },
                { name: 'Dzuhur', time: prayerTimes.Dzuhur },
                { name: 'Ashar', time: prayerTimes.Ashar },
                { name: 'Maghrib', time: prayerTimes.Maghrib },
                { name: 'Isya', time: prayerTimes.Isya }
            ].filter(p => p.time);

            let next = null;
            let minDiff = Infinity;

            for (const p of times) {
                const [h, m] = p.time.split(':').map(Number);
                const pTime = new Date();
                pTime.setHours(h, m, 0, 0);

                if (pTime > now) {
                    const diff = pTime - now;
                    if (diff < minDiff) {
                        minDiff = diff;
                        next = p;
                    }
                }
            }

            if (!next) {
                const [h, m] = times[0].time.split(':').map(Number);
                const pTime = new Date();
                pTime.setDate(pTime.getDate() + 1);
                pTime.setHours(h, m, 0, 0);
                minDiff = pTime - now;
                next = times[0];
            }

            setNextPrayer(next);

            const hh = Math.floor(minDiff / 3600000);
            const mm = Math.floor((minDiff % 3600000) / 60000);
            const ss = Math.floor((minDiff % 60000) / 1000);
            setCountdown(`${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`);
        };

        updateTimer();
        countdownRef.current = setInterval(updateTimer, 1000);
        return () => clearInterval(countdownRef.current);
    }, [prayerTimes]);

    return { nextPrayer, countdown, refreshLocation };
}
