import { Router } from 'express';
import { createSale, reserveStock, releaseStock, updateFulfillmentStatus } from '../controllers/firebaseController';

const router = Router();

router.post('/sale', createSale);
router.post('/reserve', reserveStock);
router.post('/release', releaseStock);
router.patch('/:id/fulfillment', updateFulfillmentStatus);

export default router;
