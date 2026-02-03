
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

async function fixOrder() {
    const docId = 'UQbmnW327Arju6gmrKjH';
    console.log(`🚀 Fixing order fulfillment status: ${docId}`);

    try {
        const docRef = db.collection('sales').doc(docId);

        await docRef.update({
            status: 'shipped',
            fulfillment_status: 'shipped', // DASHBOARD EXPECTS 'shipped' OR 'picked_up'
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            history: admin.firestore.FieldValue.arrayUnion({
                status: 'shipped',
                timestamp: new Date().toISOString(),
                note: 'Corrected fulfillment_status to shipped to match dashboard filters.'
            })
        });

        console.log('✅ Order updated successfully to shipped.');

    } catch (error) {
        console.error('Error:', error);
    }
}

fixOrder();
