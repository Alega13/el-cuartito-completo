
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

async function updateOrder() {
    const docId = 'UQbmnW327Arju6gmrKjH';
    console.log(`🚀 Updating order: ${docId}`);

    try {
        const docRef = db.collection('sales').doc(docId);

        await docRef.update({
            status: 'shipped',
            fulfillment_status: 'fulfilled',
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            // Add a history entry if needed, but the user asked for "silent" update effectively
            history: admin.firestore.FieldValue.arrayUnion({
                status: 'fulfilled',
                timestamp: new Date().toISOString(),
                note: 'Order marked as fulfilled manually by admin request.'
            })
        });

        console.log('✅ Order updated successfully to fulfilled.');

    } catch (error) {
        console.error('Error:', error);
    }
}

updateOrder();
