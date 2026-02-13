"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firebaseController_1 = require("../controllers/firebaseController");
const router = (0, express_1.Router)();
router.get('/products', firebaseController_1.listProducts);
exports.default = router;
