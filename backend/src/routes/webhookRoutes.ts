import { Request, Response } from 'express';
import Stripe from 'stripe';
import config from '../config/env';
import { getDb } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin';
import { sendOrderConfirmationEmail } from '../services/mailService';

// Initialize Stripe only if key exists
const stripe = config.STRIPE_SECRET_KEY && config.STRIPE_SECRET_KEY !== 'sk_test_mock'
    ? new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' } as any)
    : null;

export const stripeWebhookHandler = async (req: Request, res: Response) => {
    // DEBUG: Log everything about the request
    console.log('========== WEBHOOK DEBUG START ==========');
    console.log('Body type:', typeof req.body);
    console.log('Is Buffer?:', Buffer.isBuffer(req.body));
    console.log('Body length:', req.body?.length || 'N/A');
    console.log('Secret configured?:', !!config.STRIPE_WEBHOOK_SECRET);
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
            req.body, // req.body is now a Buffer thanks to express.raw()
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

                    if (!saleDoc.exists) return;

                    const saleData = saleDoc.data() as any;

                    // Idempotency check: Skip if already processed by this exact payment intent
                    const alreadyProcessed = saleData?.stripePaymentIntentId === paymentIntent.id && saleData?.status === 'completed';

                    if (alreadyProcessed) {
                        console.log(`✓ Webhook already processed for sale ${saleId} with payment intent ${paymentIntent.id}, skipping (idempotent)`);
                        return;
                    }

                    const isNew = saleData?.status === 'PENDING';
                    const isMissingData = saleData?.status === 'completed' && !saleData?.orderNumber;

                    if (isNew || isMissingData) {
                        // Generate or use existing order number
                        const now = new Date();
                        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
                        const orderNumber = saleData.orderNumber || `WEB-${dateStr}-${saleId.slice(-5).toUpperCase()}`;
                        console.log(`Using orderNumber: ${orderNumber} for sale ${saleId}`);

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

                        // Update sale status (preserving existing customer data, but enriching with Stripe info)
                        const stripeCustomer = {
                            name: paymentIntent.shipping?.name || paymentIntent.receipt_email || saleData.customer?.name || (saleData.customer?.firstName ? `${saleData.customer.firstName} ${saleData.customer.lastName}` : '') || 'Customer',
                            email: paymentIntent.receipt_email || saleData.customer?.email || '',
                            shipping: paymentIntent.shipping?.address ? {
                                line1: paymentIntent.shipping.address.line1,
                                line2: paymentIntent.shipping.address.line2,
                                city: paymentIntent.shipping.address.city,
                                state: paymentIntent.shipping.address.state,
                                postal_code: paymentIntent.shipping.address.postal_code,
                                country: paymentIntent.shipping.address.country,
                            } : (saleData.customer?.address ? {
                                line1: saleData.customer.address,
                                city: saleData.customer.city,
                                postal_code: saleData.customer.postalCode,
                                country: saleData.customer.country || 'Denmark'
                            } : null)
                        };

                        const updatedSaleData = {
                            status: 'completed',
                            fulfillment_status: 'pending', // Initialize fulfillment status
                            orderNumber: orderNumber,
                            stripePaymentIntentId: paymentIntent.id, // NEW: For idempotency
                            paymentId: paymentIntent.id,
                            payment_method: paymentIntent.payment_method_types[0] || 'card',
                            customer: {
                                ...saleData.customer, // Keep original data from checkout form
                                ...stripeCustomer,    // Flatten for easier access
                                stripe_info: stripeCustomer // Keep full stripe info for reference
                            },
                            completed_at: admin.firestore.FieldValue.serverTimestamp(),
                            updated_at: admin.firestore.FieldValue.serverTimestamp()
                        };

                        transaction.update(saleRef, updatedSaleData);

                        console.log(`✅ Payment confirmed and stock updated for sale ${saleId}, order ${orderNumber}`);

                        // Send confirmation email asynchronously after transaction
                        const finalOrderData = {
                            ...saleData,
                            ...updatedSaleData,
                            // Ensure numeric values for template if they were Firestore FieldValues
                            items_total: saleData.items_total,
                            shipping_cost: saleData.shipping_cost,
                            total_amount: saleData.total_amount
                        };

                        // Execute email sending in the background to not delay webhook response
                        setTimeout(() => {
                            sendOrderConfirmationEmail(finalOrderData).catch(e =>
                                console.error('Error in background email sending:', e)
                            );
                        }, 1);
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
        console.error('========== WEBHOOK ERROR ==========');
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Error type:', err.type);
        console.error('rawBody preview:', (req as any).rawBody?.substring(0, 200));
        console.error('Signature:', req.headers['stripe-signature']);
        console.error('Secret configured?:', !!config.STRIPE_WEBHOOK_SECRET);
        console.error('Secret preview:', config.STRIPE_WEBHOOK_SECRET?.substring(0, 15) + '...');
        console.error('========== WEBHOOK ERROR END ==========');
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
};
