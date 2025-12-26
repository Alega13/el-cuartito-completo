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
        const { items, customerData, shippingMethod } = req.body; // Added shippingMethod
        const db = getDb();

        let itemsTotal = 0;
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

            itemsTotal += data.price * item.quantity;
            validatedItems.push({
                productId: item.recordId,
                quantity: item.quantity,
                unitPrice: data.price,
                album: data.album,
                artist: data.artist
            });
        }

        // Calculate shipping cost
        const shippingCost = shippingMethod?.price || 0;
        const total = itemsTotal + shippingCost;

        // Create Pending Sale in Firestore with customer data and shipping info
        const saleRef = db.collection('sales').doc();

        // Generate order number immediately (format: WEB-YYYYMMDD-XXXXX)
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const orderNumber = `WEB-${dateStr}-${saleRef.id.slice(-5).toUpperCase()}`;

        await saleRef.set({
            orderNumber, // Now included from the start
            items_total: itemsTotal,
            shipping_cost: shippingCost,
            total_amount: total, // items + shipping
            channel: 'online',
            status: 'PENDING',
            items: validatedItems,
            customer: customerData || null,
            shipping_method: shippingMethod ? {
                id: shippingMethod.id,
                method: shippingMethod.method,
                price: shippingMethod.price,
                estimatedDays: shippingMethod.estimatedDays
            } : null,
            fulfillment_status: 'pending',
            stripePaymentIntentId: null, // Will be set by webhook
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // Create Stripe PaymentIntent with TOTAL (items + shipping)
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(total * 100), // Total includes shipping now
            currency: 'dkk',
            metadata: {
                saleId: saleRef.id,
                shipping_method: shippingMethod?.method || 'TBD',
                shipping_cost: shippingCost.toString()
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.json({
            saleId: saleRef.id,
            itemsTotal,
            shippingCost,
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

/**
 * @deprecated This endpoint is deprecated and should not be called.
 * Stock management is now handled exclusively by the Stripe webhook.
 * This endpoint remains only for backwards compatibility and does nothing.
 * 
 * The correct flow is:
 * 1. Frontend calls /checkout/start
 * 2. Frontend calls stripe.confirmCardPayment
 * 3. Stripe webhook handles stock reduction on payment_intent.succeeded
 */
export const confirmCheckout = async (req: Request, res: Response) => {
    try {
        const { saleId } = req.body;

        console.warn('⚠️  DEPRECATED: /checkout/confirm called. This endpoint does nothing. Stock is managed by webhook.');

        // Return success but do nothing - webhook will handle everything
        res.json({
            success: true,
            saleId,
            message: 'Payment confirmation will be handled by Stripe webhook. Please wait for webhook processing.'
        });

    } catch (error: any) {
        console.error("Confirmation error:", error);
        res.status(400).json({ error: error.message || "Confirmation failed" });
    }
};

