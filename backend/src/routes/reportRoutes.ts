import { Router } from 'express';
import { generateFinancialReport } from '../controllers/reportController';

const router = Router();

// Endpoint for generating Excel financial report
router.get('/financial', generateFinancialReport);

export default router;
