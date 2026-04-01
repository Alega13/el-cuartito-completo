const admin = require('firebase-admin');
require('dotenv').config({ path: './.env' });

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
});

const db = admin.firestore();

async function checkStockField() {
    try {
        const pDoc = await db.collection('products').doc('dojNTV7VzImoG4Zp0Lgy').get();
        if (pDoc.exists) {
            console.log("Product data:", JSON.stringify(pDoc.data(), null, 2));
        } else {
            console.log("Product not found");
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

checkStockField();
