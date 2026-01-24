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
exports.stripeWebhookHandler = void 0;
const stripe_1 = __importDefault(require("stripe"));
const env_1 = __importDefault(require("../config/env"));
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const admin = __importStar(require("firebase-admin"));
const mailService_1 = require("../services/mailService");
// Initialize Stripe only if key exists
const stripe = env_1.default.STRIPE_SECRET_KEY && env_1.default.STRIPE_SECRET_KEY !== 'sk_test_mock'
    ? new stripe_1.default(env_1.default.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
    : null;
const stripeWebhookHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    // DEBUG: Log everything about the request
    console.log('========== WEBHOOK DEBUG START ==========');
    console.log('Body type:', typeof req.body);
    console.log('Is Buffer?:', Buffer.isBuffer(req.body));
    console.log('Body length:', ((_a = req.body) === null || _a === void 0 ? void 0 : _a.length) || 'N/A');
    console.log('Secret configured?:', !!env_1.default.STRIPE_WEBHOOK_SECRET);
    console.log('========== WEBHOOK DEBUG END ==========');
    if (!stripe) {
        return res.status(500).json({ error: 'Stripe not configured' });
    }
    const sig = req.headers['stripe-signature'];
    if (!sig) {
        return res.status(400).json({ error: 'No signature provided' });
    }
    try {
        const event = stripe.webhooks.constructEvent(req.body, // req.body is now a Buffer thanks to express.raw()
        sig, env_1.default.STRIPE_WEBHOOK_SECRET || '');
        console.log('Webhook event received:', event.type);
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            const saleId = paymentIntent.metadata.saleId;
            console.log('Payment succeeded for sale:', saleId);
            if (saleId) {
                const db = (0, firebaseAdmin_1.getDb)();
                // Confirm sale and deduct stock in transaction
                yield db.runTransaction((transaction) => __awaiter(void 0, void 0, void 0, function* () {
                    var _a, _b, _c, _d, _e, _f;
                    const saleRef = db.collection('sales').doc(saleId);
                    const saleDoc = yield transaction.get(saleRef);
                    if (!saleDoc.exists)
                        return;
                    const saleData = saleDoc.data();
                    // Idempotency check: Skip if already processed by this exact payment intent
                    const alreadyProcessed = (saleData === null || saleData === void 0 ? void 0 : saleData.stripePaymentIntentId) === paymentIntent.id && (saleData === null || saleData === void 0 ? void 0 : saleData.status) === 'completed';
                    if (alreadyProcessed) {
                        console.log(`✓ Webhook already processed for sale ${saleId} with payment intent ${paymentIntent.id}, skipping (idempotent)`);
                        return;
                    }
                    const isNew = (saleData === null || saleData === void 0 ? void 0 : saleData.status) === 'PENDING';
                    const isMissingData = (saleData === null || saleData === void 0 ? void 0 : saleData.status) === 'completed' && !(saleData === null || saleData === void 0 ? void 0 : saleData.orderNumber);
                    if (isNew || isMissingData) {
                        // Generate or use existing order number
                        const now = new Date();
                        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
                        const orderNumber = saleData.orderNumber || `WEB-${dateStr}-${saleId.slice(-5).toUpperCase()}`;
                        console.log(`Using orderNumber: ${orderNumber} for sale ${saleId}`);
                        // Deduct stock for each item
                        for (const item of saleData.items) {
                            const productRef = db.collection('products').doc(item.productId);
                            const productDoc = yield transaction.get(productRef);
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
                            name: ((_a = paymentIntent.shipping) === null || _a === void 0 ? void 0 : _a.name) || paymentIntent.receipt_email || ((_b = saleData.customer) === null || _b === void 0 ? void 0 : _b.name) || (((_c = saleData.customer) === null || _c === void 0 ? void 0 : _c.firstName) ? `${saleData.customer.firstName} ${saleData.customer.lastName}` : '') || 'Customer',
                            email: paymentIntent.receipt_email || ((_d = saleData.customer) === null || _d === void 0 ? void 0 : _d.email) || '',
                            shipping: ((_e = paymentIntent.shipping) === null || _e === void 0 ? void 0 : _e.address) ? {
                                line1: paymentIntent.shipping.address.line1,
                                line2: paymentIntent.shipping.address.line2,
                                city: paymentIntent.shipping.address.city,
                                state: paymentIntent.shipping.address.state,
                                postal_code: paymentIntent.shipping.address.postal_code,
                                country: paymentIntent.shipping.address.country,
                            } : (((_f = saleData.customer) === null || _f === void 0 ? void 0 : _f.address) ? {
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
                            customer: Object.assign(Object.assign(Object.assign({}, saleData.customer), stripeCustomer), { stripe_info: stripeCustomer // Keep full stripe info for reference
                             }),
                            completed_at: admin.firestore.FieldValue.serverTimestamp(),
                            updated_at: admin.firestore.FieldValue.serverTimestamp()
                        };
                        transaction.update(saleRef, updatedSaleData);
                        console.log(`✅ Payment confirmed and stock updated for sale ${saleId}, order ${orderNumber}`);
                        // Send confirmation email asynchronously after transaction
                        const finalOrderData = Object.assign(Object.assign(Object.assign({}, saleData), updatedSaleData), { 
                            // Ensure numeric values for template if they were Firestore FieldValues
                            items_total: saleData.items_total, shipping_cost: saleData.shipping_cost, total_amount: saleData.total_amount });
                        // Execute email sending in the background to not delay webhook response
                        setTimeout(() => {
                            (0, mailService_1.sendOrderConfirmationEmail)(finalOrderData).catch(e => console.error('Error in background email sending:', e));
                        }, 1);
                    }
                    else {
                        console.log('Sale not found or already processed:', saleId);
                    }
                }));
            }
        }
        else if (event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object;
            const saleId = paymentIntent.metadata.saleId;
            console.log('Payment failed for sale:', saleId);
            if (saleId) {
                const db = (0, firebaseAdmin_1.getDb)();
                yield db.collection('sales').doc(saleId).update({
                    status: 'failed',
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        res.json({ received: true });
    }
    catch (err) {
        console.error('========== WEBHOOK ERROR ==========');
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Error type:', err.type);
        console.error('rawBody preview:', (_b = req.rawBody) === null || _b === void 0 ? void 0 : _b.substring(0, 200));
        console.error('Signature:', req.headers['stripe-signature']);
        console.error('Secret configured?:', !!env_1.default.STRIPE_WEBHOOK_SECRET);
        console.error('Secret preview:', ((_c = env_1.default.STRIPE_WEBHOOK_SECRET) === null || _c === void 0 ? void 0 : _c.substring(0, 15)) + '...');
        console.error('========== WEBHOOK ERROR END ==========');
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});
exports.stripeWebhookHandler = stripeWebhookHandler;
