import { Request, Response } from 'express';
import { getDb } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin';

/**
 * Add product to user wishlist
 * POST /api/wishlist/:userId
 */
export const addToWishlist = async (req: Request, res: Response) => {
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

        const db = getDb();
        const userRef = db.collection('users').doc(userId);

        await userRef.set({
            saved_items: admin.firestore.FieldValue.arrayUnion(targetId),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return res.status(200).json({
            success: true,
            message: `Product ${targetId} added to wishlist`,
            userId,
            productId: targetId
        });
    } catch (error: any) {
        console.error('Error adding to wishlist:', error);
        return res.status(500).json({
            error: 'Failed to add item to wishlist',
            message: error.message
        });
    }
};

/**
 * Remove product from user wishlist
 * DELETE /api/wishlist/:userId/:productId
 */
export const removeFromWishlist = async (req: Request, res: Response) => {
    try {
        const { userId, productId } = req.params;

        if (!userId || !productId) {
            return res.status(400).json({ error: 'userId and productId parameters are required' });
        }

        const db = getDb();
        const userRef = db.collection('users').doc(userId);

        await userRef.update({
            saved_items: admin.firestore.FieldValue.arrayRemove(productId),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.status(200).json({
            success: true,
            message: `Product ${productId} removed from wishlist`,
            userId,
            productId
        });
    } catch (error: any) {
        console.error('Error removing from wishlist:', error);
        return res.status(500).json({
            error: 'Failed to remove item from wishlist',
            message: error.message
        });
    }
};

/**
 * Get user wishlist items
 * GET /api/wishlist/:userId
 */
export const getWishlist = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: 'userId parameter is required' });
        }

        const db = getDb();
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return res.status(200).json({
                success: true,
                userId,
                count: 0,
                items: []
            });
        }

        const userData = userDoc.data() || {};
        const savedIds: string[] = userData.saved_items || [];

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
        const productSnapshots = await Promise.all(productPromises);

        const items = productSnapshots
            .filter(snap => snap.exists)
            .map(snap => ({
                id: snap.id,
                ...snap.data()
            }));

        return res.status(200).json({
            success: true,
            userId,
            count: items.length,
            items
        });
    } catch (error: any) {
        console.error('Error fetching wishlist:', error);
        return res.status(500).json({
            error: 'Failed to fetch wishlist',
            message: error.message
        });
    }
};
