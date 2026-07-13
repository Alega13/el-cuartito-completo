/**
 * SCRIPT PARA MIGRAR EL INVENTARIO Y CORREGIR LAS VENTAS (V2)
 * 
 * Instrucciones:
 * 1. Abrí localhost:5174 o la web de admin
 * 2. Copiá todo esto y pegalo en la consola (F12)
 * 3. window.migrateAllData(true) para DRY RUN
 * 4. window.migrateAllData(false) para APLICAR
 */

window.migrateAllData = async function(dryRun = true) {
    const db = firebase.firestore();
    console.log(`🚀 Iniciando Migración Total... (Dry Run: ${dryRun})`);
    
    try {
        const inventorySnapshot = await db.collection('products').get();
        const salesSnapshot = await db.collection('sales').get();
        
        let modifiedProducts = [];
        let modifiedSales = [];
        const inventoryMap = new Map();

        // 1. MIGRAR INVENTARIO (products)
        for (const doc of inventorySnapshot.docs) {
            const data = doc.data();
            let needsUpdate = false;
            let updatedData = {};

            // Mapeamos para usar luego en las ventas
            if (data.sku) inventoryMap.set(data.sku, data);
            inventoryMap.set(doc.id, data);

            // Si el origen de proveedor está vacío, o está mal por defecto, lo deducimos de product_condition
            if (!data.provider_origin || data.provider_origin === 'Local_Used') {
                if (data.product_condition === 'New' || data.condition === 'New') {
                    if (data.provider_origin !== 'EU_B2B') { // Solo si no estaba ya seteado a EU_B2B
                        updatedData.provider_origin = 'EU_B2B';
                        needsUpdate = true;
                    }
                } else if (!data.provider_origin) {
                    updatedData.provider_origin = 'Local_Used';
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                modifiedProducts.push({ id: doc.id, changes: updatedData, name: data.album });
                // Actualizar en el mapa en memoria para el paso de ventas
                Object.assign(data, updatedData); 
            }
        }

        // 2. MIGRAR VENTAS (sales)
        for (const saleDoc of salesSnapshot.docs) {
            const sale = saleDoc.data();
            let needsSaleUpdate = false;
            
            if (!sale.items || !Array.isArray(sale.items)) continue;

            let updatedItems = sale.items.map(item => {
                let newItem = { ...item };
                let correctOrigin = null;

                // Intentar deducir de la condición del item en la venta
                if (item.productCondition === 'New' || item.condition === 'New') {
                    correctOrigin = 'EU_B2B';
                } else if (item.productCondition === 'Second-hand' || item.productCondition === 'Used') {
                    correctOrigin = 'Local_Used';
                } else {
                    // Si no tiene, buscar en el inventario
                    const productId = item.productId || item.recordId;
                    const inventoryProduct = inventoryMap.get(item.sku) || inventoryMap.get(productId);
                    
                    if (inventoryProduct) {
                        correctOrigin = inventoryProduct.provider_origin || 'Local_Used';
                    } else {
                        correctOrigin = 'Local_Used';
                    }
                }

                // Si el origen que tiene guardado actualmente es incorrecto
                if (newItem.providerOrigin !== correctOrigin) {
                    newItem.providerOrigin = correctOrigin;
                    needsSaleUpdate = true;
                }
                
                return newItem;
            });

            if (needsSaleUpdate) {
                modifiedSales.push({ id: saleDoc.id, items: updatedItems });
            }
        }

        console.log(`📦 Discos de inventario a corregir: ${modifiedProducts.length}`);
        if (modifiedProducts.length > 0) console.log("Ejemplo de disco:", modifiedProducts[0]);
        
        console.log(`🧾 Ventas a corregir: ${modifiedSales.length}`);

        if (!dryRun) {
            console.log('💾 Guardando en Firestore...');
            const batch = db.batch();
            let ops = 0;

            const commitBatch = async () => {
                if (ops > 0) {
                    await batch.commit();
                    console.log(`✅ Batch commited (${ops} operaciones)`);
                    ops = 0;
                }
            };

            for (const p of modifiedProducts) {
                batch.update(db.collection('products').doc(p.id), p.changes);
                ops++;
                if (ops >= 450) { await commitBatch(); }
            }

            for (const s of modifiedSales) {
                batch.update(db.collection('sales').doc(s.id), { items: s.items });
                ops++;
                if (ops >= 450) { await commitBatch(); }
            }

            await commitBatch();
            console.log('🎉 Migración Total Finalizada!');
        } else {
            console.log('⚠️ MODO DRY RUN. Escribí window.migrateAllData(false) para aplicar los cambios.');
        }

    } catch (e) {
        console.error("❌ Error en la migración:", e);
    }
};

window.migrateAllData(true);
