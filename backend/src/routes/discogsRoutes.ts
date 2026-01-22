import { Router } from 'express';
import { syncInventory, getSyncStatus, syncOrders, createListing, updateListing, deleteListing, getPriceSuggestions } from '../controllers/discogsController';

const router = Router();

// POST /discogs/sync - Trigger manual inventory sync
router.post('/sync', syncInventory);

// POST /discogs/sync-orders - Sync orders from Discogs (auto-create sales)
router.post('/sync-orders', syncOrders);

// GET /discogs/status - Check sync configuration
router.get('/status', getSyncStatus);

// POST /discogs/create-listing - Create new Discogs listing
router.post('/create-listing', createListing);

// PUT /discogs/update-listing/:id - Update existing listing
router.put('/update-listing/:id', updateListing);

// DELETE /discogs/delete-listing/:id - Delete listing
router.delete('/delete-listing/:id', deleteListing);

// GET /discogs/price-suggestions/:releaseId - Get suggested prices
router.get('/price-suggestions/:releaseId', getPriceSuggestions);

export default router;
