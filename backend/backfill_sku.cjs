/**
 * backfill_sku.cjs
 * Assigns SKU-xxx to every product that doesn't already have one.
 * Products already in SKU-xxx format are untouched.
 *
 * Usage: node backfill_sku.cjs [--dry-run]
 */

const admin = require('firebase-admin');
require('dotenv').config();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const DRY_RUN = process.argv.includes('--dry-run');
const SKU_RE = /^SKU-(\d+)$/;

async function run() {
  console.log(DRY_RUN ? '🔍 DRY-RUN mode — no writes' : '✏️  WRITE mode');

  // 1. Load all products
  const snap = await db.collection('products').get();
  console.log(`📦 ${snap.size} products loaded`);

  // 2. Find highest existing SKU-xxx number
  let maxNum = 0;
  snap.docs.forEach(d => {
    const m = (d.data().sku || '').match(SKU_RE);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
  });
  console.log(`🔢 Highest existing SKU number: ${maxNum}`);

  // 3. Collect products that need a new SKU
  const needsSku = snap.docs
    .filter(d => !SKU_RE.test(d.data().sku || ''))
    .sort((a, b) => {
      // Sort by created_at so older records get lower numbers
      const tsA = a.data().created_at?.seconds ?? 0;
      const tsB = b.data().created_at?.seconds ?? 0;
      return tsA - tsB;
    });

  console.log(`⚠️  ${needsSku.length} products need a new SKU`);

  if (needsSku.length === 0) {
    console.log('✅ Nothing to do.');
    process.exit(0);
  }

  // 4. Assign and write in batches of 400 (Firestore limit is 500)
  const BATCH_SIZE = 400;
  let counter = maxNum;
  let written = 0;

  for (let i = 0; i < needsSku.length; i += BATCH_SIZE) {
    const chunk = needsSku.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const doc of chunk) {
      counter++;
      const newSku = `SKU-${String(counter).padStart(3, '0')}`;
      const oldSku = doc.data().sku;

      if (DRY_RUN) {
        console.log(`  [dry] ${doc.id.slice(0, 8)} | ${oldSku} → ${newSku}`);
      } else {
        batch.update(db.collection('products').doc(doc.id), { sku: newSku });
        if (written < 5 || written % 50 === 0) {
          console.log(`  → ${newSku}  (era: ${oldSku})`);
        }
      }
      written++;
    }

    if (!DRY_RUN) {
      await batch.commit();
      console.log(`  ✓ Batch committed (${Math.min(i + BATCH_SIZE, needsSku.length)}/${needsSku.length})`);
    }
  }

  console.log(`\n✅ Done!`);
  console.log(`   Productos actualizados: ${written}`);
  console.log(`   Rango asignado: SKU-${String(maxNum + 1).padStart(3, '0')} → SKU-${String(counter).padStart(3, '0')}`);
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
