import { Router } from 'express';
import { getUserOrders } from '../controllers/orderController';

const router = Router();

// GET /api/orders/:userId -> fetch Firestore purchase history for userId
router.get('/orders/:userId', getUserOrders);

export default router;
