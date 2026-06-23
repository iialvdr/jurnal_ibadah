// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDX2VOndgMEIHOGnRA2O1dDa1AKmNV3H08",
    authDomain: "jurnalibadah.firebaseapp.com",
    projectId: "jurnalibadah",
    storageBucket: "jurnalibadah.firebasestorage.app",
    messagingSenderId: "142461877640",
    appId: "1:142461877640:web:0ac0b0353bde1f32ac0e3d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
export const WEB_PUSH_VAPID_PUBLIC_KEY = "BN2gGu-94U0pPYjnlvieAwvPK8mIr7rqJFUBqoMMjbPZFYdb9d7M4p8wTMTkEwOEn-WECZD91Qzy-6ewSmFDGS0";
