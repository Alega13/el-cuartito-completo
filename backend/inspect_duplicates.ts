
import * as admin from 'firebase-admin';
import path from 'path';
import dotenv from 'dotenv';

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
        storageBucket: 'el-cuartito-admin-records.appspot.com'
    });
}

const db = admin.firestore();

async function deleteInvoice(invoiceNumber: string) {
    console.log(`Searching for invoice ${invoiceNumber} to DELETE...`);
    const snapshot = await db.collection('invoices').where('invoiceNumber', '==', invoiceNumber).get();

    if (snapshot.empty) {
        console.log('No invoice found.');
        return;
    }

    // We expect only 1, but if multiple, delete all
    for (const doc of snapshot.docs) {
        const data = doc.data();

        console.log(`Deleting Firestore doc: ${doc.id}`);
        await db.collection('invoices').doc(doc.id).delete();
        console.log('✅ Firestore doc deleted.');

        if (data.storagePath) {
            console.log(`Deleting Storage file: ${data.storagePath}`);
            try {
                await admin.storage().bucket().file(data.storagePath).delete();
                console.log('✅ Storage file deleted.');
            } catch (e: any) {
                console.error('⚠️ Could not delete file (maybe already gone):', e.message);
            }
        }
    }
}

async function main() {
    // We only delete 2026-0004 as it is the duplicate of 0003
    await deleteInvoice('2026-0004');
}

main().catch(console.error);
