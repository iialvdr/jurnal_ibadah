// js/modules/qibla.js

const KAABA_COORDS = { lat: 21.422487, lng: 39.826206 };

let calculatedQiblaAngle = 0;
let isAligned = false;
let isCompassActive = false;
let animationFrameId = null;

// [VARIABEL SMOOTHING]
let currentSmoothHeading = 0; // Heading yang ditampilkan (sudah halus)
let rawHeading = 0;           // Heading asli dari sensor
let firstReading = true;

export function initQibla() {
    window.requestCompassPermission = requestCompassPermission;

    window.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'qiblaView') {
            if (window.lastLat && window.lastLng) {
                calculateQibla(window.lastLat, window.lastLng);
                calculateDistance(window.lastLat, window.lastLng);
            }
            startCompass();
        } else {
            stopCompass();
        }
    });
}

function calculateQibla(lat, lng) {
    const PI = Math.PI;
    const lat1 = lat * (PI / 180);
    const lng1 = lng * (PI / 180);
    const lat2 = KAABA_COORDS.lat * (PI / 180);
    const lng2 = KAABA_COORDS.lng * (PI / 180);

    const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);

    let qiblaAngle = (Math.atan2(y, x) * 180 / PI + 360) % 360;
    calculatedQiblaAngle = qiblaAngle;

    const degreeEl = document.getElementById('qiblaDegree');
    if (degreeEl) degreeEl.innerText = `${Math.round(qiblaAngle)}°`;

    // Putar jarum kiblat relatif terhadap piringan
    const pointer = document.getElementById('qiblaPointer');
    if (pointer) {
        pointer.style.transform = `rotate(${qiblaAngle}deg)`;
    }
}

function calculateDistance(lat1, lon1) {
    const R = 6371;
    const dLat = deg2rad(KAABA_COORDS.lat - lat1);
    const dLon = deg2rad(KAABA_COORDS.lng - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(KAABA_COORDS.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = Math.round(R * c);

    const distEl = document.getElementById('qiblaDistance');
    if (distEl) distEl.innerText = `${d.toLocaleString('id-ID')} km`;
}

function deg2rad(deg) { return deg * (Math.PI / 180); }

async function requestCompassPermission() {
    try {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            const response = await DeviceOrientationEvent.requestPermission();
            if (response === 'granted') {
                document.getElementById('compassPermissionBtn').classList.add('hidden');
                startCompass();
            } else {
                alert('Izin kompas ditolak.');
            }
        } else {
            startCompass();
        }
    } catch (e) { console.error(e); }
}

function startCompass() {
    if (isCompassActive) return;

    firstReading = true;
    isCompassActive = true;
    isAligned = false;

    if ('ondeviceorientationabsolute' in window) {
        window.addEventListener('deviceorientationabsolute', handleSensorData, true);
    } else if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleSensorData, true);
    } else {
        alert("Sensor kompas tidak terdeteksi.");
    }

    updateCompassUI();
}

function stopCompass() {
    isCompassActive = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    window.removeEventListener('deviceorientationabsolute', handleSensorData, true);
    window.removeEventListener('deviceorientation', handleSensorData, true);
}

function handleSensorData(event) {
    let heading = null;
    if (event.webkitCompassHeading) {
        heading = event.webkitCompassHeading;
    } else if (event.alpha) {
        heading = 360 - event.alpha;
    }

    if (heading !== null) {
        rawHeading = heading;
    }
}

function lerpAngle(start, end, amount) {
    let difference = Math.abs(end - start);
    if (difference > 180) {
        if (end > start) {
            start += 360;
        } else {
            end += 360;
        }
    }
    let value = (start + ((end - start) * amount));
    return (value % 360 + 360) % 360;
}

function updateCompassUI() {
    if (!isCompassActive) return;

    if (rawHeading !== null) {
        if (firstReading) {
            currentSmoothHeading = rawHeading;
            firstReading = false;
        } else {
            currentSmoothHeading = lerpAngle(currentSmoothHeading, rawHeading, 0.15);
        }

        const textEl = document.getElementById('compassHeading');
        if (textEl) textEl.innerText = `${Math.round(currentSmoothHeading)}°`;

        const disc = document.getElementById('compassDisc');
        if (disc) {
            disc.style.transform = `rotate(${-currentSmoothHeading}deg)`;
        }

        checkQiblaAlignment(currentSmoothHeading);
    }

    animationFrameId = requestAnimationFrame(updateCompassUI);
}

function checkQiblaAlignment(heading) {
    let diff = Math.abs(heading - calculatedQiblaAngle);
    if (diff > 180) diff = 360 - diff;

    const TOLERANCE = 4;

    const disc = document.getElementById('compassDisc');
    const indicator = document.getElementById('qiblaSuccessIndicator');
    const glow = document.getElementById('kaabaGlow');
    const pointerLine = document.getElementById('pointerLine');
    const iconContainer = document.getElementById('kaabaIconContainer');

    if (diff <= TOLERANCE) {
        if (!isAligned) {
            isAligned = true;
            if (navigator.vibrate) navigator.vibrate([40, 60, 40]);

            if (disc) {
                disc.style.borderColor = '#10b981';
                disc.style.boxShadow = '0 0 40px rgba(16, 185, 129, 0.25)';
            }
            if (indicator) {
                indicator.classList.remove('opacity-0', 'scale-90', '-translate-y-4');
                indicator.classList.add('opacity-100', 'scale-100', 'translate-y-0');
            }
            if (glow) glow.classList.remove('opacity-0');

            /** * PERBAIKAN: Sertakan translateX(-50%) agar tetap di tengah 
             * saat efek scale diaktifkan melalui JavaScript.
             */
            if (iconContainer) iconContainer.style.transform = "translateX(-50%) scale(1.15)";

            if (pointerLine) pointerLine.classList.add('from-emerald-400', 'to-emerald-500');
        }
    } else {
        if (isAligned) {
            isAligned = false;

            if (disc) {
                disc.style.borderColor = '';
                disc.style.boxShadow = '';
            }
            if (indicator) {
                indicator.classList.add('opacity-0', 'scale-90', '-translate-y-4');
                indicator.classList.remove('opacity-100', 'scale-100', 'translate-y-0');
            }
            if (glow) glow.classList.add('opacity-0');

            /** * PERBAIKAN: Kembalikan translateX(-50%) saat mereset scale.
             */
            if (iconContainer) iconContainer.style.transform = "translateX(-50%) scale(1)";

            if (pointerLine) pointerLine.classList.remove('from-emerald-400', 'to-emerald-500');
        }
    }
}