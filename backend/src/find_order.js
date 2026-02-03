
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

async function findOrder() {
    const searchId = 'UQbmnW';
    console.log(`🔍 Searching for orders containing: ${searchId}`);

    try {
        const salesRef = db.collection('sales');
        const snapshot = await salesRef.get();

        let found = false;
        snapshot.forEach(doc => {
            const data = doc.data();
            const docId = doc.id;
            const orderNumber = data.orderNumber || '';
            const discogsId = data.discogsId || '';

            if (docId.includes(searchId) || String(orderNumber).includes(searchId) || String(discogsId).includes(searchId)) {
                console.log(`✅ Found Match! Doc ID: ${docId}`);
                console.log(JSON.stringify(data, null, 2));
                found = true;
            }
        });

        if (!found) {
            console.log('❌ No matching orders found.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

findOrder();
