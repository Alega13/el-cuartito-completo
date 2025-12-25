import { Router } from 'express';
import * as eventController from '../controllers/eventController';
import { isAdmin } from '../middlewares/auth';

const router = Router();

router.use(isAdmin);

router.get('/', eventController.getEvents);
router.post('/', eventController.createEvent);
router.delete('/:id', eventController.deleteEvent);

export default router;
