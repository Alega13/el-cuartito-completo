/**
 * Invoice API Routes
 * Provides endpoints for listing and downloading invoices.
 */

import { Router, Request, Response } from 'express';
import { isAdmin } from '../middlewares/auth';
import {
    listInvoices,
    getInvoiceDownloadUrl,
    getQuarterInvoices,
    backfillInvoices,
} from '../services/invoiceService';

const router = Router();

/**
 * GET /invoices
 * List invoices, optionally filtered by year and quarter.
 * Query params: ?year=2026&quarter=1
 */
router.get('/', isAdmin, async (req: Request, res: Response) => {
    try {
        const year = req.query.year ? parseInt(req.query.year as string) : undefined;
        const quarter = req.query.quarter ? parseInt(req.query.quarter as string) : undefined;

        const invoices = await listInvoices(year, quarter);
        res.json({ success: true, invoices });
    } catch (error: any) {
        console.error('Error listing invoices:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /invoices/:id/download
 * Get a signed download URL for a specific invoice PDF.
 */
router.get('/:id/download', isAdmin, async (req: Request, res: Response) => {
    try {
        const downloadUrl = await getInvoiceDownloadUrl(req.params.id);
        if (!downloadUrl) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        res.json({ success: true, downloadUrl });
    } catch (error: any) {
        console.error('Error getting invoice download URL:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /invoices/quarter-download?year=2026&quarter=1
 * Get all invoice download URLs for a specific quarter.
 */
router.get('/quarter-download', isAdmin, async (req: Request, res: Response) => {
    try {
        const year = parseInt(req.query.year as string);
        const quarter = parseInt(req.query.quarter as string);

        if (!year || !quarter || quarter < 1 || quarter > 4) {
            return res.status(400).json({ error: 'Valid year and quarter (1-4) required' });
        }

        const invoices = await getQuarterInvoices(year, quarter);
        res.json({
            success: true,
            year,
            quarter,
            count: invoices.length,
            invoices,
        });
    } catch (error: any) {
        console.error('Error getting quarter invoices:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /invoices/backfill
 * Generate invoices for all existing sales that don't have one yet.
 * This is a one-time migration endpoint.
 */
router.post('/backfill', isAdmin, async (req: Request, res: Response) => {
    try {
        console.log('🔄 Starting invoice backfill...');
        const result = await backfillInvoices();
        res.json({ success: true, ...result });
    } catch (error: any) {
        console.error('Error during backfill:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
