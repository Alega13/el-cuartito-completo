const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') }); 

const privateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined;

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
    });
}

const db = admin.firestore();

// Exact titles provided by the user from the admin interface
const targetTitlesList = [
    'The It EP',
    'Tribute',
    'Vault Sessions 3',
    'Deep Space',
    'All Of The Chaos',
    "I'm Your Audio Tech",
    'Keep Hold Tight EP',
    'Maiden Japan / The Gold Room',
    'Ambulare Aude EP',
    'History of Discipline',
    'Sector III: Polyphony',
    'Fear Of Programming',
    'Another Life',
    'Spacer Woman',
    'Inertial Frame',
    'Space Invaders Are Smoking Grass',
    'Love Affair',
    'Nation 2 Nation',
    'Paradise For The Restless Souls EP',
    'Transferencia Electrónica',
    'Capichone',
    'Aqua Hotel',
    'Boosted',
    'Mordisco EP',
    'Hypnosis EP',
    'Tia',
    'Heike',
    'Salvador Part I/III',
    'N-DRA'
];

const sanitize = (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const sanitizedTargetTitles = targetTitlesList.map(t => ({
    original: t,
    sanitized: sanitize(t)
}));

async function runMigration() {
    try {
        console.log("🚀 Iniciando SEGUNDA PASADA de script de migración Micro-IVA para lote Rush Hour...");
        const snapshot = await db.collection('products').get();
        
        let batch = db.batch();
        let updatedCount = 0;
        let batchCount = 0;
        let skippedCount = 0;
        
        const missingTitles = new Set(targetTitlesList);

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const currentTitleRaw = data.album || data.title || '';
            const currentTitleSanitized = sanitize(currentTitleRaw);

            const matchedTarget = sanitizedTargetTitles.find(t => t.sanitized === currentTitleSanitized);

            if (matchedTarget) {
                // If it already has the provider_origin, skip to avoid redundant writes
                if (data.provider_origin === 'EU_B2B' && data.acquisition_date === '2026-03-19') {
                    // console.log(`⏭️  [SKIPPED] ${currentTitleRaw} (Ya actualizado)`);
                    skippedCount++;
                    missingTitles.delete(matchedTarget.original);
                    continue;
                }

                const currentCost = parseFloat(data.cost) || 0;
                const phantomVat = Math.round((currentCost * 0.25) * 100) / 100;
                
                batch.update(doc.ref, {
                    provider_origin: 'EU_B2B',
                    acquisition_date: '2026-03-19',
                    product_condition: 'New',
                    item_phantom_vat: phantomVat,
                    item_real_vat: 0
                });
                
                updatedCount++;
                batchCount++;
                missingTitles.delete(matchedTarget.original);

                console.log(`✔️ [UPDATE LISTO] ${currentTitleRaw} | Costo: ${currentCost} DKK | VAT Fantasma: ${phantomVat} DKK`);

                if (batchCount >= 450) {
                    await batch.commit();
                    batch = db.batch();
                    batchCount = 0;
                }
            }
        }

        if (batchCount > 0) {
            await batch.commit();
        }

        console.log(`\n================================`);
        console.log(`✅ MIGRACIÓN COMPLETADA`);
        console.log(`Nuevos actualizados: ${updatedCount}`);
        console.log(`Ya estaban actualizados de la pasada anterior: ${skippedCount}`);
        console.log(`================================\n`);
        
        if (missingTitles.size > 0) {
            console.warn(`⚠️ ATENCIÓN: Aún no se encontraron estos ${missingTitles.size} títulos:`);
            missingTitles.forEach(t => console.warn(` - ${t}`));
        } else {
            console.log("🎉 LISTO: Todos los discos de la factura fueron encontrados y actualizados correctamente.");
        }

    } catch (error) {
        console.error("❌ Falla crítica en la migración:", error);
    }
}

runMigration();
