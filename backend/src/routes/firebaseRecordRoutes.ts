import { Router } from 'express';
import { listProducts } from '../controllers/firebaseController';

const router = Router();

router.get('/products', listProducts);

export default router;
