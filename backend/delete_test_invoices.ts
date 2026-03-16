import * as admin from 'firebase-admin';

// Initialize using the service account from env, similar to the rest of the backend
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
}

const db = admin.firestore();
const bucket = admin.storage().bucket('elcuartitorecords.appspot.com');

async function deleteInvoices() {
    const invoicesToDelete = ['2026-0007', '2026-0008', '2026-0009'];

    // 1. Delete from Firestore
    console.log('1. Deleting from Firestore...');
    for (const invNum of invoicesToDelete) {
        const snapshot = await db.collection('invoices').where('invoiceNumber', '==', invNum).get();
        if (snapshot.empty) {
            console.log(`- Invoice ${invNum} not found in Firestore.`);
            continue;
        }
        for (const doc of snapshot.docs) {
            const data = doc.data();
            await db.collection('invoices').doc(doc.id).delete();
            console.log(`- Deleted ${invNum} from Firestore (ID: ${doc.id})`);

            // Also try to delete from Storage if storagePath exists
            if (data.downloadUrl) {
                // Storage path is stored in downloadUrl sometimes or explicitly in storagePath
                const sPath = data.storagePath || decodeURIComponent(data.downloadUrl.split('/o/')[1].split('?')[0]);
                try {
                    await bucket.file(sPath).delete();
                    console.log(`   - Deleted PDF from Storage: ${sPath}`);
                } catch (e: any) {
                    if (e.code === 404) {
                        console.log(`   - PDF not found in Storage: ${sPath}`);
                    } else {
                        console.error(`   - Failed to delete PDF: ${e.message}`);
                    }
                }
            }
        }
    }

    // 2. Decrement Counter
    console.log('\n2. Updating Counter...');
    const counterRef = db.collection('counters').doc('invoice_2026');
    const counterDoc = await counterRef.get();
    if (counterDoc.exists) {
        const currentCount = counterDoc.data()?.count || 0;
        console.log(`- Current counter is ${currentCount}`);
        if (currentCount > 6) {
            await counterRef.update({ count: 6 });
            console.log(`- Reset counter to 6`);
        } else {
            console.log(`- Counter is already 6 or lower, not changing.`);
        }
    } else {
        console.log('- Counter doc not found.');
    }

    console.log('\n✅ Done.');
}

deleteInvoices().catch(console.error);
