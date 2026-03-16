const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.resolve(process.cwd(), 'backend/.env') });

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
});

const db = admin.firestore();

async function inspectLatestSales() {
    const ids = ['tiPwtia3kgdhbRWPXeiC', 'W9ZWq17YKzaLZe0Z8x5j'];
    for (const productId of ids) {
        console.log(`\n==================================================`);
        console.log(`Product ID: ${productId}`);
        const productDoc = await db.collection('products').doc(productId).get();
        if (productDoc.exists) {
            console.log(`Current Stock in DB: ${productDoc.data().stock}`);
        }
        
        const movementsSnapshot = await db.collection('inventory_movements')
            .where('product_id', '==', productId)
            .get();
            
        console.log(`All movements (unsorted due to no index):`);
        const moves = movementsSnapshot.docs.map(d => d.data());
        moves.sort((a,b) => (b.timestamp?.toDate().getTime() || 0) - (a.timestamp?.toDate().getTime() || 0));
        
        moves.forEach(m => {
            console.log(`  Change: ${m.change}, Reason: ${m.reason}, Channel: ${m.channel}, User: ${m.userEmail || 'N/A'}, Date: ${m.timestamp ? m.timestamp.toDate().toLocaleString() : 'N/A'}`);
        });
    }
}

inspectLatestSales()
    .then(() => process.exit(0))
    .catch(e => {
        console.error("Error:", e);
        process.exit(1);
    });
