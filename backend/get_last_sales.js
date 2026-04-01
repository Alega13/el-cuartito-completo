const admin = require('firebase-admin');
require('dotenv').config({ path: './.env' });

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
});

const db = admin.firestore();

async function getLastSales() {
    try {
        const salesRef = db.collection('sales');
        // Search for sales on 2026-03-25
        // We'll try both exact string match and range if it's a timestamp
        const snapshot = await salesRef.where('date', '==', '2026-03-25').get();

        let salesData = [];
        let totalItems = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            const items = data.items ? data.items.map(i => ({
                artist: i.artist || i.artists_sort || 'Unknown Artist',
                title: i.album || i.title || i.name || 'Unknown Title',
                quantity: i.qty || i.quantity || 1
            })) : [];

            salesData.push({
                id: doc.id,
                date: data.date,
                items: items
            });
            totalItems += items.reduce((acc, i) => acc + (i.quantity || 1), 0);
        });

        if (salesData.length === 0) {
            console.log("No sales found with exact date string '2026-03-25'. Trying timestamp range...");
            const start = new Date('2026-03-25T00:00:00Z');
            const end = new Date('2026-03-25T23:59:59Z');
            const snapshot2 = await salesRef.where('timestamp', '>=', start).where('timestamp', '<=', end).get();
            
            const productIds = new Set();
            snapshot2.forEach(doc => {
                const data = doc.data();
                if (data.items) data.items.forEach(i => { if (i.productId) productIds.add(i.productId); });
            });

            const productsMap = {};
            if (productIds.size > 0) {
                const productsRef = db.collection('products');
                const chunks = Array.from(productIds);
                // Firestore limit is 30 for 'in' queries, but manual lookup is safer if we have many
                for (const pid of chunks) {
                    const pDoc = await productsRef.doc(pid).get();
                    if (pDoc.exists) {
                        const pData = pDoc.data();
                        productsMap[pid] = {
                            artist: pData.artist || pData.artists_sort || pData.artists?.[0]?.name || 'Unknown Artist',
                            album: pData.album || pData.title || 'Unknown Title'
                        };
                    }
                }
            }

            snapshot2.forEach(doc => {
                const data = doc.data();
                const items = data.items ? data.items.map(i => {
                    const mapped = productsMap[i.productId] || {};
                    const artist = i.artist || mapped.artist || 'Unknown Artist';
                    const title = i.album || mapped.album || 'Unknown Title';
                    return {
                        artist: artist,
                        title: title,
                        quantity: i.qty || i.quantity || 1
                    };
                }) : [];
                salesData.push({
                    id: doc.id,
                    items: items
                });
                totalItems += items.reduce((acc, i) => acc + (i.quantity || 1), 0);
            });
        }

        console.log(`Total discs found for March 25th: ${totalItems}`);
        console.log(JSON.stringify(salesData, null, 2));
    } catch (error) {
        console.error("Error", error);
    } finally {
        process.exit(0);
    }
}

getLastSales();
