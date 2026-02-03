
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

async function deleteSpecificOrder() {
    const targetId = 'TEST-SHIPPING-DISCOGS-364';

    try {
        console.log(`🔍 Searching for order: ${targetId}...`);

        // Search by orderNumber
        let snapshot = await db.collection('sales').where('orderNumber', '==', targetId).get();

        if (snapshot.empty) {
            // Search by ID (document key)
            const docRef = db.collection('sales').doc(targetId);
            const doc = await docRef.get();
            if (doc.exists) {
                console.log(`✅ Found order by Doc ID: ${doc.id}`);
                await docRef.delete();
                console.log(`🗑️ Deleted order ${doc.id} successfully.`);
                return;
            } else {
                // Try searching without the hash just in case
                snapshot = await db.collection('sales').where('orderNumber', '==', targetId.replace('#', '')).get();
            }
        }

        if (snapshot.empty) {
            console.log(`❌ Order ${targetId} not found (checked orderNumber and Doc ID).`);
            return;
        }

        const batch = db.batch();
        snapshot.forEach(doc => {
            console.log(`✅ Found order by orderNumber: ${doc.id}`);
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`🗑️ Successfully deleted ${snapshot.size} order(s).`);

    } catch (error) {
        console.error('❌ Error executing deletion:', error);
    }
}

deleteSpecificOrder();
