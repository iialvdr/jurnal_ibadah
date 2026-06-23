// src/modules/push.js
import { db, WEB_PUSH_VAPID_PUBLIC_KEY } from '@/config/firebase';
import { doc, deleteDoc, setDoc } from 'firebase/firestore';

const PUSH_DOC_ID = 'push_web';

function isPushSupported() {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

function base64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function saveSubscription(uid, subscription) {
    const pushRef = doc(db, 'users', uid, 'settings', PUSH_DOC_ID);
    await setDoc(pushRef, {
        endpoint: subscription.endpoint,
        keys: subscription.keys || {},
        subscription,
        updated_at: new Date(),
        user_agent: navigator.userAgent || ''
    }, { merge: true });
}

async function clearSubscription(uid) {
    const pushRef = doc(db, 'users', uid, 'settings', PUSH_DOC_ID);
    await deleteDoc(pushRef);
}

export async function syncPushSubscription(user, isEnabled) {
    if (!user || !user.uid) return { supported: false, subscribed: false };
    if (!isPushSupported()) return { supported: false, subscribed: false, reason: 'unsupported' };

    try {
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (!isEnabled) {
            if (subscription) await subscription.unsubscribe();
            await clearSubscription(user.uid);
            return { supported: true, subscribed: false };
        }

        if (Notification.permission !== 'granted') {
            return { supported: true, subscribed: false, reason: 'permission-not-granted' };
        }

        const vapidKey = (WEB_PUSH_VAPID_PUBLIC_KEY || '').trim();
        if (!vapidKey) return { supported: true, subscribed: false, reason: 'missing-vapid-key' };

        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: base64ToUint8Array(vapidKey)
            });
        }

        const subscriptionJson = subscription.toJSON();
        await saveSubscription(user.uid, subscriptionJson);

        return { supported: true, subscribed: true };
    } catch (error) {
        console.error('Gagal sinkronisasi push subscription:', error);
        return { supported: true, subscribed: false, error };
    }
}
