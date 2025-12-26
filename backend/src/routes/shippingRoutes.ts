import { Router } from 'express';
import * as shippingController from '../controllers/shippingController';

const router = Router();

// Calculate shipping rates for an address
router.post('/calculate', shippingController.calculateShipping);

// Get all shipping zones (public endpoint)
router.get('/zones', shippingController.getShippingZones);

export default router;
