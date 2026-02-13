"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmCheckout = exports.startCheckout = void 0;
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const env_1 = __importDefault(require("../config/env"));
const stripe = env_1.default.STRIPE_SECRET_KEY && env_1.default.STRIPE_SECRET_KEY !== 'sk_test_mock'
    ? new stripe_1.default(env_1.default.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
    : null;
const startCheckout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!stripe) {
            console.error("Stripe key missing or using mock");
            return res.status(500).json({ error: "Payment system not configured" });
        }
        const { items, customerData, shippingMethod } = req.body; // Added shippingMethod
        const db = (0, firebaseAdmin_1.getDb)();
        console.log('🚀 [START-CHECKOUT] Initiating checkout...');
        console.log('📦 [START-CHECKOUT] Shipping Method:', JSON.stringify(shippingMethod, null, 2));
        console.log('👤 [START-CHECKOUT] Customer:', JSON.stringify(customerData, null, 2));
        let itemsTotal = 0;
        const validatedItems = [];
        // Check availability in Firestore
        for (const item of items) {
            const productRef = db.collection('products').doc(item.recordId);
            const productDoc = yield productRef.get();
            if (!productDoc.exists) {
                return res.status(404).json({ error: `Product ${item.recordId} not found` });
            }
            const data = productDoc.data();
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
                cost: data.cost || 0
            });
        }
        // Calculate shipping cost
        const shippingCost = (shippingMethod === null || shippingMethod === void 0 ? void 0 : shippingMethod.price) || 0;
        const total = itemsTotal + shippingCost;
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
        const saleRef = yield db.collection('sales').add({
            orderNumber,
            date: dateForAdmin,
            items_total: itemsTotal,
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
        // Create Stripe PaymentIntent with TOTAL (items + shipping)
        const paymentIntent = yield stripe.paymentIntents.create({
            amount: Math.round(total * 100),
            currency: 'dkk',
            receipt_email: customerData === null || customerData === void 0 ? void 0 : customerData.email, // Enable automatic receipt email
            metadata: {
                saleId: saleRef.id,
                shipping_method: (shippingMethod === null || shippingMethod === void 0 ? void 0 : shippingMethod.method) || 'TBD',
                shipping_cost: shippingCost.toString(),
                customer_name: (customerData === null || customerData === void 0 ? void 0 : customerData.name) || (customerData === null || customerData === void 0 ? void 0 : customerData.firstName) || 'Guest'
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
    }
    catch (error) {
        console.error("Checkout error:", error);
        res.status(500).json({ error: error.message || "Checkout error" });
    }
});
exports.startCheckout = startCheckout;
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
const confirmCheckout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { saleId } = req.body;
        console.warn('⚠️  DEPRECATED: /checkout/confirm called. This endpoint does nothing. Stock is managed by webhook.');
        // Return success but do nothing - webhook will handle everything
        res.json({
            success: true,
            saleId,
            message: 'Payment confirmation will be handled by Stripe webhook. Please wait for webhook processing.'
        });
    }
    catch (error) {
        console.error("Confirmation error:", error);
        res.status(400).json({ error: error.message || "Confirmation failed" });
    }
});
exports.confirmCheckout = confirmCheckout;
