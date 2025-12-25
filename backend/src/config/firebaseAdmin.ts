import * as admin from 'firebase-admin';
import config from './env';

let db: admin.firestore.Firestore;

export const getDb = () => {
    if (db) return db;

    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: config.FIREBASE_PROJECT_ID,
                clientEmail: config.FIREBASE_CLIENT_EMAIL,
                privateKey: config.FIREBASE_PRIVATE_KEY,
            }),
        });
        db = admin.firestore();
        console.log("🔥 Firebase Admin initialized successfully");
        return db;
    } catch (error) {
        console.error("❌ Firebase initialization error:", error);
        throw error;
    }
};

export default admin;
