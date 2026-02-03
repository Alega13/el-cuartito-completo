import { Request, Response } from 'express';
import { DiscogsService } from '../services/discogsService';
import { getDb } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin';

interface SyncResult {
    success: boolean;
    synced: number;
    created: number;
    updated: number;
    salesDetected: number;
    errors: string[];
    message: string;
}

/**
 * Sync inventory from Discogs to Firebase
 */
export const syncInventory = async (req: Request, res: Response) => {
    try {
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;

        if (!username || !token) {
            return res.status(500).json({
                error: 'Discogs credentials not configured. Please set DISCOGS_USERNAME and DISCOGS_TOKEN in .env'
            });
        }

        console.log(`Starting Discogs sync for user: ${username}`);

        const discogsService = new DiscogsService(username, token);
        const products = await discogsService.fetchInventory();

        console.log(`Normalized ${products.length} products from Discogs`);

        const db = getDb();
        const result: SyncResult = {
            success: true,
            synced: 0,
            created: 0,
            updated: 0,
            salesDetected: 0,
            errors: [],
            message: ''
        };

        // Process each product
        for (const product of products) {
            try {
                // First, try to find by discogs_listing_id (most reliable)
                let existingQuery = await db.collection('products')
                    .where('discogs_listing_id', '==', product.discogs_listing_id)
                    .limit(1)
                    .get();

                // If not found by listing_id, try by SKU (for backwards compatibility)
                if (existingQuery.empty) {
                    existingQuery = await db.collection('products')
                        .where('sku', '==', product.sku)
                        .limit(1)
                        .get();
                }

                // Remove undefined fields to avoid Firestore errors
                const cleanProduct: any = {};
                Object.keys(product).forEach(key => {
                    const value = (product as any)[key];
                    if (value !== undefined) {
                        cleanProduct[key] = value;
                    }
                });

                const productData = {
                    ...cleanProduct,
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                };

                if (existingQuery.empty) {
                    // Create new product - only if it doesn't exist
                    await db.collection('products').add(productData);
                    result.created++;
                    console.log(`Created: ${product.artist} - ${product.album}`);
                } else {
                    // Update existing product and detect sales
                    const docId = existingQuery.docs[0].id;
                    const existingProduct = existingQuery.docs[0].data();
                    const oldStock = existingProduct.stock || 0;
                    const newStock = product.stock || 0;

                    // Detect sale: stock decreased
                    if (newStock < oldStock) {
                        const quantitySold = oldStock - newStock;
                        console.log(`🔔 Sale detected! ${product.artist} - ${product.album}: ${quantitySold} sold`);

                        // Create sale record
                        await db.collection('sales').add({
                            items: [{
                                productId: docId,
                                album: product.album,
                                artist: product.artist,
                                qty: quantitySold,
                                priceAtSale: product.price,
                                costAtSale: existingProduct.cost || 0
                            }],
                            channel: 'discogs',
                            total_amount: product.price * quantitySold,
                            paymentMethod: 'Discogs',
                            customerName: null,
                            customerEmail: null,
                            timestamp: admin.firestore.FieldValue.serverTimestamp(),
                            status: 'completed',
                            discogs_listing_id: product.discogs_listing_id
                        });

                        // Create inventory movement log
                        await db.collection('inventory_movements').add({
                            product_id: docId,
                            album: product.album,
                            change: -quantitySold,
                            reason: 'sale',
                            channel: 'discogs',
                            timestamp: admin.firestore.FieldValue.serverTimestamp()
                        });

                        result.salesDetected++;
                    }

                    await db.collection('products').doc(docId).update(productData);
                    result.updated++;
                    console.log(`Updated: ${product.artist} - ${product.album}`);
                }

                result.synced++;
            } catch (error: any) {
                const errorMsg = `Error syncing ${product.artist} - ${product.album}: ${error.message}`;
                console.error(errorMsg);
                result.errors.push(errorMsg);
            }
        }

        result.message = `Successfully synced ${result.synced} products (${result.created} created, ${result.updated} updated)`;

        if (result.salesDetected > 0) {
            result.message += `. 🎉 ${result.salesDetected} Discogs sale(s) detected!`;
        }

        if (result.errors.length > 0) {
            result.message += ` with ${result.errors.length} errors`;
        }

        console.log(result.message);
        res.json(result);
    } catch (error: any) {
        console.error('Sync failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            synced: 0,
            created: 0,
            updated: 0,
            salesDetected: 0,
            errors: [error.message],
            message: 'Sync failed'
        });
    }
};

