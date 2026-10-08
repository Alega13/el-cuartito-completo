import { Router } from 'express';
import { addToWishlist, removeFromWishlist, getWishlist } from '../controllers/wishlistController';
import { requireUser } from '../middlewares/auth';

const router = Router();

// GET /api/wishlist/:userId
router.get('/wishlist/:userId', requireUser, getWishlist);

// POST /api/wishlist/:userId
router.post('/wishlist/:userId', requireUser, addToWishlist);

// DELETE /api/wishlist/:userId/:productId
router.delete('/wishlist/:userId/:productId', requireUser, removeFromWishlist);

export default router;
