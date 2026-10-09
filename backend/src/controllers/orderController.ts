import { Request, Response } from 'express';
import { getDb } from '../config/firebaseAdmin';

// Checkouts that were never paid are not shown to customers
const HIDDEN_STATUSES = ['pending', 'failed'];

const toIso = (v: any) => (v && typeof v.toDate === 'function') ? v.toDate().toISOString() : (v || null);

/**
 * Get the logged-in customer's purchase history.
 * Route: GET /api/orders/:userId (requireUser: token uid must match :userId)
 *
 * Orders don't store a uid, so they are matched by the account's email —
 * only when that email is verified, so nobody can see someone else's orders.
 */
export const getUserOrders = async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        const db = getDb();
        const salesRef = db.collection('sales');
        const docs = new Map<string, any>();

        const email = (user.email || '').trim();
        if (email && user.email_verified) {
            const variants = Array.from(new Set([email, email.toLowerCase()]));
            const snaps = await Promise.all([
                salesRef.where('customer.email', 'in', variants).get(),
                salesRef.where('customerEmail', 'in', variants).get()
            ]);
            snaps.forEach(snap => snap.forEach(doc => docs.set(doc.id, doc.data())));
        }

        const orders = Array.from(docs.entries())
            .filter(([, d]) => !HIDDEN_STATUSES.includes(String(d.status || '').toLowerCase()))
            .map(([id, d]) => ({
                id,
                orderNumber: d.orderNumber || null,
                date: d.date || null,
                created_at: toIso(d.created_at) || toIso(d.timestamp),
                status: d.status || null,
                fulfillment_status: d.fulfillment_status || null,
                tracking_number: d.tracking_number || d.shipment?.tracking_number || null,
                tracking_link: d.tracking_link || null,
                carrier: d.label_carrier || d.shipment?.carrier || null,
                is_pickup: d.shipping_method?.id === 'local_pickup',
                total_amount: d.total_amount ?? d.total ?? 0,
                items: (d.items || []).map((i: any) => ({
                    productId: i.productId || i.recordId || null,
                    album: i.album || i.title || null,
                    artist: i.artist || null,
                    cover_image: i.cover_image || null,
                    quantity: i.quantity || 1,
                    unitPrice: i.unitPrice ?? i.price ?? null
                }))
            }))
            .sort((a, b) => String(b.created_at || b.date).localeCompare(String(a.created_at || a.date)));

        return res.status(200).json({
            success: true,
            emailVerified: !!user.email_verified,
            count: orders.length,
            orders
        });
    } catch (error: any) {
        console.error('Error fetching user orders from Firestore:', error);
        return res.status(500).json({
            error: 'Failed to retrieve purchase history',
            message: error.message
        });
    }
};
