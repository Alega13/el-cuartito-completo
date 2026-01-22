import { Router } from 'express';
import * as firebaseController from '../controllers/firebaseController';
import { isAdmin } from '../middlewares/auth';

const router = Router();

router.get('/', isAdmin, firebaseController.getSales);
router.post('/', isAdmin, firebaseController.createSale);
router.patch('/:id/fulfillment', isAdmin, firebaseController.updateFulfillmentStatus);
router.patch('/:id/value', isAdmin, firebaseController.updateSaleValue);

export default router;

