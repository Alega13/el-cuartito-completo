import { Router } from 'express';
import { createSale, reserveStock, releaseStock } from '../controllers/firebaseController';

const router = Router();

router.post('/sale', createSale);
router.post('/reserve', reserveStock);
router.post('/release', releaseStock);

export default router;
