import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Try multiple config file paths
let configPath = path.resolve(process.cwd(), 'admin/firebase.json');
if (!fs.existsSync(configPath)) {
    configPath = path.resolve(process.cwd(), 'backend/serviceAccountKey.json');
    if (!fs.existsSync(configPath)) {
        console.error("Could not find Firebase credentials. Using application default.");
        admin.initializeApp();
    } else {
        const serviceAccount = require(configPath);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
} else {
    const serviceAccount = require(configPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
    });
}

const db = admin.firestore();

async function inspectLatestSales() {
    console.log("Fetching latest 5 sales...");
    const salesSnapshot = await db.collection('sales')
        .orderBy('timestamp', 'desc')
        .limit(5)
        .get();

    for (const doc of salesSnapshot.docs) {
        const sale = doc.data();
        console.log(`\n==================================================`);
        console.log(`Sale ID: ${doc.id}`);
        console.log(`Channel: ${sale.channel}`);
        console.log(`Order Number: ${sale.orderNumber || 'N/A'}`);
        console.log(`Status: ${sale.status}`);
        console.log(`Timestamp: ${sale.timestamp ? sale.timestamp.toDate().toLocaleString() : 'N/A'}`);
        
        console.log(`Items:`);
        for (const item of sale.items || []) {
            const productId = item.productId || item.recordId;
            console.log(`  - Product: ${item.album || item.name} (ID: ${productId}), Qty: ${item.qty || item.quantity}`);
            
            // Check current stock
            if (productId) {
                const productDoc = await db.collection('products').doc(productId).get();
                if (productDoc.exists) {
                    const product = productDoc.data();
                    console.log(`    Current Stock: ${product?.stock}`);
                } else {
                    console.log(`    Product not found in DB!`);
                }
                
                // Check movements
                const movementsSnapshot = await db.collection('inventory_movements')
                    .where('product_id', '==', productId)
                    .orderBy('timestamp', 'desc')
                    .limit(3)
                    .get();
                    
                console.log(`    Recent movements:`);
                if (movementsSnapshot.empty) {
                    console.log(`      None`);
                } else {
                    movementsSnapshot.forEach(mDoc => {
                        const m = mDoc.data();
                        console.log(`      Change: ${m.change}, Reason: ${m.reason}, Channel: ${m.channel}, SaleID: ${m.saleId || 'N/A'}`);
                    });
                }
            }
        }
    }
}

inspectLatestSales()
    .then(() => process.exit(0))
    .catch(e => {
        console.error("Error:", e);
        process.exit(1);
    });
