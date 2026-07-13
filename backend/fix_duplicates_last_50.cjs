const admin = require('firebase-admin');
require('dotenv').config();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/"/g, '').replace(/-----BEGIN PRIVATE KEY-----/g, 'BEGIN_KEY').replace(/-----END PRIVATE KEY-----/g, 'END_KEY').replace(/\\n/g, '\n').replace(/\s+/g, '\n').replace(/BEGIN_KEY/g, '-----BEGIN PRIVATE KEY-----\n').replace(/END_KEY/g, '\n-----END PRIVATE KEY-----\n') : undefined,
    }),
  });
}

const db = admin.firestore();

async function run() {
  console.log('🔍 Revisando los últimos 50 discos en busca de SKUs repetidos...');

  const snap = await db.collection('products').orderBy('created_at', 'desc').limit(50).get();
  const recentDocs = snap.docs;

  // Get all products to find duplicates across the whole DB
  const allSnap = await db.collection('products').get();
  const skuCounts = {};
  
  allSnap.docs.forEach(d => {
    const sku = d.data().sku;
    if (sku) {
      skuCounts[sku] = (skuCounts[sku] || 0) + 1;
    }
  });

  const duplicatesToFix = [];

  for (const doc of recentDocs) {
    const sku = doc.data().sku;
    if (sku && skuCounts[sku] > 1) {
      duplicatesToFix.push(doc);
      // Decrease the count so we only fix the extra ones, leaving exactly one intact
      // Wait, if it's the newest 50, and there are 2, the newest one gets fixed.
      skuCounts[sku]--;
    }
  }

  if (duplicatesToFix.length === 0) {
    console.log('✅ No hay SKUs repetidos en los últimos 50 discos agregados.');
    process.exit(0);
  }

  console.log(`⚠️ Se encontraron ${duplicatesToFix.length} discos recientes con SKU repetido. Arreglando...`);

  await db.runTransaction(async (transaction) => {
    const counterRef = db.collection('metadata').doc('vinylCounter');
    const counterDoc = await transaction.get(counterRef);
    let currentCount = counterDoc.exists ? (counterDoc.data().current || 0) : 0;

    for (const doc of duplicatesToFix.reverse()) { // Reverse to fix oldest among duplicates first
      currentCount++;
      const newSku = `SKU-${String(currentCount).padStart(3, '0')}`;
      const quickId = String(currentCount).padStart(4, '0');
      
      console.log(`  → Modificando disco "${doc.data().album}" (antes ${doc.data().sku}) -> Nuevo SKU: ${newSku}`);
      
      transaction.update(doc.ref, { 
          sku: newSku,
          quickId: quickId
      });
    }

    transaction.set(counterRef, { current: currentCount }, { merge: true });
  });

  console.log('✅ Reparación completada con éxito.');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
