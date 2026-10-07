import { Router } from 'express';
import { postQuotes, getServicePoints, postShipment } from '../controllers/shipmondoProxyController';

const router = Router();

/** Live rates for the admin's Pre-Flight flow. Body: {sender, receiver, parcels} */
router.post('/quotes', postQuotes);

/** Nearest parcel shops. Query: ?country_code&zipcode&carrier&limit */
router.get('/service-points', getServicePoints);

/** Buy a label. Body: {orderId?, productCode?, servicePointId?, testMode?, shipment:{parties:[...]}} */
router.post('/shipments', postShipment);

export default router;
