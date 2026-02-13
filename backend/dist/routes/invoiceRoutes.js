"use strict";
/**
 * Invoice API Routes
 * Provides endpoints for listing and downloading invoices.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const invoiceService_1 = require("../services/invoiceService");
const router = (0, express_1.Router)();
/**
 * GET /invoices
 * List invoices, optionally filtered by year and quarter.
 * Query params: ?year=2026&quarter=1
 */
router.get('/', auth_1.isAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const year = req.query.year ? parseInt(req.query.year) : undefined;
        const quarter = req.query.quarter ? parseInt(req.query.quarter) : undefined;
        const invoices = yield (0, invoiceService_1.listInvoices)(year, quarter);
        res.json({ success: true, invoices });
    }
    catch (error) {
        console.error('Error listing invoices:', error);
        res.status(500).json({ error: error.message });
    }
}));
/**
 * GET /invoices/:id/download
 * Get a signed download URL for a specific invoice PDF.
 */
router.get('/:id/download', auth_1.isAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const downloadUrl = yield (0, invoiceService_1.getInvoiceDownloadUrl)(req.params.id);
        if (!downloadUrl) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        res.json({ success: true, downloadUrl });
    }
    catch (error) {
        console.error('Error getting invoice download URL:', error);
        res.status(500).json({ error: error.message });
    }
}));
/**
 * GET /invoices/quarter-download?year=2026&quarter=1
 * Get all invoice download URLs for a specific quarter.
 */
router.get('/quarter-download', auth_1.isAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const year = parseInt(req.query.year);
        const quarter = parseInt(req.query.quarter);
        if (!year || !quarter || quarter < 1 || quarter > 4) {
            return res.status(400).json({ error: 'Valid year and quarter (1-4) required' });
        }
        const invoices = yield (0, invoiceService_1.getQuarterInvoices)(year, quarter);
        res.json({
            success: true,
            year,
            quarter,
            count: invoices.length,
            invoices,
        });
    }
    catch (error) {
        console.error('Error getting quarter invoices:', error);
        res.status(500).json({ error: error.message });
    }
}));
/**
 * POST /invoices/backfill
 * Generate invoices for all existing sales that don't have one yet.
 * This is a one-time migration endpoint.
 */
router.post('/backfill', auth_1.isAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = req.body.limit ? parseInt(req.body.limit) : 20;
        console.log(`🔄 Starting invoice backfill (limit: ${limit})...`);
        const result = yield (0, invoiceService_1.backfillInvoices)(limit);
        res.json(Object.assign({ success: true }, result));
    }
    catch (error) {
        console.error('Error during backfill:', error);
        res.status(500).json({ error: error.message });
    }
}));
exports.default = router;
