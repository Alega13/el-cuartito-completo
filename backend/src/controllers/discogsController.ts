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
