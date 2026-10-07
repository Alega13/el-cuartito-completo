import { Request, Response } from 'express';
import { getDb } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin';
import { calculateSaleVATLiability } from '../services/vatCalculator';
import { generateInvoice, buildInvoiceFromPOSSale } from '../services/invoiceService';
import { sendSaleNotificationEmail } from '../services/mailService';
import { removeDiscogsListings } from '../services/discogsService';

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
        const flattedData: any = {
            ...data,
            is_online: data.is_online ?? data.availableOnline ?? false,
            cover_image: data.cover_image ?? data.coverImage ?? null,
            condition: data.condition ?? data.status ?? 'VG',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        };

        // Atomic quickId generation via transaction
        const result = await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
            const counterRef = db.collection('metadata').doc('vinylCounter');
            const counterDoc = await transaction.get(counterRef);

            let currentCount = 0;
            if (counterDoc.exists) {
                currentCount = counterDoc.data()?.current || 0;
            }

            const newCount = currentCount + 1;
            const quickId = String(newCount).padStart(4, '0');

            // Update counter
            transaction.set(counterRef, { current: newCount }, { merge: true });

            // Create product with quickId
            flattedData.quickId = quickId;
            const newDocRef = db.collection('products').doc();
            transaction.set(newDocRef, flattedData);

            return { id: newDocRef.id, quickId };
        });

        res.status(201).json(normalizeProduct({ ...flattedData, quickId: result.quickId }, result.id));
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
    const { items, channel, totalAmount, paymentMethod, customerName, customerEmail, discountPercent, discountAmount } = req.body;
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

        // Discogs listings to remove after the sale commits (reset on each tx retry).
        const discogsListingsToRemove: string[] = [];

        const saleId = await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
            let calculatedTotal = 0;
            discogsListingsToRemove.length = 0;

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

                // If this item is listed on Discogs and now sells out, queue listing removal
                // so the Discogs inventory sync can't re-inflate its stock.
                if (productData.discogs_listing_id && currentStock - item.qty <= 0) {
                    discogsListingsToRemove.push(String(productData.discogs_listing_id));
                }

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
                discount_percent: discountPercent || 0,
                discount_amount: discountAmount || 0,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                status: 'completed'
            });

            return saleRef.id;
        });

        res.json({ success: true, saleId });

        // Sync sold-out items to Discogs by removing their listings (non-blocking)
        if (discogsListingsToRemove.length > 0) {
            removeDiscogsListings(discogsListingsToRemove).catch(e =>
                console.error('⚠️ Discogs listing removal failed for POS sale:', e.message)
            );
        }

        // Generate invoice in background (non-blocking)
        const finalTotal = totalAmount || normalizedItems.reduce((sum: number, i: any) => sum + (i.priceAtSale * i.qty), 0);
        setTimeout(() => {
            const invoiceData = buildInvoiceFromPOSSale(
                saleId, normalizedItems, channel, finalTotal, paymentMethod, customerName, discountPercent, discountAmount
            );
            generateInvoice(invoiceData).catch(e =>
                console.error('⚠️ Invoice generation failed for POS sale:', e.message)
            );
        }, 1);

        // Send sale notification email to owner (non-blocking)
        setTimeout(() => {
            sendSaleNotificationEmail({
                channel: channel || 'local',
                items: normalizedItems,
                totalAmount: finalTotal,
                paymentMethod: paymentMethod || 'CASH',
                customerName: customerName || undefined,
                saleId,
            }).catch(e => console.error('⚠️ Sale notification email failed:', e.message));
        }, 50);
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
    sendPickupReadyEmail,
    sendOrderPreparingEmail,
    sendLabelReadyEmail,
    sendShippingNotificationEmail
} from '../services/mailService';

/* ------------------------------------------------------------------ */
/* Notificaciones al cliente: idempotencia (anti doble envío)           */
/*                                                                     */
/* Cada venta guarda `notifications: { <tipo>: { status, sentAt, to } }`.*/
/* El envío se reclama en transacción ANTES de mandar el email: si dos   */
/* requests llegan a la vez, solo una manda el mail. Si el tipo ya se    */
/* envió (o está en curso), se devuelve 200 { alreadySent: true } — no   */
/* es error: el frontend lo muestra como "ya avisado". Si el email falla,*/
/* el claim se libera para permitir reintento.                          */
/* ------------------------------------------------------------------ */
const NOTIFY_TYPES = ['preparing', 'label_created', 'shipped', 'pickup_ready'] as const;
type NotifyType = typeof NOTIFY_TYPES[number];

