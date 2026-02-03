
const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config();

const privateKey = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
    });
}

const db = admin.firestore();

async function checkOrder() {
    const searchId = 'UQbmnW32';
    console.log(`🔍 Checking status for: ${searchId}`);

    try {
        // Check by Doc ID
        const docRef = db.collection('sales').doc(searchId);
        const doc = await docRef.get();

        if (doc.exists) {
            console.log('✅ Found by Doc ID');
            console.log(JSON.stringify(doc.data(), null, 2));
            return;
        }

        // Check by orderNumber (exact)
        const snapshot = await db.collection('sales').where('orderNumber', '==', searchId).get();
        if (!snapshot.empty) {
            console.log('✅ Found by orderNumber');
            snapshot.forEach(d => console.log(JSON.stringify(d.data(), null, 2)));
            return;
        }

        // Check by orderNumber (partial - maybe it has a prefix?)
        // Can't do partial match easily in Firestore without third party, but let's assume exact.

        console.log('❌ Order NOT found in database.');

    } catch (error) {
        console.error('Error:', error);
    }
}

checkOrder();
