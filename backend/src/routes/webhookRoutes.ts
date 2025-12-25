import { Request, Response } from 'express';
import Stripe from 'stripe';
import config from '../config/env';
import { getDb } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin';

// Initialize Stripe only if key exists
const stripe = config.STRIPE_SECRET_KEY && config.STRIPE_SECRET_KEY !== 'sk_test_mock'
    ? new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' } as any)
    : null;

export const stripeWebhookHandler = async (req: Request, res: Response) => {
    // DEBUG: Log everything about the request
    console.log('========== WEBHOOK DEBUG START ==========');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body type:', typeof req.body);
    console.log('Body is Buffer?:', Buffer.isBuffer(req.body));
    console.log('Body is String?:', typeof req.body === 'string');
    console.log('Body is Object?:', typeof req.body === 'object' && !Buffer.isBuffer(req.body));
    console.log('Body length:', req.body?.length || 'N/A');
    console.log('Body preview:', req.body ? (Buffer.isBuffer(req.body) ? req.body.toString().substring(0, 100) : JSON.stringify(req.body).substring(0, 100)) : 'EMPTY');
    console.log('========== WEBHOOK DEBUG END ==========');

    if (!stripe) {
        return res.status(500).json({ error: 'Stripe not configured' });
    }

    const sig = req.headers['stripe-signature'] as string;

    if (!sig) {
        return res.status(400).json({ error: 'No signature provided' });
    }

    try {
        const event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            config.STRIPE_WEBHOOK_SECRET || ''
        );

        console.log('Webhook event received:', event.type);

        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            const saleId = paymentIntent.metadata.saleId;

            console.log('Payment succeeded for sale:', saleId);

            if (saleId) {
                const db = getDb();

                // Confirm sale and deduct stock in transaction
                await db.runTransaction(async (transaction) => {
                    const saleRef = db.collection('sales').doc(saleId);
                    const saleDoc = await transaction.get(saleRef);

                    if (saleDoc.exists && saleDoc.data()?.status === 'PENDING') {
                        const saleData = saleDoc.data() as any;

                        // Generate order number (format: WEB-YYYYMMDD-XXXXX)
                        const now = new Date();
                        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
                        const orderNumber = `WEB-${dateStr}-${saleId.slice(-5).toUpperCase()}`;

                        // Deduct stock for each item
                        for (const item of saleData.items) {
                            const productRef = db.collection('products').doc(item.productId);
                            const productDoc = await transaction.get(productRef);

                            if (productDoc.exists) {
                                transaction.update(productRef, {
                                    stock: admin.firestore.FieldValue.increment(-item.quantity),
                                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                                });

                                // Record inventory movement
                                const movementRef = db.collection('inventory_movements').doc();
                                transaction.set(movementRef, {
                                    product_id: item.productId,
                                    change: -item.quantity,
                                    reason: 'sale',
                                    channel: 'online',
                                    saleId: saleId,
                                    orderNumber: orderNumber,
                                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                                });
                            }
                        }

                        // Update sale status (preserving existing customer data)
                        transaction.update(saleRef, {
                            status: 'completed',
                            orderNumber: orderNumber,
                            paymentId: paymentIntent.id,
                            payment_method: paymentIntent.payment_method_types[0] || 'card',
                            completed_at: admin.firestore.FieldValue.serverTimestamp(),
                            updated_at: admin.firestore.FieldValue.serverTimestamp()
                        });

                        console.log(`✅ Payment confirmed and stock updated for sale ${saleId}, order ${orderNumber}`);
                    } else {
                        console.log('Sale not found or already processed:', saleId);
                    }
                });
            }
        } else if (event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            const saleId = paymentIntent.metadata.saleId;

            console.log('Payment failed for sale:', saleId);

            if (saleId) {
                const db = getDb();
                await db.collection('sales').doc(saleId).update({
                    status: 'failed',
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        res.json({ received: true });
    } catch (err: any) {
        console.error('Webhook error:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
};
