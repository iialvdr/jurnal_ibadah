// js/config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
export const provider = new GoogleAuthProvider(); //