import { Router } from 'express';
import { printLabel } from '../controllers/labelPrintController';

const router = Router();

router.post('/print-label', printLabel);

export default router;
