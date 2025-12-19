// js/modules/qibla.js

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
    const PI = Math.PI;
    const lat1 = lat * (PI / 180);
    const lng1 = lng * (PI / 180);
    const lat2 = KAABA_COORDS.lat * (PI / 180);
    const lng2 = KAABA_COORDS.lng * (PI / 180);

    const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);

    calculatedQiblaAngle = (Math.atan2(y, x) * 180 / PI + 360) % 360;

    const degreeEl = document.getElementById('qiblaDegree');
    if (degreeEl) degreeEl.innerText = `${Math.round(calculatedQiblaAngle)}°`;

    const pointer = document.getElementById('qiblaPointer');
    if (pointer) {
        // Kunci posisi di tengah piringan
        pointer.style.position = 'absolute';
        pointer.style.top = '50%';
        pointer.style.left = '50%';
        pointer.style.width = '100%';
        pointer.style.height = '100%';
        pointer.style.transformOrigin = 'center center';
        // Reset transform awal (nanti diupdate di loop)
        pointer.style.transform = `translate(-50%, -50%) rotate(${calculatedQiblaAngle}deg)`;
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

    if ('ondeviceorientationabsolute' in window) {
        window.addEventListener('deviceorientationabsolute', handleSensorData, true);
    } else {
        window.addEventListener('deviceorientation', handleSensorData, true);
    }
    updateCompassUI();
}

function stopCompass() {
    isCompassActive = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
}

function handleSensorData(event) {
    let heading = null;
    if (event.webkitCompassHeading) {
        heading = event.webkitCompassHeading;
    } else if (event.alpha) {
        heading = 360 - event.alpha;
    }
    if (heading !== null) rawHeading = heading;
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

    if (firstReading) {
        currentSmoothHeading = rawHeading;
        firstReading = false;
    } else {
        currentSmoothHeading = lerpAngle(currentSmoothHeading, rawHeading, 0.15);
    }

    const textEl = document.getElementById('compassHeading');
    if (textEl) textEl.innerText = `${Math.round((currentSmoothHeading + 360) % 360)}°`;

    const disc = document.getElementById('compassDisc');
    if (disc) {
        // Piringan berputar dengan poros tengah yang kaku
        disc.style.transform = `rotate(${-currentSmoothHeading}deg)`;
    }

    checkQiblaAlignment(currentSmoothHeading);
    animationFrameId = requestAnimationFrame(updateCompassUI);
}

function checkQiblaAlignment(heading) {
    let normalizedHeading = (heading + 360) % 360;
    let diff = Math.abs(normalizedHeading - calculatedQiblaAngle);
    if (diff > 180) diff = 360 - diff;

    const TOLERANCE = 4;
    const isNowAligned = diff <= TOLERANCE;

    if (isNowAligned !== isAligned) {
        isAligned = isNowAligned;
        const indicator = document.getElementById('qiblaSuccessIndicator');
        const glow = document.getElementById('kaabaGlow');
        const iconContainer = document.getElementById('kaabaIconContainer');
        const pointerLine = document.getElementById('pointerLine');

        if (isAligned) {
            if (navigator.vibrate) navigator.vibrate(50);
            indicator?.classList.replace('opacity-0', 'opacity-100');
            indicator?.classList.replace('scale-90', 'scale-100');
            glow?.classList.replace('opacity-0', 'opacity-100');

            // PERBAIKAN: Gunakan scale saja tanpa ganggu layout flex
            if (iconContainer) iconContainer.style.transform = "scale(1.2)";
            if (pointerLine) pointerLine.style.backgroundColor = "#10b981";
        } else {
            indicator?.classList.replace('opacity-100', 'opacity-0');
            indicator?.classList.replace('scale-100', 'scale-90');
            glow?.classList.replace('opacity-100', 'opacity-0');

            if (iconContainer) iconContainer.style.transform = "scale(1)";
            if (pointerLine) pointerLine.style.backgroundColor = "";
        }
    }
}