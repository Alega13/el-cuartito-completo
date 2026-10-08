import { Router } from 'express';
import { getUserOrders } from '../controllers/orderController';
import { upsertProfile } from '../controllers/accountController';
import { requireUser } from '../middlewares/auth';

const router = Router();

// GET /api/orders/:userId -> purchase history of the logged-in customer (matched by verified email)
router.get('/orders/:userId', requireUser, getUserOrders);

// POST /api/account/:userId/profile -> create/update users/{uid}, optional newsletter opt-in
router.post('/account/:userId/profile', requireUser, upsertProfile);

export default router;
