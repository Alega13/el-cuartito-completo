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
const FieldValue = admin.firestore.FieldValue;

const productIds = [
    'dojNTV7VzImoG4Zp0Lgy',
    'KkdgeA4Rq5hMn3onvByq',
    'o27XReK0rmwNYoioW2nf',
    'DIbXbNa5EgQtnRWcjJQC',
    'lDEAVY7Rk79SNHWhHRGm',
    'KzkufymVWs6rZtSjyF0Y',
    'PvVb6gBJlpYo8nopUTpQ',
    'vvc6R2SJ1KkILJhcQFOz',
    'WAcg6r9dCWvVNqdqI5ON',
    'akjmGrJZXNPpdkTcwHGj'
];

async function reduceStock() {
    const batch = db.batch();
    const productsRef = db.collection('products');
    
    console.log(`Reducing stock for ${productIds.length} products...`);
    
    for (const id of productIds) {
        const docRef = productsRef.doc(id);
        batch.update(docRef, {
            stock: FieldValue.increment(-1),
            updated_at: FieldValue.serverTimestamp()
        });
    }
    
    try {
        await batch.commit();
        console.log("Successfully updated stock for all 10 products.");
    } catch (error) {
        console.error("Error updating stock:", error);
    } finally {
        process.exit(0);
    }
}

reduceStock();
