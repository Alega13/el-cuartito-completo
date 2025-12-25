import { Router } from 'express';
import * as firebaseController from '../controllers/firebaseController';
import { isAdmin } from '../middlewares/auth';

const router = Router();

router.get('/', isAdmin, firebaseController.getAllProducts);
router.get('/online', firebaseController.listProducts);
router.post('/', isAdmin, firebaseController.createProduct);
router.patch('/:id', isAdmin, firebaseController.updateProduct);
router.delete('/:id', isAdmin, firebaseController.deleteProduct);

export default router;

