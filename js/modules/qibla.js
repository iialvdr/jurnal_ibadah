const KAABA_COORDS = { lat: 21.422487, lng: 39.826206 };

let currentDiscRotation = 0;
let previousHeading = 0; 
let calculatedQiblaAngle = 0; 
let isAligned = false; 
let isFirstReading = true; // [BARU] Flag untuk deteksi bacaan pertama

export function initQibla() {
    window.requestCompassPermission = requestCompassPermission;
    window.addEventListener('viewChanged', (e) => {
        if(e.detail.viewId === 'qiblaView') {
            if(window.lastLat) {
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
    const lat1 = lat * (PI/180), lng1 = lng * (PI/180), lat2 = KAABA_COORDS.lat * (PI/180), lng2 = KAABA_COORDS.lng * (PI/180);
    const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
    let qiblaAngle = (Math.atan2(y, x) * 180 / PI + 360) % 360; 
    
    calculatedQiblaAngle = qiblaAngle; 
    
    document.getElementById('qiblaDegree').innerText = `${Math.round(qiblaAngle)}°`;
    const pointer = document.getElementById('qiblaPointer');
    if(pointer) pointer.style.transform = `rotate(${qiblaAngle}deg)`;
}

function calculateDistance(lat1, lon1) {
    const R = 6371; 
    const dLat = deg2rad(KAABA_COORDS.lat - lat1);
    const dLon = deg2rad(KAABA_COORDS.lng - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(KAABA_COORDS.lat)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = Math.round(R * c); 
    const distEl = document.getElementById('qiblaDistance');
    if(distEl) distEl.innerText = `${d.toLocaleString('id-ID')} km`;
}

function deg2rad(deg) { return deg * (Math.PI/180); }

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
    previousHeading = 0; 
    isAligned = false;
    isFirstReading = true; // [BARU] Reset flag saat mulai
    if ('ondeviceorientationabsolute' in window) window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    else if (window.DeviceOrientationEvent) window.addEventListener('deviceorientation', handleOrientation, true);
}

function stopCompass() {
    window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
    window.removeEventListener('deviceorientation', handleOrientation, true);
}

function handleOrientation(event) {
    let heading = event.webkitCompassHeading || (360 - event.alpha);
    
    if (heading != null) {
        document.getElementById('compassHeading').innerText = `${Math.round(heading)}°`;
        
        // [BARU] Logika sinkronisasi awal
        if (isFirstReading) {
            // Langsung set rotasi ke arah heading saat ini agar tidak loncat
            currentDiscRotation = -heading;
            previousHeading = heading;
            isFirstReading = false;
        } else {
            // Logika smooth rotation (Delta)
            let delta = heading - previousHeading;
            if (delta > 180) delta -= 360;
            if (delta < -180) delta += 360;
            currentDiscRotation -= delta;
            previousHeading = heading;
        }
        
        const disc = document.getElementById('compassDisc');
        if(disc) {
            disc.style.transform = `rotate(${currentDiscRotation}deg)`;
        }

        checkQiblaAlignment(heading);
    }
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

            if(disc) disc.classList.add('qibla-found-ring');
            if(indicator) {
                indicator.classList.remove('opacity-0', 'translate-y-4');
                indicator.classList.add('animate-pop-in');
            }
            if(glow) glow.classList.remove('opacity-0');
            if(iconContainer) iconContainer.classList.add('qibla-found-icon');
            if(pointerLine) pointerLine.classList.add('from-emerald-400', 'to-emerald-600'); 
        }
    } else {
        if (isAligned) {
            isAligned = false;
            
            if(disc) disc.classList.remove('qibla-found-ring');
            if(indicator) {
                indicator.classList.add('opacity-0', 'translate-y-4');
                indicator.classList.remove('animate-pop-in');
            }
            if(glow) glow.classList.add('opacity-0');
            if(iconContainer) iconContainer.classList.remove('qibla-found-icon');
            if(pointerLine) pointerLine.classList.remove('from-emerald-400', 'to-emerald-600');
        }
    }
}