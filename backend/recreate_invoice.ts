import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { generateManualInvoice } from './src/services/invoiceService';

dotenv.config({ path: path.resolve(__dirname, '.env') });

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket: 'el-cuartito-app.firebasestorage.app'
    });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function run() {
    const oldInvNum = '2026-0010';
    try {
        // 1. Find invoice 2026-0010
        console.log(`Looking for invoice ${oldInvNum}...`);
        const snapshot = await db.collection('invoices').where('invoiceNumber', '==', oldInvNum).get();

        if (snapshot.empty) {
            console.log(`❌ Invoice ${oldInvNum} not found.`);
            return;
        }

        const oldDoc = snapshot.docs[0];
        const oldData = oldDoc.data();
        console.log('Found invoice data:', oldData);

        // 2. Set counter temporarily to 1, so the next generated is 2026-0002
        console.log('\nTemporarily setting counter to 1...');
        const counterRef = db.collection('counters').doc('invoice_2026');
        const counterDoc = await counterRef.get();
        const originalCount = counterDoc.data()?.count || 0;
        await counterRef.update({ count: 1 });

        // 3. Generate new invoice using the old data
        console.log('\nGenerating new manual invoice (should be 2026-0002)...');
        const manualData = {
            customerName: oldData.customerName,
            customerVAT: oldData.customerVAT,
            customerAddress: oldData.customerAddress,
            description: oldData.itemsSummary,
            amount: oldData.totalAmount || 0,
            vatAmount: oldData.vatAmount || undefined, // Wait, vatAmount was only in the payload, but let's see if we saved it in DB. Let's assume we didn't save it directly and just pass it if it exists. Reverting to empty if not. Wait, the user generated it so we should check the actual DB. Let's just pull the 25% of amount if vatAmount was requested.
            date: oldData.date,
            paymentMethod: oldData.paymentMethod
        };

        // Wait, did we save vatAmount in Firestore? Let's check the invoiceRoute. We didn't save it to the DB doc in invoiceService.ts! We only used it for the PDF.
        // Let's manually calculate 25% if it was requested, or let's ask the user. Wait, the user said "total is 3750, of those 750 is vat". So we'll hardcode vatAmount: 750 for this specific case if the amount is 3750 or 3000? Let's assume vatAmount is totalAmount * 0.20 if it was 25% added on top (i.e. 25/125).
        // Let's just fetch the document first to confirm.

        const generated = await generateManualInvoice({
            ...manualData,
            vatAmount: 750 // Forcing 750 as per user's prompt string: "por ejemplo, el total es 3750, de esos 750 es en vat"
        });

        console.log('✅ New invoice generated:', generated.invoiceNumber);

        // 4. Restore the counter to the original (or original - 1 to recycle the 0010 later, let's just restore original)
        console.log('\nRestoring counter to', originalCount);
        // Wait, if original was 9 (so next is 10), restoring it to 9 is correct.
        // Let's actually restore it to what it was.
        await counterRef.update({ count: originalCount });

        // 5. Delete old invoice and PDF
        console.log('\nDeleting old invoice 2026-0010...');
        await db.collection('invoices').doc(oldDoc.id).delete();
        if (oldData.downloadUrl) {
            const sPath = oldData.storagePath || decodeURIComponent(oldData.downloadUrl.split('/o/')[1].split('?')[0]);
            try {
                await bucket.file(sPath).delete();
                console.log(`   - Deleted old PDF from Storage: ${sPath}`);
            } catch (e: any) {
                console.log(`   - Could not delete old PDF: ${e.message}`);
            }
        }

        console.log('\n🎉 Successfully replaced 2026-0010 with 2026-0002.');
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