/**
 * Get sync status/configuration
 */
export const getSyncStatus = async (req: Request, res: Response) => {
    const username = process.env.DISCOGS_USERNAME;
    const hasToken = !!process.env.DISCOGS_TOKEN;

    res.json({
        configured: !!username && hasToken,
        username: username || null,
        tokenConfigured: hasToken
    });
};

/**
 * Sync orders from Discogs - creates sales for orders that haven't been synced yet
 */
export const syncOrders = async (req: Request, res: Response) => {
    try {
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;

        if (!username || !token) {
            return res.status(500).json({
                error: 'Discogs credentials not configured'
            });
        }

        console.log('Starting Discogs orders sync...');

        const discogsService = new DiscogsService(username, token);
        const orders = await discogsService.fetchOrders();

        const db = getDb();
        const result = {
            success: true,
            ordersProcessed: 0,
            salesCreated: 0,
            alreadySynced: 0,
            errors: [] as string[]
        };

        for (const order of orders) {
            try {
                // Skip if not a completed/paid order
                const validStatuses = ['Payment Received', 'Shipped', 'Merged'];
                if (!validStatuses.includes(order.status)) {
                    continue;
                }

                // Check if this order was already synced
                const existingOrderQuery = await db.collection('sales')
                    .where('discogs_order_id', '==', order.id)
                    .limit(1)
                    .get();

                if (!existingOrderQuery.empty) {
                    result.alreadySynced++;
                    continue;
                }

                // Extract order details
                const orderDate = new Date(order.created);
                const totalBruto = order.total?.value || 0;
                const shipping = order.shipping?.value || 0;

                const netAmount = totalBruto;

                // Map items from order
                const items = order.items.map((item: any) => ({
                    discogs_listing_id: String(item.id),
                    artist: item.release?.artist || 'Unknown',
                    album: item.release?.title || 'Unknown',
                    priceAtSale: item.price?.value || 0,
                    qty: 1,
                    costAtSale: 0
                }));

                // Create sale record
                await db.collection('sales').add({
                    discogs_order_id: order.id,
                    channel: 'discogs',
                    status: 'pending_review',
                    total: netAmount,
                    originalTotal: totalBruto,
                    discogsFee: 0,
                    paypalFee: 0,
                    totalFees: 0,
                    shipping: shipping,
                    shipping_income: shipping, // Map to new field for VAT reporting
                    date: orderDate.toISOString().split('T')[0],
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    customerName: order.buyer?.username || 'Discogs Buyer',
                    customerEmail: order.buyer?.email || null,
                    paymentMethod: 'Discogs Payout',
                    items: items,
                    shippingAddress: order.shipping_address || null,
                    orderStatus: order.status,
                    needsReview: true
                });



                console.log(`✅ Created sale for Discogs order ${order.id}: ${items.map((i: any) => i.album).join(', ')}`);
                result.salesCreated++;
                result.ordersProcessed++;

                // Update stock for matching products
                for (const item of items) {
                    const productQuery = await db.collection('products')
                        .where('discogs_listing_id', '==', item.discogs_listing_id)
                        .limit(1)
                        .get();

                    if (!productQuery.empty) {
                        const productDoc = productQuery.docs[0];
                        const currentStock = productDoc.data().stock || 0;
                        await productDoc.ref.update({
                            stock: Math.max(0, currentStock - 1)
                        });
                        console.log(`  📦 Updated stock for ${item.album}`);
                    }
                }

            } catch (orderError: any) {
                result.errors.push(`Order ${order.id}: ${orderError.message}`);
            }
        }

        const message = `Synced ${result.ordersProcessed} orders. Created ${result.salesCreated} sales. ${result.alreadySynced} already synced.`;
        console.log(message);

        res.json({
            ...result,
            message
        });

    } catch (error: any) {
        console.error('Orders sync failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Create a new Discogs listing
 */
export const createListing = async (req: Request, res: Response) => {
    try {
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;

        if (!username || !token) {
            return res.status(500).json({
                error: 'Discogs credentials not configured'
            });
        }

        const { releaseId, product } = req.body;

        if (!releaseId || !product) {
            return res.status(400).json({
                error: 'releaseId and product are required'
            });
        }

        const discogsService = new DiscogsService(username, token);
        const listingId = await discogsService.createListing(releaseId, product);

        res.json({
            success: true,
            listingId,
            message: `Listing created successfully`
        });
    } catch (error: any) {
        console.error('Create listing failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Update an existing Discogs listing
 */
export const updateListing = async (req: Request, res: Response) => {
    try {
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;

        if (!username || !token) {
            return res.status(500).json({
                error: 'Discogs credentials not configured'
            });
        }

        const { id } = req.params;
        const { product } = req.body;

        if (!product) {
            return res.status(400).json({
                error: 'product data is required'
            });
        }

        const discogsService = new DiscogsService(username, token);
        await discogsService.updateListing(id, product);

        res.json({
            success: true,
            message: `Listing ${id} updated successfully`
        });
    } catch (error: any) {
        console.error('Update listing failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Delete a Discogs listing
 */
export const deleteListing = async (req: Request, res: Response) => {
    try {
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;

        if (!username || !token) {
            return res.status(500).json({
                error: 'Discogs credentials not configured'
            });
        }

        const { id } = req.params;

        const discogsService = new DiscogsService(username, token);
        await discogsService.deleteListing(id);

        res.json({
            success: true,
            message: `Listing ${id} deleted successfully`
        });
    } catch (error: any) {
        console.error('Delete listing failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get price suggestions for a release
 */
export const getPriceSuggestions = async (req: Request, res: Response) => {
    try {
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;

        if (!username || !token) {
            return res.status(500).json({
                error: 'Discogs credentials not configured'
            });
        }

        const { releaseId } = req.params;

        if (!releaseId) {
            return res.status(400).json({
                error: 'releaseId is required'
            });
        }

        const discogsService = new DiscogsService(username, token);
        const suggestions = await discogsService.getPriceSuggestions(parseInt(releaseId));

        res.json({
            success: true,
            suggestions
        });
    } catch (error: any) {
        console.error('Fetch price suggestions failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


/**
 * Get a specific release from Discogs
 */
export const getReleaseById = async (req: Request, res: Response) => {
    try {
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;

        if (!username || !token) {
            return res.status(500).json({
                error: 'Discogs credentials not configured'
            });
        }

        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                error: 'id is required'
            });
        }

        const discogsService = new DiscogsService(username!, token!);
        const release = await discogsService.getRelease(parseInt(id));

        res.json({
            success: true,
            release
        });
    } catch (error: any) {
        console.error('Fetch release failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Bulk import products from CSV
 */
export const bulkImport = async (req: Request, res: Response) => {
    try {
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;
        const { csvData, defaultStorage, defaultOwner } = req.body;

        if (!username || !token) {
            return res.status(500).json({ error: 'Discogs credentials not configured' });
        }

        if (!csvData) {
            return res.status(400).json({ error: 'csvData is required' });
        }

        console.log('🚀 Starting bulk import...');
        const lines = csvData.trim().split('\n');
        // Filter out header if present (checking for "Identificador")
        const dataLines = lines.filter((line: string) => !line.includes('Identificador'));

        const discogsService = new DiscogsService(username, token);
        const db = getDb();
        const results = {
            total: dataLines.length,
            success: 0,
            failed: 0,
            errors: [] as string[]
        };

        for (const line of dataLines) {
            try {
                // Format: Artículo;Identificador;Estado;Condición Funda;Comentarios;Precio costo;Precio Venta
                const [itemName, releaseIdStr, mediaCondition, sleeveCondition, comments, costStr, priceStr] = line.split(';');

                if (!itemName && !releaseIdStr) continue;
                const releaseIdRaw = parseInt(releaseIdStr?.trim());
                let releaseId = isNaN(releaseIdRaw) ? null : releaseIdRaw;

                // Parse prices (remove "kr.", replace "," with ".")
                const parsePrice = (s: string) => s ? parseFloat(s.replace('kr.', '').replace(',', '.').trim()) || 0 : 0;
                const cost = parsePrice(costStr);
                const price = parsePrice(priceStr);

                console.log(`📦 Processing ${itemName} (ID: ${releaseIdStr || 'Missing'})`);

                // 1. Get metadata from Discogs (Handle missing ID or Listing ID)
                let release;
                try {
                    // Scenario A: No ID provided -> Search by name
                    if (!releaseId) {
                        console.log(`🔍 No ID provided for "${itemName}". Searching on Discogs...`);
                        const searchResult = await discogsService.searchRelease(itemName);
                        if (!searchResult) {
                            throw new Error('No se encontró el disco en Discogs mediante búsqueda.');
                        }
                        releaseId = searchResult.id;
                        console.log(`✅ Found Release ID ${releaseId} via search`);
                    }

                    if (releaseId !== null && releaseId > 200000000) {
                        try {
                            console.log(`🔍 ID ${releaseId} looks like a Listing ID. Fetching listing details first...`);
                            const listing = await discogsService.getListing(String(releaseId));
                            releaseId = listing.release.id;
                            console.log(`✅ Found Release ID ${releaseId} from listing`);
                        } catch (err) {
                            console.log(`⚠️ Failed to fetch listing ${releaseId}. Falling back to search by name...`);
                            releaseId = null; // Trigger search below
                        }
                    }

                    if (releaseId === null) {
                        console.log(`🔍 Searching on Discogs for "${itemName}"...`);
                        const searchResult = await discogsService.searchRelease(itemName);
                        if (!searchResult) {
                            throw new Error('No se encontró el disco en Discogs mediante búsqueda.');
                        }
                        releaseId = searchResult.id;
                        console.log(`✅ Found Release ID ${releaseId} via search`);
                    }

                    if (releaseId === null) {
                        throw new Error('No se pudo determinar el Release ID.');
                    }

                    // Fetch full release details
                    release = await discogsService.getRelease(releaseId);
                } catch (err: any) {
                    // Scenario C: If it's a number but getRelease failed, maybe it's a Listing ID after all? (Fallback)
                    if (releaseId !== null && releaseId <= 200000000 && !release) {
                        try {
                            console.log(`🔍 Release fetch failed for ${releaseId}. Trying as Listing ID...`);
                            const listing = await discogsService.getListing(String(releaseId));
                            releaseId = listing.release.id;
                            release = await discogsService.getRelease(releaseId as number);
                        } catch (innerErr) {
                            console.log(`⚠️ Listing fallback failed. Trying search by name as last resort...`);
                            const searchResult = await discogsService.searchRelease(itemName);
                            if (searchResult) {
                                releaseId = searchResult.id;
                                release = await discogsService.getRelease(releaseId as number);
                            } else {
                                throw err; // Throw original error
                            }
                        }
                    } else {
                        throw err;
                    }
                }

                // 2. Map conditions
                // Our system uses simpler codes (M, NM, VG+, etc). Discogs service handles mapping.
                // We'll trust the input or fallback to VG if unknown.
                const mapInputCondition = (c: string) => {
                    if (c.includes('Near Mint')) return 'NM';
                    if (c.includes('Mint')) return 'M';
                    if (c.includes('Very Good Plus')) return 'VG+';
                    if (c.includes('Very Good')) return 'VG';
                    if (c.includes('Good Plus')) return 'G+';
                    if (c.includes('Good')) return 'G';
                    if (c.includes('Fair')) return 'F';
                    if (c.includes('Poor')) return 'P';
                    return 'VG';
                };

                const product = {
                    artist: release.artists_sort || release.artists[0]?.name || 'Unknown',
                    album: release.title || 'Unknown',
                    condition: mapInputCondition(mediaCondition),
                    sleeveCondition: mapInputCondition(sleeveCondition),
                    price: price,
                    cost: cost,
                    stock: 1,
                    comments: comments?.trim(),
                    discogs_release_id: release.id,
                    is_online: true
                };

                // 3. Create listing on Discogs
                const listingId = await discogsService.createListing(releaseId as number, product);

                // 4. Save to Firestore
                const sku = `DISCOGS-${listingId}`;
                const existing = await db.collection('products').where('sku', '==', sku).get();

                if (!existing.empty) {
                    console.log(`⏩ Skipping ${sku} - already exists`);
                    results.success++; // Count as success since it's already there
                    continue;
                }

                const primaryImage = release.images?.find((img: any) => img.type === 'primary');
                const coverImage = primaryImage?.uri || release.images?.[0]?.uri || '';

                await db.collection('products').add({
                    sku: `DISCOGS-${listingId}`,
                    artist: product.artist,
                    album: product.album,
                    price: product.price,
                    cost: product.cost,
                    stock: product.stock,
                    condition: product.condition,
                    sleeveCondition: product.sleeveCondition,
                    comments: product.comments,
                    genre: [...(release.genres || []), ...(release.styles || [])].join(', ') || 'Unknown',
                    year: release.year || 0,
                    label: release.labels?.[0]?.name || 'Unknown',
                    cover_image: coverImage,
                    format: release.formats?.[0]?.name || 'Vinyl',
                    discogs_listing_id: String(listingId),
                    discogs_release_id: release.id,
                    is_online: true,
                    storageLocation: defaultStorage || 'Tienda',
                    owner: defaultOwner || 'El Cuartito',
                    created_at: admin.firestore.FieldValue.serverTimestamp(),
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                });

                results.success++;
                // Delay between items to respect Discogs rate limits (2s)
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (err: any) {
                console.error(`❌ Error importing line: ${line}`, err.message);

                if (err.message.includes('429')) {
                    console.log('🛑 Rate limit hit (429). Pausing for 60 seconds...');
                    results.errors.push('PAUSA_LIMITE_TASA'); // Flag to indicate we paused
                    await new Promise(resolve => setTimeout(resolve, 60000));
                    // Optional: retry this specific line once? No, let's just continue
                }

                results.failed++;
                results.errors.push(`Error en: ${line.slice(0, 30)}... -> ${err.message}`);
            }
        }

        res.json({
            success: true,
            summary: `Importación completada: ${results.success} éxitos, ${results.failed} errores.`,
            details: results
        });

    } catch (error: any) {
        console.error('Bulk import failed:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Refresh metadata for a specific product from Discogs
 */
export const refreshMetadata = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;

        if (!username || !token) {
            return res.status(500).json({ error: 'Discogs credentials not configured' });
        }

        const db = getDb();
        const productDoc = await db.collection('products').doc(id).get();

        if (!productDoc.exists) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const product = productDoc.data();
        const releaseId = product?.discogs_release_id;

        if (!releaseId) {
            return res.status(400).json({ error: 'This product is not linked to a Discogs Release ID' });
        }

        console.log(`🔄 Refreshing metadata for product ${id} (Discogs Release: ${releaseId})`);

        const discogsService = new DiscogsService(username, token);
        const release = await discogsService.getRelease(releaseId);

        // Map fresh data
        const primaryImage = release.images?.find((img: any) => img.type === 'primary');
        const coverImage = primaryImage?.uri || release.images?.[0]?.uri || product?.cover_image;

        const updatedData = {
            artist: release.artists_sort || release.artists[0]?.name || product?.artist,
            album: release.title || product?.album,
            genre: [...(release.genres || []), ...(release.styles || [])].join(', ') || 'Unknown',
            year: release.year || product?.year || 0,
            label: release.labels?.[0]?.name || product?.label || 'Unknown',
            cover_image: coverImage,
            format: release.formats?.[0]?.name || product?.format || 'Vinyl',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('products').doc(id).update(updatedData);

        res.json({
            success: true,
            message: 'Metadata actualizada correctamente desde Discogs',
            data: updatedData
        });

    } catch (error: any) {
        console.error('Refresh metadata failed:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get a specific listing from Discogs
 */
export const getListingById = async (req: Request, res: Response) => {
    try {
        const username = process.env.DISCOGS_USERNAME;
        const token = process.env.DISCOGS_TOKEN;

        if (!username || !token) {
            return res.status(500).json({
                error: 'Discogs credentials not configured'
            });
        }

        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                error: 'id is required'
            });
        }

        const discogsService = new DiscogsService(username!, token!);
        const listing = await discogsService.getListing(id);

        res.json({
            success: true,
            listing
        });
    } catch (error: any) {
        console.error('Fetch listing failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
