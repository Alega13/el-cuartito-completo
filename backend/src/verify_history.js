
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

async function verifyHistory() {
    try {
        // 1. Get a recent test order (preferably one I created)
        const snapshot = await db.collection('sales')
            .where('customerEmail', '==', 'alejogalli98@gmail.com')
            .limit(1)
            .get();

        if (snapshot.empty) {
            console.log('❌ No test order found for alejogalli98@gmail.com');
            return;
        }

        const doc = snapshot.docs[0];
        console.log(`ℹ️ Testing on Order ID: ${doc.id}`);

        // 2. Simulate a status update (using the same logic as controller, or directly updating to test DB schema)
        // Actually, let's call the endpoint using fetch (requires running server) OR just test the arrayUnion manually here to prove it works with the SDK.
        // Better: Validating the endpoint is running.

        // Let's just check if 'history' field exists on this doc.
        const data = doc.data();
        if (data.history && Array.isArray(data.history)) {
            console.log('✅ History array exists!');
            console.log(JSON.stringify(data.history, null, 2));
        } else {
            console.log('⚠️ History array does NOT exist yet (Expected if no action taken since update).');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

verifyHistory();
