import * as admin from 'firebase-admin';

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n')
};

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.error("Missing Firebase credentials in .env");
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixBrokenDates() {
    try {
        console.log("Fetching sales...");
        const snapshot = await db.collection("sales").get();
        let fixCount = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            // date might be a Firestore Timestamp object
            if (data.date && data.date.toDate) {
                console.log(`Fixing doc ${doc.id}`);
                const correctDateString = data.date.toDate().toISOString().split('T')[0];
                await db.collection("sales").doc(doc.id).update({
                    date: correctDateString
                });
                fixCount++;
            }
        }
        console.log(`Fixed ${fixCount} sales records.`);
        process.exit(0);
    } catch (e) {
        console.error("Error", e);
        process.exit(1);
    }
}

fixBrokenDates();
