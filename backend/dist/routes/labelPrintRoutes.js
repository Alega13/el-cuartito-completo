"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const labelPrintController_1 = require("../controllers/labelPrintController");
const router = (0, express_1.Router)();
router.post('/print-label', labelPrintController_1.printLabel);
exports.default = router;
