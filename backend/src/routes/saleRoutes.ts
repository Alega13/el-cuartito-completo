import { Router } from 'express';
import * as firebaseController from '../controllers/firebaseController';
import { isAdmin } from '../middlewares/auth';

const router = Router();

router.get('/', isAdmin, firebaseController.getSales);
router.get('/public/:id', firebaseController.getSaleById);
router.post('/public/:id/confirm-local', firebaseController.confirmLocalPayment);
router.post('/', isAdmin, firebaseController.createSale);
router.patch('/:id/fulfillment', isAdmin, firebaseController.updateFulfillmentStatus);
router.patch('/:id/value', isAdmin, firebaseController.updateSaleValue);

router.post('/:id/notify-preparing', isAdmin, firebaseController.notifyPreparing);
router.post('/:id/update-tracking', isAdmin, firebaseController.updateTrackingNumber);
router.post('/:id/notify-shipped', isAdmin, firebaseController.notifyShipped);
router.post('/:id/mark-dispatched', isAdmin, firebaseController.markAsDispatched);
router.post('/:id/notify-pickup-ready', isAdmin, firebaseController.notifyReadyForPickup);
router.post('/:id/mark-picked-up', isAdmin, firebaseController.markAsPickedUp);

export default router;

