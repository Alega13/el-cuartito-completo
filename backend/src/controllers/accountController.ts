import { Request, Response } from 'express';
import { getDb } from '../config/firebaseAdmin';
import { sendWelcomeEmail } from '../services/mailService';

/**
 * Create/update the customer's profile in users/{uid}.
 * Route: POST /api/account/:userId/profile  body: { newsletter?: boolean }
 *
 * newsletter === true  -> also subscribes the email to Drops & Newsletter (subscribers/{email})
 * newsletter === false -> only records the choice (never unsubscribes an existing subscriber)
 */
export const upsertProfile = async (req: Request, res: Response) => {
    try {
        const user = req.user!;
        const { newsletter } = req.body || {};
        const db = getDb();
        const email = (user.email || '').trim().toLowerCase();
        const now = new Date().toISOString();

        const userRef = db.collection('users').doc(user.uid);
        const existing = await userRef.get();

        const profile: any = {
            email,
            displayName: user.name || null,
            lastLoginAt: now
        };
        if (!existing.exists || !existing.data()?.createdAt) profile.createdAt = now;
        if (typeof newsletter === 'boolean') profile.newsletter_opt_in = newsletter;

        await userRef.set(profile, { merge: true });

        if (newsletter === true && email) {
            const subRef = db.collection('subscribers').doc(email);
            const sub = await subRef.get();
            if (!(sub.exists && sub.data()?.active === true)) {
                await subRef.set({ email, active: true, subscribedAt: now, source: 'account' }, { merge: true });
                sendWelcomeEmail(email).catch(err => console.error('Error sending welcome email:', err));
            }
        }

        return res.json({ success: true });
    } catch (error: any) {
        console.error('Error upserting profile:', error);
        return res.status(500).json({ error: 'Failed to save profile', message: error.message });
    }
};
