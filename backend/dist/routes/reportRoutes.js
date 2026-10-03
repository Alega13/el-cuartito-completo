"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reportController_1 = require("../controllers/reportController");
const router = (0, express_1.Router)();
// Endpoint for generating Excel financial report
router.get('/financial', reportController_1.generateFinancialReport);
exports.default = router;
