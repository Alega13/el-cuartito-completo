"use strict";
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
exports.getUserOrders = void 0;
const firebaseAdmin_1 = require("../config/firebaseAdmin");
/**
 * Get user purchase history / orders by userId from Firestore
 * Route: GET /api/orders/:userId
 */
const getUserOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({
                error: 'userId parameter is required'
            });
        }
        const db = (0, firebaseAdmin_1.getDb)();
        const userOrders = [];
        // 1. Query 'sales' collection for matching userId
        const salesRef = db.collection('sales');
        // Primary query by userId
        const snapshotByUserId = yield salesRef.where('userId', '==', userId).get();
        snapshotByUserId.forEach(doc => {
            userOrders.push(Object.assign({ id: doc.id, sourceCollection: 'sales' }, doc.data()));
        });
        // Query by customer.userId
        const snapshotByCustomerUserId = yield salesRef.where('customer.userId', '==', userId).get();
        snapshotByCustomerUserId.forEach(doc => {
            if (!userOrders.some(o => o.id === doc.id)) {
                userOrders.push(Object.assign({ id: doc.id, sourceCollection: 'sales' }, doc.data()));
            }
        });
        // Query by uid field
        const snapshotByUid = yield salesRef.where('uid', '==', userId).get();
        snapshotByUid.forEach(doc => {
            if (!userOrders.some(o => o.id === doc.id)) {
                userOrders.push(Object.assign({ id: doc.id, sourceCollection: 'sales' }, doc.data()));
            }
        });
        // 2. Query 'orders' collection if present
        try {
            const ordersRef = db.collection('orders');
            const ordersSnapshot = yield ordersRef.where('userId', '==', userId).get();
            ordersSnapshot.forEach(doc => {
                if (!userOrders.some(o => o.id === doc.id)) {
                    userOrders.push(Object.assign({ id: doc.id, sourceCollection: 'orders' }, doc.data()));
                }
            });
        }
        catch (err) {
            // Silence if orders collection does not exist
        }
        // Normalize Firestore Timestamp fields for JSON response
        const formattedOrders = userOrders.map(order => {
            const data = Object.assign({}, order);
            if (data.created_at && typeof data.created_at.toDate === 'function') {
                data.created_at = data.created_at.toDate().toISOString();
            }
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                data.createdAt = data.createdAt.toDate().toISOString();
            }
            if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                data.timestamp = data.timestamp.toDate().toISOString();
            }
            return data;
        });
        return res.status(200).json({
            success: true,
            userId,
            count: formattedOrders.length,
            orders: formattedOrders
        });
    }
    catch (error) {
        console.error('Error fetching user orders from Firestore:', error);
        return res.status(500).json({
            error: 'Failed to retrieve purchase history',
            message: error.message
        });
    }
});
exports.getUserOrders = getUserOrders;
