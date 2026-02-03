
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

async function deleteTestOrders() {
    try {
        console.log('🗑️ Deleting test orders for alejogalli98@gmail.com...');

        const snapshot = await db.collection('sales')
            .where('customerEmail', '==', 'alejogalli98@gmail.com')
            .get();

        if (snapshot.empty) {
            console.log('✅ No test orders found.');
            return;
        }

        const batch = db.batch();
        let count = 0;

        snapshot.forEach(doc => {
            batch.delete(doc.ref);
            count++;
        });

        await batch.commit();
        console.log(`✅ Successfully deleted ${count} test orders.`);

    } catch (error) {
        console.error('❌ Error executing deletion:', error);
    }
}

deleteTestOrders();
