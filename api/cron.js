import admin from 'firebase-admin';
import webpush from 'web-push';
import adhan from 'adhan';

// Cek apakah admin sudah diinisialisasi
if (!admin.apps.length) {
    try {
        const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!serviceAccountStr) {
            throw new Error('Missing FIREBASE_SERVICE_ACCOUNT env var');
        }
        const serviceAccount = JSON.parse(serviceAccountStr);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (error) {
        console.error('Error initializing Firebase Admin:', error);
    }
}

const db = admin.apps.length ? admin.firestore() : null;

export default async function handler(req, res) {
    // 1. Verifikasi Secret Token agar cron job aman dari spam
    const authHeader = req.headers.authorization;
    const authQuery = req.query.secret;
    const secret = process.env.CRON_SECRET;

    if (secret && authHeader !== `Bearer ${secret}` && authQuery !== secret) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!db) {
        return res.status(500).json({ error: 'Database not initialized' });
    }

    // 2. Setup VAPID Keys untuk Web Push
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    
    if (!publicKey || !privateKey) {
        return res.status(500).json({ error: 'Missing VAPID keys' });
    }
    
    webpush.setVapidDetails('mailto:admin@jurnalibadah.com', publicKey, privateKey);

    const now = new Date();
    // Offset untuk WIB GMT+7 (Karena server Vercel di GMT+0)
    // Walaupun lebih baik menggunakan timezone lokal dari user, kita asumsikan server jalan dan membandingkan jam menit
    // secara spesifik untuk masing-masing zona waktu.
    // Paling aman: hitung jadwal azan untuk hari ini (timezone server), lalu cek selisih waktu.
    // Tapi adhan.js butuh Date object.

    try {
        const usersSnapshot = await db.collection('users').get();
        let notifiedCount = 0;
        let processedCount = 0;

        // Loop semua user
        for (const userDoc of usersSnapshot.docs) {
            const uid = userDoc.id;
            const prefsDoc = await db.collection('users').doc(uid).collection('settings').doc('preferences').get();
            const pushDoc = await db.collection('users').doc(uid).collection('settings').doc('push_web').get();

            if (!prefsDoc.exists || !pushDoc.exists) continue;

            const prefs = prefsDoc.data();
            const pushData = pushDoc.data();

            // Lanjut hanya jika notifikasi dinyalakan dan ada langganan push
            if (prefs.notifications !== true || !pushData.subscription) continue;
            if (!pushData.latitude || !pushData.longitude) continue;

            processedCount++;

            // Hitung jadwal sholat untuk koordinat user
            const coordinates = new adhan.Coordinates(pushData.latitude, pushData.longitude);
            // Default params: Kemenag (mirip Singapore / SI)
            const params = adhan.CalculationMethod.Singapore();
            
            // Kita hitung untuk tanggal sekarang (UTC), karena adhan.js mengubahnya ke local time secara internal
            const date = new Date();
            const prayerTimes = new adhan.PrayerTimes(coordinates, date, params);

            // Daftar waktu sholat
            const prayers = [
                { name: 'Subuh', time: prayerTimes.fajr },
                { name: 'Dzuhur', time: prayerTimes.dhuhr },
                { name: 'Ashar', time: prayerTimes.asr },
                { name: 'Maghrib', time: prayerTimes.maghrib },
                { name: 'Isya', time: prayerTimes.isha }
            ];

            let activePrayer = null;

            // Cek apakah waktu SEKARANG persis sama dengan waktu azan (toleransi 1 menit)
            for (const p of prayers) {
                if (!p.time) continue;
                // Kita bandingkan timestamp dalam ms (beda maksimal 60 detik)
                const diffMs = now.getTime() - p.time.getTime();
                
                // Jika sudah masuk waktu azan dalam rentang 0 sampai 59 detik yang lalu
                if (diffMs >= 0 && diffMs < 60000) {
                    activePrayer = p;
                    break;
                }
            }

            if (activePrayer) {
                // Kirim Notifikasi!
                const payload = JSON.stringify({
                    title: `Waktu ${activePrayer.name}`,
                    body: `Sudah masuk waktu ${activePrayer.name} untuk wilayah Anda. Yuk sholat!`,
                    url: '/'
                });

                try {
                    await webpush.sendNotification(pushData.subscription, payload);
                    notifiedCount++;
                } catch (err) {
                    // Jika subscription sudah tidak valid/expired, hapus dari database
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        await pushDoc.ref.delete();
                    } else {
                        console.error('Push error for', uid, err);
                    }
                }
            }
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Cron executed successfully',
            processed: processedCount,
            notified: notifiedCount
        });

    } catch (error) {
        console.error('Cron error:', error);
        return res.status(500).json({ error: error.message });
    }
}
