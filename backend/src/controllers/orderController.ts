import { Request, Response } from 'express';
import { getDb } from '../config/firebaseAdmin';

/**
 * Get user purchase history / orders by userId from Firestore
 * Route: GET /api/orders/:userId
 */
export const getUserOrders = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                error: 'userId parameter is required'
            });
        }

        const db = getDb();
        const userOrders: any[] = [];

        // 1. Query 'sales' collection for matching userId
        const salesRef = db.collection('sales');
        
        // Primary query by userId
        const snapshotByUserId = await salesRef.where('userId', '==', userId).get();
        snapshotByUserId.forEach(doc => {
            userOrders.push({
                id: doc.id,
                sourceCollection: 'sales',
                ...doc.data()
            });
        });

        // Query by customer.userId
        const snapshotByCustomerUserId = await salesRef.where('customer.userId', '==', userId).get();
        snapshotByCustomerUserId.forEach(doc => {
            if (!userOrders.some(o => o.id === doc.id)) {
                userOrders.push({
                    id: doc.id,
                    sourceCollection: 'sales',
                    ...doc.data()
                });
            }
        });

        // Query by uid field
        const snapshotByUid = await salesRef.where('uid', '==', userId).get();
        snapshotByUid.forEach(doc => {
            if (!userOrders.some(o => o.id === doc.id)) {
                userOrders.push({
                    id: doc.id,
                    sourceCollection: 'sales',
                    ...doc.data()
                });
            }
        });

        // 2. Query 'orders' collection if present
        try {
            const ordersRef = db.collection('orders');
            const ordersSnapshot = await ordersRef.where('userId', '==', userId).get();
            ordersSnapshot.forEach(doc => {
                if (!userOrders.some(o => o.id === doc.id)) {
                    userOrders.push({
                        id: doc.id,
                        sourceCollection: 'orders',
                        ...doc.data()
                    });
                }
            });
        } catch (err) {
            // Silence if orders collection does not exist
        }

        // Normalize Firestore Timestamp fields for JSON response
        const formattedOrders = userOrders.map(order => {
            const data = { ...order };
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
    } catch (error: any) {
        console.error('Error fetching user orders from Firestore:', error);
        return res.status(500).json({
            error: 'Failed to retrieve purchase history',
            message: error.message
        });
    }
};
