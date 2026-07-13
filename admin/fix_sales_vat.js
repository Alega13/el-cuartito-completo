/**
 * SCRIPT DE MIGRACIÓN PARA CORREGIR IVA DE VENTAS HISTÓRICAS
 * 
 * Instrucciones de uso:
 * 1. Abrí la app admin en tu navegador (localhost o producción)
 * 2. Abrí la consola del navegador (F12 -> Console)
 * 3. Copiá todo el contenido de este archivo
 * 4. Pegalo en la consola y presiona Enter
 * 5. Primero ejecutará un DRY RUN (no guarda nada, solo te dice cuántos cambiaría).
 * 6. Para aplicar los cambios reales, escribí: window.migrateSalesVat(false) y presiona Enter.
 */

window.migrateSalesVat = async function(dryRun = true) {
    const db = firebase.firestore();
    console.log(`🚀 Starting Sales VAT Migration... (Dry Run: ${dryRun})`);
    try {
        const salesSnapshot = await db.collection('sales').get();
        const inventorySnapshot = await db.collection('products').get();
        
        // Build inventory lookup map
        const inventoryMap = new Map();
        inventorySnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.sku) inventoryMap.set(data.sku, data);
            inventoryMap.set(doc.id, data);
        });

        let updatedSalesCount = 0;
        let modifiedSalesDocs = [];

        for (const saleDoc of salesSnapshot.docs) {
            const sale = saleDoc.data();
            let needsUpdate = false;
            let updatedItems = [];

            if (!sale.items || !Array.isArray(sale.items)) continue;

            for (const item of sale.items) {
                let updatedItem = { ...item };
                
                // If it already has providerOrigin, skip unless it's wrong (but we'll just check if missing)
                if (!updatedItem.providerOrigin) {
                    const productId = item.productId || item.recordId;
                    let inventoryProduct = inventoryMap.get(item.sku) || inventoryMap.get(productId);
                    
                    if (inventoryProduct) {
                        updatedItem.providerOrigin = inventoryProduct.provider_origin || 'Local_Used';
                    } else {
                        updatedItem.providerOrigin = 'Local_Used'; // fallback
                    }
                    needsUpdate = true;
                }
                
                updatedItems.push(updatedItem);
            }

            if (needsUpdate) {
                modifiedSalesDocs.push({
                    id: saleDoc.id,
                    items: updatedItems,
                    date: sale.date || 'Unknown Date'
                });
            }
        }

        console.log(`📊 Found ${modifiedSalesDocs.length} sales that need updating.`);
        
        if (modifiedSalesDocs.length > 0) {
            console.log("📝 Sample of updates (first 3):", JSON.stringify(modifiedSalesDocs.slice(0, 3), null, 2));
        }

        if (!dryRun) {
            console.log('💾 Saving changes to Firestore...');
            const batch = db.batch();
            let batchCount = 0;
            
            for (const doc of modifiedSalesDocs) {
                const ref = db.collection('sales').doc(doc.id);
                batch.update(ref, { items: doc.items });
                batchCount++;
                
                // Firestore batches have a 500 limit
                if (batchCount >= 450) {
                    await batch.commit();
                    console.log(`✅ Committed batch of ${batchCount} sales`);
                    batchCount = 0;
                }
            }
            if (batchCount > 0) {
                await batch.commit();
                console.log(`✅ Committed final batch of ${batchCount} sales`);
            }
            console.log('🎉 Migration completed successfully!');
        } else {
            console.log('⚠️ This was a DRY RUN. No changes were saved to Firestore. Run window.migrateSalesVat(false) to apply.');
        }

    } catch (error) {
        console.error("❌ Migration failed:", error);
    }
};

// Auto-ejecutar en modo prueba
window.migrateSalesVat(true);
