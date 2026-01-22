import { Request, Response } from 'express';
import { getDb } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin';

// Types for clarity
interface ProductData {
    id?: string;
    sku: string;
    artist: string;
    album: string;
    price: number;
    stock: number;
    is_online: boolean;
    genre?: string;
    condition?: string;
    cost?: number;
    owner?: string;
    label?: string;
    storageLocation?: string;
    cover_image?: string;
    updated_at?: admin.firestore.FieldValue;
}

const normalizeProduct = (data: any, id: string) => {
    return {
        ...data,
        id,
        // Dual mapping for Shop and Admin compatibility
        availableOnline: data.is_online ?? data.availableOnline ?? false,
        is_online: data.is_online ?? data.availableOnline ?? false,
        coverImage: data.cover_image ?? data.coverImage ?? null,
        cover_image: data.cover_image ?? data.coverImage ?? null,
        condition: data.condition ?? data.status ?? 'VG',
        status: data.condition ?? data.status ?? 'VG'
    };
};

export const getAllProducts = async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const snapshot = await db.collection('products').get();
        const products = snapshot.docs.map(doc => normalizeProduct(doc.data(), doc.id));
        res.json(products);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const listProducts = async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const productsSnapshot = await db.collection('products')
            .where('is_online', '==', true)
            .get();

        const products = productsSnapshot.docs.map(doc => normalizeProduct(doc.data(), doc.id));

        res.json(products);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};


export const createProduct = async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const data = req.body;

        // Canonicalize names for Firestore
        const flattedData = {
            ...data,
            is_online: data.is_online ?? data.availableOnline ?? false,
            cover_image: data.cover_image ?? data.coverImage ?? null,
            condition: data.condition ?? data.status ?? 'VG',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('products').add(flattedData);
        res.status(201).json(normalizeProduct(flattedData, docRef.id));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const db = getDb();
        const data = req.body;

        const updateData: any = {
            ...data,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        };

        if (data.availableOnline !== undefined) updateData.is_online = data.availableOnline;
        if (data.coverImage !== undefined) updateData.cover_image = data.coverImage;
        if (data.status !== undefined) updateData.condition = data.status;

        await db.collection('products').doc(id).update(updateData);
        res.json({ id, ...updateData });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};


export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const db = getDb();

        // Dependency check removed to allow deletion. 
        // Sales data is denormalized (album/artist stored in sale), so deleting product won't break history display.
        // However, calculating historical profit for old sales without costAtSale might be less accurate (fallback to 0).

        await db.collection('products').doc(id).delete();
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const reserveStock = async (req: Request, res: Response) => {
    const { productId, qty } = req.body;

    try {
        const db = getDb();
        await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
            const productRef = db.collection('products').doc(productId);
            const productDoc = await transaction.get(productRef);

            if (!productDoc.exists) {
                throw new Error('Product not found');
            }

            const currentStock = (productDoc.data() as any)?.stock || 0;
            if (currentStock < qty) {
                throw new Error('Insufficient stock');
            }

            transaction.update(productRef, {
                stock: admin.firestore.FieldValue.increment(-qty),
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        res.json({ success: true, message: 'Stock reserved successfully' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const releaseStock = async (req: Request, res: Response) => {
    const { productId, qty } = req.body;

    try {
        const db = getDb();
        const productRef = db.collection('products').doc(productId);
        await productRef.update({
            stock: admin.firestore.FieldValue.increment(qty),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'Stock released successfully' });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const createSale = async (req: Request, res: Response) => {
    const { items, channel, totalAmount, paymentMethod, customerName, customerEmail } = req.body;
    // items: [{ productId, qty, priceAtSale, album }]

    try {
        const db = getDb();

        // Normalize items - accept both recordId/productId and quantity/qty
        const normalizedItems = items.map((item: any) => {
            const normalized: any = {
                productId: item.productId || item.recordId,
                qty: item.qty || item.quantity || 1,
            };
            if (item.priceAtSale !== undefined) normalized.priceAtSale = item.priceAtSale;
            if (item.price !== undefined) normalized.priceAtSale = item.price;
            if (item.album !== undefined) normalized.album = item.album;
            return normalized;
        });

        const saleId = await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
            let calculatedTotal = 0;

            // 1. Validate all items have enough stock AND calculate total
            for (const item of normalizedItems) {
                if (!item.productId) {
                    throw new Error('Missing productId/recordId in sale item');
                }
                const productRef = db.collection('products').doc(item.productId);
                const productDoc = await transaction.get(productRef);

                if (!productDoc.exists) {
                    throw new Error(`Product ${item.productId} not found`);
                }

                const productData = productDoc.data() as any;
                const currentStock = productData?.stock || 0;

                if (currentStock < item.qty) {
                    throw new Error(`Insufficient stock for product ${item.album || item.productId}`);
                }

                // Use price from request if available (e.g. override), otherwise use product price
                const price = item.priceAtSale || productData.price || 0;
                item.priceAtSale = price; // Store the price used in the item
                item.costAtSale = productData.cost || 0; // Store cost for profit calculation
                item.album = productData.album || item.album || 'Unknown'; // Ensure album name is stored

                calculatedTotal += price * item.qty;
            }

            // 2. Decrement stock and Prepare Sale document
            for (const item of normalizedItems) {
                const productRef = db.collection('products').doc(item.productId);
                transaction.update(productRef, {
                    stock: admin.firestore.FieldValue.increment(-item.qty),
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                });

                // Record movement
                const movementRef = db.collection('inventory_movements').doc();
                transaction.set(movementRef, {
                    product_id: item.productId,
                    album: item.album,
                    change: -item.qty,
                    reason: 'sale',
                    channel: channel || 'local',
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            const saleRef = db.collection('sales').doc();
            transaction.set(saleRef, {
                items: normalizedItems,
                channel: channel || 'local',
                total_amount: totalAmount || calculatedTotal,
                paymentMethod: paymentMethod || 'CASH',
                customerName: customerName || null,
                customerEmail: customerEmail || null,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                status: 'completed'
            });

            return saleRef.id;
        });

        res.json({ success: true, saleId });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const getSales = async (req: Request, res: Response) => {
    try {
        const db = getDb();
        const snapshot = await db.collection('sales').orderBy('timestamp', 'desc').get();
        const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(sales);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateFulfillmentStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const db = getDb();

        if (!['pending', 'preparing', 'shipped', 'delivered'].includes(status)) {
            return res.status(400).json({ error: 'Invalid fulfillment status' });
        }

        await db.collection('sales').doc(id).update({
            fulfillment_status: status,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, id, fulfillment_status: status });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateSaleValue = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { netReceived } = req.body; // The actual amount received after fees
        const db = getDb();

        const saleRef = db.collection('sales').doc(id);
        const saleDoc = await saleRef.get();

        if (!saleDoc.exists) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        const saleData = saleDoc.data() as any;
        const originalTotal = saleData.originalTotal || saleData.total || 0;
        const newNetReceived = parseFloat(netReceived);

        if (isNaN(newNetReceived)) {
            return res.status(400).json({ error: 'Invalid netReceived amount' });
        }

        const totalFees = originalTotal - newNetReceived;

        await saleRef.update({
            total: newNetReceived, // Update with the actual received amount
            totalFees: totalFees,
            status: 'completed', // Move from pending_review to completed
            needsReview: false,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({
            success: true,
            id,
            newTotal: newNetReceived,
            fees: totalFees
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

