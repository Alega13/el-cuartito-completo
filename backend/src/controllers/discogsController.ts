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

