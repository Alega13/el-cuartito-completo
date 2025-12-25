import { Router } from 'express';
import * as expenseController from '../controllers/expenseController';
import { isAdmin } from '../middlewares/auth';

const router = Router();

router.use(isAdmin);

router.get('/', expenseController.getExpenses);
router.post('/', expenseController.createExpense);
router.patch('/:id', expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);

export default router;
