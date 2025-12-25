import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import config from '../config/env';
import { getDb } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin';
import express from 'express';

const router = Router();

// Initialize Stripe only if key exists
const stripe = config.STRIPE_SECRET_KEY && config.STRIPE_SECRET_KEY !== 'sk_test_mock'
    ? new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' } as any)
    : null;

router.post('/stripe',
    express.raw({ type: 'application/json' }), // RAW body for signature verification
    async (req: Request, res: Response) => {
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
                                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                                    });
                                }
                            }

                            // Update sale status
                            transaction.update(saleRef, {
                                status: 'completed',
                                paymentId: paymentIntent.id,
                                payment_method: paymentIntent.payment_method_types[0] || 'card',
                                updated_at: admin.firestore.FieldValue.serverTimestamp()
                            });

                            console.log(`✅ Payment confirmed and stock updated for sale ${saleId}`);
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
    }
);

export default router;
