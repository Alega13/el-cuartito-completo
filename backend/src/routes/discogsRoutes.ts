import { Router } from 'express';
import { syncInventory, getSyncStatus, syncOrders, createListing, updateListing, deleteListing, getPriceSuggestions, getReleaseById, getListingById, bulkImport, refreshMetadata, searchRelease, getTracklist } from '../controllers/discogsController';

const router = Router();

// PUBLIC ENDPOINTS (no auth needed - for shop frontend)
// GET /discogs/search?q=artist+album - Search for a release (proxy to avoid CORS)
router.get('/search', searchRelease);

// GET /discogs/tracklist/:id - Get tracklist for a release (proxy to avoid CORS)
router.get('/tracklist/:id', getTracklist);

// PROTECTED ENDPOINTS (for admin panel)
// POST /discogs/sync - Trigger manual inventory sync
router.post('/sync', syncInventory);

// POST /discogs/bulk-import - Bulk import from CSV string
router.post('/bulk-import', bulkImport);

// POST /discogs/refresh-metadata/:id - Refresh metadata for a specific product
router.post('/refresh-metadata/:id', refreshMetadata);

// POST /discogs/sync-orders - Sync orders from Discogs (auto-create sales)
router.post('/sync-orders', syncOrders);

// GET /discogs/status - Check sync configuration
router.get('/status', getSyncStatus);

// GET /discogs/release/:id - Get specific release
router.get('/release/:id', getReleaseById);

// GET /discogs/listing/:id - Get specific listing
router.get('/listing/:id', getListingById);

// POST /discogs/create-listing - Create new Discogs listing
router.post('/create-listing', createListing);

// PUT /discogs/update-listing/:id - Update existing listing
router.put('/update-listing/:id', updateListing);

// DELETE /discogs/delete-listing/:id - Delete listing
router.delete('/delete-listing/:id', deleteListing);

// GET /discogs/price-suggestions/:releaseId - Get suggested prices
router.get('/price-suggestions/:releaseId', getPriceSuggestions);

export default router;
