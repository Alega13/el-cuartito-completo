
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

async function countOrders() {
    try {
        const snapshot = await db.collection('sales').get();
        console.log(`📊 Total Remaining Orders: ${snapshot.size}`);

        // List last 5 IDs/Numbers/Emails to give context
        console.log('--- Last 5 Orders ---');
        const docs = snapshot.docs.slice(-5);
        docs.forEach(doc => {
            const data = doc.data();
            console.log(`ID: ${doc.id} | #: ${data.orderNumber} | Email: ${data.customerEmail || data.email} | Channel: ${data.channel}`);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

countOrders();
