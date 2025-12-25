"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firebaseController_1 = require("../controllers/firebaseController");
const router = (0, express_1.Router)();
router.post('/sale', firebaseController_1.createSale);
router.post('/reserve', firebaseController_1.reserveStock);
router.post('/release', firebaseController_1.releaseStock);
exports.default = router;
