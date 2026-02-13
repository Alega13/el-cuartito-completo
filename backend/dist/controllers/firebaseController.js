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
exports.markAsPickedUp = exports.notifyReadyForPickup = exports.markAsDispatched = exports.notifyShipped = exports.updateTrackingNumber = exports.notifyPreparing = exports.updateSaleValue = exports.updateFulfillmentStatus = exports.confirmLocalPayment = exports.getSaleById = exports.getSales = exports.createSale = exports.releaseStock = exports.reserveStock = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.listProducts = exports.getAllProducts = void 0;
const firebaseAdmin_1 = require("../config/firebaseAdmin");
const admin = __importStar(require("firebase-admin"));
const vatCalculator_1 = require("../services/vatCalculator");
const invoiceService_1 = require("../services/invoiceService");
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
        // Dependency check removed to allow deletion. 
        // Sales data is denormalized (album/artist stored in sale), so deleting product won't break history display.
        // However, calculating historical profit for old sales without costAtSale might be less accurate (fallback to 0).
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
        // Normalize items - accept both recordId/productId and quantity/qty
        const normalizedItems = items.map((item) => {
            const normalized = {
                productId: item.productId || item.recordId,
                qty: item.qty || item.quantity || 1,
            };
            if (item.priceAtSale !== undefined)
                normalized.priceAtSale = item.priceAtSale;
            if (item.price !== undefined)
                normalized.priceAtSale = item.price;
            if (item.album !== undefined)
                normalized.album = item.album;
            return normalized;
        });
        const saleId = yield db.runTransaction((transaction) => __awaiter(void 0, void 0, void 0, function* () {
            let calculatedTotal = 0;
            // 1. Validate all items have enough stock AND calculate total
            for (const item of normalizedItems) {
                if (!item.productId) {
                    throw new Error('Missing productId/recordId in sale item');
                }
                const productRef = db.collection('products').doc(item.productId);
                const productDoc = yield transaction.get(productRef);
                if (!productDoc.exists) {
                    throw new Error(`Product ${item.productId} not found`);
                }
                const productData = productDoc.data();
                const currentStock = (productData === null || productData === void 0 ? void 0 : productData.stock) || 0;
                if (currentStock < item.qty) {
                    throw new Error(`Insufficient stock for product ${item.album || item.productId}`);
                }
                // Use price from request if available (e.g. override), otherwise use product price
                const price = item.priceAtSale || productData.price || 0;
                item.priceAtSale = price; // Store the price used in the item
                item.costAtSale = productData.cost || 0; // Store cost for profit calculation
                item.productCondition = productData.product_condition || 'Second-hand'; // Store for VAT calculation
                item.album = productData.album || item.album || 'Unknown'; // Ensure album name is stored
                calculatedTotal += price * item.qty;
            }
            // 2. Decrement stock and Prepare Sale document
            for (const item of normalizedItems) {
                const productRef = db.collection('products').doc(item.productId);
                transaction.update(productRef, {
                    stock: admin.firestore.FieldValue.increment(-item.qty),
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                });
                // Record movement
                const movementRef = db.collection('inventory_movements').doc();
                transaction.set(movementRef, {
                    product_id: item.productId,
                    album: item.album,
                    change: -item.qty,
                    reason: 'sale',
                    channel: channel || 'local',
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            // Calculate VAT liability using Denmark rules (Brugtmoms for used goods)
            const calculatedVatLiability = (0, vatCalculator_1.calculateSaleVATLiability)(normalizedItems);
            const saleRef = db.collection('sales').doc();
            transaction.set(saleRef, {
                items: normalizedItems,
                channel: channel || 'local',
                total_amount: totalAmount || calculatedTotal,
                calculated_vat_liability: calculatedVatLiability,
                paymentMethod: paymentMethod || 'CASH',
                customerName: customerName || null,
                customerEmail: customerEmail || null,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                status: 'completed'
            });
            return saleRef.id;
        }));
        res.json({ success: true, saleId });
        // Generate invoice in background (non-blocking)
        const finalTotal = totalAmount || normalizedItems.reduce((sum, i) => sum + (i.priceAtSale * i.qty), 0);
        setTimeout(() => {
            const invoiceData = (0, invoiceService_1.buildInvoiceFromPOSSale)(saleId, normalizedItems, channel, finalTotal, paymentMethod, customerName);
            (0, invoiceService_1.generateInvoice)(invoiceData).catch(e => console.error('⚠️ Invoice generation failed for POS sale:', e.message));
        }, 1);
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
const getSaleById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const db = (0, firebaseAdmin_1.getDb)();
        const doc = yield db.collection('sales').doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Sale not found' });
        }
        const data = doc.data();
        // Return only necessary fields for the success page (avoid leaking sensitive admin data if any)
        const publicData = {
            id: doc.id,
            orderNumber: data === null || data === void 0 ? void 0 : data.orderNumber,
            total_amount: data === null || data === void 0 ? void 0 : data.total_amount,
            items_total: data === null || data === void 0 ? void 0 : data.items_total,
            shipping_cost: data === null || data === void 0 ? void 0 : data.shipping_cost,
            status: data === null || data === void 0 ? void 0 : data.status,
            customer: (data === null || data === void 0 ? void 0 : data.customer) || null,
            items: (data === null || data === void 0 ? void 0 : data.items) || [],
            shipping_method: data === null || data === void 0 ? void 0 : data.shipping_method,
            date: data === null || data === void 0 ? void 0 : data.date
        };
        res.json(publicData);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getSaleById = getSaleById;
/**
 * Trigger confirmation flow manually for local development
 * (Since Stripe webhooks don't reach localhost)
 */
const mailService_1 = require("../services/mailService");
const confirmLocalPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { paymentIntentId } = req.body;
        console.log(`📡 [LOCAL CONFIRM] Received request for sale: ${id}`);
        const db = (0, firebaseAdmin_1.getDb)();
        const saleRef = db.collection('sales').doc(id);
        const saleDoc = yield saleRef.get();
        if (!saleDoc.exists) {
            console.error(`❌ [LOCAL CONFIRM] Sale not found: ${id}`);
            return res.status(404).json({ error: 'Sale not found' });
        }
        const saleData = saleDoc.data();
        console.log(`📡 [LOCAL CONFIRM] Sale details: Number=${saleData.orderNumber}, Status=${saleData.status}`);
        // Only process if not already completed
        if (saleData.status !== 'completed') {
            console.log(`📡 [LOCAL CONFIRM] Updating sale ${id} to completed and sending email...`);
            yield saleRef.update({
                status: 'completed',
                stripePaymentIntentId: paymentIntentId,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            // Trigger email
            yield (0, mailService_1.sendOrderConfirmationEmail)(Object.assign(Object.assign({}, saleData), { status: 'completed' }));
        }
        else {
            console.log(`📡 [LOCAL CONFIRM] Sale ${id} already completed.`);
            // SEND EMAIL ANYWAY FOR DEBUGGING if requested? Let's just do it to be sure.
            yield (0, mailService_1.sendOrderConfirmationEmail)(Object.assign(Object.assign({}, saleData), { status: 'completed' }));
        }
        res.json({ success: true, message: 'Local confirmation processed' });
    }
    catch (error) {
        console.error('❌ [LOCAL CONFIRM] Error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.confirmLocalPayment = confirmLocalPayment;
const updateFulfillmentStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const db = (0, firebaseAdmin_1.getDb)();
        if (!['pending', 'preparing', 'shipped', 'delivered'].includes(status)) {
            return res.status(400).json({ error: 'Invalid fulfillment status' });
        }
        yield db.collection('sales').doc(id).update({
            fulfillment_status: status,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({ success: true, id, fulfillment_status: status });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updateFulfillmentStatus = updateFulfillmentStatus;
const updateSaleValue = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { netReceived } = req.body; // The actual amount received after fees
        const db = (0, firebaseAdmin_1.getDb)();
        const saleRef = db.collection('sales').doc(id);
        const saleDoc = yield saleRef.get();
        if (!saleDoc.exists) {
            return res.status(404).json({ error: 'Sale not found' });
        }
        const saleData = saleDoc.data();
        const originalTotal = saleData.originalTotal || saleData.total || 0;
        const newNetReceived = parseFloat(netReceived);
        if (isNaN(newNetReceived)) {
            return res.status(400).json({ error: 'Invalid netReceived amount' });
        }
        const totalFees = originalTotal - newNetReceived;
        yield saleRef.update({
            total: newNetReceived, // Update with the actual received amount
            totalFees: totalFees,
            status: 'completed', // Move from pending_review to completed
            needsReview: false,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({
            success: true,
            id,
            newTotal: newNetReceived,
            fees: totalFees
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updateSaleValue = updateSaleValue;
const mailService_2 = require("../services/mailService");
const notifyPreparing = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const db = (0, firebaseAdmin_1.getDb)();
        const saleRef = db.collection('sales').doc(id);
        const saleDoc = yield saleRef.get();
        if (!saleDoc.exists) {
            return res.status(404).json({ error: 'Sale not found' });
        }
        const saleData = saleDoc.data();
        // Update status in Firestore
        yield saleRef.update({
            fulfillment_status: 'preparing',
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            history: admin.firestore.FieldValue.arrayUnion({
                status: 'preparing',
                timestamp: new Date().toISOString(), // Use string for easier frontend parsing or Timestamp if consistent
                note: 'Order is being prepared. Notification sent.'
            })
        });
        // Send email
        const mailResult = yield (0, mailService_2.sendDiscogsOrderPreparingEmail)(saleData);
        res.json({ success: true, mailResult });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.notifyPreparing = notifyPreparing;
const updateTrackingNumber = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { trackingNumber } = req.body;
        const db = (0, firebaseAdmin_1.getDb)();
        if (!trackingNumber) {
            return res.status(400).json({ error: 'Tracking number is required' });
        }
        yield db.collection('sales').doc(id).update({
            tracking_number: trackingNumber,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({ success: true, trackingNumber });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updateTrackingNumber = updateTrackingNumber;
const notifyShipped = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { trackingNumber, trackingLink } = req.body;
        const db = (0, firebaseAdmin_1.getDb)();
        const saleRef = db.collection('sales').doc(id);
        const saleDoc = yield saleRef.get();
        if (!saleDoc.exists) {
            return res.status(404).json({ error: 'Sale not found' });
        }
        const saleData = saleDoc.data();
        const finalTrackingNumber = trackingNumber || saleData.tracking_number;
        if (!finalTrackingNumber) {
            return res.status(400).json({ error: 'Tracking number is required to notify shipment' });
        }
        // Prepare update data
        const updateData = {
            fulfillment_status: 'in_transit', // Step 2: In Transit (Tracking sent)
            tracking_number: finalTrackingNumber,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            history: admin.firestore.FieldValue.arrayUnion({
                status: 'in_transit',
                timestamp: new Date().toISOString(),
                note: `Order is in transit. Tracking: ${finalTrackingNumber}`
            })
        };
        if (trackingLink) {
            updateData.tracking_link = trackingLink;
            // Update local object for email content
            saleData.tracking_link = trackingLink;
        }
        // Update status in Firestore
        yield saleRef.update(updateData);
        // Send email
        const mailResult = yield (0, mailService_2.sendDiscogsShippingNotificationEmail)(saleData, finalTrackingNumber);
        res.json({ success: true, mailResult });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.notifyShipped = notifyShipped;
const markAsDispatched = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const db = (0, firebaseAdmin_1.getDb)();
        yield db.collection('sales').doc(id).update({
            fulfillment_status: 'shipped', // Step 3: Dispatched (Closed)
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            history: admin.firestore.FieldValue.arrayUnion({
                status: 'shipped',
                timestamp: new Date().toISOString(),
                note: 'Order dispatched (Archived).'
            })
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.markAsDispatched = markAsDispatched;
const notifyReadyForPickup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const db = (0, firebaseAdmin_1.getDb)();
        const saleRef = db.collection('sales').doc(id);
        const saleDoc = yield saleRef.get();
        if (!saleDoc.exists)
            return res.status(404).json({ error: 'Sale not found' });
        const saleData = saleDoc.data();
        yield saleRef.update({
            fulfillment_status: 'ready_for_pickup',
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            history: admin.firestore.FieldValue.arrayUnion({
                status: 'ready_for_pickup',
                timestamp: new Date().toISOString(),
                note: 'Ready for pickup. Notification sent.'
            })
        });
        const mailResult = yield (0, mailService_2.sendPickupReadyEmail)(saleData);
        res.json({ success: true, mailResult });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.notifyReadyForPickup = notifyReadyForPickup;
const markAsPickedUp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const db = (0, firebaseAdmin_1.getDb)();
        yield db.collection('sales').doc(id).update({
            fulfillment_status: 'picked_up', // Closed
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            history: admin.firestore.FieldValue.arrayUnion({
                status: 'picked_up',
                timestamp: new Date().toISOString(),
                note: 'Order picked up by customer (Archived).'
            })
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.markAsPickedUp = markAsPickedUp;
