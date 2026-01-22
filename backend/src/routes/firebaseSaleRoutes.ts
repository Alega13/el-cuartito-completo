import { Router } from 'express';
import { createSale, reserveStock, releaseStock, updateFulfillmentStatus, updateSaleValue } from '../controllers/firebaseController';
import { isAdmin } from '../middlewares/auth';

const router = Router();

router.post('/sale', createSale);
router.post('/reserve', reserveStock);
router.post('/release', releaseStock);
router.patch('/:id/fulfillment', isAdmin, updateFulfillmentStatus);
router.patch('/:id/value', isAdmin, updateSaleValue);

export default router;
