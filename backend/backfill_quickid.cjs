/**
 * Backfill QuickID for Existing Products
 * 
 * This script assigns sequential quickId values to all existing products
 * that don't already have one, ordered by created_at date (oldest first).
 * 
 * Usage: node backfill_quickid.cjs
 * 
 * Run this ONCE from the admin/ or backend/ directory.
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function backfillQuickIds() {
    console.log('🔍 Fetching all products...');
    
    const snapshot = await db.collection('products').get();
    const products = [];
    
    snapshot.forEach(doc => {
        products.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`📦 Found ${products.length} total products.`);
    
    // Filter products without quickId
    const needsQuickId = products.filter(p => !p.quickId);
    console.log(`🔢 ${needsQuickId.length} products need a quickId.`);
    
    if (needsQuickId.length === 0) {
        console.log('✅ All products already have quickIds. Nothing to do.');
        process.exit(0);
    }
    
    // Sort by created_at (oldest first) — so the oldest product gets 0001
    needsQuickId.sort((a, b) => {
        const dateA = a.created_at ? (a.created_at._seconds || a.created_at.seconds || 0) : 0;
        const dateB = b.created_at ? (b.created_at._seconds || b.created_at.seconds || 0) : 0;
        return dateA - dateB;
    });
    
    // Get current counter value
    const counterRef = db.collection('metadata').doc('vinylCounter');
    const counterDoc = await counterRef.get();
    let currentCount = counterDoc.exists ? (counterDoc.data().current || 0) : 0;
    
    console.log(`📊 Current counter value: ${currentCount}`);
    console.log(`🚀 Starting backfill from ${currentCount + 1}...`);
    
    // Process in batches of 500 (Firestore batch write limit)
    const BATCH_SIZE = 500;
    let processed = 0;
    
    for (let i = 0; i < needsQuickId.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = needsQuickId.slice(i, i + BATCH_SIZE);
        
        for (const product of chunk) {
            currentCount++;
            const quickId = String(currentCount).padStart(4, '0');
            
            const productRef = db.collection('products').doc(product.id);
            batch.update(productRef, { quickId });
            
            processed++;
            if (processed <= 5 || processed % 50 === 0) {
                console.log(`  → ${quickId}: ${product.artist} - ${product.album}`);
            }
        }
        
        await batch.commit();
        console.log(`  ✓ Batch committed (${Math.min(i + BATCH_SIZE, needsQuickId.length)}/${needsQuickId.length})`);
    }
    
    // Update counter to final value
    await counterRef.set({ current: currentCount }, { merge: true });
    
    console.log(`\n✅ Backfill complete!`);
    console.log(`   - ${processed} products updated`);
    console.log(`   - Counter set to: ${currentCount}`);
    console.log(`   - Next new product will get quickId: ${String(currentCount + 1).padStart(4, '0')}`);
    
    process.exit(0);
}

backfillQuickIds().catch(err => {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
});
