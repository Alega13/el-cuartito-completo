import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function run() {
    try {
        await db.collection('coupons').doc('CUARTITO20').set({
            code: 'CUARTITO20',
            discount_percentage: 20,
            active: true
        });
        console.log('✅ Coupon CUARTITO20 created successfully');
    } catch (e) {
        console.error('❌ Error creating coupon:', e);
    }
    process.exit(0);
}

run();
