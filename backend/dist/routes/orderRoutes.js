"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orderController_1 = require("../controllers/orderController");
const router = (0, express_1.Router)();
// GET /api/orders/:userId -> fetch Firestore purchase history for userId
router.get('/orders/:userId', orderController_1.getUserOrders);
exports.default = router;
