import { Router, Request, Response } from 'express';
import { getDb } from '../config/firebaseAdmin';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
    try {
        // Test database connection
        const db = getDb();
        await db.collection('products').limit(1).get();

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error: any) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;
