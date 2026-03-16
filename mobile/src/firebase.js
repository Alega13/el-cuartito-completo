import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfigString = import.meta.env.VITE_FIREBASE_CONFIG;
let firebaseConfig;

try {
    firebaseConfig = JSON.parse(firebaseConfigString);
} catch (error) {
    console.error("Failed to parse Firebase configuration from VITE_FIREBASE_CONFIG", error);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
