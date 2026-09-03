import { Router } from 'express';
import { addToWishlist, removeFromWishlist, getWishlist } from '../controllers/wishlistController';

const router = Router();

// GET /api/wishlist/:userId
router.get('/wishlist/:userId', getWishlist);

// POST /api/wishlist/:userId
router.post('/wishlist/:userId', addToWishlist);

// DELETE /api/wishlist/:userId/:productId
router.delete('/wishlist/:userId/:productId', removeFromWishlist);

export default router;
