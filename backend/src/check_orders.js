
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

async function checkLastOrders() {
    try {
        const snapshot = await db.collection('sales')
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get();

        if (snapshot.empty) {
            console.log('No orders found.');
            return;
        }

        console.log('--- LAST 5 ORDERS ---');
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`ID: ${doc.id}`);
            console.log(`Order #: ${data.orderNumber || 'N/A'}`);
            console.log(`Email: ${data.customer_email || data.email || 'MISSING'}`);
            console.log(`Channel: ${data.channel}`);
            console.log(`Status: ${data.fulfillment_status}`);
            console.log('---------------------');
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
    }
}

checkLastOrders();
