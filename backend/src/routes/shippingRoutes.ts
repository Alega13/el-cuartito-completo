import { Router } from 'express';
import * as shippingController from '../controllers/shippingController';

const router = Router();

// Calculate shipping rates for an address
router.post('/calculate', shippingController.calculateShipping);

// Get all shipping zones (public endpoint)
router.get('/zones', shippingController.getShippingZones);

// Shipmondo Integration
router.post('/create-shipment/:saleId', shippingController.createShipment);
router.post('/ship-order', shippingController.shipOrder);
router.post('/manual-ship', shippingController.manualShipOrder);
router.post('/ready-for-pickup', shippingController.readyForPickup);
router.get('/shipment-label/:shipmentId', shippingController.getShipmentLabel);

export default router;
