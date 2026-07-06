// src/pages/Qibla.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass, MapPin, Info, ChevronDown } from 'lucide-react';
import TopNavConfig from '@/components/TopNavConfig';

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

function calcDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function angleDiff(a, b) {
    const d = ((a - b + 180) % 360 + 360) % 360 - 180;
    return Math.abs(d);
}

function smoothAngle(prev, next, factor = 0.15) {
    let diff = next - prev;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return prev + diff * factor;
}

export default function Qibla() {
    const navigate = useNavigate();
    const [location, setLocation] = useState(null);
    const [qiblaAngle, setQiblaAngle] = useState(null);
    const [distance, setDistance] = useState(null);
    const [error, setError] = useState(null);
    const [permissionState, setPermissionState] = useState('granted');
    const [apiVerified, setApiVerified] = useState(false);
    const [isAligned, setIsAligned] = useState(false);

    // Refs for 60fps animation without React re-render
    const rawHeadingRef = useRef(null);
    const smoothRef = useRef(null);
    const animFrameRef = useRef(null);
    const compassListenerRef = useRef(null);
    const qiblaAngleRef = useRef(null);

    // DOM refs for direct manipulation
    const discRef = useRef(null);       // the rotating compass disc
    const headingTextRef = useRef(null); // the heading number text
    const wrapperRef = useRef(null);     // outer page div for bg color
    const chevronRef = useRef(null);

    // Sync qiblaAngle into ref
    useEffect(() => { qiblaAngleRef.current = qiblaAngle; }, [qiblaAngle]);

    // Get location
    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolokasi tidak didukung di perangkat ini.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                setLocation({ lat, lng });
                const angle = calcQiblaAngle(lat, lng);
                setQiblaAngle(angle);
                qiblaAngleRef.current = angle;
                setDistance(calcDistance(lat, lng, KAABA_LAT, KAABA_LNG));

                fetch(`https://api.aladhan.com/v1/qibla/${lat}/${lng}`)
                    .then(r => r.json())
                    .then(d => {
                        if (d?.data?.direction) {
                            setQiblaAngle(d.data.direction);
                            qiblaAngleRef.current = d.data.direction;
                            setApiVerified(true);
                        }
                    })
                    .catch(() => {});
            },
            () => setError('Gagal mendapatkan lokasi. Pastikan GPS aktif dan izin diberikan.')
        );
    }, []);

    // 60fps animation loop — no React setState, direct DOM
    useEffect(() => {
        let lastAligned = false;

        const loop = () => {
            const raw = rawHeadingRef.current;
            if (raw !== null) {
                // Smooth
                if (smoothRef.current === null) smoothRef.current = raw;
                let diff = raw - smoothRef.current;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;
                smoothRef.current += diff * 0.12;

                // Always keep in 0–360 range
                smoothRef.current = ((smoothRef.current % 360) + 360) % 360;

                const smooth = smoothRef.current;
                const discRotation = -smooth;

                // Apply rotation directly to DOM
                if (discRef.current) {
                    discRef.current.style.transform = `rotate(${discRotation}deg)`;
                }
                if (headingTextRef.current) {
                    headingTextRef.current.textContent = (Math.round(smooth) % 360) + '°';
                }

                // Check alignment (update React state only when it changes)
                const qa = qiblaAngleRef.current;
                if (qa !== null) {
                    const aligned = angleDiff(smooth, qa) <= TOLERANCE;
                    if (aligned !== lastAligned) {
                        lastAligned = aligned;
                        setIsAligned(aligned);
                    }
                }
            }
            animFrameRef.current = requestAnimationFrame(loop);
        };
        animFrameRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, []);

    const startListening = () => {
        let hasAbsolute = false;

        const absoluteHandler = (e) => {
            if (e.alpha === null) return;
            hasAbsolute = true;
            // deviceorientationabsolute: alpha is degrees from geographic/magnetic north
            rawHeadingRef.current = (360 - e.alpha) % 360;
        };

        const relativeHandler = (e) => {
            // Only use relative if we never got an absolute event
            if (hasAbsolute) return;
            // webkitCompassHeading is iOS-specific, already a true compass heading
            if (e.webkitCompassHeading != null) {
                rawHeadingRef.current = e.webkitCompassHeading;
            } else if (e.alpha !== null) {
                rawHeadingRef.current = (360 - e.alpha) % 360;
            }
        };

        compassListenerRef.current = { absoluteHandler, relativeHandler };
        window.addEventListener('deviceorientationabsolute', absoluteHandler, true);
        window.addEventListener('deviceorientation', relativeHandler, true);
    };

    const stopCompass = () => {
        if (compassListenerRef.current) {
            const { absoluteHandler, relativeHandler } = compassListenerRef.current;
            window.removeEventListener('deviceorientationabsolute', absoluteHandler, true);
            window.removeEventListener('deviceorientation', relativeHandler, true);
        }
        cancelAnimationFrame(animFrameRef.current);
    };

    const requestCompass = async () => {
        setPermissionState('requesting');
        try {
            if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
                const result = await DeviceOrientationEvent.requestPermission();
                if (result === 'granted') {
                    setPermissionState('granted');
                    startListening();
                } else {
                    setPermissionState('idle');
                    setError('Izin kompas ditolak.');
                }
            } else {
                setPermissionState('granted');
                startListening();
            }
        } catch {
            setPermissionState('idle');
            setError('Tidak dapat meminta izin kompas.');
        }
    };

    useEffect(() => {
        const check = async () => {
            if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
                setPermissionState('idle');
            } else {
                setPermissionState('granted');
                startListening();
            }
        };
        check();
        return () => stopCompass();
    }, []);


    return (
        <div className={`app-view active flex flex-col h-full overflow-hidden no-scrollbar qibla-view transition-colors duration-1000 ${isAligned ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-slate-100 dark:bg-slate-950'}`}>

            {/* Gradient top glow */}
            <div className={`fixed top-0 left-0 right-0 h-80 pointer-events-none z-0 transition-all duration-1000 ${isAligned ? 'bg-gradient-to-b from-white/20 to-transparent' : 'bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent'}`}></div>

            {/* Header */}
            <TopNavConfig
                leftNode={
                    <button onClick={() => { if (navigator.vibrate) navigator.vibrate(10); navigate(-1); }}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90 group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
                    </button>
                }
                titleNode="Arah Kiblat"
                rightNode={<div className="w-10"></div>}
            />
            <div className="h-[5.5rem] md:h-[7rem] shrink-0 w-full" />

            {/* Main layout — compass dominates, info bar below */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-start gap-4 px-5 pt-6 pb-4 md:grid md:grid-cols-2 md:gap-10 md:px-12 md:content-center max-w-7xl mx-auto w-full overflow-hidden">

                {/* ── Compass disc ── */}
                <div className="relative w-full max-w-[min(86vw,380px)] md:max-w-[420px] aspect-square flex items-center justify-center touch-none mx-auto">
                    {/* Outer decorative ring */}
                    <div className={`absolute inset-0 rounded-full border-2 opacity-30 transition-colors duration-1000 ${isAligned ? 'border-white' : 'border-slate-300 dark:border-slate-700'}`}></div>

                    {/* Chevron pointer — always points up */}
                    <div className="absolute -top-8 left-0 right-0 flex justify-center z-20">
                        <ChevronDown className={`w-10 h-10 fill-current drop-shadow-[0_0_10px_rgba(16,185,129,0.6)] animate-bounce transition-colors duration-500 ${isAligned ? 'text-white' : 'text-emerald-500'}`} />
                    </div>

                    {/* "Tepat" pill — centered when aligned */}
                    <div className={`absolute inset-0 flex justify-center items-center z-40 transition-all duration-500 pointer-events-none ${isAligned ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                        <div className="bg-white/90 text-emerald-700 px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-white/40 backdrop-blur-md">
                            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            <span className="text-sm font-black tracking-wide">Arah Kiblat Tepat!</span>
                        </div>
                    </div>

                    {/* Rotating compass disc */}
                    <div
                        ref={discRef}
                        className={`w-[92%] aspect-square rounded-full backdrop-blur-2xl shadow-2xl border-[6px] relative will-change-transform flex items-center justify-center transition-[border-color,box-shadow,background] duration-500 ${isAligned ? 'bg-emerald-400/30 border-white shadow-[0_0_60px_rgba(255,255,255,0.3)]' : 'bg-white/80 dark:bg-slate-900/80 border-white dark:border-slate-800'}`}
                    >
                        {/* Cardinal directions */}
                        <span className={`absolute top-4 left-1/2 -translate-x-1/2 text-base font-black transition-colors duration-500 ${isAligned ? 'text-white' : 'text-rose-500'}`}>U</span>
                        <span className={`absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-bold transition-colors duration-500 ${isAligned ? 'text-white/60' : 'text-slate-300 dark:text-slate-600'}`}>S</span>
                        <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold transition-colors duration-500 ${isAligned ? 'text-white/60' : 'text-slate-300 dark:text-slate-600'}`}>B</span>
                        <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold transition-colors duration-500 ${isAligned ? 'text-white/60' : 'text-slate-300 dark:text-slate-600'}`}>T</span>

                        {/* Tick ring */}
                        <div className={`absolute inset-6 rounded-full border border-dashed opacity-30 transition-colors duration-500 ${isAligned ? 'border-white' : 'border-slate-300 dark:border-slate-600'}`}></div>

                        {/* Qibla needle */}
                        {qiblaAngle !== null && (
                            <div className="absolute inset-0 z-20 will-change-transform flex items-center justify-center" style={{ transform: `rotate(${qiblaAngle}deg)` }}>
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center w-14">
                                    <div className="relative flex justify-center">
                                        <div className={`absolute inset-[-10px] bg-emerald-500 blur-2xl rounded-full transition-opacity duration-500 ${isAligned ? 'opacity-50' : 'opacity-0'}`}></div>
                                        <img
                                            src="https://img.icons8.com/fluency/48/kaaba.png"
                                            className={`relative w-12 h-12 drop-shadow-lg z-10 object-contain transition-transform duration-500 ${isAligned ? 'scale-125' : 'scale-100'}`}
                                            alt="Kaaba"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    </div>
                                    <div className={`w-2 h-24 rounded-full mt-1 transition-all duration-500 ${isAligned ? 'bg-gradient-to-b from-white to-transparent opacity-80' : 'bg-gradient-to-b from-emerald-500 to-transparent opacity-40'}`}></div>
                                </div>
                            </div>
                        )}

                        {/* Center dot — counter-rotates to stay upright */}
                        <div className="w-5 h-5 rounded-full z-30 shadow-md border-4 flex items-center justify-center bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                        </div>
                    </div>
                </div>

                {/* ── Info bar ── */}
                <div className="w-full md:max-w-sm mx-auto">
                    {error && (
                        <div className="w-full bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-3 mb-3 flex items-center gap-3">
                            <span className="text-rose-500">⚠️</span>
                            <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300">{error}</p>
                        </div>
                    )}

                    {/* Glass dashboard — fixed width columns so nothing shifts */}
                    <div className={`backdrop-blur-xl border rounded-[2rem] px-5 py-4 shadow-2xl transition-all duration-1000 ${isAligned ? 'bg-white/30 border-white/40' : 'bg-white/60 dark:bg-slate-900/60 border-white/50 dark:border-slate-700/50'}`}>
                        <div className="flex items-stretch justify-between">

                            {/* Qibla angle — fixed width */}
                            <div className="flex flex-col justify-center w-[35%]">
                                <span className={`text-[9px] uppercase tracking-[0.2em] font-bold transition-colors duration-500 ${isAligned ? 'text-white/70' : 'text-slate-400'}`}>Arah Kiblat</span>
                                <div className="flex items-baseline gap-0.5 mt-1">
                                    <span className={`text-4xl font-black font-mono tracking-tighter leading-none transition-colors duration-500 ${isAligned ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {qiblaAngle !== null ? Math.round(qiblaAngle) : '--'}
                                    </span>
                                    <span className={`text-base font-bold transition-colors duration-500 ${isAligned ? 'text-white/80' : 'text-emerald-500'}`}>°</span>
                                </div>
                                {apiVerified && (
                                    <span className="text-[7px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-sm mt-1.5 self-start">API ✓</span>
                                )}
                            </div>

                            <div className={`w-px self-stretch shrink-0 transition-colors duration-500 ${isAligned ? 'bg-white/30' : 'bg-slate-200 dark:bg-slate-700'}`}></div>

                            {/* Distance — fixed width */}
                            <div className="flex flex-col items-center justify-center w-[30%]">
                                <span className={`text-[9px] uppercase tracking-[0.2em] font-bold transition-colors duration-500 ${isAligned ? 'text-white/70' : 'text-slate-400'}`}>Jarak</span>
                                <div className="flex items-baseline gap-0.5 justify-center mt-1">
                                    <span className={`text-2xl font-black font-mono leading-none transition-colors duration-500 ${isAligned ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                                        {distance !== null ? distance.toLocaleString('id-ID') : '--'}
                                    </span>
                                </div>
                                <span className={`text-[9px] font-bold mt-0.5 transition-colors duration-500 ${isAligned ? 'text-white/60' : 'text-slate-400'}`}>km</span>
                            </div>

                            <div className={`w-px self-stretch shrink-0 transition-colors duration-500 ${isAligned ? 'bg-white/30' : 'bg-slate-200 dark:bg-slate-700'}`}></div>

                            {/* Current heading — fixed width, updated via DOM ref */}
                            <div className="flex flex-col items-end justify-center w-[30%]">
                                <span className={`text-[9px] uppercase tracking-[0.2em] font-bold transition-colors duration-500 ${isAligned ? 'text-white/70' : 'text-slate-400'}`}>Arahmu</span>
                                <div className="flex items-baseline gap-0.5 justify-end mt-1">
                                    <span ref={headingTextRef} className={`text-2xl font-black font-mono leading-none transition-colors duration-500 ${isAligned ? 'text-white' : 'text-slate-700 dark:text-white'}`}>--°</span>
                                </div>
                                <div className="flex items-center gap-1 justify-end mt-0.5">
                                    <Compass className={`w-2.5 h-2.5 transition-colors duration-500 ${isAligned ? 'text-white/60' : 'text-emerald-500'}`} />
                                    <span className={`text-[8px] font-bold transition-colors duration-500 ${isAligned ? 'text-white/60' : 'text-slate-400'}`}>Kompas</span>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* iOS permission buttons */}
                    {permissionState === 'idle' && (
                        <button onClick={requestCompass}
                            className="w-full mt-3 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[1.5rem] text-xs font-bold shadow-xl shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 active:scale-95">
                            <Compass className="w-4 h-4" />
                            Izinkan Akses Kompas
                        </button>
                    )}
                    {permissionState === 'requesting' && (
                        <button disabled className="w-full mt-3 py-3.5 bg-emerald-400 text-white rounded-[1.5rem] text-xs font-bold flex items-center justify-center gap-2 opacity-70 cursor-wait">
                            <Compass className="w-4 h-4 animate-spin" />
                            Meminta izin...
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}