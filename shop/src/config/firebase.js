import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBj0bgdOtb5snSrn3tteblFdVUtA0BpFss",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "el-cuartito-app.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "el-cuartito-app",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "el-cuartito-app.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "116723400888",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:116723400888:web:47ec6d99818d391d6ab44d"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export default app;
