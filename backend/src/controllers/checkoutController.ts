import { Request, Response } from 'express';
import { getDb } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import config from '../config/env';

const stripe = config.STRIPE_SECRET_KEY && config.STRIPE_SECRET_KEY !== 'sk_test_mock'
    ? new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' } as any)
    : null;

export const startCheckout = async (req: Request, res: Response) => {
    try {
        if (!stripe) {
            console.error("Stripe key missing or using mock");
            return res.status(500).json({ error: "Payment system not configured" });
        }
        const { items, customerData } = req.body; // { recordId, quantity }[] + customer info
        const db = getDb();

        let total = 0;
        const validatedItems = [];

        // Check availability in Firestore
        for (const item of items) {
            const productRef = db.collection('products').doc(item.recordId);
            const productDoc = await productRef.get();

            if (!productDoc.exists) {
                return res.status(404).json({ error: `Product ${item.recordId} not found` });
            }

            const data = productDoc.data() as any;
            if (data.stock < item.quantity) {
                return res.status(400).json({ error: `Not enough stock for ${data.album}` });
            }

            total += data.price * item.quantity;
            validatedItems.push({
                productId: item.recordId,
                quantity: item.quantity,
                unitPrice: data.price,
                album: data.album,
                artist: data.artist
            });
        }

        // Create Pending Sale in Firestore with customer data
        const saleRef = db.collection('sales').doc();
        await saleRef.set({
            total_amount: total,
            channel: 'online',
            status: 'PENDING',
            items: validatedItems,
            customer: customerData || null,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // Create Stripe PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(total * 100),
            currency: 'dkk',
            metadata: {
                saleId: saleRef.id
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.json({
            saleId: saleRef.id,
            total,
            items: validatedItems,
            clientSecret: paymentIntent.client_secret,
            message: "Checkout started. Please confirm payment."
        });

    } catch (error: any) {
        console.error("Checkout error:", error);
        res.status(500).json({ error: error.message || "Checkout error" });
    }
};

export const confirmCheckout = async (req: Request, res: Response) => {
    try {
        const { saleId, paymentId } = req.body;
        const db = getDb();

        // Transactional confirmation in Firestore
        await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
            const saleRef = db.collection('sales').doc(saleId);
            const saleDoc = await transaction.get(saleRef);

            if (!saleDoc.exists || saleDoc.data()?.status !== 'PENDING') {
                throw new Error("Invalid or expired sale");
            }

            const saleData = saleDoc.data() as any;

            // Generate order number (format: WEB-YYYYMMDD-XXXXX)
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
            const orderNumber = `WEB-${dateStr}-${saleId.slice(-5).toUpperCase()}`;

            // Re-validate and deduct stock
            for (const item of saleData.items) {
                const productRef = db.collection('products').doc(item.productId);
                const productDoc = await transaction.get(productRef);

                if (!productDoc.exists || (productDoc.data() as any).stock < item.quantity) {
                    throw new Error(`Stock unavailable for item ${item.productId}`);
                }

                transaction.update(productRef, {
                    stock: admin.firestore.FieldValue.increment(-item.quantity),
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                });

                // Record movement in Firestore
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

            // Customer data enrichment (simplified as we don't have stripe shipping here yet, 
            // but we use form data)
            const customer = saleData.customer || {};
            const enrichedCustomer = {
                ...customer,
                name: customer.name || (customer.firstName ? `${customer.firstName} ${customer.lastName || ''}` : '') || 'Cliente',
                email: customer.email || ''
            };

            transaction.update(saleRef, {
                status: 'completed',
                fulfillment_status: 'pending',
                orderNumber: orderNumber,
                paymentId: paymentId || 'MOCK_PAYMENT',
                customer: enrichedCustomer,
                completed_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        res.json({ success: true, saleId, status: 'completed' });

    } catch (error: any) {
        console.error("Confirmation error:", error);
        res.status(400).json({ error: error.message || "Confirmation failed" });
    }
};

