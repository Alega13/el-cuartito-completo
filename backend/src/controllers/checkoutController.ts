import { Request, Response } from 'express';
import { getDb } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import config from '../config/env';

const stripe = config.STRIPE_SECRET_KEY && config.STRIPE_SECRET_KEY !== 'sk_test_mock'
    ? new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' } as any)
    : null;

export const validateCoupon = async (req: Request, res: Response) => {
    try {
        const { code, email } = req.body;
        if (!code || !email) {
            return res.status(400).json({ error: "Code and email are required" });
        }
        
        const db = getDb();
        const codeUpper = code.trim().toUpperCase();
        
        // Check if coupon exists and is active
        const couponDoc = await db.collection('coupons').doc(codeUpper).get();
        if (!couponDoc.exists) {
            return res.status(404).json({ error: "Cupón inválido" });
        }
        
        const couponData = couponDoc.data();
        if (!couponData?.active) {
            return res.status(400).json({ error: "El cupón ya no está activo" });
        }
        
        // Check if user already used it
        const usedId = `${email}_${codeUpper}`;
        const usedDoc = await db.collection('used_coupons').doc(usedId).get();
        if (usedDoc.exists) {
            return res.status(400).json({ error: "Este cupón ya fue utilizado" });
        }
        
        res.json({
            valid: true,
            code: codeUpper,
            discount_percentage: couponData.discount_percentage
        });
    } catch (error: any) {
        console.error("Coupon validation error:", error);
        res.status(500).json({ error: "Error al validar el cupón" });
    }
};

export const startCheckout = async (req: Request, res: Response) => {
    try {
        if (!stripe) {
            console.error("Stripe key missing or using mock");
            return res.status(500).json({ error: "Payment system not configured" });
        }
        const { items, customerData, shippingMethod, couponCode } = req.body; // Added couponCode
        const db = getDb();

        console.log('🚀 [START-CHECKOUT] Initiating checkout...');
        console.log('📦 [START-CHECKOUT] Shipping Method:', JSON.stringify(shippingMethod, null, 2));
        console.log('👤 [START-CHECKOUT] Customer:', JSON.stringify(customerData, null, 2));
        if (couponCode) console.log(`🎟️ [START-CHECKOUT] Coupon Code: ${couponCode}`);

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
                artist: data.artist,
                cover_image: data.cover_image || null,
                cost: data.cost || 0,
                productCondition: data.product_condition || 'Second-hand'
            });
        }

        // Validate and apply coupon if present
        let discountAmount = 0;
        let appliedCoupon = null;

        if (couponCode && customerData?.email) {
            const codeUpper = couponCode.trim().toUpperCase();
            const couponDoc = await db.collection('coupons').doc(codeUpper).get();
            const usedId = `${customerData.email}_${codeUpper}`;
            const usedDoc = await db.collection('used_coupons').doc(usedId).get();
            
            if (couponDoc.exists && couponDoc.data()?.active && !usedDoc.exists) {
                const percentage = couponDoc.data()?.discount_percentage || 0;
                discountAmount = (itemsTotal * percentage) / 100;
                appliedCoupon = codeUpper;
            } else {
                return res.status(400).json({ error: "Cupón inválido o ya utilizado" });
            }
        }

        // Calculate shipping cost
        const shippingCost = shippingMethod?.price || 0;
        let total = itemsTotal - discountAmount + shippingCost;
        if (total < 0) total = 0;

        if (total < 2.50) {
            return res.status(400).json({ error: `Total amount (${total} DKK) is too low. Minimum for online payment is 2.50 DKK.` });
        }

        // Generate order number immediately (format: WEB-YYYYMMDD-XXXXX)
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const tempId = db.collection('sales').doc().id; // Get temp ID for orderNumber
        const orderNumber = `WEB-${dateStr}-${tempId.slice(-5).toUpperCase()}`;

        // Format date for admin panel compatibility (YYYY-MM-DD)
        const dateForAdmin = now.toISOString().split('T')[0];

        // Create Pending Sale in Firestore with customer data and shipping info
        const saleRef = await db.collection('sales').add({
            orderNumber,
            date: dateForAdmin,
            items_total: itemsTotal,
            discount_amount: discountAmount || 0,
            coupon_code: appliedCoupon || null,
            shipping_cost: shippingCost || 0,
            shipping_income: shippingCost || 0,
            total_amount: total,
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
            stripePaymentIntentId: null,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });

        // Create Stripe PaymentIntent with TOTAL (items + shipping - discount)
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(total * 100),
            currency: 'dkk',
            receipt_email: customerData?.email, // Enable automatic receipt email
            metadata: {
                saleId: saleRef.id,
                shipping_method: shippingMethod?.method || 'TBD',
                shipping_cost: shippingCost.toString(),
                discount_amount: discountAmount.toString(),
                coupon_code: appliedCoupon || 'None',
                customer_name: customerData?.name || customerData?.firstName || 'Guest'
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.json({
            saleId: saleRef.id,
            itemsTotal,
            discountAmount,
            appliedCoupon,
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