const customerEmailOf = (saleData: any): string =>
    saleData.customerEmail || saleData.email || saleData.customer_email || saleData.customer?.email || '';

async function claimNotification(
    db: admin.firestore.Firestore,
    saleRef: admin.firestore.DocumentReference,
    type: NotifyType
): Promise<{ alreadySent: boolean }> {
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(saleRef);
        if (!snap.exists) throw Object.assign(new Error('Sale not found'), { code: 'NOT_FOUND' });
        const data = snap.data() as any;
        const rec = data.notifications && data.notifications[type];
        if (rec && (rec.status === 'sent' || rec.status === 'sending')) {
            return { alreadySent: true };
        }
        tx.update(saleRef, {
            [`notifications.${type}`]: { status: 'sending', claimedAt: new Date().toISOString() },
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { alreadySent: false };
    });
}

async function finalizeNotification(
    saleRef: admin.firestore.DocumentReference,
    type: NotifyType,
    email: string,
    note: string
): Promise<void> {
    await saleRef.update({
        [`notifications.${type}`]: { status: 'sent', sentAt: new Date().toISOString(), to: email },
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        history: admin.firestore.FieldValue.arrayUnion({
            status: `notify_${type}`,
            timestamp: new Date().toISOString(),
            note,
        }),
    });
}

async function releaseNotificationClaim(
    saleRef: admin.firestore.DocumentReference,
    type: NotifyType
): Promise<void> {
    try {
        await saleRef.update({ [`notifications.${type}`]: admin.firestore.FieldValue.delete() });
    } catch {
        /* best effort: si no se puede liberar, el reintento manual lo pisa */
    }
}

/**
 * Envía una notificación una sola vez por venta y tipo.
 * Devuelve { alreadySent: true } si ya constaba enviada/en curso.
 */
async function sendNotificationOnce(opts: {
    db: FirebaseFirestore.Firestore;
    id: string;
    type: NotifyType;
    send: (saleData: any) => Promise<any>;
    historyNote: (email: string) => string;
}): Promise<{ alreadySent: boolean; mailResult?: any }> {
    const { db, id, type, send, historyNote } = opts;
    const saleRef = db.collection('sales').doc(id);

    const claim = await claimNotification(db, saleRef, type);
    if (claim.alreadySent) return { alreadySent: true };

    const saleSnap = await saleRef.get();
    const saleData = saleSnap.data() as any;
    const email = customerEmailOf(saleData);

    let mailResult: any;
    try {
        mailResult = await send(saleData);
    } catch (e: any) {
        await releaseNotificationClaim(saleRef, type);
        // NO_TRACKING es error de validación (400), no fallo del email
        if (e?.code === 'NO_TRACKING') throw e;
        throw Object.assign(new Error(`No se pudo enviar el email: ${e?.message || e}`), { code: 'MAIL_FAILED' });
    }
    if (!mailResult || mailResult.success === false) {
        await releaseNotificationClaim(saleRef, type);
        throw Object.assign(new Error(mailResult?.error || 'El email no pudo enviarse'), { code: 'MAIL_FAILED' });
    }
    await finalizeNotification(saleRef, type, email, historyNote(email));
    return { alreadySent: false, mailResult };
}

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

        // Estado idempotente: si ya está en preparing, no duplicar historial
        if (saleData.fulfillment_status !== 'preparing') {
            await saleRef.update({
                fulfillment_status: 'preparing',
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                history: admin.firestore.FieldValue.arrayUnion({
                    status: 'preparing',
                    timestamp: new Date().toISOString(), // Use string for easier frontend parsing or Timestamp if consistent
                    note: 'Order is being prepared. Notification sent.'
                })
            });
        }

        // Email: una sola vez por venta (ver cabecera de esta sección)
        const { alreadySent, mailResult } = await sendNotificationOnce({
            db, id, type: 'preparing',
            send: (s) => sendDiscogsOrderPreparingEmail(s),
            historyNote: (email) => `Notificación "en preparación" enviada a ${email || 'cliente'}.`,
        });

        res.json({ success: true, alreadySent, mailResult: mailResult || null });
    } catch (error: any) {
        if (error?.code === 'NOT_FOUND') return res.status(404).json({ error: 'Sale not found' });
        if (error?.code === 'MAIL_FAILED') return res.status(502).json({ success: false, error: error.message });
        res.status(500).json({ error: error.message });
    }
};

