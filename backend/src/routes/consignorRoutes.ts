import { Router } from 'express';
import { getConsignors, createConsignor, deleteConsignor } from '../controllers/consignorController';
import { isAdmin } from '../middlewares/auth';


const router = Router();

router.use(isAdmin);

router.get('/', getConsignors);
router.post('/', createConsignor);
router.delete('/:id', deleteConsignor);

export default router;
