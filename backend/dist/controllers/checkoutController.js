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
const stripe = new stripe_1.default(env_1.default.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
const startCheckout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { items } = req.body; // { recordId, quantity }[]
        const db = (0, firebaseAdmin_1.getDb)();
        let total = 0;
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
            total += data.price * item.quantity;
            validatedItems.push({
                productId: item.recordId,
                quantity: item.quantity,
                unitPrice: data.price,
                album: data.album
            });
        }
        // Create Pending Sale in Firestore
        const saleRef = db.collection('sales').doc();
        yield saleRef.set({
            total_amount: total,
            channel: 'online',
            status: 'PENDING',
            items: validatedItems,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        // Create Stripe PaymentIntent
        const paymentIntent = yield stripe.paymentIntents.create({
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
    }
    catch (error) {
        console.error("Checkout error:", error);
        res.status(500).json({ error: error.message || "Checkout error" });
    }
});
exports.startCheckout = startCheckout;
const confirmCheckout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { saleId, paymentId } = req.body;
        const db = (0, firebaseAdmin_1.getDb)();
        // Transactional confirmation in Firestore
        yield db.runTransaction((transaction) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const saleRef = db.collection('sales').doc(saleId);
            const saleDoc = yield transaction.get(saleRef);
            if (!saleDoc.exists || ((_a = saleDoc.data()) === null || _a === void 0 ? void 0 : _a.status) !== 'PENDING') {
                throw new Error("Invalid or expired sale");
            }
            const saleData = saleDoc.data();
            // Re-validate and deduct stock
            for (const item of saleData.items) {
                const productRef = db.collection('products').doc(item.productId);
                const productDoc = yield transaction.get(productRef);
                if (!productDoc.exists || productDoc.data().stock < item.quantity) {
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
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            transaction.update(saleRef, {
                status: 'completed',
                paymentId: paymentId || 'MOCK_PAYMENT',
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
        }));
        res.json({ success: true, saleId, status: 'completed' });
    }
    catch (error) {
        console.error("Confirmation error:", error);
        res.status(400).json({ error: error.message || "Confirmation failed" });
    }
});
exports.confirmCheckout = confirmCheckout;
