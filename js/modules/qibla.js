/* jurnal_ibadah/js/modules/qibla.js */

const KAABA_COORDS = { lat: 21.422487, lng: 39.826206 };

let calculatedQiblaAngle = 0;
let isAligned = false;
let isCompassActive = false;
let animationFrameId = null;

let currentSmoothHeading = 0;
let rawHeading = 0;
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
    const lat1 = lat * (Math.PI / 180);
    const lng1 = lng * (Math.PI / 180);
    const lat2 = KAABA_COORDS.lat * (Math.PI / 180);
    const lng2 = KAABA_COORDS.lng * (Math.PI / 180);

    const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);

    calculatedQiblaAngle = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

    const degreeEl = document.getElementById('qiblaDegree');
    if (degreeEl) degreeEl.innerText = `${Math.round(calculatedQiblaAngle)}°`;

    const pointer = document.getElementById('qiblaPointer');
    if (pointer) pointer.style.transform = `rotate(${calculatedQiblaAngle}deg)`;
}

function calculateDistance(lat1, lon1) {
    const R = 6371;
    const dLat = (KAABA_COORDS.lat - lat1) * (Math.PI / 180);
    const dLon = (KAABA_COORDS.lng - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(KAABA_COORDS.lat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = Math.round(R * c);

    const distEl = document.getElementById('qiblaDistance');
    if (distEl) distEl.innerText = `${d.toLocaleString('id-ID')} km`;
}

async function requestCompassPermission() {
    try {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            const response = await DeviceOrientationEvent.requestPermission();
            if (response === 'granted') {
                document.getElementById('compassPermissionBtn')?.classList.add('hidden');
                startCompass();
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
    rawHeading = event.webkitCompassHeading || (360 - event.alpha) || 0;
}

function lerpAngle(start, end, amount) {
    let diff = Math.abs(end - start);
    if (diff > 180) {
        if (end > start) start += 360;
        else end += 360;
    }
    return (start + (end - start) * amount) % 360;
}

function updateCompassUI() {
    if (!isCompassActive) return;
    if (firstReading) { currentSmoothHeading = rawHeading; firstReading = false; }
    else { currentSmoothHeading = lerpAngle(currentSmoothHeading, rawHeading, 0.15); }

    const textEl = document.getElementById('compassHeading');
    if (textEl) textEl.innerText = `${Math.round(currentSmoothHeading)}°`;

    const disc = document.getElementById('compassDisc');
    if (disc) disc.style.transform = `rotate(${-currentSmoothHeading}deg)`;

    checkQiblaAlignment(currentSmoothHeading);
    animationFrameId = requestAnimationFrame(updateCompassUI);
}

function checkQiblaAlignment(heading) {
    let diff = Math.abs(heading - calculatedQiblaAngle);
    if (diff > 180) diff = 360 - diff;

    const TOLERANCE = 3;
    const disc = document.getElementById('compassDisc');
    const indicator = document.getElementById('qiblaSuccessIndicator');
    const glow = document.getElementById('kaabaGlow');
    const iconContainer = document.getElementById('kaabaIconContainer');

    if (diff <= TOLERANCE) {
        if (!isAligned) {
            isAligned = true;
            if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
            disc?.classList.add('border-emerald-500', 'shadow-[0_0_50px_rgba(16,185,129,0.4)]');
            indicator?.classList.replace('opacity-0', 'opacity-100');
            indicator?.classList.replace('-translate-y-4', 'translate-y-0');
            glow?.classList.add('opacity-80', 'animate-pulse');
            if (iconContainer) iconContainer.style.transform = "translateX(-50%) scale(1.15)";
        }
    } else {
        if (isAligned) {
            isAligned = false;
            disc?.classList.remove('border-emerald-500', 'shadow-[0_0_50px_rgba(16,185,129,0.4)]');
            indicator?.classList.replace('opacity-100', 'opacity-0');
            indicator?.classList.replace('translate-y-0', '-translate-y-4');
            glow?.classList.remove('opacity-80', 'animate-pulse');
            if (iconContainer) iconContainer.style.transform = "translateX(-50%) scale(1)";
        }
    }
}