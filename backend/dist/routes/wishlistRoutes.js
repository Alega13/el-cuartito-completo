"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wishlistController_1 = require("../controllers/wishlistController");
const router = (0, express_1.Router)();
// GET /api/wishlist/:userId
router.get('/wishlist/:userId', wishlistController_1.getWishlist);
// POST /api/wishlist/:userId
router.post('/wishlist/:userId', wishlistController_1.addToWishlist);
// DELETE /api/wishlist/:userId/:productId
router.delete('/wishlist/:userId/:productId', wishlistController_1.removeFromWishlist);
exports.default = router;
