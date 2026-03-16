
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialize Firebase Admin check
if (!admin.apps.length) {
    try {
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
        };

        if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
            throw new Error('Missing Firebase environment variables');
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin initialized via Environment Variables');
    } catch (error) {
        console.error('❌ Error initializing Firebase Admin:', error);
        process.exit(1);
    }
}

const db = admin.firestore();

// Batch 5 Data (SKU -> Location)
const updates = [
    { sku: "DISCOGS-3991270000", location: "Dub Techno" },
    { sku: "DISCOGS-4011026194", location: "Industrial / EBM" },
    { sku: "DISCOGS-3999015757", location: "Dub Techno" },
    { sku: "DISCOGS-4007651767", location: "Techno" },
    { sku: "DISCOGS-3999015313", location: "Dub Techno" },
    { sku: "DISCOGS-4007646097", location: "Techno" },
    { sku: "DISCOGS-4011056302", location: "Dub Techno" },
    { sku: "DISCOGS-3999036238", location: "Hypnotic Techno" },
    { sku: "DISCOGS-4010999053", location: "Techno" },
    { sku: "DISCOGS-4011015319", location: "Hard Techno" },
    { sku: "DISCOGS-3991255546", location: "Hard Techno" },
    { sku: "DISCOGS-4011065086", location: "Hypnotic Techno" },
    { sku: "DISCOGS-4007766346", location: "Techno" },
    { sku: "DISCOGS-4011028078", location: "Industrial / EBM" },
    { sku: "DISCOGS-4007456851", location: "Techno" },
    { sku: "DISCOGS-3992448604", location: "Hypnotic Techno" },
    { sku: "DISCOGS-3991258687", location: "Techno" },
    { sku: "DISCOGS-3999041548", location: "Techno" },
    { sku: "DISCOGS-4011061366", location: "Hard Techno" },
    { sku: "DISCOGS-3992395900", location: "Techno" },
    { sku: "DISCOGS-3992447167", location: "Dub Techno" },
    { sku: "DISCOGS-4007777692", location: "Industrial / EBM" },
    { sku: "DISCOGS-4011018709", location: "Industrial / EBM" },
    { sku: "DISCOGS-4007760034", location: "Hard Techno" },
    { sku: "DISCOGS-4010999833", location: "Industrial / EBM" },
    { sku: "DISCOGS-4011023548", location: "Hard Techno" },
    { sku: "DISCOGS-4011028528", location: "Industrial / EBM" },
    { sku: "DISCOGS-4011016864", location: "Industrial / EBM" },
    { sku: "DISCOGS-4011064942", location: "Industrial / EBM" },
    { sku: "DISCOGS-4007768224", location: "Hard Techno" },
    { sku: "DISCOGS-3999016918", location: "Techno" },
    { sku: "DISCOGS-4011008806", location: "Dub Techno" },
    { sku: "DISCOGS-3991270549", location: "Industrial / EBM" },
    { sku: "DISCOGS-4011025441", location: "Dub Techno" },
    { sku: "DISCOGS-4011021274", location: "Hypnotic Techno" },
    { sku: "DISCOGS-4002571099", location: "Hard Techno" },
    { sku: "DISCOGS-4011008635", location: "Industrial / EBM" },
    { sku: "DISCOGS-4011016189", location: "Dub Techno" },
    { sku: "DISCOGS-4011062947", location: "Hard Techno" },
    { sku: "DISCOGS-4011026782", location: "Industrial / EBM" },
    { sku: "DISCOGS-3999048910", location: "Hypnotic Techno" },
    { sku: "DISCOGS-4007458834", location: "Dub Techno" },
    { sku: "DISCOGS-4007698735", location: "Techno" },
    { sku: "DISCOGS-3999018838", location: "Industrial / EBM" },
    { sku: "DISCOGS-4011061900", location: "Hypnotic Techno" },
    { sku: "DISCOGS-3992538088", location: "Hypnotic Techno" },
    { sku: "DISCOGS-4011060448", location: "Hypnotic Techno" },
    { sku: "DISCOGS-3992459629", location: "Dub Techno" },
    { sku: "DISCOGS-4011063931", location: "Hard Techno" },
    { sku: "DISCOGS-4011062491", location: "Industrial / EBM" },
    { sku: "DISCOGS-4011064765", location: "Hard Techno" },
    { sku: "DISCOGS-3992485498", location: "Techno" },
    { sku: "DISCOGS-4011023038", location: "Industrial / EBM" },
    { sku: "DISCOGS-4007478166", location: "Industrial / EBM" },
    { sku: "DISCOGS-4011061024", location: "Industrial / EBM" },
    { sku: "DISCOGS-3992475037", location: "Dub Techno" },
    { sku: "DISCOGS-3992418964", location: "Dub Techno" },
    { sku: "SKU-145", location: "Techno" },
    { sku: "DISCOGS-4011024739", location: "Industrial / EBM" },
    { sku: "DISCOGS-4002570154", location: "Hard Techno" },
    { sku: "DISCOGS-3992520079", location: "Industrial / EBM" },
    { sku: "DISCOGS-3999026875", location: "Industrial / EBM" },
    { sku: "DISCOGS-3999021808", location: "Industrial / EBM" },
    { sku: "DISCOGS-4007456854", location: "Techno" },
    { sku: "DISCOGS-4011005722", location: "Techno" },
    { sku: "DISCOGS-3992527414", location: "Techno" },
    { sku: "DISCOGS-3991274593", location: "Dub Techno" },
    { sku: "DISCOGS-3992453191", location: "Hypnotic Techno" },
    { sku: "DISCOGS-4011022519", location: "Hypnotic Techno" }
];

async function updateLocations() {
    console.log(`Starting update for ${updates.length} items...`);
    let successCount = 0;
    let failCount = 0;

    for (const update of updates) {
        try {
            // Find by SKU
            const snapshot = await db.collection('products').where('sku', '==', update.sku).get();

            if (snapshot.empty) {
                console.warn(`⚠️ SKU not found: ${update.sku}`);
                failCount++;
                continue;
            }

            // Update all matching docs (usually 1)
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, {
                    storageLocation: update.location,
                    updatedAt: new Date()
                });
            });

            await batch.commit();
            console.log(`✅ Updated ${update.sku} -> ${update.location}`);
            successCount++;
        } catch (error) {
            console.error(`❌ Error updating ${update.sku}:`, error);
            failCount++;
        }
    }

    console.log(`\nSummary:`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`Total: ${updates.length}`);
}

updateLocations().catch(console.error);
