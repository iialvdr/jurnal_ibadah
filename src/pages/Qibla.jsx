// src/pages/Qibla.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass, MapPin, Info, ChevronDown } from 'lucide-react';

const KAABA_LAT = 21.422487;
const KAABA_LNG = 39.826206;
const TOLERANCE = 3;

function toRad(deg) { return deg * (Math.PI / 180); }
function toDeg(rad) { return rad * (180 / Math.PI); }

function calcQiblaAngle(lat, lng) {
    const y = Math.sin(toRad(KAABA_LNG - lng)) * Math.cos(toRad(KAABA_LAT));
    const x = Math.cos(toRad(lat)) * Math.sin(toRad(KAABA_LAT)) - Math.sin(toRad(lat)) * Math.cos(toRad(KAABA_LAT)) * Math.cos(toRad(KAABA_LNG - lng));
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function calcDistance(lat1, lng1) {
    const R = 6371;
    const dLat = toRad(KAABA_LAT - lat1);
    const dLng = toRad(KAABA_LNG - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(KAABA_LAT)) * Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Interpolasi sudut melalui jalur terpendek agar tidak memutar balik di 0°/360°
function shortestAngleLerp(current, target, t) {
    // Normalisasi kedua sudut ke [0,360) terlebih dahulu
    const c = ((current % 360) + 360) % 360;
    const tgt = ((target % 360) + 360) % 360;
    // diff selalu dalam range [-180, 180] — ambil jalur terpendek
    let diff = tgt - c;
    if (diff > 180) diff -= 360;
    else if (diff < -180) diff += 360;
    // Normalisasi hasil ke [0, 360)
    return ((c + diff * t) % 360 + 360) % 360;
}

export default function Qibla() {
    const navigate = useNavigate();
    const [qiblaAngle, setQiblaAngle] = useState(null);
    const [distance, setDistance] = useState(null);
    const [smoothHeading, setSmoothHeading] = useState(null);
    const [isAligned, setIsAligned] = useState(false);
    const [error, setError] = useState(null);
    const [location, setLocation] = useState(null);
    const [permissionState, setPermissionState] = useState('checking'); // checking | idle | requesting | granted | denied
    const [apiVerified, setApiVerified] = useState(false);

    const rawHeadingRef = useRef(null);
    const smoothHeadingRef = useRef(null);
    const isCompassActiveRef = useRef(false);
    const rafIdRef = useRef(null);
    const qiblaAngleRef = useRef(null);
    const orientationHandlerRef = useRef(null);
    const isAlignedRef = useRef(false);

    const handleSensorData = (e) => {
        let heading = null;

        // iOS Safari: webkitCompassHeading sudah true north, clockwise dari North
        // Ini tersedia di event 'deviceorientation' maupun 'deviceorientationabsolute' di iOS
        if (typeof e.webkitCompassHeading === 'number' && e.webkitCompassHeading >= 0) {
            heading = e.webkitCompassHeading;
        }
        // Android / browser modern: gunakan HANYA jika event benar-benar absolute
        // e.absolute === true menjamin alpha diukur relatif ke North, bukan startup orientation
        else if (e.absolute === true && typeof e.alpha === 'number' && e.alpha !== null) {
            heading = (360 - e.alpha) % 360;
        }
        // JANGAN gunakan e.alpha dari deviceorientation biasa (e.absolute !== true) karena
        // nilainya relatif ke posisi awal HP dinyalakan, BUKAN ke Utara geografis.

        if (heading !== null) rawHeadingRef.current = heading;
    };

    const updateCompassUI = () => {
        if (!isCompassActiveRef.current) return;

        if (rawHeadingRef.current !== null) {
            if (smoothHeadingRef.current === null) {
                // Inisialisasi langsung tanpa interpolasi
                smoothHeadingRef.current = rawHeadingRef.current;
            } else {
                // Gunakan shortestAngleLerp — tidak akan "memutar balik" saat melewati 0°/360°
                smoothHeadingRef.current = shortestAngleLerp(
                    smoothHeadingRef.current,
                    rawHeadingRef.current,
                    0.12
                );
            }
            setSmoothHeading(smoothHeadingRef.current);

            if (qiblaAngleRef.current !== null) {
                let diff = Math.abs(smoothHeadingRef.current - qiblaAngleRef.current);
                if (diff > 180) diff = 360 - diff;
                const aligned = diff <= TOLERANCE;
                if (aligned !== isAlignedRef.current) {
                    isAlignedRef.current = aligned;
                    setIsAligned(aligned);
                    if (aligned && navigator.vibrate) navigator.vibrate([30, 50, 30]);
                }
            }
        }

        rafIdRef.current = requestAnimationFrame(updateCompassUI);
    };

    const startListening = () => {
        isCompassActiveRef.current = true;
        isAlignedRef.current = false;
        smoothHeadingRef.current = null; // reset agar tidak ada lompatan awal

        const handler = handleSensorData;
        orientationHandlerRef.current = handler;

        // Tambahkan listener deviceorientationabsolute (Android/modern)
        // DAN deviceorientation (iOS webkitCompassHeading).
        // Handler sudah aman — hanya menerima data valid sesuai kondisi di atas.
        if ('ondeviceorientationabsolute' in window) {
            window.addEventListener('deviceorientationabsolute', handler, true);
        }
        window.addEventListener('deviceorientation', handler, true);
        updateCompassUI();
    };

    const stopCompass = () => {
        isCompassActiveRef.current = false;
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        if (orientationHandlerRef.current) {
            window.removeEventListener('deviceorientationabsolute', orientationHandlerRef.current, true);
            window.removeEventListener('deviceorientation', orientationHandlerRef.current, true);
        }
    };

    const requestCompass = async () => {
        setPermissionState('requesting');
        // iOS 13+ perlu requestPermission eksplisit
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const perm = await DeviceOrientationEvent.requestPermission();
                if (perm === 'granted') {
                    startListening();
                    setPermissionState('granted');
                } else {
                    setPermissionState('denied');
                    setError('Izin kompas ditolak. Buka Pengaturan > Safari > Izin untuk mengaktifkan.');
                }
            } catch {
                setPermissionState('denied');
                setError('Gagal meminta izin kompas.');
            }
        } else {
            // Android / non-iOS: langsung listen, tidak butuh requestPermission
            startListening();
            setPermissionState('granted');
        }
    };

    useEffect(() => {
        // Ambil lokasi via GPS
        navigator.geolocation?.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                setLocation({ lat: latitude, lng: longitude });
                // Hitung lokal dulu
                const localAngle = calcQiblaAngle(latitude, longitude);
                setQiblaAngle(localAngle);
                qiblaAngleRef.current = localAngle;
                setDistance(calcDistance(latitude, longitude));
                // Verifikasi via API
                try {
                    const res = await fetch(`https://api.myquran.com/v3/qibla/${latitude}/${longitude}`);
                    const json = await res.json();
                    if (json.status && json.data?.direction) {
                        setQiblaAngle(json.data.direction);
                        qiblaAngleRef.current = json.data.direction;
                        setApiVerified(true);
                    }
                } catch { /* tetap pakai lokal */ }
            },
            () => setError('Tidak bisa mendapatkan lokasi. Aktifkan GPS.')
        );

        // Cek status permission kompas
        const checkCompassPermission = async () => {
            // iOS perlu requestPermission eksplisit — tidak bisa dicek via Permissions API
            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                // iOS: tidak bisa tahu status tanpa minta, tampilkan tombol
                setPermissionState('idle');
                return;
            }

            // Android/Desktop: cek via Permissions API jika tersedia
            if (navigator.permissions) {
                try {
                    // Tidak semua browser support 'gyroscope'
                    const result = await navigator.permissions.query({ name: 'gyroscope' });
                    if (result.state === 'granted') {
                        setPermissionState('granted');
                        startListening();
                    } else if (result.state === 'denied') {
                        setPermissionState('denied');
                        setError('Akses sensor gerak ditolak oleh browser.');
                    } else {
                        // 'prompt' — sensor belum pernah diminta, tapi di non-iOS biasanya langsung bisa
                        setPermissionState('granted');
                        startListening();
                    }
                } catch {
                    // Permissions API tidak support sensor, langsung coba
                    setPermissionState('granted');
                    startListening();
                }
            } else {
                // Tidak ada Permissions API, langsung coba
                setPermissionState('granted');
                startListening();
            }
        };

        checkCompassPermission();

        return () => stopCompass();
    }, []);

    // Rotasi disc kompas berlawanan arah dengan heading perangkat
    // Sehingga huruf "U" (utara) selalu menunjuk utara sejati
    const discRotation = smoothHeading !== null ? -smoothHeading : 0;

    return (
        <div className="app-view active flex flex-col h-full bg-slate-100 dark:bg-slate-950 overflow-y-auto no-scrollbar qibla-view">

            {/* Gradient top glow */}
            <div className="fixed top-0 left-0 right-0 h-80 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none z-0"></div>

            {/* Header */}
            <div className="sticky top-0 z-[100] px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-3 md:px-8 md:pt-6">
                <div className="flex items-center justify-between p-2 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-sm w-full max-w-7xl mx-auto">
                    <button onClick={() => { if (navigator.vibrate) navigator.vibrate(10); navigate(-1); }}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90 group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
                    </button>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight text-center flex-1 truncate px-2">Arah Kiblat</h2>
                    <div className="w-10"></div>
                </div>
            </div>

            {/* Main content */}
            <div className="relative z-10 flex-1 flex flex-col items-center pt-4 pb-20 md:grid md:grid-cols-2 md:gap-10 md:px-12 md:content-center md:h-full md:pb-0 max-w-7xl mx-auto w-full">

                {/* Aligned indicator floating pill */}
                <div className={`absolute -top-2 left-0 right-0 flex justify-center z-40 transition-all duration-500 md:top-6 pointer-events-none ${isAligned ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-3 scale-90'}`}>
                    <div className="bg-emerald-500 text-white px-4 py-1.5 rounded-full shadow-lg shadow-emerald-500/30 flex items-center gap-2 border border-emerald-400/50 backdrop-blur-md">
                        <div className="bg-white/20 p-1 rounded-full">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <span className="text-[10px] font-black tracking-[0.1em] uppercase">Arah Kiblat Tepat</span>
                    </div>
                </div>

                {/* Compass disc */}
                <div className="relative w-full max-w-[310px] md:max-w-[420px] aspect-square flex items-center justify-center mb-6 mt-14 md:mb-0 md:mt-0 touch-none mx-auto">
                    {/* Outer faint ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-slate-200/50 dark:border-slate-800/50 opacity-50"></div>

                    {/* Chevron indicator at top (fixed, always points up) */}
                    <div className="absolute -top-7 left-0 right-0 flex justify-center items-end z-20">
                        <ChevronDown className={`w-10 h-10 fill-current drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-bounce transition-colors duration-500 ${isAligned ? 'text-emerald-400' : 'text-emerald-500'}`} />
                    </div>

                    {/* Compass disc rotates based on device heading */}
                    <div
                        className={`w-[92%] aspect-square rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-2xl border-[6px] relative will-change-transform flex items-center justify-center transition-colors duration-500 ${isAligned ? 'border-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.35)]' : 'border-white dark:border-slate-800'}`}
                        style={{
                            transform: `rotate(${discRotation}deg)`,
                            transition: 'border-color 0.5s, box-shadow 0.5s'
                        }}
                    >
                        {/* Cardinal directions (rotate with disc) */}
                        <span className="absolute top-5 left-1/2 -translate-x-1/2 text-sm font-black text-rose-500">U</span>
                        <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-300 dark:text-slate-600">S</span>
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-300 dark:text-slate-600">B</span>
                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-300 dark:text-slate-600">T</span>

                        {/* Tick marks */}
                        <div className="absolute inset-4 rounded-full border border-dashed border-slate-200 dark:border-slate-700/50 opacity-40"></div>

                        {/* Qibla needle — fixed at qiblaAngle inside the rotating disc */}
                        {qiblaAngle !== null && (
                            <div
                                className="absolute inset-0 z-20 will-change-transform flex items-center justify-center"
                                style={{ transform: `rotate(${qiblaAngle}deg)` }}
                            >
                                <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center w-14">
                                    <div className="relative flex justify-center">
                                        <div className={`absolute inset-[-10px] bg-emerald-500 blur-2xl rounded-full transition-opacity duration-500 ${isAligned ? 'opacity-40' : 'opacity-0'}`}></div>
                                        <img
                                            src="https://img.icons8.com/fluency/48/kaaba.png"
                                            className={`relative w-12 h-12 drop-shadow-lg z-10 object-contain transition-transform duration-500 ${isAligned ? 'scale-125' : 'scale-100'}`}
                                            alt="Kaaba"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    </div>
                                    <div className={`w-2 h-24 bg-gradient-to-b from-emerald-500 to-transparent mt-2 rounded-full transition-opacity duration-500 ${isAligned ? 'opacity-100' : 'opacity-40'}`}></div>
                                </div>
                            </div>
                        )}

                        {/* Center dot */}
                        <div
                            className="w-5 h-5 bg-white dark:bg-slate-800 rounded-full z-30 shadow-md border-4 border-slate-100 dark:border-slate-700 flex items-center justify-center"
                            style={{ transform: `rotate(${-discRotation}deg)` }}
                        >
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                        </div>
                    </div>
                </div>

                {/* Info panel */}
                <div className="w-full max-w-xs space-y-4 md:max-w-sm mx-auto px-5 md:px-0">

                    {error && (
                        <div className="w-full bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-[2rem] p-4 flex items-center gap-3">
                            <span className="text-rose-500 text-lg">⚠️</span>
                            <p className="text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>
                        </div>
                    )}

                    {/* Qibla degree card */}
                    <div className="bento-card bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm p-6 rounded-[2rem] border border-white dark:border-slate-800 text-center md:text-left">
                        <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold">Sudut Kiblat Kamu</span>
                        <h3 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white font-mono tracking-tighter mt-2">
                            {qiblaAngle !== null ? `${Math.round(qiblaAngle)}°` : '--°'}
                        </h3>
                        {location && (
                            <div className="flex items-center gap-1.5 mt-3 justify-center md:justify-start">
                                <MapPin className="w-3 h-3 text-teal-500" />
                                <span className="text-[10px] font-bold text-slate-400">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
                                {apiVerified && (
                                    <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">API ✓</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Distance + Compass row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bento-card bg-white dark:bg-slate-900 p-5 rounded-[1.8rem] border border-white dark:border-slate-800 shadow-sm flex flex-col items-center justify-center group hover:border-emerald-500/30 transition-all md:items-start md:pl-6">
                            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                                <MapPin className="w-4 h-4" />
                            </div>
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Jarak</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                {distance !== null ? `${distance.toLocaleString('id-ID')} km` : '- km'}
                            </span>
                        </div>

                        <div className="bento-card bg-white dark:bg-slate-900 p-5 rounded-[1.8rem] border border-white dark:border-slate-800 shadow-sm flex flex-col items-center justify-center group hover:border-blue-500/30 transition-all md:items-start md:pl-6">
                            <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                                <Compass className="w-4 h-4" />
                            </div>
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Kompas</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                {smoothHeading !== null ? `${Math.round(smoothHeading)}°` : '--°'}
                            </span>
                        </div>
                    </div>

                    {/* Tombol izin hanya muncul di iOS (perlu requestPermission) */}
                    {permissionState === 'idle' && (
                        <button onClick={requestCompass}
                            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-bold shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 active:scale-95">
                            <Compass className="w-5 h-5" />
                            Izinkan Akses Kompas
                        </button>
                    )}
                    {permissionState === 'requesting' && (
                        <button disabled
                            className="w-full py-4 bg-emerald-400 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-3 opacity-70 cursor-wait">
                            <Compass className="w-5 h-5 animate-spin" />
                            Meminta izin...
                        </button>
                    )}

                    {/* Tips box */}
                    <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-[2rem]">
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                <Info className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest">Tips Akurasi</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">Jauhkan perangkat dari benda logam atau magnet. Putar perangkat membentuk angka 8 jika kompas terasa tidak akurat.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
