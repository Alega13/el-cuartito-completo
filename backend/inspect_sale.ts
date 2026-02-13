
import * as admin from 'firebase-admin';
import path from 'path';
import dotenv from 'dotenv';
// import { getDb } from './src/config/firebase'; // Removed to avoid path issues

// Load .env from current directory
dotenv.config({ path: path.resolve(__dirname, '.env') });

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const projectId = process.env.FIREBASE_PROJECT_ID;

if (!privateKey || !clientEmail || !projectId) {
    console.error('Missing Firebase credentials in .env');
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
}

const db = admin.firestore();

async function inspectSale(saleId: string) {
    console.log(`Searching for sale ${saleId}...`);
    const doc = await db.collection('sales').doc(saleId).get();

    if (!doc.exists) {
        console.log('No sale found.');
        return;
    }

    const data = doc.data();
    console.log(`Document ID: ${doc.id}`);
    console.log(JSON.stringify(data, null, 2));
}

async function main() {
    console.log('Searching for invoice 2026-0002...');
    const snapshot = await db.collection('invoices').where('invoiceNumber', '==', '2026-0002').get();

    if (snapshot.empty) {
        console.log('Invoice 2026-0002 not found.');
        return;
    }

    const invoiceDoc = snapshot.docs[0];
    const invoiceData = invoiceDoc.data();
    console.log(`Invoice Found: ${invoiceDoc.id}`);
    console.log(`Sale ID: ${invoiceData.saleId}`);

    await inspectSale(invoiceData.saleId);
}

main().catch(console.error);