export const cancelOrder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const db = getDb();
        const saleRef = db.collection('sales').doc(id);
        const saleDoc = await saleRef.get();

        if (!saleDoc.exists) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        // Update status in Firestore
        await saleRef.update({
            fulfillment_status: 'canceled',
            status: 'canceled', // also update the global sale status if needed
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            history: admin.firestore.FieldValue.arrayUnion({
                status: 'canceled',
                timestamp: new Date().toISOString(),
                note: 'Order has been canceled.'
            })
        });

        res.json({ success: true });
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

        // Estado idempotente: si ya está in_transit, no duplicar historial
        if (saleData.fulfillment_status !== 'in_transit') {
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
        } else if (trackingNumber) {
            await saleRef.update({
                tracking_number: finalTrackingNumber,
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        // Email: una sola vez por venta (ver cabecera de esta sección)
        const { alreadySent, mailResult } = await sendNotificationOnce({
            db, id, type: 'shipped',
            send: (s) => sendDiscogsShippingNotificationEmail(s, finalTrackingNumber),
            historyNote: (email) => `Notificación "despachado" enviada a ${email || 'cliente'}. Tracking: ${finalTrackingNumber}`,
        });

        res.json({ success: true, alreadySent, mailResult: mailResult || null });
    } catch (error: any) {
        if (error?.code === 'NOT_FOUND') return res.status(404).json({ error: 'Sale not found' });
        if (error?.code === 'MAIL_FAILED') return res.status(502).json({ success: false, error: error.message });
        res.status(500).json({ error: error.message });
    }
};

export const markAsDispatched = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const db = getDb();
        const saleRef = db.collection('sales').doc(id);
        const saleDoc = await saleRef.get();
        if (!saleDoc.exists) return res.status(404).json({ error: 'Sale not found' });

        // Idempotente: si ya está despachado, ok sin efectos secundarios
        if ((saleDoc.data() as any).fulfillment_status === 'shipped') {
            return res.json({ success: true, alreadyDone: true });
        }

        await saleRef.update({
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

        // Estado idempotente: si ya está listo para retiro, no duplicar historial
        if (saleData.fulfillment_status !== 'ready_for_pickup') {
            await saleRef.update({
                fulfillment_status: 'ready_for_pickup',
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                history: admin.firestore.FieldValue.arrayUnion({
                    status: 'ready_for_pickup',
                    timestamp: new Date().toISOString(),
                    note: 'Ready for pickup. Notification sent.'
                })
            });
        }

        // Email: una sola vez por venta (ver cabecera de esta sección)
        const { alreadySent, mailResult } = await sendNotificationOnce({
            db, id, type: 'pickup_ready',
            send: (s) => sendPickupReadyEmail(s),
            historyNote: (email) => `Notificación "listo para recoger" enviada a ${email || 'cliente'}.`,
        });

        res.json({ success: true, alreadySent, mailResult: mailResult || null });
    } catch (error: any) {
        if (error?.code === 'NOT_FOUND') return res.status(404).json({ error: 'Sale not found' });
        if (error?.code === 'MAIL_FAILED') return res.status(502).json({ success: false, error: error.message });
        res.status(500).json({ error: error.message });
    }
};

export const markAsPickedUp = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const db = getDb();
        const saleRef = db.collection('sales').doc(id);
        const saleDoc = await saleRef.get();
        if (!saleDoc.exists) return res.status(404).json({ error: 'Sale not found' });

        // Idempotente: si ya está recogido, ok sin efectos secundarios
        if ((saleDoc.data() as any).fulfillment_status === 'picked_up') {
            return res.json({ success: true, alreadyDone: true });
        }

        await saleRef.update({
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

/**
 * Marca un envío como "etiqueta creada": guarda tracking + datos de la etiqueta
 * y mueve fulfillment_status a 'label_created'. Vale tanto para compra vía API
 * como para carga manual del tracking (etiqueta generada a mano en Shipmondo).
 * No envía email — eso lo hace POST /:id/notify con type=label_created.
 */
export const setLabelCreated = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { trackingNumber, carrier, labelUrl } = req.body || {};
        const db = getDb();

        if (!trackingNumber || !String(trackingNumber).trim()) {
            return res.status(400).json({ error: 'trackingNumber es requerido' });
        }

        const saleRef = db.collection('sales').doc(id);
        const saleDoc = await saleRef.get();
        if (!saleDoc.exists) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        const saleData = saleDoc.data() as any;
        const tracking = String(trackingNumber).trim();

        // Idempotente: si ya está en label_created con el mismo tracking, ok sin efectos
        if (saleData.fulfillment_status === 'label_created' && saleData.tracking_number === tracking) {
            return res.json({ success: true, alreadyDone: true, trackingNumber: tracking });
        }

        const updateData: any = {
            tracking_number: tracking,
            fulfillment_status: 'label_created',
            label_created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            history: admin.firestore.FieldValue.arrayUnion({
                status: 'label_created',
                timestamp: new Date().toISOString(),
                note: `Etiqueta creada. Tracking: ${tracking}${carrier ? ` (${carrier})` : ''}`
            })
        };
        if (carrier) updateData.label_carrier = String(carrier);
        if (labelUrl) updateData.label_url = String(labelUrl);

        await saleRef.update(updateData);
        res.json({ success: true, trackingNumber: updateData.tracking_number });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * "Avisar al cliente": envía el email correspondiente al estado indicado
 * usando Resend. Puro notify — NO cambia fulfillment_status.
 * Idempotente: si el tipo ya se envió para esta venta, devuelve
 * 200 { success: true, alreadySent: true } sin reenviar.
 */
export const notifyCustomer = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { type } = (req.body || {}) as { type: NotifyType };
        const db = getDb();

        if (!NOTIFY_TYPES.includes(type)) {
            return res.status(400).json({ error: `type inválido. Usar uno de: ${NOTIFY_TYPES.join(', ')}` });
        }

        const senders: Record<NotifyType, (saleData: any) => Promise<any>> = {
            preparing: (s) => sendOrderPreparingEmail(s),
            label_created: (s) => {
                const tracking = s.tracking_number;
                if (!tracking) {
                    throw Object.assign(new Error('El envío no tiene tracking_number cargado'), { code: 'NO_TRACKING' });
                }
                return sendLabelReadyEmail(s, tracking);
            },
            shipped: (s) => sendShippingNotificationEmail(s, {
                tracking_number: s.tracking_number || '—',
                tracking_link: s.tracking_link || '',
                carrier: s.label_carrier || ''
            }),
            pickup_ready: (s) => sendPickupReadyEmail(s),
        };

        const { alreadySent, mailResult } = await sendNotificationOnce({
            db, id, type,
            send: senders[type],
            historyNote: (email) => `Notificación "${type}" enviada a ${email || 'cliente'}.`,
        });

        res.json({ success: true, type, alreadySent, mailResult: mailResult || null });
    } catch (error: any) {
        if (error?.code === 'NOT_FOUND') return res.status(404).json({ error: 'Sale not found' });
        if (error?.code === 'NO_TRACKING') return res.status(400).json({ error: error.message });
        if (error?.code === 'MAIL_FAILED') return res.status(502).json({ success: false, error: error.message });
        res.status(500).json({ error: error.message });
    }
};

/**
 * DELETE /sales/:id — elimina la ficha de envío (el doc de la venta).
 * Si la venta tenía stockDecremented y el disco vinculado existe, devuelve
 * 1 unidad al stock y lo registra en inventory_logs. Todo en transacción.
 * Solo toca ventas (y la devolución puntual al inventario).
 */
export const deleteSale = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const db = getDb();
        const saleRef = db.collection('sales').doc(id);

        const result = await db.runTransaction(async (tx: admin.firestore.Transaction) => {
            const snap = await tx.get(saleRef);
            if (!snap.exists) throw Object.assign(new Error('Sale not found'), { code: 'NOT_FOUND' });
            const sale = snap.data() as any;

            let stockReturned = false;
            let returnedTo = '';
            if (sale.stockDecremented && sale.linkedInventory?.productId) {
                const prodRef = db.collection('products').doc(sale.linkedInventory.productId);
                const prodSnap = await tx.get(prodRef);
                if (prodSnap.exists) {
                    const pd = prodSnap.data() as any;
                    tx.update(prodRef, { stock: (Number(pd.stock) || 0) + 1 });
                    returnedTo = [pd.artist, pd.album].filter(Boolean).join(' — ') || 'disco vinculado';
                    tx.set(db.collection('inventory_logs').doc(), {
                        type: 'STOCK_RETURN',
                        sku: pd.sku || 'Unknown',
                        album: pd.album || 'Unknown',
                        artist: pd.artist || 'Unknown',
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        details: `Ficha de envío eliminada (${sale.orderNumber || id}): 1 unidad devuelta al stock`,
                    });
                    stockReturned = true;
                }
            }
            tx.delete(saleRef);
            return { stockReturned, returnedTo };
        });

        res.json({ success: true, ...result });
    } catch (error: any) {
        if (error?.code === 'NOT_FOUND') return res.status(404).json({ error: 'Sale not found' });
        res.status(500).json({ error: error.message });
    }
};
