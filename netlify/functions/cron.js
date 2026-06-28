import { schedule } from '@netlify/functions';
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

// Fungsi ini akan otomatis dijalankan oleh Netlify setiap 1 menit (* * * * *)
export const handler = schedule('* * * * *', async (event) => {
    if (!db) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Database not initialized' }) };
    }

    // Setup VAPID Keys untuk Web Push
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    
    if (!publicKey || !privateKey) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Missing VAPID keys' }) };
    }
    
    webpush.setVapidDetails('mailto:admin@jurnalibadah.com', publicKey, privateKey);

    const now = new Date();

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

            if (prefs.notifications !== true || !pushData.subscription) continue;
            if (!pushData.latitude || !pushData.longitude) continue;

            processedCount++;

            const coordinates = new adhan.Coordinates(pushData.latitude, pushData.longitude);
            const params = adhan.CalculationMethod.Singapore();
            const date = new Date();
            const prayerTimes = new adhan.PrayerTimes(coordinates, date, params);

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
                const diffMs = now.getTime() - p.time.getTime();
                
                if (diffMs >= 0 && diffMs < 60000) {
                    activePrayer = p;
                    break;
                }
            }

            if (activePrayer) {
                const payload = JSON.stringify({
                    title: `Waktu ${activePrayer.name}`,
                    body: `Sudah masuk waktu ${activePrayer.name} untuk wilayah Anda. Yuk sholat!`,
                    url: '/'
                });

                try {
                    await webpush.sendNotification(pushData.subscription, payload);
                    notifiedCount++;
                } catch (err) {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        await pushDoc.ref.delete();
                    } else {
                        console.error('Push error for', uid, err);
                    }
                }
            }
        }

        return { 
            statusCode: 200, 
            body: JSON.stringify({ 
                success: true, 
                message: 'Cron executed successfully',
                processed: processedCount,
                notified: notifiedCount
            }) 
        };

    } catch (error) {
        console.error('Cron error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
});
