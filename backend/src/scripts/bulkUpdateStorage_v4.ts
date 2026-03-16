
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        })
    });
}

const db = admin.firestore();

const updates = [
    { location: "Industrial / EBM", sku: "DISCOGS-4011061918" },
    { location: "Minimal", sku: "DISCOGS-4002570655" },
    { location: "Minimal", sku: "DISCOGS-4007503954" },
    { location: "Minimal", sku: "DISCOGS-4007484940" },
    { location: "Electro / Breaks", sku: "DISCOGS-3991275091" },
    { location: "Sello: Multiplex", sku: "DISCOGS-3991214377" },
    { location: "Ambient / IDM / Experimental", sku: "DISCOGS-4011011368" },
    { location: "Acid", sku: "DISCOGS-4011072286" },
    { location: "Deep House", sku: "DISCOGS-4007767477" },
    { location: "Sello: Multiplex", sku: "DISCOGS-3991171780" },
    { location: "Acid", sku: "DISCOGS-4011020632" },
    { location: "Minimal", sku: "SKU-142" },
    { location: "Minimal", sku: "DISCOGS-4011023908" },
    { location: "House", sku: "DISCOGS-4002570109" },
    { location: "Deep House", sku: "DISCOGS-3999012673" },
    { location: "Proper Techno", sku: "DISCOGS-4011021274" },
    { location: "Deep House", sku: "DISCOGS-4007773387" },
    { location: "Electro / Breaks", sku: "DISCOGS-4007765134" },
    { location: "Tech House", sku: "DISCOGS-3999022345" },
    { location: "Proper Techno", sku: "DISCOGS-4002571099" },
    { location: "Minimal", sku: "DISCOGS-3992446438" },
    { location: "Electro / Breaks", sku: "DISCOGS-4007673673" },
    { location: "Proper Techno", sku: "DISCOGS-4011008635" },
    { location: "House", sku: "DISCOGS-3992516305" },
    { location: "Electro / Breaks", sku: "DISCOGS-4007776348" },
    { location: "Sello: Multiplex", sku: "DISCOGS-3991185025" },
    { location: "Tech House", sku: "DISCOGS-4007688136" },
    { location: "Sello: Trapez", sku: "DISCOGS-4002568399" },
    { location: "Minimal", sku: "DISCOGS-4011015913" },
    { location: "Industrial / EBM", sku: "DISCOGS-3999014788" },
    { location: "Trance", sku: "DISCOGS-4002569965" },
    { location: "Minimal", sku: "DISCOGS-4007682649" },
    { location: "Tech House", sku: "DISCOGS-4002568447" },
    { location: "Minimal", sku: "DISCOGS-4002570220" },
    { location: "House", sku: "DISCOGS-4002570004" },
    { location: "House", sku: "DISCOGS-4002568477" },
    { location: "House", sku: "DISCOGS-4007778586" },
    { location: "Acid", sku: "DISCOGS-4007767669" },
    { location: "Trance", sku: "DISCOGS-4011019870" },
    { location: "Minimal", sku: "SKU-139" },
    { location: "Minimal", sku: "DISCOGS-4010996200" },
    { location: "Sello: Trapez", sku: "DISCOGS-4002570247" },
    { location: "Minimal", sku: "DISCOGS-3999014236" },
    { location: "Acid", sku: "DISCOGS-3992526823" },
    { location: "Ambient / IDM / Experimental", sku: "DISCOGS-4011010054" },
    { location: "Electro / Breaks", sku: "DISCOGS-4007691514" },
    { location: "Industrial / EBM", sku: "DISCOGS-4011071386" },
    { location: "Proper Techno", sku: "DISCOGS-4011016189" },
    { location: "Minimal", sku: "DISCOGS-4011021307" },
    { location: "Proper Techno", sku: "DISCOGS-4011062947" },
    { location: "Ambient / IDM / Experimental", sku: "DISCOGS-4002568381" },
    { location: "Disco / Funk / Edits", sku: "SKU-130" },
    { location: "Deep House", sku: "DISCOGS-4010995159" },
    { location: "Proper Techno", sku: "DISCOGS-4011026782" },
    { location: "Disco / Funk / Edits", sku: "DISCOGS-4002571969" },
    { location: "Disco / Funk / Edits", sku: "SKU-144" },
    { location: "Sello: Baum Records", sku: "DISCOGS-4007642446" },
    { location: "Proper Techno", sku: "DISCOGS-3999048910" },
    { location: "Deep House", sku: "DISCOGS-3999047893" },
    { location: "Proper Techno", sku: "DISCOGS-4007458834" },
    { location: "House", sku: "DISCOGS-4011006652" },
    { location: "Disco / Funk / Edits", sku: "DISCOGS-4007772889" },
    { location: "Dub Techno", sku: "DISCOGS-3991243333" },
    { location: "Minimal", sku: "DISCOGS-4011007213" },
    { location: "Deep House", sku: "DISCOGS-4002554368" },
    { location: "Sello: Multiplex", sku: "DISCOGS-3991211533" },
    { location: "House", sku: "DISCOGS-4007465359" },
    { location: "Sello: Trapez", sku: "DISCOGS-4002568438" },
    { location: "Trance", sku: "DISCOGS-4002572212" },
    { location: "Electro / Breaks", sku: "DISCOGS-4007773147" },
    { location: "Proper Techno", sku: "DISCOGS-4007698735" },
    { location: "Electro / Breaks", sku: "DISCOGS-4011015718" },
    { location: "Sello: Strictly Rhythm", sku: "DISCOGS-4002572059" },
    { location: "Electro / Breaks", sku: "DISCOGS-4011019351" },
    { location: "French Touch", sku: "DISCOGS-4007691403" },
    { location: "House", sku: "DISCOGS-4002570043" },
    { location: "Disco / Funk / Edits", sku: "SKU-131" },
    { location: "Tech House", sku: "DISCOGS-4007681695" },
    { location: "Minimal", sku: "DISCOGS-4002570769" },
    { location: "House", sku: "DISCOGS-4007779402" },
    { location: "Proper Techno", sku: "DISCOGS-3999018838" },
    { location: "Trance", sku: "DISCOGS-4002570022" },
    { location: "House", sku: "DISCOGS-4007680462" },
    { location: "Sello: Baum Records", sku: "DISCOGS-4011071872" },
    { location: "Deep House", sku: "DISCOGS-4002572800" },
    { location: "Minimal", sku: "DISCOGS-3992405143" },
    { location: "Detroit Techno", sku: "DISCOGS-4011056953" },
    { location: "Sello: Multiplex", sku: "DISCOGS-3991215322" },
    { location: "Proper Techno", sku: "DISCOGS-4011061900" },
    { location: "Proper Techno", sku: "DISCOGS-3992538088" },
    { location: "Proper Techno", sku: "DISCOGS-4011060448" },
    { location: "Proper Techno", sku: "DISCOGS-3992459629" },
    { location: "Disco / Funk / Edits", sku: "SKU-146" },
    { location: "Proper Techno", sku: "DISCOGS-4011063931" },
    { location: "Dub Techno", sku: "DISCOGS-4007772148" },
    { location: "Proper Techno", sku: "DISCOGS-4011062491" },
    { location: "Deep House", sku: "DISCOGS-4011066136" },
    { location: "Proper Techno", sku: "DISCOGS-4011064765" },
    { location: "House", sku: "DISCOGS-4002568513" },
    { location: "Sello: Multiplex", sku: "DISCOGS-3991213306" },
    { location: "Proper Techno", sku: "DISCOGS-3992485498" },
    { location: "Sello: Multiplex", sku: "DISCOGS-3991212337" },
    { location: "Proper Techno", sku: "DISCOGS-4011023038" },
    { location: "Disco / Funk / Edits", sku: "DISCOGS-4011091429" },
    { location: "Ambient / IDM / Experimental", sku: "DISCOGS-4007764399" },
    { location: "House", sku: "DISCOGS-4002571945" },
    { location: "Minimal", sku: "DISCOGS-3991250686" },
    { location: "Proper Techno", sku: "DISCOGS-4007478166" },
    { location: "Deep House", sku: "DISCOGS-4010996542" },
    { location: "Minimal", sku: "DISCOGS-4007771680" },
    { location: "Dub Techno", sku: "DISCOGS-4007479828" },
    { location: "Industrial / EBM", sku: "DISCOGS-4011055948" },
    { location: "Industrial / EBM", sku: "DISCOGS-4007459689" },
    { location: "Dub Techno", sku: "DISCOGS-4011059320" },
    { location: "House", sku: "DISCOGS-3991242526" },
    { location: "Minimal", sku: "DISCOGS-3992536930" },
    { location: "Acid", sku: "DISCOGS-4011014854" },
    { location: "Deep House", sku: "DISCOGS-4002569956" },
    { location: "Dub Techno", sku: "DISCOGS-3992444695" },
    { location: "Minimal", sku: "DISCOGS-4002570742" },
    { location: "House", sku: "DISCOGS-4002571879" },
    { location: "Tech House", sku: "DISCOGS-4011012061" },
    { location: "House", sku: "SKU-135" },
    { location: "Tech House", sku: "DISCOGS-4011056584" },
    { location: "Minimal", sku: "DISCOGS-4007692465" },
    { location: "Sello: Multiplex", sku: "DISCOGS-3991170757" },
    { location: "Dub Techno", sku: "DISCOGS-3991272919" },
    { location: "House", sku: "DISCOGS-4002570799" },
    { location: "Proper Techno", sku: "DISCOGS-4011061024" },
    { location: "Ambient / IDM / Experimental", sku: "DISCOGS-4011082189" },
    { location: "Proper Techno", sku: "DISCOGS-3992475037" },
    { location: "Sello: Trapez", sku: "DISCOGS-4002571003" },
    { location: "Sello: Perlon", sku: "DISCOGS-4002596755" },
    { location: "minimal", sku: "SKU-146" },
    { location: "Ambient / IDM / Experimental", sku: "SKU-054" },
    { location: "Trance", sku: "DISCOGS-4002571909" },
    { location: "Ambient / IDM / Experimental", sku: "DISCOGS-4011010561" },
    { location: "Proper Techno", sku: "DISCOGS-3992418964" },
    { location: "Proper Techno", sku: "SKU-145" },
    { location: "Minimal", sku: "SKU-144" },
    { location: "Electro / Breaks", sku: "DISCOGS-4007700823" },
    { location: "Industrial / EBM", sku: "DISCOGS-4011057370" },
    { location: "Acid", sku: "DISCOGS-4011060121" },
    { location: "Sello: Multiplex", sku: "DISCOGS-3991214068" },
    { location: "House", sku: "DISCOGS-4007665498" },
    { location: "House", sku: "DISCOGS-3991275472" },
    { location: "House", sku: "DISCOGS-4011019693" },
    { location: "Proper Techno", sku: "DISCOGS-4011024739" },
    { location: "Proper Techno", sku: "DISCOGS-4002570154" },
    { location: "Detroit Techno", sku: "DISCOGS-4007761270" },
    { location: "Proper Techno", sku: "DISCOGS-3992520079" },
    { location: "Dub Techno", sku: "DISCOGS-4011008161" },
    { location: "Tech House", sku: "DISCOGS-4002570679" },
    { location: "Proper Techno", sku: "DISCOGS-3999026875" },
    { location: "Minimal", sku: "DISCOGS-3992534479" },
    { location: "House", sku: "DISCOGS-4007653285" },
    { location: "Tech House", sku: "DISCOGS-4007761117" },
    { location: "Sello: Multiplex", sku: "DISCOGS-3991214656" },
    { location: "Sello: Strictly Rhythm", sku: "DISCOGS-4002572086" },
    { location: "Minimal", sku: "DISCOGS-4011012295" },
    { location: "Deep House", sku: "DISCOGS-3992447953" },
    { location: "Tech House", sku: "DISCOGS-4007774977" },
    { location: "Proper Techno", sku: "DISCOGS-4011081580" },
    { location: "Minimal", sku: "DISCOGS-4010999464" },
    { location: "Minimal", sku: "DISCOGS-4011015058" },
    { location: "Detroit Techno", sku: "DISCOGS-4011006925" },
    { location: "Ambient / IDM / Experimental", sku: "DISCOGS-4011011050" },
    { location: "Proper Techno", sku: "DISCOGS-3999021808" },
    { location: "House", sku: "DISCOGS-4007775325" },
    { location: "Minimal", sku: "DISCOGS-4011050899" },
    { location: "Minimal", sku: "DISCOGS-4007773924" },
    { location: "Proper Techno", sku: "DISCOGS-4007456854" },
    { location: "Proper Techno", sku: "DISCOGS-4011005722" },
    { location: "Ambient / IDM / Experimental", sku: "DISCOGS-4011063904" },
    { location: "Minimal", sku: "DISCOGS-4007658478" },
    { location: "Deep House", sku: "DISCOGS-4011071920" },
    { location: "Tech House", sku: "DISCOGS-4007680597" },
    { location: "Deep House", sku: "DISCOGS-4011013381" },
    { location: "Minimal", sku: "DISCOGS-3992452453" },
    { location: "Tech House", sku: "DISCOGS-4011083296" },
    { location: "Proper Techno", sku: "DISCOGS-3992527414" },
    { location: "Minimal", sku: "DISCOGS-4011016309" },
    { location: "House", sku: "DISCOGS-4011024742" },
    { location: "Sello: Baum Records", sku: "DISCOGS-4007780077" },
    { location: "Proper Techno", sku: "DISCOGS-3991274593" },
    { location: "Electro / Breaks", sku: "DISCOGS-4011018334" },
    { location: "Tech House", sku: "DISCOGS-4002570202" },
    { location: "House", sku: "DISCOGS-4007663554" },
    { location: "Proper Techno", sku: "DISCOGS-3992453191" },
    { location: "Minimal", sku: "DISCOGS-4010999275" },
    { location: "Disco / Funk / Edits", sku: "SKU-147" },
    { location: "Electro / Breaks", sku: "DISCOGS-4007646991" },
    { location: "Detroit Techno", sku: "DISCOGS-4002572866" },
    { location: "Sello: Multiplex", sku: "DISCOGS-3991171198" },
    { location: "Minimal", sku: "DISCOGS-3991266841" },
    { location: "Minimal", sku: "DISCOGS-3992414470" },
    { location: "Sello: Baum Records", sku: "DISCOGS-4007640070" },
    { location: "Trance", sku: "DISCOGS-4011058141" },
    { location: "Tech House", sku: "SKU-136" },
    { location: "Deep House", sku: "DISCOGS-4007762590" },
    { location: "Tech House", sku: "DISCOGS-4007775211" },
    { location: "House", sku: "DISCOGS-4002571786" },
    { location: "Proper Techno", sku: "DISCOGS-4011022519" }
];

async function updateLocations() {
    console.log(`Starting update for ${updates.length} items...`);

    let successCount = 0;
    let failCount = 0;

    for (const update of updates) {
        try {
            const productsRef = db.collection('products');
            const snapshot = await productsRef.where('sku', '==', update.sku).get();

            if (snapshot.empty) {
                console.warn(`⚠️ SKU not found: ${update.sku}`);
                failCount++;
                continue;
            }

            // Should only be one, but iterate just in case
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, { storageLocation: update.location });
            });

            await batch.commit();
            console.log(`✅ Updated ${update.sku} -> ${update.location}`);
            successCount++;
        } catch (error) {
            console.error(`❌ Error updating ${update.sku}:`, error);
            failCount++;
        }
    }

    console.log(`\nDone! Success: ${successCount}, Failures: ${failCount}`);
}

updateLocations().catch(console.error);
