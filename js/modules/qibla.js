// js/modules/qibla.js

const KAABA_COORDS = { lat: 21.422487, lng: 39.826206 };

let currentDiscRotation = 0;
let previousHeading = 0;
let calculatedQiblaAngle = 0;
let isAligned = false;
let isFirstReading = true;

// [OPTIMASI] Variabel untuk Throttling UI
let latestHeadingData = null;
let animationFrameId = null;
let isCompassActive = false;

export function initQibla() {
    window.requestCompassPermission = requestCompassPermission;
    window.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'qiblaView') {
            if (window.lastLat) {
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
    const lat1 = lat * (PI / 180), lng1 = lng * (PI / 180), lat2 = KAABA_COORDS.lat * (PI / 180), lng2 = KAABA_COORDS.lng * (PI / 180);
    const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
    let qiblaAngle = (Math.atan2(y, x) * 180 / PI + 360) % 360;

    calculatedQiblaAngle = qiblaAngle;

    document.getElementById('qiblaDegree').innerText = `${Math.round(qiblaAngle)}°`;
    const pointer = document.getElementById('qiblaPointer');
    // Pointer statis, update sekali saja
    if (pointer) {
        pointer.style.willChange = 'transform'; // Hint browser
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
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            const response = await DeviceOrientationEvent.requestPermission();
            if (response === 'granted') {
                document.getElementById('compassPermissionBtn').classList.add('hidden');
                startCompass();
            } else alert('Izin ditolak.');
        }
    } catch (e) { console.error(e); }
}

function startCompass() {
    if (isCompassActive) return;

    previousHeading = 0;
    isAligned = false;
    isFirstReading = true;
    isCompassActive = true;

    // Listener Sensor
    if ('ondeviceorientationabsolute' in window) window.addEventListener('deviceorientationabsolute', handleSensorData, true);
    else if (window.DeviceOrientationEvent) window.addEventListener('deviceorientation', handleSensorData, true);

    // [OPTIMASI] Jalankan Loop Animasi UI terpisah dari sensor
    updateCompassUI();
}

function stopCompass() {
    isCompassActive = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    window.removeEventListener('deviceorientationabsolute', handleSensorData, true);
    window.removeEventListener('deviceorientation', handleSensorData, true);
}

// 1. Fungsi ini hanya menyimpan data, TIDAK update UI (sangat ringan)
function handleSensorData(event) {
    let heading = event.webkitCompassHeading || (360 - event.alpha);
    if (heading != null) {
        latestHeadingData = heading;
    }
}

// 2. Fungsi ini yang update UI sinkron dengan refresh rate layar (60fps)
function updateCompassUI() {
    if (!isCompassActive) return;

    if (latestHeadingData !== null) {
        const heading = latestHeadingData;

        // Update teks (bisa di-throttle lebih jarang jika mau, tapi rAF sudah cukup oke)
        const textEl = document.getElementById('compassHeading');
        if (textEl) textEl.innerText = `${Math.round(heading)}°`;

        // Logika Rotasi Halus
        if (isFirstReading) {
            currentDiscRotation = -heading;
            previousHeading = heading;
            isFirstReading = false;
        } else {
            // Shortest path logic agar tidak berputar 360 derajat penuh
            let delta = heading - previousHeading;
            if (delta > 180) delta -= 360;
            if (delta < -180) delta += 360;
            currentDiscRotation -= delta;
            previousHeading = heading;
        }

        const disc = document.getElementById('compassDisc');
        if (disc) {
            // will-change sudah di-set di CSS atau JS init
            disc.style.transform = `rotate(${currentDiscRotation}deg)`;
        }

        checkQiblaAlignment(heading);
    }

    // Loop terus selama aktif
    animationFrameId = requestAnimationFrame(updateCompassUI);
}

function checkQiblaAlignment(currentHeading) {
    let diff = Math.abs(currentHeading - calculatedQiblaAngle);
    if (diff > 180) diff = 360 - diff;

    const TOLERANCE = 3;

    const disc = document.getElementById('compassDisc');
    const indicator = document.getElementById('qiblaSuccessIndicator');
    const glow = document.getElementById('kaabaGlow');
    const iconContainer = document.getElementById('kaabaIconContainer');
    const pointerLine = document.getElementById('pointerLine');

    if (diff <= TOLERANCE) {
        if (!isAligned) {
            isAligned = true;
            if (navigator.vibrate) navigator.vibrate([30, 50, 30]);

            if (disc) disc.classList.add('qibla-found-ring');
            if (indicator) {
                indicator.classList.remove('opacity-0', 'translate-y-4');
                indicator.classList.add('animate-pop-in');
            }
            if (glow) glow.classList.remove('opacity-0');
            if (iconContainer) iconContainer.classList.add('qibla-found-icon');
            if (pointerLine) pointerLine.classList.add('from-emerald-400', 'to-emerald-600');
        }
    } else {
        if (isAligned) {
            isAligned = false;

            if (disc) disc.classList.remove('qibla-found-ring');
            if (indicator) {
                indicator.classList.add('opacity-0', 'translate-y-4');
                indicator.classList.remove('animate-pop-in');
            }
            if (glow) glow.classList.add('opacity-0');
            if (iconContainer) iconContainer.classList.remove('qibla-found-icon');
            if (pointerLine) pointerLine.classList.remove('from-emerald-400', 'to-emerald-600');
        }
    }
}