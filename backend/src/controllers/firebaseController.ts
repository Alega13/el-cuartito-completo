import { Request, Response } from 'express';
import { getDb } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin';
import { calculateSaleVATLiability } from '../services/vatCalculator';

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
                item.productCondition = productData.product_condition || 'Second-hand'; // Store for VAT calculation
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

            // Calculate VAT liability using Denmark rules (Brugtmoms for used goods)
            const calculatedVatLiability = calculateSaleVATLiability(normalizedItems);

            const saleRef = db.collection('sales').doc();
            transaction.set(saleRef, {
                items: normalizedItems,
                channel: channel || 'local',
                total_amount: totalAmount || calculatedTotal,
                calculated_vat_liability: calculatedVatLiability,
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

export const getSaleById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const db = getDb();
        const doc = await db.collection('sales').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        const data = doc.data();
        // Return only necessary fields for the success page (avoid leaking sensitive admin data if any)
        const publicData = {
            id: doc.id,
            orderNumber: data?.orderNumber,
            total_amount: data?.total_amount,
            items_total: data?.items_total,
            shipping_cost: data?.shipping_cost,
            status: data?.status,
            customer: data?.customer || null,
            items: data?.items || [],
            shipping_method: data?.shipping_method,
            date: data?.date
        };

        res.json(publicData);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Trigger confirmation flow manually for local development
 * (Since Stripe webhooks don't reach localhost)
 */
import { sendOrderConfirmationEmail } from '../services/mailService';
export const confirmLocalPayment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { paymentIntentId } = req.body;
        console.log(`📡 [LOCAL CONFIRM] Received request for sale: ${id}`);

        const db = getDb();
        const saleRef = db.collection('sales').doc(id);
        const saleDoc = await saleRef.get();

        if (!saleDoc.exists) {
            console.error(`❌ [LOCAL CONFIRM] Sale not found: ${id}`);
            return res.status(404).json({ error: 'Sale not found' });
        }

        const saleData = saleDoc.data() as any;
        console.log(`📡 [LOCAL CONFIRM] Sale details: Number=${saleData.orderNumber}, Status=${saleData.status}`);

        // Only process if not already completed
        if (saleData.status !== 'completed') {
            console.log(`📡 [LOCAL CONFIRM] Updating sale ${id} to completed and sending email...`);
            await saleRef.update({
                status: 'completed',
                stripePaymentIntentId: paymentIntentId,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });

            // Trigger email
            await sendOrderConfirmationEmail({
                ...saleData,
                status: 'completed'
            });
        } else {
            console.log(`📡 [LOCAL CONFIRM] Sale ${id} already completed.`);
            // SEND EMAIL ANYWAY FOR DEBUGGING if requested? Let's just do it to be sure.
            await sendOrderConfirmationEmail({
                ...saleData,
                status: 'completed'
            });
        }

        res.json({ success: true, message: 'Local confirmation processed' });
    } catch (error: any) {
        console.error('❌ [LOCAL CONFIRM] Error:', error);
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

import {
    sendDiscogsOrderPreparingEmail,
    sendDiscogsShippingNotificationEmail,
    sendPickupReadyEmail
} from '../services/mailService';

export const notifyPreparing = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const db = getDb();
        const saleRef = db.collection('sales').doc(id);
        const saleDoc = await saleRef.get();

        if (!saleDoc.exists) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        const saleData = saleDoc.data() as any;

        // Update status in Firestore
        await saleRef.update({
            fulfillment_status: 'preparing',
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            history: admin.firestore.FieldValue.arrayUnion({
                status: 'preparing',
                timestamp: new Date().toISOString(), // Use string for easier frontend parsing or Timestamp if consistent
                note: 'Order is being prepared. Notification sent.'
            })
        });

        // Send email
        const mailResult = await sendDiscogsOrderPreparingEmail(saleData);

        res.json({ success: true, mailResult });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateTrackingNumber = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { trackingNumber } = req.body;
        const db = getDb();

        if (!trackingNumber) {
            return res.status(400).json({ error: 'Tracking number is required' });
        }

        await db.collection('sales').doc(id).update({
            tracking_number: trackingNumber,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, trackingNumber });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const notifyShipped = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { trackingNumber, trackingLink } = req.body;
        const db = getDb();
        const saleRef = db.collection('sales').doc(id);
        const saleDoc = await saleRef.get();

        if (!saleDoc.exists) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        const saleData = saleDoc.data() as any;
        const finalTrackingNumber = trackingNumber || saleData.tracking_number;

        if (!finalTrackingNumber) {
            return res.status(400).json({ error: 'Tracking number is required to notify shipment' });
        }

        // Prepare update data
        const updateData: any = {
            fulfillment_status: 'in_transit', // Step 2: In Transit (Tracking sent)
            tracking_number: finalTrackingNumber,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            history: admin.firestore.FieldValue.arrayUnion({
                status: 'in_transit',
                timestamp: new Date().toISOString(),
                note: `Order is in transit. Tracking: ${finalTrackingNumber}`
            })
        };

        if (trackingLink) {
            updateData.tracking_link = trackingLink;
            // Update local object for email content
            saleData.tracking_link = trackingLink;
        }

        // Update status in Firestore
        await saleRef.update(updateData);

        // Send email
        const mailResult = await sendDiscogsShippingNotificationEmail(saleData, finalTrackingNumber);

        res.json({ success: true, mailResult });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const markAsDispatched = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const db = getDb();

        await db.collection('sales').doc(id).update({
            fulfillment_status: 'shipped', // Step 3: Dispatched (Closed)
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            history: admin.firestore.FieldValue.arrayUnion({
                status: 'shipped',
                timestamp: new Date().toISOString(),
                note: 'Order dispatched (Archived).'
            })
        });

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const notifyReadyForPickup = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const db = getDb();
        const saleRef = db.collection('sales').doc(id);
        const saleDoc = await saleRef.get();

        if (!saleDoc.exists) return res.status(404).json({ error: 'Sale not found' });

        const saleData = saleDoc.data() as any;

        await saleRef.update({
            fulfillment_status: 'ready_for_pickup',
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            history: admin.firestore.FieldValue.arrayUnion({
                status: 'ready_for_pickup',
                timestamp: new Date().toISOString(),
                note: 'Ready for pickup. Notification sent.'
            })
        });

        const mailResult = await sendPickupReadyEmail(saleData);
        res.json({ success: true, mailResult });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const markAsPickedUp = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const db = getDb();

        await db.collection('sales').doc(id).update({
            fulfillment_status: 'picked_up', // Closed
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            history: admin.firestore.FieldValue.arrayUnion({
                status: 'picked_up',
                timestamp: new Date().toISOString(),
                note: 'Order picked up by customer (Archived).'
            })
        });

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
