const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
async function run() {
    const db = admin.firestore();
    const snapshot = await db.collection('sales').orderBy('date', 'desc').limit(20).get();
    for (const d of snapshot.docs) {
        if(d.id.includes('oTcYhW')) {
            console.log(JSON.stringify(d.data(), null, 2));
        }
    }
}
run().then(() => process.exit(0)).catch(console.error);
