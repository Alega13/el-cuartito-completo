import { Router } from 'express';
import * as checkoutController from '../controllers/checkoutController';

const router = Router();

router.post('/start', checkoutController.startCheckout);
router.post('/confirm', checkoutController.confirmCheckout);

export default router;
