import { Router } from 'express';
import { subscribeEmail, unsubscribeEmail, sendDrop, getCustomers } from '../controllers/newsletterController';

const router = Router();

router.get('/admin/api/customers', getCustomers);
router.get('/admin/customers', getCustomers);
router.get('/api/admin/customers', getCustomers);

router.post('/newsletter/subscribe', subscribeEmail);
router.get('/newsletter/unsubscribe', unsubscribeEmail);
router.post('/newsletter/unsubscribe', unsubscribeEmail);
router.post('/newsletter/send-drop', sendDrop);

export default router;
