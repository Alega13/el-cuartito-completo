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

async function checkListings() {
    const productsRef = db.collection('products');
    
    for (const id of productIds) {
        const doc = await productsRef.doc(id).get();
        if (doc.exists) {
            const data = doc.data();
            console.log(`Product: ${data.album || data.title}, Stock: ${data.stock}, Discogs ID: ${data.discogs_listing_id}`);
        }
    }
    process.exit(0);
}

checkListings();
