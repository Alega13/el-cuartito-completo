require('dotenv').config({ path: './.env' });
const admin = require('firebase-admin');
const { default: axios } = require('axios');

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
});

const db = admin.firestore();

const productIds = [
    'dojNTV7VzImoG4Zp0Lgy',
    'KkdgeA4Rq5hMn3onvByq',
    'o27XReK0rmwNYoioW2nf',
    'DIbXbNa5EgQtnRWcjJQC',
    'lDEAVY7Rk79SNHWhHRGm',
    'KzkufymVWs6rZtSjyF0Y',
    'PvVb6gBJlpYo8nopUTpQ',
    'vvc6R2SJ1KkILJhcQFOz',
    'WAcg6r9dCWvVNqdqI5ON',
    'akjmGrJZXNPpdkTcwHGj'
];

async function deleteFromDiscogs() {
    const productsRef = db.collection('products');
    const username = process.env.DISCOGS_USERNAME;
    const token = process.env.DISCOGS_TOKEN;
    
    if (!username || !token) {
        throw new Error("Missing Discogs credentials in .env");
    }

    let batch = db.batch();
    
    for (const id of productIds) {
        const doc = await productsRef.doc(id).get();
        if (doc.exists) {
            const data = doc.data();
            const listingId = data.discogs_listing_id;
            
            if (listingId) {
                console.log(`Deleting Discogs listing ${listingId} for product ${id}...`);
                try {
                    // Call Discogs API to delete listing
                    await axios.delete(`https://api.discogs.com/marketplace/listings/${listingId}`, {
                        headers: {
                            'Authorization': `Discogs token=${token}`,
                            'User-Agent': `ElCuartitoApp/1.0 +https://el-cuartito.com`
                        }
                    });
                    console.log(`Successfully deleted ${listingId} from Discogs.`);
                } catch (apiError) {
                    if (apiError.response && apiError.response.status === 404) {
                        console.log(`Listing ${listingId} already deleted from Discogs.`);
                    } else {
                        console.error(`Failed to delete ${listingId} on Discogs:`, apiError.message);
                    }
                }
            }
            
            // Set stock to 0 locally and unpublish from discogs
            batch.update(productsRef.doc(id), {
                stock: 0,
                publish_discogs: false,
                is_online: false,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }
    
    await batch.commit();
    console.log("Local stock forcefully set to 0 and unpublished from Discogs to prevent sync overrides.");
    process.exit(0);
}

deleteFromDiscogs().catch(console.error);
