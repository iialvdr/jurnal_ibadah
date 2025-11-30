const KAABA_COORDS = { lat: 21.422487, lng: 39.826206 };

// === VARIABLE STATE ===
let currentDiscRotation = 0;
let previousHeading = 0; // [BARU] Menyimpan heading sebelumnya untuk hitung selisih

export function initQibla() {
    window.requestCompassPermission = requestCompassPermission;
    
    window.addEventListener('viewChanged', (e) => {
        if(e.detail.viewId === 'qiblaView') {
            if(window.lastLat) calculateQibla(window.lastLat, window.lastLng);
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
    
    document.getElementById('qiblaDegree').innerText = `${Math.round(qiblaAngle)}°`;
    const pointer = document.getElementById('qiblaPointer');
    
    // Pointer menunjuk ke Ka'bah relatif terhadap Utara piringan kompas
    if(pointer) pointer.style.transform = `rotate(${qiblaAngle}deg)`;
}

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
    // Reset state saat kompas mulai agar tidak loncat
    previousHeading = 0; 
    
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

        // === [LOGIKA PERBAIKAN ROTASI] ===
        
        // 1. Hitung selisih antara sudut baru dan sudut lama
        let delta = heading - previousHeading;

        // 2. Koreksi lompatan sudut (misal 359 -> 1 atau 1 -> 359)
        // Jika selisih > 180, berarti dia lompat lewat batas 0/360, kita kurangi 360
        if (delta > 180) delta -= 360;
        // Jika selisih < -180, kita tambah 360
        if (delta < -180) delta += 360;

        // 3. Akumulasi rotasi (Negatif karena piringan berputar berlawanan arah HP)
        currentDiscRotation -= delta;
        
        // 4. Simpan heading sekarang untuk frame berikutnya
        previousHeading = heading;

        const disc = document.getElementById('compassDisc');
        if(disc) {
            // Menggunakan transform langsung
            disc.style.transform = `rotate(${currentDiscRotation}deg)`;
        }
    }
}