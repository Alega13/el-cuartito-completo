import { Router } from 'express';
import { syncInventory, getSyncStatus, createListing, updateListing, deleteListing } from '../controllers/discogsController';

const router = Router();

// POST /discogs/sync - Trigger manual sync
router.post('/sync', syncInventory);

// GET /discogs/status - Check sync configuration
router.get('/status', getSyncStatus);

// POST /discogs/create-listing - Create new Discogs listing
router.post('/create-listing', createListing);

// PUT /discogs/update-listing/:id - Update existing listing
router.put('/update-listing/:id', updateListing);

// DELETE /discogs/delete-listing/:id - Delete listing
router.delete('/delete-listing/:id', deleteListing);

export default router;
