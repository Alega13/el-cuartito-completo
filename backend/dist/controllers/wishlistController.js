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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWishlist = exports.removeFromWishlist = exports.addToWishlist = void 0;
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const admin = __importStar(require("firebase-admin"));
/**
 * Add product to user wishlist
 * POST /api/wishlist/:userId
 */
const addToWishlist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { productId, recordId } = req.body;
        const targetId = productId || recordId;
        if (!userId) {
            return res.status(400).json({ error: 'userId parameter is required' });
        }
        if (!targetId) {
            return res.status(400).json({ error: 'productId or recordId is required in body' });
        }
        const db = (0, firebaseAdmin_1.getDb)();
        const userRef = db.collection('users').doc(userId);
        yield userRef.set({
            saved_items: admin.firestore.FieldValue.arrayUnion(targetId),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return res.status(200).json({
            success: true,
            message: `Product ${targetId} added to wishlist`,
            userId,
            productId: targetId
        });
    }
    catch (error) {
        console.error('Error adding to wishlist:', error);
        return res.status(500).json({
            error: 'Failed to add item to wishlist',
            message: error.message
        });
    }
});
exports.addToWishlist = addToWishlist;
/**
 * Remove product from user wishlist
 * DELETE /api/wishlist/:userId/:productId
 */
const removeFromWishlist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, productId } = req.params;
        if (!userId || !productId) {
            return res.status(400).json({ error: 'userId and productId parameters are required' });
        }
        const db = (0, firebaseAdmin_1.getDb)();
        const userRef = db.collection('users').doc(userId);
        yield userRef.update({
            saved_items: admin.firestore.FieldValue.arrayRemove(productId),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        return res.status(200).json({
            success: true,
            message: `Product ${productId} removed from wishlist`,
            userId,
            productId
        });
    }
    catch (error) {
        console.error('Error removing from wishlist:', error);
        return res.status(500).json({
            error: 'Failed to remove item from wishlist',
            message: error.message
        });
    }
});
exports.removeFromWishlist = removeFromWishlist;
/**
 * Get user wishlist items
 * GET /api/wishlist/:userId
 */
const getWishlist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ error: 'userId parameter is required' });
        }
        const db = (0, firebaseAdmin_1.getDb)();
        const userDoc = yield db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(200).json({
                success: true,
                userId,
                count: 0,
                items: []
            });
        }
        const userData = userDoc.data() || {};
        const savedIds = userData.saved_items || [];
        if (savedIds.length === 0) {
            return res.status(200).json({
                success: true,
                userId,
                count: 0,
                items: []
            });
        }
        // Fetch products for all savedIds
        const productPromises = savedIds.map(id => db.collection('products').doc(id).get());
        const productSnapshots = yield Promise.all(productPromises);
        const items = productSnapshots
            .filter(snap => snap.exists)
            .map(snap => (Object.assign({ id: snap.id }, snap.data())));
        return res.status(200).json({
            success: true,
            userId,
            count: items.length,
            items
        });
    }
    catch (error) {
        console.error('Error fetching wishlist:', error);
        return res.status(500).json({
            error: 'Failed to fetch wishlist',
            message: error.message
        });
    }
});
exports.getWishlist = getWishlist;
