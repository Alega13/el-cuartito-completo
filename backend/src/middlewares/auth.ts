import { Request, Response, NextFunction } from 'express';
import admin, { getDb } from '../config/firebaseAdmin';

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: admin.auth.DecodedIdToken;
        }
    }
}

/**
 * Requires a valid Firebase ID token from a shop customer.
 * If the route has a :userId param, it must match the token's uid.
 */
export const requireUser = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    try {
        getDb();
        const decodedToken = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
        if (req.params.userId && req.params.userId !== decodedToken.uid) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Error verifying Firebase token:', error);
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        // Ensure Firebase is initialized before using auth
        getDb();
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Error verifying Firebase token:', error);
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

