const admin = require('firebase-admin');
require('dotenv').config({ path: './backend/.env' });

// Initialize Firebase Admin using environment variables
admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
});

const db = admin.firestore();

// Collections to delete
const collections = [
    'products',      // Inventory
    'sales',         // Sales (local and online)
    'expenses',      // Expenses
    'events',        // Calendar events
    'consignors'     // Consignments
];

async function deleteCollection(collectionPath, batchSize = 100) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, resolve, reject);
    });
}

async function deleteQueryBatch(query, resolve, reject) {
    try {
        const snapshot = await query.get();

        if (snapshot.size === 0) {
            resolve();
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`✓ Deleted ${snapshot.size} documents`);

        // Recurse on the next batch
        process.nextTick(() => {
            deleteQueryBatch(query, resolve, reject);
        });
    } catch (error) {
        reject(error);
    }
}

async function resetDatabase() {
    console.log('\n⚠️  WARNING: This will DELETE ALL DATA from Firestore!');
    console.log('⚠️  This operation is IRREVERSIBLE!\n');

    console.log('Starting database reset in 3 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    for (const collection of collections) {
        console.log(`\nDeleting collection: ${collection}...`);
        try {
            await deleteCollection(collection);
            console.log(`✅ Collection '${collection}' deleted successfully`);
        } catch (error) {
            console.error(`❌ Error deleting collection '${collection}':`, error);
        }
    }

    console.log('\n✅ Database reset complete!');
    console.log('All data has been permanently deleted.\n');
    process.exit(0);
}

// Run the reset
resetDatabase().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
