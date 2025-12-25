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
exports.getSales = exports.createSale = exports.releaseStock = exports.reserveStock = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.listProducts = exports.getAllProducts = void 0;
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const admin = __importStar(require("firebase-admin"));
const normalizeProduct = (data, id) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    return Object.assign(Object.assign({}, data), { id, 
        // Dual mapping for Shop and Admin compatibility
        availableOnline: (_b = (_a = data.is_online) !== null && _a !== void 0 ? _a : data.availableOnline) !== null && _b !== void 0 ? _b : false, is_online: (_d = (_c = data.is_online) !== null && _c !== void 0 ? _c : data.availableOnline) !== null && _d !== void 0 ? _d : false, coverImage: (_f = (_e = data.cover_image) !== null && _e !== void 0 ? _e : data.coverImage) !== null && _f !== void 0 ? _f : null, cover_image: (_h = (_g = data.cover_image) !== null && _g !== void 0 ? _g : data.coverImage) !== null && _h !== void 0 ? _h : null, condition: (_k = (_j = data.condition) !== null && _j !== void 0 ? _j : data.status) !== null && _k !== void 0 ? _k : 'VG', status: (_m = (_l = data.condition) !== null && _l !== void 0 ? _l : data.status) !== null && _m !== void 0 ? _m : 'VG' });
};
const getAllProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = (0, firebaseAdmin_1.getDb)();
        const snapshot = yield db.collection('products').get();
        const products = snapshot.docs.map(doc => normalizeProduct(doc.data(), doc.id));
        res.json(products);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getAllProducts = getAllProducts;
const listProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = (0, firebaseAdmin_1.getDb)();
        const productsSnapshot = yield db.collection('products')
            .where('is_online', '==', true)
            .get();
        const products = productsSnapshot.docs.map(doc => normalizeProduct(doc.data(), doc.id));
        res.json(products);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.listProducts = listProducts;
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const db = (0, firebaseAdmin_1.getDb)();
        const data = req.body;
        // Canonicalize names for Firestore
        const flattedData = Object.assign(Object.assign({}, data), { is_online: (_b = (_a = data.is_online) !== null && _a !== void 0 ? _a : data.availableOnline) !== null && _b !== void 0 ? _b : false, cover_image: (_d = (_c = data.cover_image) !== null && _c !== void 0 ? _c : data.coverImage) !== null && _d !== void 0 ? _d : null, condition: (_f = (_e = data.condition) !== null && _e !== void 0 ? _e : data.status) !== null && _f !== void 0 ? _f : 'VG', updated_at: admin.firestore.FieldValue.serverTimestamp() });
        const docRef = yield db.collection('products').add(flattedData);
        res.status(201).json(normalizeProduct(flattedData, docRef.id));
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.createProduct = createProduct;
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const db = (0, firebaseAdmin_1.getDb)();
        const data = req.body;
        const updateData = Object.assign(Object.assign({}, data), { updated_at: admin.firestore.FieldValue.serverTimestamp() });
        if (data.availableOnline !== undefined)
            updateData.is_online = data.availableOnline;
        if (data.coverImage !== undefined)
            updateData.cover_image = data.coverImage;
        if (data.status !== undefined)
            updateData.condition = data.status;
        yield db.collection('products').doc(id).update(updateData);
        res.json(Object.assign({ id }, updateData));
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updateProduct = updateProduct;
const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const db = (0, firebaseAdmin_1.getDb)();
        // Dependency check: simple check if items array contains this productId
        // Note: 'array-contains-any' needs specific structure. 
        // For simplicity, we'll just check if there are documents where items contains an object with this productId.
        // Firestore doesn't support 'array-contains' on object fields well without indexing.
        // Alternative: get all sales and filter, or just allow deletion and warn.
        // For now, let's assume if we can find any sale with this product.
        const salesWithProduct = yield db.collection('sales')
            .where('items', 'array-contains-any', [{ productId: id }])
            .limit(1)
            .get();
        if (!salesWithProduct.empty) {
            return res.status(400).json({ error: 'Cannot delete product with existing sales.' });
        }
        yield db.collection('products').doc(id).delete();
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.deleteProduct = deleteProduct;
const reserveStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { productId, qty } = req.body;
    try {
        const db = (0, firebaseAdmin_1.getDb)();
        yield db.runTransaction((transaction) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const productRef = db.collection('products').doc(productId);
            const productDoc = yield transaction.get(productRef);
            if (!productDoc.exists) {
                throw new Error('Product not found');
            }
            const currentStock = ((_a = productDoc.data()) === null || _a === void 0 ? void 0 : _a.stock) || 0;
            if (currentStock < qty) {
                throw new Error('Insufficient stock');
            }
            transaction.update(productRef, {
                stock: admin.firestore.FieldValue.increment(-qty),
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
        }));
        res.json({ success: true, message: 'Stock reserved successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.reserveStock = reserveStock;
const releaseStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { productId, qty } = req.body;
    try {
        const db = (0, firebaseAdmin_1.getDb)();
        const productRef = db.collection('products').doc(productId);
        yield productRef.update({
            stock: admin.firestore.FieldValue.increment(qty),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({ success: true, message: 'Stock released successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.releaseStock = releaseStock;
const createSale = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { items, channel, totalAmount, paymentMethod, customerName, customerEmail } = req.body;
    // items: [{ productId, qty, priceAtSale, album }]
    try {
        const db = (0, firebaseAdmin_1.getDb)();
        const saleId = yield db.runTransaction((transaction) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            // 1. Validate all items have enough stock
            for (const item of items) {
                const productRef = db.collection('products').doc(item.productId);
                const productDoc = yield transaction.get(productRef);
                if (!productDoc.exists) {
                    throw new Error(`Product ${item.productId} not found`);
                }
                const currentStock = ((_a = productDoc.data()) === null || _a === void 0 ? void 0 : _a.stock) || 0;
                if (currentStock < item.qty) {
                    throw new Error(`Insufficient stock for product ${item.album || item.productId}`);
                }
            }
            // 2. Decrement stock and Prepare Sale document
            for (const item of items) {
                const productRef = db.collection('products').doc(item.productId);
                transaction.update(productRef, {
                    stock: admin.firestore.FieldValue.increment(-item.qty),
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                });
                // Record movement
                const movementRef = db.collection('inventory_movements').doc();
                transaction.set(movementRef, {
                    product_id: item.productId,
                    album: item.album || 'Unknown',
                    change: -item.qty,
                    reason: 'sale',
                    channel: channel || 'online',
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            const saleRef = db.collection('sales').doc();
            transaction.set(saleRef, {
                items,
                channel: channel || 'online',
                total_amount: totalAmount,
                paymentMethod: paymentMethod || 'STRIPE',
                customerName: customerName || null,
                customerEmail: customerEmail || null,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                status: 'completed'
            });
            return saleRef.id;
        }));
        res.json({ success: true, saleId });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.createSale = createSale;
const getSales = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = (0, firebaseAdmin_1.getDb)();
        const snapshot = yield db.collection('sales').orderBy('timestamp', 'desc').get();
        const sales = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        res.json(sales);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getSales = getSales;
